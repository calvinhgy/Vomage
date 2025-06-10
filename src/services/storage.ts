/**
 * 文件存储服务 (AWS S3)
 */

import { 
  S3Client, 
  PutObjectCommand, 
  GetObjectCommand, 
  DeleteObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  CopyObjectCommand
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// 初始化 S3 客户端
const s3Client = new S3Client({
  region: process.env.AWS_S3_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_S3_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_S3_SECRET_ACCESS_KEY!,
  },
});

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
  private static bucketName = process.env.AWS_S3_BUCKET_NAME!;
  private static cloudFrontDomain = process.env.AWS_CLOUDFRONT_DOMAIN;

  /**
   * 上传文件
   */
  static async uploadFile(
    key: string,
    buffer: Buffer,
    options: UploadOptions = {}
  ): Promise<UploadResult> {
    try {
      const {
        contentType = 'application/octet-stream',
        metadata = {},
        cacheControl = 'max-age=31536000', // 1年
        acl = 'public-read',
      } = options;

      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        Metadata: metadata,
        CacheControl: cacheControl,
        ACL: acl,
      });

      const response = await s3Client.send(command);

      const url = this.getPublicUrl(key);

      return {
        key,
        url,
        size: buffer.length,
        etag: response.ETag || '',
      };
    } catch (error) {
      console.error('File upload error:', error);
      throw new Error(`文件上传失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 上传音频文件
   */
  static async uploadAudio(
    audioBuffer: Buffer,
    userId: string,
    mimeType: string = 'audio/webm'
  ): Promise<UploadResult> {
    const timestamp = Date.now();
    const extension = this.getExtensionFromMimeType(mimeType);
    const key = `audio/${userId}/${timestamp}.${extension}`;

    return this.uploadFile(key, audioBuffer, {
      contentType: mimeType,
      metadata: {
        userId,
        type: 'audio',
        uploadedAt: new Date().toISOString(),
      },
      cacheControl: 'max-age=86400', // 1天
    });
  }

  /**
   * 上传图片文件
   */
  static async uploadImage(
    imageBuffer: Buffer,
    userId: string,
    voiceRecordId: string,
    mimeType: string = 'image/png'
  ): Promise<UploadResult> {
    const timestamp = Date.now();
    const extension = this.getExtensionFromMimeType(mimeType);
    const key = `images/${userId}/${voiceRecordId}/${timestamp}.${extension}`;

    return this.uploadFile(key, imageBuffer, {
      contentType: mimeType,
      metadata: {
        userId,
        voiceRecordId,
        type: 'image',
        uploadedAt: new Date().toISOString(),
      },
    });
  }

  /**
   * 上传缩略图
   */
  static async uploadThumbnail(
    thumbnailBuffer: Buffer,
    originalKey: string,
    mimeType: string = 'image/jpeg'
  ): Promise<UploadResult> {
    const extension = this.getExtensionFromMimeType(mimeType);
    const key = originalKey.replace(/\.[^.]+$/, `_thumb.${extension}`);

    return this.uploadFile(key, thumbnailBuffer, {
      contentType: mimeType,
      metadata: {
        type: 'thumbnail',
        originalKey,
        uploadedAt: new Date().toISOString(),
      },
    });
  }

  /**
   * 获取文件
   */
  static async getFile(key: string): Promise<Buffer> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      const response = await s3Client.send(command);
      
      if (!response.Body) {
        throw new Error('文件内容为空');
      }

      // 将流转换为 Buffer
      const chunks: Uint8Array[] = [];
      const reader = response.Body.transformToWebStream().getReader();
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }

      return Buffer.concat(chunks);
    } catch (error) {
      console.error('File get error:', error);
      throw new Error(`获取文件失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 删除文件
   */
  static async deleteFile(key: string): Promise<boolean> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      await s3Client.send(command);
      return true;
    } catch (error) {
      console.error('File delete error:', error);
      return false;
    }
  }

  /**
   * 检查文件是否存在
   */
  static async fileExists(key: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      await s3Client.send(command);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * 获取文件信息
   */
  static async getFileInfo(key: string): Promise<{
    size: number;
    lastModified: Date;
    contentType: string;
    metadata: Record<string, string>;
  }> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      const response = await s3Client.send(command);

      return {
        size: response.ContentLength || 0,
        lastModified: response.LastModified || new Date(),
        contentType: response.ContentType || '',
        metadata: response.Metadata || {},
      };
    } catch (error) {
      console.error('Get file info error:', error);
      throw new Error(`获取文件信息失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 生成预签名URL
   */
  static async generatePresignedUrl(
    key: string,
    expiresIn: number = 3600
  ): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      return await getSignedUrl(s3Client, command, { expiresIn });
    } catch (error) {
      console.error('Generate presigned URL error:', error);
      throw new Error(`生成预签名URL失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 复制文件
   */
  static async copyFile(sourceKey: string, destinationKey: string): Promise<boolean> {
    try {
      const command = new CopyObjectCommand({
        Bucket: this.bucketName,
        CopySource: `${this.bucketName}/${sourceKey}`,
        Key: destinationKey,
      });

      await s3Client.send(command);
      return true;
    } catch (error) {
      console.error('File copy error:', error);
      return false;
    }
  }

  /**
   * 列出文件
   */
  static async listFiles(
    prefix: string,
    maxKeys: number = 1000
  ): Promise<Array<{
    key: string;
    size: number;
    lastModified: Date;
  }>> {
    try {
      const command = new ListObjectsV2Command({
        Bucket: this.bucketName,
        Prefix: prefix,
        MaxKeys: maxKeys,
      });

      const response = await s3Client.send(command);

      return (response.Contents || []).map(object => ({
        key: object.Key || '',
        size: object.Size || 0,
        lastModified: object.LastModified || new Date(),
      }));
    } catch (error) {
      console.error('List files error:', error);
      throw new Error(`列出文件失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 获取公开访问URL
   */
  static getPublicUrl(key: string): string {
    if (this.cloudFrontDomain) {
      return `https://${this.cloudFrontDomain}/${key}`;
    }
    return `https://${this.bucketName}.s3.${process.env.AWS_S3_REGION || 'us-east-1'}.amazonaws.com/${key}`;
  }

  /**
   * 从MIME类型获取文件扩展名
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
      'image/jpg': 'jpg',
      'image/webp': 'webp',
      'image/gif': 'gif',
    };

    return mimeToExt[mimeType] || 'bin';
  }

  /**
   * 验证文件类型
   */
  static validateFileType(mimeType: string, allowedTypes: string[]): boolean {
    return allowedTypes.includes(mimeType);
  }

  /**
   * 获取允许的音频类型
   */
  static getAllowedAudioTypes(): string[] {
    return [
      'audio/webm',
      'audio/mp4',
      'audio/mpeg',
      'audio/wav',
      'audio/ogg',
    ];
  }

  /**
   * 获取允许的图片类型
   */
  static getAllowedImageTypes(): string[] {
    return [
      'image/png',
      'image/jpeg',
      'image/jpg',
      'image/webp',
    ];
  }

  /**
   * 清理过期文件
   */
  static async cleanupExpiredFiles(olderThanDays: number = 30): Promise<{
    deletedCount: number;
    errors: string[];
  }> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    let deletedCount = 0;
    const errors: string[] = [];

    try {
      // 列出所有文件
      const files = await this.listFiles('', 10000);
      
      // 筛选过期文件
      const expiredFiles = files.filter(file => file.lastModified < cutoffDate);

      // 删除过期文件
      for (const file of expiredFiles) {
        try {
          const success = await this.deleteFile(file.key);
          if (success) {
            deletedCount++;
          } else {
            errors.push(`删除文件失败: ${file.key}`);
          }
        } catch (error) {
          errors.push(`删除文件错误: ${file.key} - ${error}`);
        }
      }

      return { deletedCount, errors };
    } catch (error) {
      return {
        deletedCount: 0,
        errors: [`清理过程错误: ${error instanceof Error ? error.message : '未知错误'}`],
      };
    }
  }

  /**
   * 获取存储统计信息
   */
  static async getStorageStats(): Promise<{
    totalFiles: number;
    totalSize: number;
    audioFiles: number;
    imageFiles: number;
  }> {
    try {
      const [audioFiles, imageFiles] = await Promise.all([
        this.listFiles('audio/', 10000),
        this.listFiles('images/', 10000),
      ]);

      const totalFiles = audioFiles.length + imageFiles.length;
      const totalSize = [...audioFiles, ...imageFiles].reduce(
        (sum, file) => sum + file.size,
        0
      );

      return {
        totalFiles,
        totalSize,
        audioFiles: audioFiles.length,
        imageFiles: imageFiles.length,
      };
    } catch (error) {
      console.error('Get storage stats error:', error);
      throw error;
    }
  }
}
