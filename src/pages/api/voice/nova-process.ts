/**
 * 使用Amazon Nova服务处理语音的API
 * 集成Nova Sonic (语音转文字) 和 Nova Canvas (图片生成)
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { IncomingForm, File } from 'formidable';
import { readFileSync } from 'fs';
import { ObjectId } from 'mongodb';
import { authenticate, rateLimit, errorHandler, AuthenticatedRequest } from '@/middleware/auth';
import { connectDatabase, getVoiceRecordCollection } from '@/services/database';
import { novaSonicService } from '@/services/novaSonicService';
import { novaCanvasService } from '@/services/novaCanvasService';
import { Context } from '@/types';

// 禁用默认的 body parser
export const config = {
  api: {
    bodyParser: false,
  },
};

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: {
        code: 'METHOD_NOT_ALLOWED',
        message: '只支持 POST 请求',
      },
    });
  }

  try {
    console.log('开始Nova服务处理流程...');

    // 连接数据库
    await connectDatabase();
    const voiceRecordCollection = getVoiceRecordCollection();

    // 解析表单数据
    const form = new IncomingForm({
      maxFileSize: 25 * 1024 * 1024, // 25MB
      keepExtensions: true,
    });

    const { fields, files } = await new Promise<{
      fields: any;
      files: any;
    }>((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve({ fields, files });
      });
    });

    // 验证音频文件
    const audioFile = Array.isArray(files.audio) ? files.audio[0] : files.audio;
    if (!audioFile) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '缺少音频文件',
        },
      });
    }

    // 读取音频数据
    const audioBuffer = readFileSync(audioFile.filepath);
    const audioFormat = audioFile.mimetype?.includes('webm') ? 'webm' : 'mp4';
    
    console.log('音频文件信息:', {
      size: audioBuffer.length,
      format: audioFormat,
      originalName: audioFile.originalFilename,
    });

    // 解析上下文信息
    let context: Context | undefined;
    try {
      if (fields.context) {
        const contextStr = Array.isArray(fields.context) ? fields.context[0] : fields.context;
        context = JSON.parse(contextStr);
      }
    } catch (error) {
      console.warn('解析上下文信息失败:', error);
    }

    // 创建语音记录
    const voiceRecord = {
      _id: new ObjectId(),
      userId: req.userId,
      audioUrl: '', // 稍后更新
      audioSize: audioBuffer.length,
      duration: Math.ceil(audioBuffer.length / 1024 / 8), // 估算时长
      transcript: '',
      transcriptConfidence: 0,
      sentiment: null,
      context: context || null,
      generatedImages: [],
      metadata: {
        audioFormat,
        processingMethod: 'amazon-nova',
        uploadedAt: new Date(),
      },
      privacy: 'private',
      tags: [],
      likes: 0,
      shares: 0,
      comments: 0,
      isProcessed: false,
      processingStatus: 'processing',
      processingError: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // 保存初始记录
    const insertResult = await voiceRecordCollection.insertOne(voiceRecord);
    const voiceRecordId = insertResult.insertedId.toString();

    console.log('语音记录已创建:', voiceRecordId);

    // 立即返回响应，后台继续处理
    res.status(200).json({
      success: true,
      data: {
        id: voiceRecordId,
        status: 'processing',
        message: '开始使用Amazon Nova服务处理语音',
      },
    });

    // 后台异步处理
    processWithNovaServices(voiceRecordId, audioBuffer, audioFormat, context)
      .catch(error => {
        console.error('Nova服务处理失败:', error);
        // 更新记录状态为失败
        voiceRecordCollection.updateOne(
          { _id: new ObjectId(voiceRecordId) },
          {
            $set: {
              processingStatus: 'failed',
              processingError: error.message,
              updatedAt: new Date(),
            },
          }
        );
      });

  } catch (error) {
    console.error('Nova处理API错误:', error);
    
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '服务器内部错误',
        details: error instanceof Error ? error.message : '未知错误',
      },
    });
  }
}

/**
 * 使用Nova服务异步处理语音
 */
async function processWithNovaServices(
  voiceRecordId: string,
  audioBuffer: Buffer,
  audioFormat: string,
  context?: Context
): Promise<void> {
  try {
    console.log(`开始Nova服务处理: ${voiceRecordId}`);
    
    const voiceRecordCollection = getVoiceRecordCollection();

    // 1. 使用Nova Sonic进行语音转录
    console.log('步骤1: Nova Sonic语音转录...');
    const transcriptionResult = await novaSonicService.transcribeAudio(audioBuffer, audioFormat);
    
    console.log('转录结果:', transcriptionResult);

    // 2. 使用Nova进行内容分析
    console.log('步骤2: Nova内容分析...');
    const analysisResult = await novaSonicService.analyzeTranscript(transcriptionResult.transcript);
    
    console.log('分析结果:', analysisResult);

    // 3. 使用Nova Canvas生成心情图片
    console.log('步骤3: Nova Canvas图片生成...');
    const imageRequest = {
      sentiment: analysisResult.sentiment,
      context: context ? {
        weather: context.weather?.condition,
        timeOfDay: context.timeOfDay,
        location: context.location?.city,
      } : undefined,
      style: 'abstract' as const,
    };

    const imageResult = await novaCanvasService.generateMoodImage(imageRequest, voiceRecordId);
    
    console.log('图片生成结果:', imageResult);

    // 4. 更新数据库记录
    console.log('步骤4: 更新数据库记录...');
    const updateResult = await voiceRecordCollection.updateOne(
      { _id: new ObjectId(voiceRecordId) },
      {
        $set: {
          transcript: transcriptionResult.transcript,
          transcriptConfidence: transcriptionResult.confidence,
          sentiment: {
            mood: analysisResult.sentiment.mood,
            confidence: analysisResult.sentiment.confidence,
            details: analysisResult.sentiment.details,
            keywords: analysisResult.keywords,
            reasoning: analysisResult.reasoning,
            processedAt: analysisResult.processedAt,
          },
          generatedImages: [imageResult],
          isProcessed: true,
          processingStatus: 'completed',
          updatedAt: new Date(),
          metadata: {
            ...voiceRecordCollection,
            novaProcessing: {
              transcriptionTime: Date.now(),
              analysisTime: Date.now(),
              imageGenerationTime: Date.now(),
              totalProcessingTime: Date.now(),
            },
          },
        },
      }
    );

    console.log(`Nova服务处理完成: ${voiceRecordId}`, updateResult);

  } catch (error) {
    console.error(`Nova服务处理失败 ${voiceRecordId}:`, error);
    throw error;
  }
}

export default errorHandler(rateLimit(authenticate(handler)));
