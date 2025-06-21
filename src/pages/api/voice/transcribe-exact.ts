/**
 * 精确语音转录API
 * 服务端处理Amazon Transcribe调用，确保凭证安全
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { TranscribeClient, StartTranscriptionJobCommand, GetTranscriptionJobCommand } from '@aws-sdk/client-transcribe';
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import formidable from 'formidable';
import fs from 'fs';

// 禁用Next.js默认的body解析
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
    });
  }

  try {
    console.log('🎯 开始精确语音转录API处理');

    // AWS配置（服务端安全）
    const awsConfig = {
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    };

    const transcribeClient = new TranscribeClient(awsConfig);
    const s3Client = new S3Client(awsConfig);
    const bucketName = process.env.AWS_S3_AUDIO_BUCKET || 'vomage-audio-temp';

    // 解析上传的文件
    const form = formidable({
      maxFileSize: 10 * 1024 * 1024, // 10MB限制
    });

    const [fields, files] = await form.parse(req);
    const audioFile = Array.isArray(files.audio) ? files.audio[0] : files.audio;

    if (!audioFile) {
      return res.status(400).json({
        success: false,
        error: '未找到音频文件',
      });
    }

    console.log('📁 接收到音频文件:', {
      size: audioFile.size,
      type: audioFile.mimetype,
      name: audioFile.originalFilename,
    });

    // 1. 上传音频到S3
    const audioKey = `transcribe/${Date.now()}-${Math.random().toString(36).substring(7)}.webm`;
    const audioBuffer = fs.readFileSync(audioFile.filepath);

    const uploadCommand = new PutObjectCommand({
      Bucket: bucketName,
      Key: audioKey,
      Body: audioBuffer,
      ContentType: audioFile.mimetype || 'audio/webm',
    });

    await s3Client.send(uploadCommand);
    console.log('📤 音频已上传到S3:', audioKey);

    // 2. 启动Amazon Transcribe任务
    const jobName = `transcribe-${Date.now()}`;
    
    console.log('🚀 准备启动Transcribe任务:', {
      jobName,
      audioKey,
      bucketName,
      languageCode: 'zh-CN',
      mediaFormat: 'webm'
    });
    
    // 简化的Transcribe配置，只使用必要参数
    const startCommand = new StartTranscriptionJobCommand({
      TranscriptionJobName: jobName,
      LanguageCode: 'zh-CN', // 中文识别
      MediaFormat: 'webm',
      Media: {
        MediaFileUri: `s3://${bucketName}/${audioKey}`,
      },
      // 简化设置，避免配置错误
      Settings: {
        ShowAlternatives: true,
        MaxAlternatives: 3,
      },
      OutputBucketName: bucketName,
      OutputKey: `transcripts/${jobName}.json`,
    });

    try {
      await transcribeClient.send(startCommand);
      console.log('✅ Amazon Transcribe任务已启动:', jobName);
    } catch (transcribeError) {
      console.error('❌ 启动Transcribe任务失败:', transcribeError);
      throw new Error(`启动转录任务失败: ${transcribeError instanceof Error ? transcribeError.message : '未知错误'}`);
    }

    // 3. 等待转录完成
    const maxAttempts = 60; // 最多等待5分钟
    let attempts = 0;
    let transcriptionResult = null;

    while (attempts < maxAttempts) {
      const getCommand = new GetTranscriptionJobCommand({
        TranscriptionJobName: jobName,
      });

      const response = await transcribeClient.send(getCommand);
      const job = response.TranscriptionJob;

      if (job?.TranscriptionJobStatus === 'COMPLETED') {
        // 获取转录结果 - 使用AWS SDK而不是HTTP URL
        const transcriptUri = job.Transcript?.TranscriptFileUri;
        if (transcriptUri) {
          console.log('📥 获取转录结果URI:', transcriptUri);
          
          try {
            // 从URI中提取S3 key - 修复解析逻辑
            const url = new URL(transcriptUri);
            // URI格式: https://s3.us-east-1.amazonaws.com/bucket-name/key-path
            // 需要移除 /bucket-name/ 部分，只保留 key-path
            const pathParts = url.pathname.split('/');
            // pathParts[0] = '', pathParts[1] = 'bucket-name', pathParts[2+] = key parts
            const s3Key = pathParts.slice(2).join('/'); // 跳过空字符串和bucket名称
            
            console.log('🔑 原始URI:', transcriptUri);
            console.log('🔑 解析的S3 Key:', s3Key);
            
            // 使用AWS SDK直接从S3获取文件
            const getObjectCommand = new GetObjectCommand({
              Bucket: bucketName,
              Key: s3Key,
            });
            
            const s3Response = await s3Client.send(getObjectCommand);
            console.log('📊 S3响应状态:', s3Response.$metadata.httpStatusCode);
            
            if (!s3Response.Body) {
              throw new Error('S3响应中没有文件内容');
            }
            
            // 读取文件内容
            const responseText = await s3Response.Body.transformToString();
            console.log('📄 响应内容长度:', responseText.length);
            console.log('📄 响应内容开头:', responseText.substring(0, 200));
            
            let transcriptData;
            try {
              transcriptData = JSON.parse(responseText);
            } catch (parseError) {
              console.error('❌ JSON解析失败:', parseError);
              console.error('📄 完整响应内容:', responseText);
              throw new Error(`转录结果JSON解析失败: ${parseError instanceof Error ? parseError.message : '未知错误'}`);
            }
            
            const transcript = transcriptData.results?.transcripts?.[0]?.transcript || '';
            
            // 计算平均置信度
            let totalConfidence = 0;
            let itemCount = 0;
            
            if (transcriptData.results?.items) {
              for (const item of transcriptData.results.items) {
                if (item.alternatives?.[0]?.confidence) {
                  totalConfidence += parseFloat(item.alternatives[0].confidence);
                  itemCount++;
                }
              }
            }

            const averageConfidence = itemCount > 0 ? totalConfidence / itemCount : 0.9;

            transcriptionResult = {
              text: transcript.trim(),
              confidence: averageConfidence,
              language: 'zh-CN',
              duration: audioFile.size / 8000,
              isExact: true,
            };

            console.log('✅ 转录完成:', transcriptionResult);
            break;
            
          } catch (fetchError) {
            console.error('❌ 获取转录结果失败:', fetchError);
            throw new Error(`获取转录结果失败: ${fetchError instanceof Error ? fetchError.message : '未知错误'}`);
          }
        }
      }

      if (job?.TranscriptionJobStatus === 'FAILED') {
        throw new Error(`转录失败: ${job.FailureReason || '未知原因'}`);
      }

      // 等待5秒后重试
      await new Promise(resolve => setTimeout(resolve, 5000));
      attempts++;
    }

    // 4. 清理S3文件
    try {
      const deleteCommand = new DeleteObjectCommand({
        Bucket: bucketName,
        Key: audioKey,
      });
      await s3Client.send(deleteCommand);
      console.log('🧹 已清理S3文件:', audioKey);
    } catch (error) {
      console.warn('清理S3文件失败:', error);
    }

    // 5. 清理本地临时文件
    try {
      fs.unlinkSync(audioFile.filepath);
    } catch (error) {
      console.warn('清理本地文件失败:', error);
    }

    if (!transcriptionResult) {
      throw new Error('转录超时');
    }

    // 返回结果
    res.status(200).json({
      success: true,
      data: transcriptionResult,
    });

  } catch (error) {
    console.error('❌ 精确转录API失败:', error);
    
    res.status(500).json({
      success: false,
      error: {
        message: '精确转录失败',
        details: error instanceof Error ? error.message : '未知错误',
      },
    });
  }
}
