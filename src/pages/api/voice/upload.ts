/**
 * 语音上传和处理 API
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { IncomingForm, File } from 'formidable';
import { readFileSync } from 'fs';
import { ObjectId } from 'mongodb';
import { authenticate, rateLimit, errorHandler, AuthenticatedRequest } from '@/middleware/auth';
import { connectDatabase, getVoiceRecordCollection } from '@/services/database';
import { connectCache } from '@/services/cache';
import { StorageService } from '@/services/storage';
import { AIService } from '@/services/aiService';
import { VoiceRecordModel } from '@/models/VoiceRecord';
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
    // 连接数据库和缓存
    await Promise.all([connectDatabase(), connectCache()]);

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

    // 验证文件类型
    const allowedTypes = StorageService.getAllowedAudioTypes();
    if (!StorageService.validateFileType(audioFile.mimetype || '', allowedTypes)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '不支持的音频格式',
        },
      });
    }

    // 读取音频文件
    const audioBuffer = readFileSync(audioFile.filepath);
    
    // 获取音频时长（简单估算）
    const duration = estimateAudioDuration(audioBuffer, audioFile.mimetype || '');

    // 验证时长
    if (duration < 1) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '音频时长至少需要1秒',
        },
      });
    }

    if (duration > 300) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '音频时长不能超过5分钟',
        },
      });
    }

    // 上传音频到 S3
    const uploadResult = await StorageService.uploadAudio(
      audioBuffer,
      req.userId!,
      audioFile.mimetype || 'audio/webm'
    );

    // 解析上下文信息
    let context: Context | undefined;
    if (fields.context) {
      try {
        context = JSON.parse(Array.isArray(fields.context) ? fields.context[0] : fields.context);
      } catch (error) {
        console.warn('Failed to parse context:', error);
      }
    }

    // 创建语音记录
    const voiceRecord = VoiceRecordModel.createVoiceRecord({
      userId: new ObjectId(req.userId!),
      audioUrl: uploadResult.url,
      audioSize: uploadResult.size,
      duration,
      mimeType: audioFile.mimetype || 'audio/webm',
      context,
      privacy: req.user?.settings.privacyLevel || 'public',
    });

    // 保存到数据库
    const voiceRecordCollection = getVoiceRecordCollection();
    const insertResult = await voiceRecordCollection.insertOne(voiceRecord);
    voiceRecord._id = insertResult.insertedId;

    // 异步处理 AI 分析
    processVoiceRecordAsync(voiceRecord._id.toString(), audioBuffer, context);

    // 返回成功响应
    res.status(201).json({
      success: true,
      data: {
        id: voiceRecord._id.toString(),
        audioUrl: voiceRecord.audioUrl,
        duration: voiceRecord.duration,
        context: voiceRecord.context,
        privacy: voiceRecord.privacy,
        processingStatus: voiceRecord.processingStatus,
        createdAt: voiceRecord.createdAt,
      },
    });
  } catch (error) {
    console.error('Voice upload API error:', error);
    
    const errorMessage = error instanceof Error ? error.message : '上传失败';
    
    res.status(500).json({
      success: false,
      error: {
        code: 'UPLOAD_ERROR',
        message: errorMessage,
      },
    });
  }
}

/**
 * 异步处理语音记录的 AI 分析
 */
async function processVoiceRecordAsync(
  voiceRecordId: string,
  audioBuffer: Buffer,
  context?: Context
): Promise<void> {
  try {
    const voiceRecordCollection = getVoiceRecordCollection();
    
    // 更新处理状态
    await voiceRecordCollection.updateOne(
      { _id: new ObjectId(voiceRecordId) },
      { 
        $set: { 
          processingStatus: 'processing',
          updatedAt: new Date(),
        }
      }
    );

    // 创建 Blob 对象用于 AI 处理
    const audioBlob = new Blob([audioBuffer], { type: 'audio/webm' });

    // 使用 AI 服务处理语音
    const result = await AIService.processVoice(audioBlob, context, {
      enableImageGeneration: true,
      imageStyle: 'abstract',
    });

    // 更新语音记录
    const updateData: any = {
      transcript: result.transcript,
      sentiment: {
        mood: result.sentiment.mood,
        confidence: result.sentiment.confidence,
        details: result.sentiment.details,
        processedAt: new Date(),
      },
      processingStatus: 'completed',
      isProcessed: true,
      updatedAt: new Date(),
    };

    // 如果生成了图片，保存图片信息
    if (result.generatedImage) {
      // 这里应该保存图片到数据库
      // 暂时只更新语音记录
    }

    await voiceRecordCollection.updateOne(
      { _id: new ObjectId(voiceRecordId) },
      { $set: updateData }
    );

    console.log(`Voice record ${voiceRecordId} processed successfully`);
  } catch (error) {
    console.error(`Failed to process voice record ${voiceRecordId}:`, error);
    
    // 更新失败状态
    try {
      const voiceRecordCollection = getVoiceRecordCollection();
      await voiceRecordCollection.updateOne(
        { _id: new ObjectId(voiceRecordId) },
        { 
          $set: { 
            processingStatus: 'failed',
            processingError: error instanceof Error ? error.message : '处理失败',
            updatedAt: new Date(),
          }
        }
      );
    } catch (updateError) {
      console.error('Failed to update processing status:', updateError);
    }
  }
}

/**
 * 估算音频时长（简单实现）
 */
function estimateAudioDuration(buffer: Buffer, mimeType: string): number {
  // 这是一个简化的实现
  // 实际应用中应该使用专门的音频解析库
  
  // 基于文件大小的粗略估算
  const sizeInKB = buffer.length / 1024;
  
  // 不同格式的大致比特率（kbps）
  const bitrates: Record<string, number> = {
    'audio/webm': 64,
    'audio/mp4': 128,
    'audio/mpeg': 128,
    'audio/wav': 1411,
    'audio/ogg': 64,
  };

  const bitrate = bitrates[mimeType] || 64;
  const durationInSeconds = (sizeInKB * 8) / bitrate;
  
  return Math.max(1, Math.round(durationInSeconds));
}

// 应用中间件
const authenticatedHandler = async (req: NextApiRequest, res: NextApiResponse) => {
  // 认证中间件
  await new Promise<void>((resolve, reject) => {
    authenticate(req as any, res, (error?: any) => {
      if (error) reject(error);
      else resolve();
    });
  });

  // 速率限制中间件
  const rateLimitMiddleware = rateLimit(10, 60 * 1000); // 每分钟最多10次上传
  await new Promise<void>((resolve, reject) => {
    rateLimitMiddleware(req as any, res, (error?: any) => {
      if (error) reject(error);
      else resolve();
    });
  });

  await handler(req as AuthenticatedRequest, res);
};

export default errorHandler(authenticatedHandler as any) as any;
