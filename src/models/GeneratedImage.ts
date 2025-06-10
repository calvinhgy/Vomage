/**
 * 生成图片数据模型
 */

import { ObjectId } from 'mongodb';
import { ImageStyle } from '@/types';

export interface GeneratedImageDocument {
  _id?: ObjectId;
  userId: ObjectId;
  voiceRecordId: ObjectId;
  url: string;
  thumbnailUrl?: string;
  prompt: string;
  style: ImageStyle;
  metadata: {
    width: number;
    height: number;
    format: string;
    size: number;
    seed?: number;
    model?: string;
  };
  privacy: 'public' | 'private' | 'friends';
  tags: string[];
  likes: number;
  shares: number;
  comments: number;
  isOptimized: boolean;
  optimizationStatus: 'pending' | 'processing' | 'completed' | 'failed';
  optimizationError?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class GeneratedImageModel {
  /**
   * 创建新的生成图片记录
   */
  static createGeneratedImage(data: {
    userId: ObjectId;
    voiceRecordId: ObjectId;
    url: string;
    prompt: string;
    style: ImageStyle;
    metadata: {
      width: number;
      height: number;
      format: string;
      size: number;
      seed?: number;
      model?: string;
    };
    privacy?: 'public' | 'private' | 'friends';
  }): GeneratedImageDocument {
    const now = new Date();

    return {
      userId: data.userId,
      voiceRecordId: data.voiceRecordId,
      url: data.url,
      prompt: data.prompt,
      style: data.style,
      metadata: data.metadata,
      privacy: data.privacy || 'public',
      tags: [],
      likes: 0,
      shares: 0,
      comments: 0,
      isOptimized: false,
      optimizationStatus: 'pending',
      createdAt: now,
      updatedAt: now,
    };
  }

  /**
   * 更新优化状态
   */
  static updateOptimizationStatus(
    image: GeneratedImageDocument,
    status: GeneratedImageDocument['optimizationStatus'],
    error?: string
  ): GeneratedImageDocument {
    return {
      ...image,
      optimizationStatus: status,
      optimizationError: error,
      isOptimized: status === 'completed',
      updatedAt: new Date(),
    };
  }

  /**
   * 更新缩略图
   */
  static updateThumbnail(
    image: GeneratedImageDocument,
    thumbnailUrl: string
  ): GeneratedImageDocument {
    return {
      ...image,
      thumbnailUrl,
      updatedAt: new Date(),
    };
  }

  /**
   * 更新社交统计
   */
  static updateSocialStats(
    image: GeneratedImageDocument,
    updates: {
      likes?: number;
      shares?: number;
      comments?: number;
    }
  ): GeneratedImageDocument {
    return {
      ...image,
      likes: updates.likes ?? image.likes,
      shares: updates.shares ?? image.shares,
      comments: updates.comments ?? image.comments,
      updatedAt: new Date(),
    };
  }

  /**
   * 添加标签
   */
  static addTags(
    image: GeneratedImageDocument,
    tags: string[]
  ): GeneratedImageDocument {
    const uniqueTags = Array.from(new Set([...image.tags, ...tags]));
    
    return {
      ...image,
      tags: uniqueTags,
      updatedAt: new Date(),
    };
  }

  /**
   * 验证图片数据
   */
  static validateGeneratedImage(data: Partial<GeneratedImageDocument>): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // 验证必需字段
    if (!data.userId) {
      errors.push('用户ID不能为空');
    }

    if (!data.voiceRecordId) {
      errors.push('语音记录ID不能为空');
    }

    if (!data.url) {
      errors.push('图片URL不能为空');
    }

    if (!data.prompt) {
      errors.push('生成提示词不能为空');
    }

    if (!data.style) {
      errors.push('图片风格不能为空');
    }

    // 验证元数据
    if (data.metadata) {
      if (!data.metadata.width || !data.metadata.height) {
        errors.push('图片尺寸信息不完整');
      }

      if (!data.metadata.format) {
        errors.push('图片格式信息不能为空');
      }

      if (!data.metadata.size || data.metadata.size <= 0) {
        errors.push('图片大小必须大于0');
      }
    } else {
      errors.push('图片元数据不能为空');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * 转换为公开格式
   */
  static toPublicFormat(image: GeneratedImageDocument): any {
    return {
      id: image._id?.toString(),
      userId: image.userId.toString(),
      voiceRecordId: image.voiceRecordId.toString(),
      url: image.url,
      thumbnailUrl: image.thumbnailUrl,
      prompt: image.prompt,
      style: image.style,
      metadata: {
        width: image.metadata.width,
        height: image.metadata.height,
        format: image.metadata.format,
      },
      privacy: image.privacy,
      tags: image.tags,
      likes: image.likes,
      shares: image.shares,
      comments: image.comments,
      isOptimized: image.isOptimized,
      createdAt: image.createdAt,
    };
  }

  /**
   * 获取图片尺寸描述
   */
  static getSizeDescription(image: GeneratedImageDocument): string {
    const { width, height } = image.metadata;
    const aspectRatio = width / height;
    
    if (aspectRatio === 1) {
      return '正方形';
    } else if (aspectRatio > 1) {
      return '横向';
    } else {
      return '纵向';
    }
  }

  /**
   * 获取图片大小描述
   */
  static getFileSizeDescription(size: number): string {
    if (size < 1024) {
      return `${size}B`;
    } else if (size < 1024 * 1024) {
      return `${(size / 1024).toFixed(1)}KB`;
    } else {
      return `${(size / (1024 * 1024)).toFixed(1)}MB`;
    }
  }

  /**
   * 获取支持的图片格式
   */
  static getSupportedFormats(): string[] {
    return ['png', 'jpg', 'jpeg', 'webp'];
  }

  /**
   * 获取支持的图片尺寸
   */
  static getSupportedSizes(): Array<{ width: number; height: number; label: string }> {
    return [
      { width: 512, height: 512, label: '标准 (512x512)' },
      { width: 768, height: 512, label: '横向 (768x512)' },
      { width: 512, height: 768, label: '纵向 (512x768)' },
      { width: 1024, height: 1024, label: '高清 (1024x1024)' },
    ];
  }

  /**
   * 获取搜索索引字段
   */
  static getSearchableText(image: GeneratedImageDocument): string {
    const parts: string[] = [
      image.prompt,
      image.style,
      ...image.tags,
    ];

    return parts.join(' ').toLowerCase();
  }
}
