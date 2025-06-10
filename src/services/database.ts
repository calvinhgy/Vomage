/**
 * 数据库连接和操作服务
 */

import { MongoClient, Db, Collection, ObjectId } from 'mongodb';
import { UserDocument } from '@/models/User';
import { VoiceRecordDocument } from '@/models/VoiceRecord';
import { GeneratedImageDocument } from '@/models/GeneratedImage';

class DatabaseService {
  private client: MongoClient | null = null;
  private db: Db | null = null;
  private isConnected = false;

  /**
   * 连接数据库
   */
  async connect(): Promise<void> {
    if (this.isConnected && this.client) {
      return;
    }

    try {
      const uri = process.env.MONGODB_URI;
      if (!uri) {
        throw new Error('MONGODB_URI environment variable is not set');
      }

      this.client = new MongoClient(uri, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      });

      await this.client.connect();
      this.db = this.client.db();
      this.isConnected = true;

      console.log('Connected to MongoDB');

      // 创建索引
      await this.createIndexes();
    } catch (error) {
      console.error('Failed to connect to MongoDB:', error);
      throw error;
    }
  }

  /**
   * 断开数据库连接
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.db = null;
      this.isConnected = false;
      console.log('Disconnected from MongoDB');
    }
  }

  /**
   * 获取数据库实例
   */
  getDb(): Db {
    if (!this.db) {
      throw new Error('Database not connected');
    }
    return this.db;
  }

  /**
   * 获取用户集合
   */
  getUserCollection(): Collection<UserDocument> {
    return this.getDb().collection<UserDocument>('users');
  }

  /**
   * 获取语音记录集合
   */
  getVoiceRecordCollection(): Collection<VoiceRecordDocument> {
    return this.getDb().collection<VoiceRecordDocument>('voiceRecords');
  }

  /**
   * 获取生成图片集合
   */
  getGeneratedImageCollection(): Collection<GeneratedImageDocument> {
    return this.getDb().collection<GeneratedImageDocument>('generatedImages');
  }

  /**
   * 创建数据库索引
   */
  private async createIndexes(): Promise<void> {
    try {
      const usersCollection = this.getUserCollection();
      const voiceRecordsCollection = this.getVoiceRecordCollection();
      const imagesCollection = this.getGeneratedImageCollection();

      // 用户索引
      await usersCollection.createIndex({ username: 1 }, { unique: true });
      await usersCollection.createIndex({ email: 1 }, { unique: true, sparse: true });
      await usersCollection.createIndex({ 'stats.lastActive': -1 });

      // 语音记录索引
      await voiceRecordsCollection.createIndex({ userId: 1 });
      await voiceRecordsCollection.createIndex({ createdAt: -1 });
      await voiceRecordsCollection.createIndex({ processingStatus: 1 });
      await voiceRecordsCollection.createIndex({ privacy: 1 });
      await voiceRecordsCollection.createIndex({ 'sentiment.mood': 1 });
      await voiceRecordsCollection.createIndex({ tags: 1 });
      
      // 复合索引
      await voiceRecordsCollection.createIndex({ 
        userId: 1, 
        createdAt: -1 
      });
      await voiceRecordsCollection.createIndex({ 
        privacy: 1, 
        createdAt: -1 
      });

      // 生成图片索引
      await imagesCollection.createIndex({ userId: 1 });
      await imagesCollection.createIndex({ voiceRecordId: 1 });
      await imagesCollection.createIndex({ createdAt: -1 });
      await imagesCollection.createIndex({ style: 1 });
      await imagesCollection.createIndex({ privacy: 1 });
      await imagesCollection.createIndex({ tags: 1 });

      // 复合索引
      await imagesCollection.createIndex({ 
        userId: 1, 
        createdAt: -1 
      });
      await imagesCollection.createIndex({ 
        privacy: 1, 
        createdAt: -1 
      });

      console.log('Database indexes created successfully');
    } catch (error) {
      console.error('Failed to create database indexes:', error);
    }
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<{
    isConnected: boolean;
    dbName?: string;
    collections?: string[];
    error?: string;
  }> {
    try {
      if (!this.isConnected || !this.db) {
        return { isConnected: false, error: 'Not connected to database' };
      }

      // 执行简单的数据库操作来验证连接
      const adminDb = this.db.admin();
      await adminDb.ping();

      const collections = await this.db.listCollections().toArray();
      const collectionNames = collections.map(col => col.name);

      return {
        isConnected: true,
        dbName: this.db.databaseName,
        collections: collectionNames,
      };
    } catch (error) {
      return {
        isConnected: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * 获取数据库统计信息
   */
  async getStats(): Promise<{
    totalUsers: number;
    totalVoiceRecords: number;
    totalImages: number;
    dbSize?: number;
  }> {
    try {
      const [totalUsers, totalVoiceRecords, totalImages] = await Promise.all([
        this.getUserCollection().countDocuments(),
        this.getVoiceRecordCollection().countDocuments(),
        this.getGeneratedImageCollection().countDocuments(),
      ]);

      // 获取数据库大小（可选）
      let dbSize: number | undefined;
      try {
        const stats = await this.getDb().stats();
        dbSize = stats.dataSize;
      } catch (error) {
        console.warn('Failed to get database size:', error);
      }

      return {
        totalUsers,
        totalVoiceRecords,
        totalImages,
        dbSize,
      };
    } catch (error) {
      console.error('Failed to get database stats:', error);
      throw error;
    }
  }

  /**
   * 清理过期数据
   */
  async cleanupExpiredData(): Promise<{
    deletedRecords: number;
    deletedImages: number;
  }> {
    try {
      // 删除30天前的失败处理记录
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const deletedRecordsResult = await this.getVoiceRecordCollection().deleteMany({
        processingStatus: 'failed',
        updatedAt: { $lt: thirtyDaysAgo },
      });

      const deletedImagesResult = await this.getGeneratedImageCollection().deleteMany({
        optimizationStatus: 'failed',
        updatedAt: { $lt: thirtyDaysAgo },
      });

      return {
        deletedRecords: deletedRecordsResult.deletedCount || 0,
        deletedImages: deletedImagesResult.deletedCount || 0,
      };
    } catch (error) {
      console.error('Failed to cleanup expired data:', error);
      throw error;
    }
  }

  /**
   * 备份数据库
   */
  async backup(): Promise<{
    success: boolean;
    backupPath?: string;
    error?: string;
  }> {
    try {
      // 这里应该实现实际的备份逻辑
      // 可以使用 mongodump 或其他备份工具
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = `/backups/vomage-backup-${timestamp}`;
      
      // 模拟备份过程
      console.log(`Creating backup at ${backupPath}`);
      
      return {
        success: true,
        backupPath,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * 事务处理
   */
  async withTransaction<T>(
    operation: (session: any) => Promise<T>
  ): Promise<T> {
    if (!this.client) {
      throw new Error('Database not connected');
    }

    const session = this.client.startSession();
    
    try {
      let result: T;
      
      await session.withTransaction(async () => {
        result = await operation(session);
      });

      return result!;
    } finally {
      await session.endSession();
    }
  }
}

// 创建单例实例
export const databaseService = new DatabaseService();

// 导出便捷方法
export const connectDatabase = () => databaseService.connect();
export const disconnectDatabase = () => databaseService.disconnect();
export const getDatabase = () => databaseService.getDb();
export const getUserCollection = () => databaseService.getUserCollection();
export const getVoiceRecordCollection = () => databaseService.getVoiceRecordCollection();
export const getGeneratedImageCollection = () => databaseService.getGeneratedImageCollection();
