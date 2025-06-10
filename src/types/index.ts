// 用户类型定义
export interface User {
  id: string;
  username: string;
  avatar?: string;
  createdAt: Date;
  updatedAt: Date;
}

// 语音记录类型定义
export interface VoiceRecord {
  id: string;
  userId: string;
  audioUrl: string;
  duration: number;
  transcript?: string;
  sentiment?: SentimentAnalysis;
  createdAt: Date;
}

// 情感分析结果
export interface SentimentAnalysis {
  mood: Mood;
  confidence: number;
  details: {
    positive: number;
    negative: number;
    neutral: number;
  };
}

// 心情类型
export type Mood = 'happy' | 'sad' | 'angry' | 'excited' | 'calm' | 'anxious' | 'neutral';

// 生成的图片
export interface GeneratedImage {
  id: string;
  voiceRecordId: string;
  url: string;
  prompt: string;
  style: ImageStyle;
  createdAt: Date;
}

// 图片风格
export type ImageStyle = 'abstract' | 'realistic' | 'artistic' | 'minimalist' | 'cartoon';

// 环境上下文
export interface Context {
  location?: {
    latitude: number;
    longitude: number;
    city?: string;
    country?: string;
  };
  weather?: {
    temperature: number;
    condition: string;
    humidity: number;
  };
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
}

// API 响应类型
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

// 录音状态
export interface RecordingState {
  isRecording: boolean;
  duration: number;
  audioBlob?: Blob;
  audioUrl?: string;
}

// 应用配置
export interface AppConfig {
  maxRecordingDuration: number;
  minRecordingDuration: number;
  supportedImageStyles: ImageStyle[];
  maxRetries: number;
  apiEndpoints: {
    voice: string;
    sentiment: string;
    image: string;
  };
}

// 错误类型
export enum ErrorType {
  NETWORK = 'NETWORK_ERROR',
  PERMISSION = 'PERMISSION_ERROR',
  VALIDATION = 'VALIDATION_ERROR',
  AUTH = 'AUTH_ERROR',
  SERVER = 'SERVER_ERROR',
  UNKNOWN = 'UNKNOWN_ERROR',
}

// 通知类型
export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
}

// 社交互动
export interface SocialInteraction {
  id: string;
  type: 'like' | 'comment' | 'share';
  userId: string;
  targetId: string;
  content?: string;
  createdAt: Date;
}

// 用户设置
export interface UserSettings {
  theme: 'light' | 'dark' | 'system';
  language: string;
  notifications: boolean;
  privacyLevel: 'public' | 'private' | 'friends';
  imageStyle: ImageStyle;
}
