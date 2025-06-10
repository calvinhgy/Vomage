/**
 * 语音记录点赞 API
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { ObjectId } from 'mongodb';
import { authenticate, rateLimit, errorHandler, AuthenticatedRequest } from '@/middleware/auth';
import { connectDatabase, getVoiceRecordCollection } from '@/services/database';
import { connectCache, cacheService, CacheKeys, CacheTTL } from '@/services/cache';

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (!['POST', 'DELETE'].includes(req.method || '')) {
    return res.status(405).json({
      success: false,
      error: {
        code: 'METHOD_NOT_ALLOWED',
        message: '只支持 POST 和 DELETE 请求',
      },
    });
  }

  try {
    // 连接数据库和缓存
    await Promise.all([connectDatabase(), connectCache()]);

    const { id } = req.query;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '无效的语音记录ID',
        },
      });
    }

    const voiceRecordCollection = getVoiceRecordCollection();

    // 获取语音记录
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

    // 检查隐私设置
    if (voiceRecord.privacy === 'private' && voiceRecord.userId.toString() !== req.userId) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: '无法访问私有记录',
        },
      });
    }

    const likeKey = `like:${req.userId}:${id}`;
    const isLiked = await cacheService.exists(likeKey);

    if (req.method === 'POST') {
      // 点赞
      if (isLiked) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'ALREADY_LIKED',
            message: '已经点过赞了',
          },
        });
      }

      // 增加点赞数
      const result = await voiceRecordCollection.updateOne(
        { _id: new ObjectId(id) },
        {
          $inc: { likes: 1 },
          $set: { updatedAt: new Date() },
        }
      );

      if (result.modifiedCount === 0) {
        return res.status(500).json({
          success: false,
          error: {
            code: 'UPDATE_FAILED',
            message: '点赞失败',
          },
        });
      }

      // 记录用户点赞状态
      await cacheService.set(likeKey, true, CacheTTL.WEEK);

      // 清除相关缓存
      await clearRelatedCache(id, req.userId);

      res.status(200).json({
        success: true,
        data: {
          liked: true,
          likes: voiceRecord.likes + 1,
        },
      });
    } else {
      // 取消点赞
      if (!isLiked) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'NOT_LIKED',
            message: '尚未点赞',
          },
        });
      }

      // 减少点赞数
      const result = await voiceRecordCollection.updateOne(
        { _id: new ObjectId(id) },
        {
          $inc: { likes: -1 },
          $set: { updatedAt: new Date() },
        }
      );

      if (result.modifiedCount === 0) {
        return res.status(500).json({
          success: false,
          error: {
            code: 'UPDATE_FAILED',
            message: '取消点赞失败',
          },
        });
      }

      // 删除用户点赞状态
      await cacheService.delete(likeKey);

      // 清除相关缓存
      await clearRelatedCache(id, req.userId);

      res.status(200).json({
        success: true,
        data: {
          liked: false,
          likes: Math.max(0, voiceRecord.likes - 1),
        },
      });
    }
  } catch (error) {
    console.error('Like API error:', error);
    
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '操作失败',
      },
    });
  }
}

/**
 * 清除相关缓存
 */
async function clearRelatedCache(recordId: string, userId: string): Promise<void> {
  try {
    // 清除记录列表缓存
    await cacheService.deletePattern('records:*');
    await cacheService.deletePattern(`user:${userId}:records:*`);
    
    // 清除具体记录缓存
    await cacheService.delete(`voice:${recordId}`);
  } catch (error) {
    console.warn('Failed to clear related cache:', error);
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

  // 速率限制中间件
  const rateLimitMiddleware = rateLimit(30, 60 * 1000); // 每分钟最多30次点赞操作
  await new Promise<void>((resolve, reject) => {
    rateLimitMiddleware(req as any, res, (error?: any) => {
      if (error) reject(error);
      else resolve();
    });
  });

  await handler(req as AuthenticatedRequest, res);
};

export default errorHandler(authenticatedHandler as any) as any;
