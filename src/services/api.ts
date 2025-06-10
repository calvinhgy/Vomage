/**
 * API 服务层
 */

import { ApiResponse, VoiceRecord, SentimentAnalysis, GeneratedImage, Context } from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

class ApiClient {
  private baseURL: string;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  /**
   * 通用请求方法
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;
    
    const defaultOptions: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, defaultOptions);
      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: {
            code: response.status.toString(),
            message: data.message || '请求失败',
          },
        };
      }

      return {
        success: true,
        data,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: error instanceof Error ? error.message : '网络错误',
        },
      };
    }
  }

  /**
   * 上传音频文件
   */
  async uploadAudio(audioBlob: Blob, context?: Context): Promise<ApiResponse<VoiceRecord>> {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.webm');
    
    if (context) {
      formData.append('context', JSON.stringify(context));
    }

    return this.request<VoiceRecord>('/voice/upload', {
      method: 'POST',
      headers: {}, // 移除Content-Type，让浏览器自动设置
      body: formData,
    });
  }

  /**
   * 分析语音情感
   */
  async analyzeSentiment(voiceRecordId: string): Promise<ApiResponse<SentimentAnalysis>> {
    return this.request<SentimentAnalysis>(`/voice/${voiceRecordId}/sentiment`, {
      method: 'POST',
    });
  }

  /**
   * 生成心情图片
   */
  async generateImage(
    voiceRecordId: string,
    style: string = 'abstract'
  ): Promise<ApiResponse<GeneratedImage>> {
    return this.request<GeneratedImage>(`/voice/${voiceRecordId}/image`, {
      method: 'POST',
      body: JSON.stringify({ style }),
    });
  }

  /**
   * 获取用户的语音记录列表
   */
  async getVoiceRecords(
    page: number = 1,
    limit: number = 20
  ): Promise<ApiResponse<{ records: VoiceRecord[]; total: number }>> {
    return this.request<{ records: VoiceRecord[]; total: number }>(
      `/voice/records?page=${page}&limit=${limit}`
    );
  }

  /**
   * 删除语音记录
   */
  async deleteVoiceRecord(voiceRecordId: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/voice/${voiceRecordId}`, {
      method: 'DELETE',
    });
  }

  /**
   * 获取天气信息
   */
  async getWeather(lat: number, lon: number): Promise<ApiResponse<Context['weather']>> {
    return this.request<Context['weather']>(
      `/weather?lat=${lat}&lon=${lon}`
    );
  }

  /**
   * 获取地理位置信息
   */
  async getLocationInfo(lat: number, lon: number): Promise<ApiResponse<Context['location']>> {
    return this.request<Context['location']>(
      `/location?lat=${lat}&lon=${lon}`
    );
  }
}

// 创建API客户端实例
export const apiClient = new ApiClient();

/**
 * 语音相关API
 */
export const voiceApi = {
  upload: (audioBlob: Blob, context?: Context) => 
    apiClient.uploadAudio(audioBlob, context),
  
  analyzeSentiment: (voiceRecordId: string) => 
    apiClient.analyzeSentiment(voiceRecordId),
  
  generateImage: (voiceRecordId: string, style?: string) => 
    apiClient.generateImage(voiceRecordId, style),
  
  getRecords: (page?: number, limit?: number) => 
    apiClient.getVoiceRecords(page, limit),
  
  delete: (voiceRecordId: string) => 
    apiClient.deleteVoiceRecord(voiceRecordId),
};

/**
 * 上下文相关API
 */
export const contextApi = {
  getWeather: (lat: number, lon: number) => 
    apiClient.getWeather(lat, lon),
  
  getLocation: (lat: number, lon: number) => 
    apiClient.getLocationInfo(lat, lon),
};

/**
 * 错误处理工具
 */
export const handleApiError = (error: ApiResponse<any>['error']) => {
  if (!error) return '未知错误';
  
  const errorMessages: Record<string, string> = {
    '400': '请求参数错误',
    '401': '未授权访问',
    '403': '访问被拒绝',
    '404': '资源不存在',
    '429': '请求过于频繁，请稍后再试',
    '500': '服务器内部错误',
    'NETWORK_ERROR': '网络连接错误，请检查网络设置',
  };
  
  return errorMessages[error.code] || error.message || '请求失败';
};
