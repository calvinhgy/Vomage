/**
 * 认证中间件 (简化版本)
 */

import { NextApiRequest, NextApiResponse } from 'next';

export interface AuthenticatedRequest extends NextApiRequest {
  userId?: string;
  user?: {
    id: string;
    username: string;
    settings: {
      privacyLevel: 'public' | 'private' | 'friends';
    };
  };
}

/**
 * 简化的认证中间件
 * 目前为所有请求分配一个临时用户ID
 */
export function authenticate(
  req: AuthenticatedRequest,
  res: NextApiResponse,
  next: (error?: any) => void
): void {
  try {
    // 生成或获取临时用户ID
    const tempUserId = req.headers['x-temp-user-id'] as string || 'temp-user-' + Date.now();
    
    req.userId = tempUserId;
    req.user = {
      id: tempUserId,
      username: 'Anonymous User',
      settings: {
        privacyLevel: 'public'
      }
    };

    console.log('认证成功，用户ID:', req.userId);
    next();
  } catch (error) {
    console.error('认证失败:', error);
    next(error);
  }
}

/**
 * 速率限制中间件
 */
export function rateLimit(maxRequests: number, windowMs: number) {
  const requests = new Map<string, number[]>();

  return (req: NextApiRequest, res: NextApiResponse, next: (error?: any) => void) => {
    const clientId = req.headers['x-forwarded-for'] as string || 
                    req.connection.remoteAddress || 
                    'unknown';
    
    const now = Date.now();
    const windowStart = now - windowMs;
    
    // 获取客户端的请求记录
    const clientRequests = requests.get(clientId) || [];
    
    // 清理过期的请求记录
    const validRequests = clientRequests.filter(time => time > windowStart);
    
    if (validRequests.length >= maxRequests) {
      return res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: '请求过于频繁，请稍后再试'
        }
      });
    }
    
    // 记录当前请求
    validRequests.push(now);
    requests.set(clientId, validRequests);
    
    next();
  };
}

/**
 * 错误处理中间件
 */
export function errorHandler(handler: Function) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      await handler(req, res);
    } catch (error) {
      console.error('API错误:', error);
      
      if (res.headersSent) {
        return;
      }
      
      const errorMessage = error instanceof Error ? error.message : '服务器内部错误';
      
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: errorMessage
        }
      });
    }
  };
}
