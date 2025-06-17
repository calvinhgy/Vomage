/**
 * 语音记录数据模型
 */

import { ObjectId } from 'mongodb';
import { SentimentAnalysis, Context, Mood } from '@/types';

export interface VoiceRecordDocument {
  _id?: ObjectId;
  userId: string; // 改为字符串类型以支持临时用户ID
  audioUrl: string;
  audioSize: number;
  duration: number;
  transcript?: string;
  transcriptConfidence?: number;
  sentiment?: SentimentAnalysisDocument;
  context?: ContextDocument;
  generatedImages: ObjectId[];
  metadata: {
    mimeType: string;
    sampleRate?: number;
    channels?: number;
    bitrate?: number;
  };
  privacy: 'public' | 'private' | 'friends';
  tags: string[];
  likes: number;
  shares: number;
  comments: number;
  isProcessed: boolean;
  processingStatus: 'pending' | 'processing' | 'completed' | 'failed';
  processingError?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SentimentAnalysisDocument {
  mood: Mood;
  confidence: number;
  details: {
    positive: number;
    negative: number;
    neutral: number;
  };
  keywords: string[];
  reasoning?: string;
  processedAt: Date;
}

export interface ContextDocument {
  location?: {
    latitude: number;
    longitude: number;
    city?: string;
    country?: string;
    region?: string;
  };
  weather?: {
    temperature: number;
    condition: string;
    humidity: number;
    windSpeed?: number;
    pressure?: number;
  };
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  timezone: string;
  season: string;
  dayOfWeek: string;
  recordedAt: Date;
}

export class VoiceRecordModel {
  /**
   * 创建新的语音记录
   */
  static createVoiceRecord(data: {
    userId: ObjectId;
    audioUrl: string;
    audioSize: number;
    duration: number;
    mimeType: string;
    context?: Context;
    privacy?: 'public' | 'private' | 'friends';
  }): VoiceRecordDocument {
    const now = new Date();

    return {
      userId: data.userId,
      audioUrl: data.audioUrl,
      audioSize: data.audioSize,
      duration: data.duration,
      metadata: {
        mimeType: data.mimeType,
      },
      context: data.context ? this.convertContext(data.context) : undefined,
      generatedImages: [],
      privacy: data.privacy || 'public',
      tags: [],
      likes: 0,
      shares: 0,
      comments: 0,
      isProcessed: false,
      processingStatus: 'pending',
      createdAt: now,
      updatedAt: now,
    };
  }

  /**
   * 更新转录结果
   */
  static updateTranscript(
    record: VoiceRecordDocument,
    transcript: string,
    confidence: number
  ): VoiceRecordDocument {
    return {
      ...record,
      transcript,
      transcriptConfidence: confidence,
      updatedAt: new Date(),
    };
  }

  /**
   * 更新情感分析结果
   */
  static updateSentiment(
    record: VoiceRecordDocument,
    sentiment: SentimentAnalysis
  ): VoiceRecordDocument {
    const sentimentDoc: SentimentAnalysisDocument = {
      mood: sentiment.mood,
      confidence: sentiment.confidence,
      details: sentiment.details,
      keywords: [],
      processedAt: new Date(),
    };

    return {
      ...record,
      sentiment: sentimentDoc,
      updatedAt: new Date(),
    };
  }

  /**
   * 更新处理状态
   */
  static updateProcessingStatus(
    record: VoiceRecordDocument,
    status: VoiceRecordDocument['processingStatus'],
    error?: string
  ): VoiceRecordDocument {
    return {
      ...record,
      processingStatus: status,
      processingError: error,
      isProcessed: status === 'completed',
      updatedAt: new Date(),
    };
  }

  /**
   * 添加生成的图片
   */
  static addGeneratedImage(
    record: VoiceRecordDocument,
    imageId: ObjectId
  ): VoiceRecordDocument {
    return {
      ...record,
      generatedImages: [...record.generatedImages, imageId],
      updatedAt: new Date(),
    };
  }

  /**
   * 更新社交统计
   */
  static updateSocialStats(
    record: VoiceRecordDocument,
    updates: {
      likes?: number;
      shares?: number;
      comments?: number;
    }
  ): VoiceRecordDocument {
    return {
      ...record,
      likes: updates.likes ?? record.likes,
      shares: updates.shares ?? record.shares,
      comments: updates.comments ?? record.comments,
      updatedAt: new Date(),
    };
  }

  /**
   * 添加标签
   */
  static addTags(
    record: VoiceRecordDocument,
    tags: string[]
  ): VoiceRecordDocument {
    const uniqueTags = Array.from(new Set([...record.tags, ...tags]));
    
    return {
      ...record,
      tags: uniqueTags,
      updatedAt: new Date(),
    };
  }

  /**
   * 转换上下文数据
   */
  private static convertContext(context: Context): ContextDocument {
    const now = new Date();
    
    return {
      location: context.location,
      weather: context.weather,
      timeOfDay: context.timeOfDay,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      season: this.getSeason(now),
      dayOfWeek: this.getDayOfWeek(now),
      recordedAt: now,
    };
  }

  /**
   * 获取季节
   */
  private static getSeason(date: Date): string {
    const month = date.getMonth() + 1;
    if (month >= 3 && month <= 5) return '春季';
    if (month >= 6 && month <= 8) return '夏季';
    if (month >= 9 && month <= 11) return '秋季';
    return '冬季';
  }

  /**
   * 获取星期
   */
  private static getDayOfWeek(date: Date): string {
    const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    return days[date.getDay()];
  }

  /**
   * 验证语音记录数据
   */
  static validateVoiceRecord(data: Partial<VoiceRecordDocument>): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // 验证必需字段
    if (!data.userId) {
      errors.push('用户ID不能为空');
    }

    if (!data.audioUrl) {
      errors.push('音频URL不能为空');
    }

    if (!data.duration || data.duration <= 0) {
      errors.push('音频时长必须大于0');
    }

    if (!data.audioSize || data.audioSize <= 0) {
      errors.push('音频文件大小必须大于0');
    }

    // 验证时长限制
    if (data.duration && data.duration > 300) { // 5分钟
      errors.push('音频时长不能超过5分钟');
    }

    // 验证文件大小限制
    if (data.audioSize && data.audioSize > 25 * 1024 * 1024) { // 25MB
      errors.push('音频文件大小不能超过25MB');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * 转换为公开格式
   */
  static toPublicFormat(record: VoiceRecordDocument): any {
    return {
      id: record._id?.toString(),
      userId: record.userId.toString(),
      audioUrl: record.audioUrl,
      duration: record.duration,
      transcript: record.transcript,
      sentiment: record.sentiment,
      context: record.context,
      generatedImages: record.generatedImages.map(id => id.toString()),
      privacy: record.privacy,
      tags: record.tags,
      likes: record.likes,
      shares: record.shares,
      comments: record.comments,
      isProcessed: record.isProcessed,
      createdAt: record.createdAt,
    };
  }

  /**
   * 获取搜索索引字段
   */
  static getSearchableText(record: VoiceRecordDocument): string {
    const parts: string[] = [];

    if (record.transcript) {
      parts.push(record.transcript);
    }

    if (record.sentiment?.keywords) {
      parts.push(...record.sentiment.keywords);
    }

    if (record.tags) {
      parts.push(...record.tags);
    }

    if (record.context?.location?.city) {
      parts.push(record.context.location.city);
    }

    return parts.join(' ').toLowerCase();
  }
}
