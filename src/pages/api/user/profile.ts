/**
 * 用户个人资料 API
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { ObjectId } from 'mongodb';
import { authenticate, optionalAuthenticate, errorHandler, AuthenticatedRequest } from '@/middleware/auth';
import { connectDatabase, getUserCollection, getVoiceRecordCollection } from '@/services/database';
import { connectCache, cacheService, CacheKeys, CacheTTL } from '@/services/cache';
import { UserModel } from '@/models/User';

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (!['GET', 'PATCH'].includes(req.method || '')) {
    return res.status(405).json({
      success: false,
      error: {
        code: 'METHOD_NOT_ALLOWED',
        message: '只支持 GET 和 PATCH 请求',
      },
    });
  }

  try {
    // 连接数据库和缓存
    await Promise.all([connectDatabase(), connectCache()]);

    const userCollection = getUserCollection();

    if (req.method === 'GET') {
      // 获取用户资料
      const { userId } = req.query;
      const targetUserId = userId as string || req.userId;

      if (!targetUserId) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '缺少用户ID',
          },
        });
      }

      // 尝试从缓存获取
      const cacheKey = CacheKeys.user(targetUserId);
      let user = await cacheService.get<any>(cacheKey);

      if (!user) {
        // 从数据库获取
        user = await userCollection.findOne({
          _id: new ObjectId(targetUserId),
        });

        if (!user) {
          return res.status(404).json({
            success: false,
            error: {
              code: 'NOT_FOUND',
              message: '用户不存在',
            },
          });
        }

        // 缓存用户信息
        await cacheService.set(cacheKey, user, CacheTTL.MEDIUM);
      }

      // 获取用户统计信息
      const voiceRecordCollection = getVoiceRecordCollection();
      const [totalRecordings, publicRecordings] = await Promise.all([
        voiceRecordCollection.countDocuments({
          userId: new ObjectId(targetUserId),
          isProcessed: true,
        }),
        voiceRecordCollection.countDocuments({
          userId: new ObjectId(targetUserId),
          isProcessed: true,
          privacy: 'public',
        }),
      ]);

      // 获取心情分布统计
      const moodStats = await voiceRecordCollection.aggregate([
        {
          $match: {
            userId: new ObjectId(targetUserId),
            isProcessed: true,
            'sentiment.mood': { $exists: true },
          },
        },
        {
          $group: {
            _id: '$sentiment.mood',
            count: { $sum: 1 },
          },
        },
      ]).toArray();

      const moodDistribution = moodStats.reduce((acc, stat) => {
        acc[stat._id] = stat.count;
        return acc;
      }, {} as Record<string, number>);

      // 判断是否为自己的资料
      const isOwnProfile = req.userId === targetUserId;

      // 构建响应数据
      const profileData = {
        id: user._id.toString(),
        username: user.username,
        avatar: user.avatar,
        stats: {
          totalRecordings: isOwnProfile ? totalRecordings : publicRecordings,
          totalImages: user.stats.totalImages,
          joinDate: user.stats.joinDate,
          lastActive: isOwnProfile ? user.stats.lastActive : undefined,
        },
        moodDistribution,
        // 只有查看自己的资料时才返回设置和邮箱
        ...(isOwnProfile && {
          email: user.email,
          settings: user.settings,
        }),
      };

      return res.status(200).json({
        success: true,
        data: profileData,
      });
    }

    // PATCH 请求 - 更新个人资料
    if (!req.userId) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: '需要认证',
        },
      });
    }

    const { username, email, avatar } = req.body;

    // 验证更新数据
    const validationErrors: string[] = [];

    if (username !== undefined) {
      if (!username || username.trim().length === 0) {
        validationErrors.push('用户名不能为空');
      } else if (username.length < 2 || username.length > 50) {
        validationErrors.push('用户名长度必须在2-50个字符之间');
      }
    }

    if (email !== undefined && email !== null) {
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        validationErrors.push('邮箱格式不正确');
      }
    }

    if (avatar !== undefined && avatar !== null) {
      if (avatar && !avatar.startsWith('http')) {
        validationErrors.push('头像必须是有效的URL');
      }
    }

    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: validationErrors.join('; '),
        },
      });
    }

    // 获取当前用户
    const user = await userCollection.findOne({
      _id: new ObjectId(req.userId),
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: '用户不存在',
        },
      });
    }

    // 检查用户名是否已被使用
    if (username && username !== user.username) {
      const existingUser = await userCollection.findOne({
        username: username.trim(),
        _id: { $ne: new ObjectId(req.userId) },
      });

      if (existingUser) {
        return res.status(409).json({
          success: false,
          error: {
            code: 'CONFLICT',
            message: '用户名已被使用',
          },
        });
      }
    }

    // 检查邮箱是否已被使用
    if (email && email !== user.email) {
      const existingEmail = await userCollection.findOne({
        email: email.trim(),
        _id: { $ne: new ObjectId(req.userId) },
      });

      if (existingEmail) {
        return res.status(409).json({
          success: false,
          error: {
            code: 'CONFLICT',
            message: '邮箱已被使用',
          },
        });
      }
    }

    // 构建更新数据
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (username !== undefined) {
      updateData.username = username.trim();
    }

    if (email !== undefined) {
      updateData.email = email ? email.trim() : null;
    }

    if (avatar !== undefined) {
      updateData.avatar = avatar;
    }

    // 更新用户信息
    await userCollection.updateOne(
      { _id: new ObjectId(req.userId) },
      { $set: updateData }
    );

    // 清除用户缓存
    await cacheService.delete(CacheKeys.user(req.userId));

    // 获取更新后的用户信息
    const updatedUser = await userCollection.findOne({
      _id: new ObjectId(req.userId),
    });

    res.status(200).json({
      success: true,
      data: {
        id: updatedUser!._id.toString(),
        username: updatedUser!.username,
        email: updatedUser!.email,
        avatar: updatedUser!.avatar,
        settings: updatedUser!.settings,
        stats: updatedUser!.stats,
      },
    });
  } catch (error) {
    console.error('User profile API error:', error);
    
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '操作失败',
      },
    });
  }
}

// 应用中间件
const middlewareHandler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'GET') {
    // GET 请求使用可选认证
    await new Promise<void>((resolve, reject) => {
      optionalAuthenticate(req as any, res, (error?: any) => {
        if (error) reject(error);
        else resolve();
      });
    });
  } else {
    // PATCH 请求需要认证
    await new Promise<void>((resolve, reject) => {
      authenticate(req as any, res, (error?: any) => {
        if (error) reject(error);
        else resolve();
      });
    });
  }

  await handler(req as AuthenticatedRequest, res);
};

export default errorHandler(middlewareHandler as any) as any;
