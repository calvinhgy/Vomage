/**
 * 认证和权限控制中间件
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { AuthService } from '@/services/auth';
import { UserDocument } from '@/models/User';

// 扩展 NextApiRequest 类型
export interface AuthenticatedRequest extends NextApiRequest {
  user?: UserDocument;
  userId?: string;
}

export type AuthMiddleware = (
  req: AuthenticatedRequest,
  res: NextApiResponse,
  next: () => void | Promise<void>
) => void | Promise<void>;

/**
 * 认证中间件 - 验证用户身份
 */
export const authenticate: AuthMiddleware = async (req, res, next) => {
  try {
    // 从请求头获取令牌
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: '缺少认证令牌',
        },
      });
    }

    const token = authHeader.substring(7); // 移除 "Bearer " 前缀

    // 验证令牌并获取用户信息
    const user = await AuthService.verifyToken(token);

    // 将用户信息添加到请求对象
    req.user = user;
    req.userId = user._id!.toString();

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: '认证失败',
      },
    });
  }
};

/**
 * 可选认证中间件 - 如果提供了令牌则验证，否则继续
 */
export const optionalAuthenticate: AuthMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      
      try {
        const user = await AuthService.verifyToken(token);
        req.user = user;
        req.userId = user._id!.toString();
      } catch (error) {
        // 令牌无效，但不阻止请求继续
        console.warn('Optional authentication failed:', error);
      }
    }

    next();
  } catch (error) {
    console.error('Optional authentication error:', error);
    next();
  }
};

/**
 * 访客用户中间件 - 为未认证用户创建临时访客身份
 */
export const guestAuthenticate: AuthMiddleware = async (req, res, next) => {
  try {
    // 首先尝试正常认证
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      
      try {
        const user = await AuthService.verifyToken(token);
        req.user = user;
        req.userId = user._id!.toString();
        return next();
      } catch (error) {
        console.warn('Guest authentication - token invalid:', error);
      }
    }

    // 如果没有有效令牌，创建访客用户
    const { user, tokens } = await AuthService.createGuestUser();
    req.user = user;
    req.userId = user._id!.toString();

    // 在响应头中返回访客令牌
    res.setHeader('X-Guest-Token', tokens.accessToken);
    res.setHeader('X-Guest-Refresh-Token', tokens.refreshToken);

    next();
  } catch (error) {
    console.error('Guest authentication error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '创建访客用户失败',
      },
    });
  }
};

/**
 * 权限检查中间件工厂
 */
export const requirePermission = (
  permission: string | string[] | ((user: UserDocument) => boolean)
): AuthMiddleware => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: '需要认证',
        },
      });
    }

    try {
      let hasPermission = false;

      if (typeof permission === 'function') {
        hasPermission = permission(req.user);
      } else if (typeof permission === 'string') {
        hasPermission = checkUserPermission(req.user, permission);
      } else if (Array.isArray(permission)) {
        hasPermission = permission.some(p => checkUserPermission(req.user!, p));
      }

      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: '权限不足',
          },
        });
      }

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '权限检查失败',
        },
      });
    }
  };
};

/**
 * 资源所有者检查中间件
 */
export const requireOwnership = (
  getResourceUserId: (req: AuthenticatedRequest) => string | Promise<string>
): AuthMiddleware => {
  return async (req, res, next) => {
    if (!req.user || !req.userId) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: '需要认证',
        },
      });
    }

    try {
      const resourceUserId = await getResourceUserId(req);
      
      if (req.userId !== resourceUserId) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: '只能访问自己的资源',
          },
        });
      }

      next();
    } catch (error) {
      console.error('Ownership check error:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '所有权检查失败',
        },
      });
    }
  };
};

/**
 * 速率限制中间件
 */
export const rateLimit = (
  maxRequests: number,
  windowMs: number,
  keyGenerator?: (req: AuthenticatedRequest) => string
): AuthMiddleware => {
  return async (req, res, next) => {
    try {
      // 生成限制键
      const key = keyGenerator 
        ? keyGenerator(req)
        : `rate_limit:${getClientIP(req)}:${req.url}`;

      // 获取当前请求计数
      const current = await incrementRateLimit(key, windowMs);

      // 检查是否超过限制
      if (current > maxRequests) {
        return res.status(429).json({
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: '请求过于频繁，请稍后再试',
          },
        });
      }

      // 设置响应头
      res.setHeader('X-RateLimit-Limit', maxRequests);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - current));
      res.setHeader('X-RateLimit-Reset', Date.now() + windowMs);

      next();
    } catch (error) {
      console.error('Rate limit error:', error);
      // 速率限制失败时不阻止请求
      next();
    }
  };
};

/**
 * 检查用户权限
 */
function checkUserPermission(user: UserDocument, permission: string): boolean {
  // 基础权限检查逻辑
  switch (permission) {
    case 'create_voice_record':
      return true; // 所有用户都可以创建语音记录
    
    case 'create_public_voice_record':
      return user.settings.privacyLevel === 'public';
    
    case 'generate_image':
      return true; // 所有用户都可以生成图片
    
    case 'admin':
      return (user as any).role === 'admin';
    
    case 'moderator':
      return ['admin', 'moderator'].includes((user as any).role);
    
    default:
      return false;
  }
}

/**
 * 获取客户端IP地址
 */
function getClientIP(req: NextApiRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  const ip = forwarded 
    ? (Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0])
    : req.socket.remoteAddress;
  
  return ip || 'unknown';
}

/**
 * 增加速率限制计数
 */
async function incrementRateLimit(key: string, windowMs: number): Promise<number> {
  try {
    const { cacheService } = await import('@/services/cache');
    
    // 获取当前计数
    const current = await cacheService.get<number>(key) || 0;
    const newCount = current + 1;
    
    // 设置新计数和过期时间
    await cacheService.set(key, newCount, Math.ceil(windowMs / 1000));
    
    return newCount;
  } catch (error) {
    console.error('Rate limit increment error:', error);
    return 1;
  }
}

/**
 * 中间件组合器
 */
export function combineMiddleware(...middlewares: AuthMiddleware[]): AuthMiddleware {
  return async (req, res, next) => {
    let index = 0;

    const runNext = async (): Promise<void> => {
      if (index >= middlewares.length) {
        return next();
      }

      const middleware = middlewares[index++];
      await middleware(req, res, runNext);
    };

    await runNext();
  };
}

/**
 * 错误处理中间件
 */
export const errorHandler: AuthMiddleware = async (req, res, next) => {
  try {
    await next();
  } catch (error) {
    console.error('Middleware error:', error);
    
    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '服务器内部错误',
        },
      });
    }
  }
};
