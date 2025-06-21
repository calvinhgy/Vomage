/**
 * 语音转文字服务
 * 通过API调用实现与用户说话内容完全一致的转录
 */

export interface TranscriptionResult {
  text: string;
  confidence: number;
  language?: string;
  duration?: number;
  isExact?: boolean;
}

export interface TranscriptionOptions {
  language?: string;
  model?: string;
  temperature?: number;
  maxRetries?: number;
  requireExact?: boolean;
}

export class SpeechService {
  /**
   * 主要的语音转文字方法
   * 通过服务端API实现精确转录
   */
  static async transcribeAudio(
    audioBlob: Blob,
    options: TranscriptionOptions = {}
  ): Promise<TranscriptionResult> {
    const {
      language = 'zh-CN',
      maxRetries = 2,
      requireExact = true,
    } = options;

    console.log('🎯 开始精确语音转录，要求完全一致');
    console.log('📊 音频信息:', {
      size: audioBlob.size,
      type: audioBlob.type,
      requireExact: requireExact
    });

    if (requireExact) {
      try {
        // 通过API调用服务端的Amazon Transcribe
        console.log('🚀 通过API调用精确转录服务');
        
        const formData = new FormData();
        formData.append('audio', audioBlob, 'recording.webm');
        formData.append('language', language);

        const response = await fetch('/api/voice/transcribe-exact', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`API调用失败: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();
        
        if (!result.success) {
          throw new Error(result.error?.message || 'API返回错误');
        }

        console.log('✅ 精确转录完成:', result.data);

        return {
          text: result.data.text,
          confidence: result.data.confidence,
          language: result.data.language,
          duration: result.data.duration,
          isExact: true,
        };

      } catch (error) {
        console.error('❌ 精确转录失败:', error);
        
        // 如果要求完全一致但失败了，不降级到模拟
        throw new Error(`精确转录失败: ${error instanceof Error ? error.message : '未知错误'}`);
      }
    }

    // 如果不要求完全一致，使用智能模拟（这个分支通常不会执行）
    console.log('🔄 使用智能模拟转录');
    return await this.simulateTranscription(audioBlob, options);
  }

  /**
   * 智能模拟转录（仅作为备用，通常不使用）
   */
  private static async simulateTranscription(
    audioBlob: Blob,
    options: TranscriptionOptions
  ): Promise<TranscriptionResult> {
    console.warn('⚠️ 注意：使用模拟转录，无法保证与用户说话内容完全一致');
    
    // 模拟处理时间
    await new Promise(resolve => setTimeout(resolve, 2000));

    return {
      text: '模拟转录结果（非精确）',
      confidence: 0.5,
      language: options.language || 'zh-CN',
      duration: audioBlob.size / 8000,
      isExact: false,
    };
  }

  /**
   * 验证转录结果质量
   */
  static validateTranscription(result: TranscriptionResult): boolean {
    if (!result.text || result.text.trim().length === 0) {
      return false;
    }
    
    // 如果要求精确转录，检查isExact标志
    if (result.isExact === false) {
      console.warn('⚠️ 转录结果不是精确的');
    }
    
    if (result.confidence < 0.3) {
      return false;
    }
    
    return true;
  }

  /**
   * 获取支持的语言列表
   */
  static getSupportedLanguages(): string[] {
    return [
      'zh-CN', // 中文（简体）
      'zh-TW', // 中文（繁体）
      'en-US', // 英语（美国）
      'en-GB', // 英语（英国）
      'ja-JP', // 日语
      'ko-KR', // 韩语
    ];
  }

  /**
   * 检查服务可用性
   */
  static async checkServiceHealth(): Promise<boolean> {
    try {
      // 检查API端点可用性
      const response = await fetch('/api/voice/transcribe-exact', {
        method: 'OPTIONS',
      });
      
      return response.status !== 404;
    } catch (error) {
      console.error('❌ 语音服务健康检查失败:', error);
      return false;
    }
  }
}
