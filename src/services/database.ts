/**
 * 数据库服务 (简化版本)
 * 使用内存存储，后续可以集成MongoDB
 */

import { ObjectId } from 'mongodb';

// 内存存储
const memoryStore = {
  voiceRecords: new Map(),
  users: new Map(),
  generatedImages: new Map()
};

export interface VoiceRecord {
  _id: ObjectId;
  userId: ObjectId;
  audioUrl: string;
  audioSize: number;
  duration: number;
  mimeType: string;
  transcript?: string;
  sentiment?: any;
  context?: any;
  privacy: string;
  processingStatus: string;
  isProcessed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 连接数据库（模拟）
 */
export async function connectDatabase(): Promise<void> {
  console.log('数据库连接成功（内存模式）');
}

/**
 * 获取语音记录集合
 */
export function getVoiceRecordCollection() {
  return {
    async insertOne(doc: any) {
      const id = new ObjectId();
      doc._id = id;
      memoryStore.voiceRecords.set(id.toString(), doc);
      console.log('插入语音记录:', id.toString());
      return { insertedId: id };
    },

    async updateOne(filter: any, update: any) {
      const id = filter._id.toString();
      const existing = memoryStore.voiceRecords.get(id);
      if (existing) {
        const updated = { ...existing, ...update.$set };
        memoryStore.voiceRecords.set(id, updated);
        console.log('更新语音记录:', id);
        return { modifiedCount: 1 };
      }
      return { modifiedCount: 0 };
    },

    async findOne(filter: any) {
      const id = filter._id.toString();
      const record = memoryStore.voiceRecords.get(id);
      console.log('查询语音记录:', id, record ? '找到' : '未找到');
      return record || null;
    },

    async find(filter: any = {}) {
      const records = Array.from(memoryStore.voiceRecords.values());
      console.log('查询所有语音记录，共', records.length, '条');
      return {
        toArray: async () => records,
        limit: (n: number) => ({
          toArray: async () => records.slice(0, n)
        }),
        sort: (sort: any) => ({
          toArray: async () => records,
          limit: (n: number) => ({
            toArray: async () => records.slice(0, n)
          })
        })
      };
    }
  };
}

/**
 * 获取用户集合
 */
export function getUserCollection() {
  return {
    async insertOne(doc: any) {
      const id = new ObjectId();
      doc._id = id;
      memoryStore.users.set(id.toString(), doc);
      console.log('插入用户:', id.toString());
      return { insertedId: id };
    },

    async findOne(filter: any) {
      // 简化实现，返回默认用户
      return {
        _id: new ObjectId(),
        username: 'Anonymous User',
        settings: { privacyLevel: 'public' },
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };
    }
  };
}

/**
 * 获取生成图片集合
 */
export function getGeneratedImageCollection() {
  return {
    async insertOne(doc: any) {
      const id = new ObjectId();
      doc._id = id;
      memoryStore.generatedImages.set(id.toString(), doc);
      console.log('插入生成图片:', id.toString());
      return { insertedId: id };
    },

    async findOne(filter: any) {
      const id = filter._id?.toString() || filter.voiceRecordId?.toString();
      const image = memoryStore.generatedImages.get(id);
      console.log('查询生成图片:', id, image ? '找到' : '未找到');
      return image || null;
    }
  };
}

/**
 * 关闭数据库连接
 */
export async function closeDatabaseConnection(): Promise<void> {
  console.log('数据库连接已关闭（内存模式）');
}

/**
 * 检查数据库连接状态
 */
export function isDatabaseConnected(): boolean {
  return true; // 内存模式总是连接的
}

/**
 * 获取数据库状态
 */
export function getDatabaseStatus() {
  return {
    connected: true,
    type: 'memory',
    recordsCount: memoryStore.voiceRecords.size,
    usersCount: memoryStore.users.size,
    imagesCount: memoryStore.generatedImages.size
  };
}
