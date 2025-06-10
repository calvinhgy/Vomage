/**
 * 用户登录 API
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
    if (!username && !email) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '请提供用户名或邮箱',
        },
      });
    }

    // 登录用户
    const result = await AuthService.login({
      username: username?.trim(),
      email: email?.trim(),
      password,
    });

    // 返回成功响应
    res.status(200).json({
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
    console.error('Login API error:', error);
    
    const errorMessage = error instanceof Error ? error.message : '登录失败';
    
    // 根据错误类型返回不同的状态码
    let statusCode = 500;
    if (errorMessage.includes('不存在') || errorMessage.includes('密码错误')) {
      statusCode = 401; // Unauthorized
    } else if (errorMessage.includes('验证失败')) {
      statusCode = 400; // Bad Request
    }

    res.status(statusCode).json({
      success: false,
      error: {
        code: statusCode === 401 ? 'INVALID_CREDENTIALS' : 'LOGIN_ERROR',
        message: errorMessage,
      },
    });
  }
}

// 应用速率限制中间件
const rateLimitedHandler = async (req: NextApiRequest, res: NextApiResponse) => {
  const rateLimitMiddleware = rateLimit(10, 60 * 1000); // 每分钟最多10次登录请求
  
  await new Promise<void>((resolve, reject) => {
    rateLimitMiddleware(req as any, res, (error?: any) => {
      if (error) reject(error);
      else resolve();
    });
  });

  await handler(req, res);
};

export default errorHandler(rateLimitedHandler as any) as any;
