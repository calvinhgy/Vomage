/**
 * 获取语音记录列表 API
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { ObjectId } from 'mongodb';
import { optionalAuthenticate, errorHandler, AuthenticatedRequest } from '@/middleware/auth';
import { connectDatabase, getVoiceRecordCollection } from '@/services/database';
import { connectCache, cacheService, CacheKeys, CacheTTL } from '@/services/cache';
import { VoiceRecordModel } from '@/models/VoiceRecord';

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: {
        code: 'METHOD_NOT_ALLOWED',
        message: '只支持 GET 请求',
      },
    });
  }

  try {
    // 连接数据库和缓存
    await Promise.all([connectDatabase(), connectCache()]);

    // 解析查询参数
    const {
      page = '1',
      limit = '20',
      userId,
      mood,
      privacy = 'public',
      sort = 'createdAt',
      order = 'desc',
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string))); // 最多50条
    const skip = (pageNum - 1) * limitNum;

    // 构建查询条件
    const query: any = {};

    // 如果指定了用户ID
    if (userId) {
      query.userId = new ObjectId(userId as string);
      
      // 检查权限：只有用户本人可以查看私有记录
      if (req.userId !== userId) {
        query.privacy = { $in: ['public'] };
      }
    } else {
      // 公开记录查询
      if (!req.userId) {
        // 未认证用户只能看公开记录
        query.privacy = 'public';
      } else {
        // 认证用户可以看公开记录和自己的记录
        query.$or = [
          { privacy: 'public' },
          { userId: new ObjectId(req.userId) }
        ];
      }
    }

    // 按心情筛选
    if (mood && mood !== 'all') {
      query['sentiment.mood'] = mood;
    }

    // 只显示已处理完成的记录
    query.isProcessed = true;
    query.processingStatus = 'completed';

    // 构建排序条件
    const sortField = sort as string;
    const sortOrder = order === 'asc' ? 1 : -1;
    const sortQuery: any = {};
    
    if (['createdAt', 'likes', 'shares', 'duration'].includes(sortField)) {
      sortQuery[sortField] = sortOrder;
    } else {
      sortQuery.createdAt = -1; // 默认按创建时间倒序
    }

    // 尝试从缓存获取
    const cacheKey = `records:${JSON.stringify({ query, sort: sortQuery, skip, limit: limitNum })}`;
    let cachedResult = await cacheService.get<any>(cacheKey);

    if (cachedResult) {
      return res.status(200).json({
        success: true,
        data: cachedResult,
        cached: true,
      });
    }

    // 从数据库查询
    const voiceRecordCollection = getVoiceRecordCollection();

    const [records, total] = await Promise.all([
      voiceRecordCollection
        .find(query)
        .sort(sortQuery)
        .skip(skip)
        .limit(limitNum)
        .toArray(),
      voiceRecordCollection.countDocuments(query),
    ]);

    // 转换为公开格式
    const publicRecords = records.map(record => ({
      id: record._id?.toString(),
      userId: record.userId.toString(),
      audioUrl: record.audioUrl,
      duration: record.duration,
      transcript: record.transcript,
      sentiment: record.sentiment,
      context: record.context,
      privacy: record.privacy,
      tags: record.tags,
      likes: record.likes,
      shares: record.shares,
      comments: record.comments,
      createdAt: record.createdAt,
    }));

    const result = {
      records: publicRecords,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
        hasNext: pageNum * limitNum < total,
        hasPrev: pageNum > 1,
      },
    };

    // 缓存结果（公开记录缓存时间长一些）
    const cacheTTL = privacy === 'public' ? CacheTTL.MEDIUM : CacheTTL.SHORT;
    await cacheService.set(cacheKey, result, cacheTTL);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Get voice records API error:', error);
    
    res.status(500).json({
      success: false,
      error: {
        code: 'QUERY_ERROR',
        message: '获取语音记录失败',
      },
    });
  }
}

// 应用中间件
const middlewareHandler = async (req: NextApiRequest, res: NextApiResponse) => {
  // 可选认证中间件
  await new Promise<void>((resolve, reject) => {
    optionalAuthenticate(req as any, res, (error?: any) => {
      if (error) reject(error);
      else resolve();
    });
  });

  await handler(req as AuthenticatedRequest, res);
};

export default errorHandler(middlewareHandler as any) as any;
