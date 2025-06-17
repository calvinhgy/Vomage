/**
 * 文件存储服务 (简化版本)
 * 目前使用本地存储，后续可以集成AWS S3
 */

import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';

export interface UploadOptions {
  contentType?: string;
  metadata?: Record<string, string>;
  cacheControl?: string;
  acl?: 'private' | 'public-read';
}

export interface UploadResult {
  key: string;
  url: string;
  size: number;
  etag: string;
}

export class StorageService {
  private static uploadDir = '/tmp/vomage-uploads';

  /**
   * 初始化存储目录
   */
  private static ensureUploadDir(): void {
    if (!existsSync(this.uploadDir)) {
      mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  /**
   * 上传音频文件
   */
  static async uploadAudio(
    buffer: Buffer,
    userId: string,
    mimeType: string
  ): Promise<UploadResult> {
    console.log('开始上传音频文件...');
    console.log('文件大小:', buffer.length, 'bytes');
    console.log('MIME类型:', mimeType);

    this.ensureUploadDir();

    // 生成唯一的文件名
    const fileId = randomUUID();
    const extension = this.getExtensionFromMimeType(mimeType);
    const fileName = `${userId}_${fileId}.${extension}`;
    const filePath = join(this.uploadDir, fileName);

    try {
      // 保存文件到本地
      writeFileSync(filePath, buffer);

      const result: UploadResult = {
        key: fileName,
        url: `/uploads/${fileName}`, // 相对URL
        size: buffer.length,
        etag: fileId
      };

      console.log('音频文件上传成功:', result);
      return result;
    } catch (error) {
      console.error('音频文件上传失败:', error);
      throw new Error('文件上传失败');
    }
  }

  /**
   * 上传图片文件
   */
  static async uploadImage(
    buffer: Buffer,
    userId: string,
    mimeType: string
  ): Promise<UploadResult> {
    console.log('开始上传图片文件...');
    console.log('文件大小:', buffer.length, 'bytes');
    console.log('MIME类型:', mimeType);

    this.ensureUploadDir();

    // 生成唯一的文件名
    const fileId = randomUUID();
    const extension = this.getExtensionFromMimeType(mimeType);
    const fileName = `${userId}_${fileId}.${extension}`;
    const filePath = join(this.uploadDir, fileName);

    try {
      // 保存文件到本地
      writeFileSync(filePath, buffer);

      const result: UploadResult = {
        key: fileName,
        url: `/uploads/${fileName}`, // 相对URL
        size: buffer.length,
        etag: fileId
      };

      console.log('图片文件上传成功:', result);
      return result;
    } catch (error) {
      console.error('图片文件上传失败:', error);
      throw new Error('文件上传失败');
    }
  }

  /**
   * 根据MIME类型获取文件扩展名
   */
  private static getExtensionFromMimeType(mimeType: string): string {
    const mimeToExt: Record<string, string> = {
      'audio/webm': 'webm',
      'audio/mp4': 'm4a',
      'audio/mpeg': 'mp3',
      'audio/wav': 'wav',
      'audio/ogg': 'ogg',
      'image/png': 'png',
      'image/jpeg': 'jpg',
      'image/gif': 'gif',
      'image/webp': 'webp'
    };

    return mimeToExt[mimeType] || 'bin';
  }

  /**
   * 验证文件类型
   */
  static validateFileType(mimeType: string, allowedTypes: string[]): boolean {
    if (!mimeType) {
      console.warn('MIME类型为空，允许通过');
      return true; // 如果没有MIME类型，允许通过
    }

    // 直接匹配
    if (allowedTypes.includes(mimeType)) {
      return true;
    }

    // 检查通配符匹配 (如 audio/*)
    for (const allowedType of allowedTypes) {
      if (allowedType.endsWith('/*')) {
        const prefix = allowedType.slice(0, -2);
        if (mimeType.startsWith(prefix + '/')) {
          return true;
        }
      }
    }

    // 检查基础类型匹配 (忽略编解码器参数)
    const baseMimeType = mimeType.split(';')[0].trim();
    if (allowedTypes.includes(baseMimeType)) {
      return true;
    }

    console.warn('不支持的MIME类型:', mimeType);
    console.warn('允许的类型:', allowedTypes);
    return false;
  }

  /**
   * 获取允许的音频类型
   */
  static getAllowedAudioTypes(): string[] {
    return [
      // WebM 格式
      'audio/webm',
      'audio/webm;codecs=opus',
      'audio/webm;codecs=vp8',
      
      // MP4 格式 (iOS Safari 主要支持)
      'audio/mp4',
      'audio/mp4;codecs=aac',
      'audio/aac',
      
      // 其他常见格式
      'audio/mpeg',
      'audio/wav',
      'audio/ogg',
      'audio/3gpp',
      'audio/3gpp2',
      
      // 通用音频类型
      'audio/*'
    ];
  }

  /**
   * 获取允许的图片类型
   */
  static getAllowedImageTypes(): string[] {
    return [
      'image/png',
      'image/jpeg',
      'image/gif',
      'image/webp'
    ];
  }

  /**
   * 删除文件
   */
  static async deleteFile(key: string): Promise<void> {
    console.log('删除文件:', key);
    // 这里可以实现文件删除逻辑
    // 目前只是记录日志
  }

  /**
   * 获取文件URL
   */
  static getFileUrl(key: string): string {
    return `/uploads/${key}`;
  }

  /**
   * 检查服务是否配置
   */
  static isConfigured(): boolean {
    // 本地存储总是可用的
    return true;
  }

  /**
   * 获取服务状态
   */
  static getStatus(): {
    configured: boolean;
    type: string;
    uploadDir: string;
  } {
    return {
      configured: this.isConfigured(),
      type: 'local',
      uploadDir: this.uploadDir
    };
  }
}
