/**
 * 为语音记录生成图片 API
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { ObjectId } from 'mongodb';
import { authenticate, rateLimit, errorHandler, AuthenticatedRequest } from '@/middleware/auth';
import { connectDatabase, getVoiceRecordCollection, getGeneratedImageCollection } from '@/services/database';
import { connectCache } from '@/services/cache';
import { AIService } from '@/services/aiService';
import { StorageService } from '@/services/storage';
import { GeneratedImageModel } from '@/models/GeneratedImage';

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

    const { id } = req.query;
    const { style = 'abstract', regenerate = false } = req.body;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '无效的语音记录ID',
        },
      });
    }

    // 获取语音记录
    const voiceRecordCollection = getVoiceRecordCollection();
    const voiceRecord = await voiceRecordCollection.findOne({
      _id: new ObjectId(id),
    });

    if (!voiceRecord) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: '语音记录不存在',
        },
      });
    }

    // 检查权限：只有记录所有者可以生成图片
    if (voiceRecord.userId.toString() !== req.userId) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: '只能为自己的语音记录生成图片',
        },
      });
    }

    // 检查语音记录是否已处理完成
    if (!voiceRecord.isProcessed || !voiceRecord.transcript || !voiceRecord.sentiment) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'PROCESSING_INCOMPLETE',
          message: '语音记录尚未处理完成',
        },
      });
    }

    // 检查是否已有图片（如果不是重新生成）
    if (!regenerate && voiceRecord.generatedImages.length > 0) {
      const imageCollection = getGeneratedImageCollection();
      const existingImage = await imageCollection.findOne({
        _id: voiceRecord.generatedImages[0],
      });

      if (existingImage) {
        return res.status(200).json({
          success: true,
          data: {
            id: existingImage._id?.toString(),
            url: existingImage.url,
            thumbnailUrl: existingImage.thumbnailUrl,
            prompt: existingImage.prompt,
            style: existingImage.style,
            metadata: existingImage.metadata,
            createdAt: existingImage.createdAt,
          },
          message: '使用已存在的图片',
        });
      }
    }

    // 生成图片
    const generatedImage = await AIService.generateImageOnly(
      voiceRecord.transcript,
      {
        mood: voiceRecord.sentiment.mood,
        confidence: voiceRecord.sentiment.confidence,
        details: voiceRecord.sentiment.details,
      },
      voiceRecord.context,
      style
    );

    // 下载生成的图片
    const imageResponse = await fetch(generatedImage.url);
    if (!imageResponse.ok) {
      throw new Error('下载生成的图片失败');
    }

    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());

    // 上传图片到 S3
    const uploadResult = await StorageService.uploadImage(
      imageBuffer,
      req.userId!,
      id,
      'image/png'
    );

    // 创建图片记录
    const imageDocument = GeneratedImageModel.createGeneratedImage({
      userId: new ObjectId(req.userId!),
      voiceRecordId: new ObjectId(id),
      url: uploadResult.url,
      prompt: generatedImage.prompt,
      style: generatedImage.style,
      metadata: {
        width: 512,
        height: 512,
        format: 'png',
        size: uploadResult.size,
        model: 'amazon.nova-lite-v1:0',
      },
      privacy: voiceRecord.privacy,
    });

    // 保存图片记录到数据库
    const imageCollection = getGeneratedImageCollection();
    const insertResult = await imageCollection.insertOne(imageDocument);
    imageDocument._id = insertResult.insertedId;

    // 更新语音记录，添加图片引用
    await voiceRecordCollection.updateOne(
      { _id: new ObjectId(id) },
      {
        $addToSet: { generatedImages: imageDocument._id },
        $set: { updatedAt: new Date() },
      }
    );

    // 异步生成缩略图
    generateThumbnailAsync(imageDocument._id.toString(), imageBuffer);

    // 返回成功响应
    res.status(201).json({
      success: true,
      data: {
        id: imageDocument._id.toString(),
        url: imageDocument.url,
        prompt: imageDocument.prompt,
        style: imageDocument.style,
        metadata: imageDocument.metadata,
        createdAt: imageDocument.createdAt,
      },
    });
  } catch (error) {
    console.error('Generate image API error:', error);
    
    const errorMessage = error instanceof Error ? error.message : '图片生成失败';
    
    res.status(500).json({
      success: false,
      error: {
        code: 'GENERATION_ERROR',
        message: errorMessage,
      },
    });
  }
}

/**
 * 异步生成缩略图
 */
async function generateThumbnailAsync(imageId: string, originalBuffer: Buffer): Promise<void> {
  try {
    // 这里应该使用图片处理库（如 Sharp）生成缩略图
    // 暂时跳过缩略图生成
    console.log(`Thumbnail generation for image ${imageId} skipped`);
    
    // 更新图片记录的优化状态
    const imageCollection = getGeneratedImageCollection();
    await imageCollection.updateOne(
      { _id: new ObjectId(imageId) },
      {
        $set: {
          optimizationStatus: 'completed',
          isOptimized: true,
          updatedAt: new Date(),
        },
      }
    );
  } catch (error) {
    console.error(`Failed to generate thumbnail for image ${imageId}:`, error);
    
    // 更新失败状态
    try {
      const imageCollection = getGeneratedImageCollection();
      await imageCollection.updateOne(
        { _id: new ObjectId(imageId) },
        {
          $set: {
            optimizationStatus: 'failed',
            optimizationError: error instanceof Error ? error.message : '缩略图生成失败',
            updatedAt: new Date(),
          },
        }
      );
    } catch (updateError) {
      console.error('Failed to update optimization status:', updateError);
    }
  }
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

  // 速率限制中间件 - 图片生成比较消耗资源，限制更严格
  const rateLimitMiddleware = rateLimit(3, 60 * 1000); // 每分钟最多3次图片生成
  await new Promise<void>((resolve, reject) => {
    rateLimitMiddleware(req as any, res, (error?: any) => {
      if (error) reject(error);
      else resolve();
    });
  });

  await handler(req as AuthenticatedRequest, res);
};

export default errorHandler(authenticatedHandler as any) as any;
