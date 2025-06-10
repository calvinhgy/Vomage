/**
 * Redis 缓存服务
 */

import { createClient, RedisClientType } from 'redis';

class CacheService {
  private client: RedisClientType | null = null;
  private isConnected = false;

  /**
   * 连接 Redis
   */
  async connect(): Promise<void> {
    if (this.isConnected && this.client) {
      return;
    }

    try {
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
      
      this.client = createClient({
        url: redisUrl,
        socket: {
          connectTimeout: 5000,
          lazyConnect: true,
        },
      });

      this.client.on('error', (error) => {
        console.error('Redis Client Error:', error);
      });

      this.client.on('connect', () => {
        console.log('Connected to Redis');
      });

      this.client.on('disconnect', () => {
        console.log('Disconnected from Redis');
        this.isConnected = false;
      });

      await this.client.connect();
      this.isConnected = true;
    } catch (error) {
      console.error('Failed to connect to Redis:', error);
      throw error;
    }
  }

  /**
   * 断开 Redis 连接
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.client = null;
      this.isConnected = false;
    }
  }

  /**
   * 获取 Redis 客户端
   */
  getClient(): RedisClientType {
    if (!this.client || !this.isConnected) {
      throw new Error('Redis not connected');
    }
    return this.client;
  }

  /**
   * 设置缓存
   */
  async set(
    key: string, 
    value: any, 
    ttlSeconds?: number
  ): Promise<void> {
    try {
      const client = this.getClient();
      const serializedValue = JSON.stringify(value);
      
      if (ttlSeconds) {
        await client.setEx(key, ttlSeconds, serializedValue);
      } else {
        await client.set(key, serializedValue);
      }
    } catch (error) {
      console.error('Cache set error:', error);
      throw error;
    }
  }

  /**
   * 获取缓存
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const client = this.getClient();
      const value = await client.get(key);
      
      if (value === null) {
        return null;
      }
      
      return JSON.parse(value) as T;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  /**
   * 删除缓存
   */
  async delete(key: string): Promise<boolean> {
    try {
      const client = this.getClient();
      const result = await client.del(key);
      return result > 0;
    } catch (error) {
      console.error('Cache delete error:', error);
      return false;
    }
  }

  /**
   * 检查键是否存在
   */
  async exists(key: string): Promise<boolean> {
    try {
      const client = this.getClient();
      const result = await client.exists(key);
      return result > 0;
    } catch (error) {
      console.error('Cache exists error:', error);
      return false;
    }
  }

  /**
   * 设置过期时间
   */
  async expire(key: string, ttlSeconds: number): Promise<boolean> {
    try {
      const client = this.getClient();
      const result = await client.expire(key, ttlSeconds);
      return result;
    } catch (error) {
      console.error('Cache expire error:', error);
      return false;
    }
  }

  /**
   * 获取剩余过期时间
   */
  async ttl(key: string): Promise<number> {
    try {
      const client = this.getClient();
      return await client.ttl(key);
    } catch (error) {
      console.error('Cache TTL error:', error);
      return -1;
    }
  }

  /**
   * 批量设置
   */
  async mset(keyValuePairs: Record<string, any>, ttlSeconds?: number): Promise<void> {
    try {
      const client = this.getClient();
      const serializedPairs: string[] = [];
      
      for (const [key, value] of Object.entries(keyValuePairs)) {
        serializedPairs.push(key, JSON.stringify(value));
      }
      
      await client.mSet(serializedPairs);
      
      // 如果设置了TTL，为每个键设置过期时间
      if (ttlSeconds) {
        const promises = Object.keys(keyValuePairs).map(key => 
          client.expire(key, ttlSeconds)
        );
        await Promise.all(promises);
      }
    } catch (error) {
      console.error('Cache mset error:', error);
      throw error;
    }
  }

  /**
   * 批量获取
   */
  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    try {
      const client = this.getClient();
      const values = await client.mGet(keys);
      
      return values.map(value => {
        if (value === null) {
          return null;
        }
        try {
          return JSON.parse(value) as T;
        } catch {
          return null;
        }
      });
    } catch (error) {
      console.error('Cache mget error:', error);
      return keys.map(() => null);
    }
  }

  /**
   * 模糊匹配键
   */
  async keys(pattern: string): Promise<string[]> {
    try {
      const client = this.getClient();
      return await client.keys(pattern);
    } catch (error) {
      console.error('Cache keys error:', error);
      return [];
    }
  }

  /**
   * 清空匹配的键
   */
  async deletePattern(pattern: string): Promise<number> {
    try {
      const keys = await this.keys(pattern);
      if (keys.length === 0) {
        return 0;
      }
      
      const client = this.getClient();
      return await client.del(keys);
    } catch (error) {
      console.error('Cache delete pattern error:', error);
      return 0;
    }
  }

  /**
   * 增加数值
   */
  async increment(key: string, amount: number = 1): Promise<number> {
    try {
      const client = this.getClient();
      if (amount === 1) {
        return await client.incr(key);
      } else {
        return await client.incrBy(key, amount);
      }
    } catch (error) {
      console.error('Cache increment error:', error);
      throw error;
    }
  }

  /**
   * 减少数值
   */
  async decrement(key: string, amount: number = 1): Promise<number> {
    try {
      const client = this.getClient();
      if (amount === 1) {
        return await client.decr(key);
      } else {
        return await client.decrBy(key, amount);
      }
    } catch (error) {
      console.error('Cache decrement error:', error);
      throw error;
    }
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<{
    isConnected: boolean;
    latency?: number;
    error?: string;
  }> {
    try {
      if (!this.isConnected || !this.client) {
        return { isConnected: false, error: 'Not connected to Redis' };
      }

      const start = Date.now();
      await this.client.ping();
      const latency = Date.now() - start;

      return {
        isConnected: true,
        latency,
      };
    } catch (error) {
      return {
        isConnected: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * 获取缓存统计信息
   */
  async getStats(): Promise<{
    totalKeys: number;
    usedMemory?: string;
    connectedClients?: number;
  }> {
    try {
      const client = this.getClient();
      const info = await client.info();
      
      // 解析 Redis INFO 命令的输出
      const lines = info.split('\r\n');
      const stats: any = {};
      
      for (const line of lines) {
        if (line.includes(':')) {
          const [key, value] = line.split(':');
          stats[key] = value;
        }
      }

      const totalKeys = await client.dbSize();

      return {
        totalKeys,
        usedMemory: stats.used_memory_human,
        connectedClients: parseInt(stats.connected_clients) || 0,
      };
    } catch (error) {
      console.error('Failed to get cache stats:', error);
      throw error;
    }
  }
}

// 创建单例实例
export const cacheService = new CacheService();

// 导出便捷方法
export const connectCache = () => cacheService.connect();
export const disconnectCache = () => cacheService.disconnect();

// 缓存键生成器
export const CacheKeys = {
  user: (userId: string) => `user:${userId}`,
  userSession: (sessionId: string) => `session:${sessionId}`,
  voiceRecord: (recordId: string) => `voice:${recordId}`,
  generatedImage: (imageId: string) => `image:${imageId}`,
  userRecords: (userId: string, page: number) => `user:${userId}:records:${page}`,
  publicRecords: (page: number) => `public:records:${page}`,
  sentimentStats: (userId: string) => `sentiment:stats:${userId}`,
  rateLimit: (ip: string, endpoint: string) => `rate:${ip}:${endpoint}`,
  processingQueue: (taskId: string) => `queue:${taskId}`,
  weather: (lat: number, lon: number) => `weather:${lat.toFixed(2)}:${lon.toFixed(2)}`,
  location: (lat: number, lon: number) => `location:${lat.toFixed(2)}:${lon.toFixed(2)}`,
};

// 缓存TTL常量（秒）
export const CacheTTL = {
  SHORT: 5 * 60,        // 5分钟
  MEDIUM: 30 * 60,      // 30分钟
  LONG: 2 * 60 * 60,    // 2小时
  DAY: 24 * 60 * 60,    // 1天
  WEEK: 7 * 24 * 60 * 60, // 1周
};
