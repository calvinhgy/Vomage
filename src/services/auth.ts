/**
 * 用户认证服务
 */

import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { ObjectId } from 'mongodb';
import { UserDocument, UserModel } from '@/models/User';
import { getUserCollection } from '@/services/database';
import { cacheService, CacheKeys, CacheTTL } from '@/services/cache';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LoginCredentials {
  username?: string;
  email?: string;
  password?: string;
}

export interface RegisterData {
  username: string;
  email?: string;
  password?: string;
}

export interface TokenPayload {
  userId: string;
  username: string;
  type: 'access' | 'refresh';
  iat: number;
  exp: number;
}

export class AuthService {
  private static readonly JWT_SECRET = process.env.JWT_SECRET!;
  private static readonly REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET!;
  private static readonly ACCESS_TOKEN_EXPIRES_IN = '15m';
  private static readonly REFRESH_TOKEN_EXPIRES_IN = '7d';

  /**
   * 用户注册
   */
  static async register(userData: RegisterData): Promise<{
    user: UserDocument;
    tokens: AuthTokens;
  }> {
    try {
      const userCollection = getUserCollection();

      // 验证用户数据
      const validation = UserModel.validateUser(userData);
      if (!validation.isValid) {
        throw new Error(`注册数据验证失败: ${validation.errors.join(', ')}`);
      }

      // 检查用户名是否已存在
      const existingUser = await userCollection.findOne({
        username: userData.username
      });

      if (existingUser) {
        throw new Error('用户名已存在');
      }

      // 检查邮箱是否已存在
      if (userData.email) {
        const existingEmail = await userCollection.findOne({
          email: userData.email
        });

        if (existingEmail) {
          throw new Error('邮箱已被使用');
        }
      }

      // 创建新用户
      const newUser = UserModel.createUser({
        username: userData.username,
        email: userData.email,
      });

      // 如果提供了密码，进行哈希处理
      if (userData.password) {
        const hashedPassword = await bcrypt.hash(userData.password, 12);
        (newUser as any).password = hashedPassword;
      }

      // 保存用户到数据库
      const result = await userCollection.insertOne(newUser);
      newUser._id = result.insertedId;

      // 生成认证令牌
      const tokens = await this.generateTokens(newUser);

      // 缓存用户信息
      await this.cacheUserSession(newUser, tokens.accessToken);

      return {
        user: newUser,
        tokens,
      };
    } catch (error) {
      console.error('User registration error:', error);
      throw error;
    }
  }

  /**
   * 用户登录
   */
  static async login(credentials: LoginCredentials): Promise<{
    user: UserDocument;
    tokens: AuthTokens;
  }> {
    try {
      const userCollection = getUserCollection();

      // 构建查询条件
      const query: any = {};
      if (credentials.username) {
        query.username = credentials.username;
      } else if (credentials.email) {
        query.email = credentials.email;
      } else {
        throw new Error('请提供用户名或邮箱');
      }

      // 查找用户
      const user = await userCollection.findOne(query);
      if (!user) {
        throw new Error('用户不存在');
      }

      // 验证密码（如果提供了密码）
      if (credentials.password && (user as any).password) {
        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          (user as any).password
        );

        if (!isPasswordValid) {
          throw new Error('密码错误');
        }
      }

      // 更新最后活跃时间
      const updatedUser = UserModel.updateStats(user, {
        lastActive: new Date(),
      });

      await userCollection.updateOne(
        { _id: user._id },
        { $set: { 'stats.lastActive': updatedUser.stats.lastActive } }
      );

      // 生成认证令牌
      const tokens = await this.generateTokens(updatedUser);

      // 缓存用户会话
      await this.cacheUserSession(updatedUser, tokens.accessToken);

      return {
        user: updatedUser,
        tokens,
      };
    } catch (error) {
      console.error('User login error:', error);
      throw error;
    }
  }

  /**
   * 刷新访问令牌
   */
  static async refreshToken(refreshToken: string): Promise<AuthTokens> {
    try {
      // 验证刷新令牌
      const payload = jwt.verify(
        refreshToken,
        this.REFRESH_TOKEN_SECRET
      ) as TokenPayload;

      if (payload.type !== 'refresh') {
        throw new Error('无效的刷新令牌类型');
      }

      // 获取用户信息
      const userCollection = getUserCollection();
      const user = await userCollection.findOne({
        _id: new ObjectId(payload.userId)
      });

      if (!user) {
        throw new Error('用户不存在');
      }

      // 生成新的令牌
      const tokens = await this.generateTokens(user);

      // 更新缓存
      await this.cacheUserSession(user, tokens.accessToken);

      return tokens;
    } catch (error) {
      console.error('Token refresh error:', error);
      throw new Error('刷新令牌失败');
    }
  }

  /**
   * 用户登出
   */
  static async logout(accessToken: string): Promise<void> {
    try {
      // 验证访问令牌
      const payload = jwt.verify(accessToken, this.JWT_SECRET) as TokenPayload;

      // 从缓存中移除用户会话
      await cacheService.delete(CacheKeys.userSession(accessToken));
      await cacheService.delete(CacheKeys.user(payload.userId));

      // 将令牌加入黑名单
      await this.blacklistToken(accessToken, payload.exp);
    } catch (error) {
      console.error('User logout error:', error);
      // 登出失败不抛出错误，因为可能是令牌已过期
    }
  }

  /**
   * 验证访问令牌
   */
  static async verifyToken(token: string): Promise<UserDocument> {
    try {
      // 检查令牌是否在黑名单中
      const isBlacklisted = await this.isTokenBlacklisted(token);
      if (isBlacklisted) {
        throw new Error('令牌已失效');
      }

      // 验证令牌
      const payload = jwt.verify(token, this.JWT_SECRET) as TokenPayload;

      if (payload.type !== 'access') {
        throw new Error('无效的令牌类型');
      }

      // 尝试从缓存获取用户信息
      let user = await cacheService.get<UserDocument>(
        CacheKeys.user(payload.userId)
      );

      if (!user) {
        // 从数据库获取用户信息
        const userCollection = getUserCollection();
        user = await userCollection.findOne({
          _id: new ObjectId(payload.userId)
        });

        if (!user) {
          throw new Error('用户不存在');
        }

        // 缓存用户信息
        await cacheService.set(
          CacheKeys.user(payload.userId),
          user,
          CacheTTL.MEDIUM
        );
      }

      return user;
    } catch (error) {
      console.error('Token verification error:', error);
      throw new Error('令牌验证失败');
    }
  }

  /**
   * 生成认证令牌
   */
  private static async generateTokens(user: UserDocument): Promise<AuthTokens> {
    const userId = user._id!.toString();

    // 生成访问令牌
    const accessTokenPayload: Partial<TokenPayload> = {
      userId,
      username: user.username,
      type: 'access',
    };

    const accessToken = jwt.sign(
      accessTokenPayload,
      this.JWT_SECRET,
      { expiresIn: this.ACCESS_TOKEN_EXPIRES_IN }
    );

    // 生成刷新令牌
    const refreshTokenPayload: Partial<TokenPayload> = {
      userId,
      username: user.username,
      type: 'refresh',
    };

    const refreshToken = jwt.sign(
      refreshTokenPayload,
      this.REFRESH_TOKEN_SECRET,
      { expiresIn: this.REFRESH_TOKEN_EXPIRES_IN }
    );

    // 计算过期时间
    const decoded = jwt.decode(accessToken) as any;
    const expiresIn = decoded.exp - Math.floor(Date.now() / 1000);

    return {
      accessToken,
      refreshToken,
      expiresIn,
    };
  }

  /**
   * 缓存用户会话
   */
  private static async cacheUserSession(
    user: UserDocument,
    accessToken: string
  ): Promise<void> {
    try {
      // 缓存用户信息
      await cacheService.set(
        CacheKeys.user(user._id!.toString()),
        user,
        CacheTTL.MEDIUM
      );

      // 缓存会话信息
      await cacheService.set(
        CacheKeys.userSession(accessToken),
        {
          userId: user._id!.toString(),
          username: user.username,
          loginTime: new Date(),
        },
        CacheTTL.MEDIUM
      );
    } catch (error) {
      console.warn('Failed to cache user session:', error);
    }
  }

  /**
   * 将令牌加入黑名单
   */
  private static async blacklistToken(token: string, exp: number): Promise<void> {
    try {
      const ttl = exp - Math.floor(Date.now() / 1000);
      if (ttl > 0) {
        await cacheService.set(`blacklist:${token}`, true, ttl);
      }
    } catch (error) {
      console.warn('Failed to blacklist token:', error);
    }
  }

  /**
   * 检查令牌是否在黑名单中
   */
  private static async isTokenBlacklisted(token: string): Promise<boolean> {
    try {
      return await cacheService.exists(`blacklist:${token}`);
    } catch (error) {
      console.warn('Failed to check token blacklist:', error);
      return false;
    }
  }

  /**
   * 生成临时访客用户
   */
  static async createGuestUser(): Promise<{
    user: UserDocument;
    tokens: AuthTokens;
  }> {
    try {
      const guestUsername = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const guestUser = UserModel.createUser({
        username: guestUsername,
        settings: {
          theme: 'system',
          language: 'zh-CN',
          notifications: false,
          privacyLevel: 'private',
          imageStyle: 'abstract',
        },
      });

      // 标记为访客用户
      (guestUser as any).isGuest = true;

      // 保存到数据库
      const userCollection = getUserCollection();
      const result = await userCollection.insertOne(guestUser);
      guestUser._id = result.insertedId;

      // 生成令牌
      const tokens = await this.generateTokens(guestUser);

      // 缓存会话
      await this.cacheUserSession(guestUser, tokens.accessToken);

      return {
        user: guestUser,
        tokens,
      };
    } catch (error) {
      console.error('Create guest user error:', error);
      throw new Error('创建访客用户失败');
    }
  }

  /**
   * 将访客用户转换为正式用户
   */
  static async convertGuestToUser(
    guestUserId: string,
    userData: RegisterData
  ): Promise<UserDocument> {
    try {
      const userCollection = getUserCollection();

      // 验证用户数据
      const validation = UserModel.validateUser(userData);
      if (!validation.isValid) {
        throw new Error(`用户数据验证失败: ${validation.errors.join(', ')}`);
      }

      // 检查用户名是否已存在
      const existingUser = await userCollection.findOne({
        username: userData.username,
        _id: { $ne: new ObjectId(guestUserId) }
      });

      if (existingUser) {
        throw new Error('用户名已存在');
      }

      // 更新访客用户信息
      const updateData: any = {
        username: userData.username,
        email: userData.email,
        updatedAt: new Date(),
      };

      // 移除访客标记
      updateData.$unset = { isGuest: 1 };

      // 如果提供了密码，进行哈希处理
      if (userData.password) {
        updateData.password = await bcrypt.hash(userData.password, 12);
      }

      const result = await userCollection.findOneAndUpdate(
        { _id: new ObjectId(guestUserId) },
        { $set: updateData, $unset: updateData.$unset },
        { returnDocument: 'after' }
      );

      if (!result.value) {
        throw new Error('用户不存在');
      }

      // 清除缓存
      await cacheService.delete(CacheKeys.user(guestUserId));

      return result.value;
    } catch (error) {
      console.error('Convert guest to user error:', error);
      throw error;
    }
  }

  /**
   * 获取用户会话信息
   */
  static async getSessionInfo(token: string): Promise<{
    userId: string;
    username: string;
    loginTime: Date;
    isActive: boolean;
  } | null> {
    try {
      const sessionInfo = await cacheService.get<{
        userId: string;
        username: string;
        loginTime: Date;
      }>(CacheKeys.userSession(token));

      if (!sessionInfo) {
        return null;
      }

      return {
        ...sessionInfo,
        isActive: true,
      };
    } catch (error) {
      console.warn('Get session info error:', error);
      return null;
    }
  }

  /**
   * 清理过期会话
   */
  static async cleanupExpiredSessions(): Promise<number> {
    try {
      // 获取所有会话键
      const sessionKeys = await cacheService.keys('session:*');
      let cleanedCount = 0;

      for (const key of sessionKeys) {
        const ttl = await cacheService.ttl(key);
        if (ttl <= 0) {
          await cacheService.delete(key);
          cleanedCount++;
        }
      }

      return cleanedCount;
    } catch (error) {
      console.error('Cleanup expired sessions error:', error);
      return 0;
    }
  }
}
