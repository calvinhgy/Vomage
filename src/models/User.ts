/**
 * 用户数据模型
 */

import { ObjectId } from 'mongodb';

export interface UserDocument {
  _id?: ObjectId;
  username: string;
  email?: string;
  avatar?: string;
  settings: {
    theme: 'light' | 'dark' | 'system';
    language: string;
    notifications: boolean;
    privacyLevel: 'public' | 'private' | 'friends';
    imageStyle: string;
  };
  stats: {
    totalRecordings: number;
    totalImages: number;
    joinDate: Date;
    lastActive: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

export class UserModel {
  /**
   * 创建新用户
   */
  static createUser(userData: Partial<UserDocument>): UserDocument {
    const now = new Date();
    
    return {
      username: userData.username || `user_${Date.now()}`,
      email: userData.email,
      avatar: userData.avatar,
      settings: {
        theme: 'system',
        language: 'zh-CN',
        notifications: true,
        privacyLevel: 'public',
        imageStyle: 'abstract',
        ...userData.settings,
      },
      stats: {
        totalRecordings: 0,
        totalImages: 0,
        joinDate: now,
        lastActive: now,
        ...userData.stats,
      },
      createdAt: now,
      updatedAt: now,
    };
  }

  /**
   * 验证用户数据
   */
  static validateUser(userData: Partial<UserDocument>): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // 验证用户名
    if (!userData.username || userData.username.trim().length === 0) {
      errors.push('用户名不能为空');
    } else if (userData.username.length < 2 || userData.username.length > 50) {
      errors.push('用户名长度必须在2-50个字符之间');
    }

    // 验证邮箱
    if (userData.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(userData.email)) {
        errors.push('邮箱格式不正确');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * 更新用户统计信息
   */
  static updateStats(
    user: UserDocument,
    updates: Partial<UserDocument['stats']>
  ): UserDocument {
    return {
      ...user,
      stats: {
        ...user.stats,
        ...updates,
        lastActive: new Date(),
      },
      updatedAt: new Date(),
    };
  }

  /**
   * 更新用户设置
   */
  static updateSettings(
    user: UserDocument,
    settings: Partial<UserDocument['settings']>
  ): UserDocument {
    return {
      ...user,
      settings: {
        ...user.settings,
        ...settings,
      },
      updatedAt: new Date(),
    };
  }

  /**
   * 转换为公开信息（隐藏敏感数据）
   */
  static toPublicInfo(user: UserDocument): {
    id: string;
    username: string;
    avatar?: string;
    joinDate: Date;
    totalRecordings: number;
    totalImages: number;
  } {
    return {
      id: user._id?.toString() || '',
      username: user.username,
      avatar: user.avatar,
      joinDate: user.stats.joinDate,
      totalRecordings: user.stats.totalRecordings,
      totalImages: user.stats.totalImages,
    };
  }
}
