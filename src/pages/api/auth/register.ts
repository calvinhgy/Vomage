/**
 * 用户注册 API
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { AuthService } from '@/services/auth';
import { connectDatabase } from '@/services/database';
import { connectCache } from '@/services/cache';
import { rateLimit, errorHandler } from '@/middleware/auth';

async function handler(req: NextApiRequest, res: NextApiResponse) {
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

    const { username, email, password } = req.body;

    // 验证请求数据
    if (!username || username.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '用户名不能为空',
        },
      });
    }

    if (username.length < 2 || username.length > 50) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '用户名长度必须在2-50个字符之间',
        },
      });
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '邮箱格式不正确',
        },
      });
    }

    if (password && password.length < 6) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '密码长度至少6个字符',
        },
      });
    }

    // 注册用户
    const result = await AuthService.register({
      username: username.trim(),
      email: email?.trim(),
      password,
    });

    // 返回成功响应
    res.status(201).json({
      success: true,
      data: {
        user: {
          id: result.user._id?.toString(),
          username: result.user.username,
          email: result.user.email,
          settings: result.user.settings,
          stats: result.user.stats,
          createdAt: result.user.createdAt,
        },
        tokens: result.tokens,
      },
    });
  } catch (error) {
    console.error('Register API error:', error);
    
    const errorMessage = error instanceof Error ? error.message : '注册失败';
    
    // 根据错误类型返回不同的状态码
    let statusCode = 500;
    if (errorMessage.includes('已存在') || errorMessage.includes('已被使用')) {
      statusCode = 409; // Conflict
    } else if (errorMessage.includes('验证失败')) {
      statusCode = 400; // Bad Request
    }

    res.status(statusCode).json({
      success: false,
      error: {
        code: statusCode === 409 ? 'CONFLICT' : 'REGISTRATION_ERROR',
        message: errorMessage,
      },
    });
  }
}

// 应用速率限制中间件
const rateLimitedHandler = async (req: NextApiRequest, res: NextApiResponse) => {
  const rateLimitMiddleware = rateLimit(5, 60 * 1000); // 每分钟最多5次注册请求
  
  await new Promise<void>((resolve, reject) => {
    rateLimitMiddleware(req as any, res, (error?: any) => {
      if (error) reject(error);
      else resolve();
    });
  });

  await handler(req, res);
};

export default errorHandler(rateLimitedHandler as any) as any;
