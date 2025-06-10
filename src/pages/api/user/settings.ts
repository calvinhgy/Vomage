/**
 * 用户设置 API
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { ObjectId } from 'mongodb';
import { authenticate, errorHandler, AuthenticatedRequest } from '@/middleware/auth';
import { connectDatabase, getUserCollection } from '@/services/database';
import { connectCache, cacheService, CacheKeys } from '@/services/cache';
import { UserModel } from '@/models/User';

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  // 只允许 GET 和 PATCH 请求
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
      // 获取用户设置
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

      return res.status(200).json({
        success: true,
        data: {
          settings: user.settings,
        },
      });
    }

    // PATCH 请求 - 更新设置
    const {
      theme,
      language,
      notifications,
      privacyLevel,
      imageStyle,
      ...otherSettings
    } = req.body;

    // 验证设置值
    const validationErrors: string[] = [];

    if (theme && !['light', 'dark', 'system'].includes(theme)) {
      validationErrors.push('无效的主题设置');
    }

    if (language && !/^[a-z]{2}-[A-Z]{2}$/.test(language)) {
      validationErrors.push('无效的语言设置');
    }

    if (notifications !== undefined && typeof notifications !== 'boolean') {
      validationErrors.push('通知设置必须是布尔值');
    }

    if (privacyLevel && !['public', 'private', 'friends'].includes(privacyLevel)) {
      validationErrors.push('无效的隐私级别设置');
    }

    if (imageStyle && !['abstract', 'realistic', 'artistic', 'minimalist', 'cartoon'].includes(imageStyle)) {
      validationErrors.push('无效的图片风格设置');
    }

    // 检查是否有未知的设置项
    const unknownSettings = Object.keys(otherSettings);
    if (unknownSettings.length > 0) {
      validationErrors.push(`未知的设置项: ${unknownSettings.join(', ')}`);
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

    // 构建更新数据
    const updateData: Partial<typeof user.settings> = {};

    if (theme) updateData.theme = theme;
    if (language) updateData.language = language;
    if (notifications !== undefined) updateData.notifications = notifications;
    if (privacyLevel) updateData.privacyLevel = privacyLevel;
    if (imageStyle) updateData.imageStyle = imageStyle;

    // 更新用户设置
    const updatedUser = UserModel.updateSettings(user, updateData);

    // 保存到数据库
    await userCollection.updateOne(
      { _id: new ObjectId(req.userId) },
      {
        $set: {
          settings: updatedUser.settings,
          updatedAt: updatedUser.updatedAt,
        },
      }
    );

    // 清除用户缓存
    await cacheService.delete(CacheKeys.user(req.userId));

    // 返回更新后的设置
    res.status(200).json({
      success: true,
      data: {
        settings: updatedUser.settings,
      },
    });
  } catch (error) {
    console.error('User settings API error:', error);
    
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '更新设置失败',
      },
    });
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

  await handler(req as AuthenticatedRequest, res);
};

export default errorHandler(authenticatedHandler as any) as any;
