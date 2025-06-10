/**
 * 语音转文字服务
 * 集成多个语音识别服务作为备选方案
 */

export interface TranscriptionResult {
  text: string;
  confidence: number;
  language?: string;
  duration?: number;
}

export interface TranscriptionOptions {
  language?: string;
  model?: string;
  temperature?: number;
  maxRetries?: number;
}

export class SpeechService {
  /**
   * 主要的语音转文字方法
   * 优先使用浏览器原生 API，失败时使用备选方案
   */
  static async transcribeAudio(
    audioBlob: Blob,
    options: TranscriptionOptions = {}
  ): Promise<TranscriptionResult> {
    const {
      language = 'zh-CN',
      maxRetries = 3
    } = options;

    let lastError: Error | null = null;

    // 方案1: 尝试使用浏览器原生 Web Speech API
    try {
      const result = await this.transcribeWithWebSpeechAPI(audioBlob, language);
      if (result.text.trim().length > 0) {
        return result;
      }
    } catch (error) {
      console.warn('Web Speech API failed:', error);
      lastError = error as Error;
    }

    // 方案2: 使用服务端 API (OpenAI Whisper 或其他服务)
    try {
      const result = await this.transcribeWithServerAPI(audioBlob, options);
      if (result.text.trim().length > 0) {
        return result;
      }
    } catch (error) {
      console.warn('Server API transcription failed:', error);
      lastError = error as Error;
    }

    // 方案3: 使用模拟转录（开发和测试用）
    if (process.env.NODE_ENV === 'development') {
      console.warn('Using mock transcription for development');
      return this.getMockTranscription();
    }

    // 所有方案都失败了
    throw new Error(`语音转文字失败: ${lastError?.message || '未知错误'}`);
  }

  /**
   * 使用浏览器原生 Web Speech API
   */
  private static async transcribeWithWebSpeechAPI(
    audioBlob: Blob,
    language: string
  ): Promise<TranscriptionResult> {
    return new Promise((resolve, reject) => {
      // 检查浏览器支持
      if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        reject(new Error('浏览器不支持语音识别'));
        return;
      }

      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();

      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = language;
      recognition.maxAlternatives = 1;

      let hasResult = false;

      recognition.onresult = (event: any) => {
        hasResult = true;
        const result = event.results[0][0];
        
        resolve({
          text: result.transcript,
          confidence: result.confidence,
          language: language,
        });
      };

      recognition.onerror = (event: any) => {
        if (!hasResult) {
          reject(new Error(`语音识别错误: ${event.error}`));
        }
      };

      recognition.onend = () => {
        if (!hasResult) {
          reject(new Error('语音识别未返回结果'));
        }
      };

      // 创建音频 URL 并播放以触发识别
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      
      audio.onplay = () => {
        recognition.start();
      };

      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
      };

      audio.play().catch(reject);

      // 设置超时
      setTimeout(() => {
        if (!hasResult) {
          recognition.stop();
          reject(new Error('语音识别超时'));
        }
      }, 30000);
    });
  }

  /**
   * 使用服务端 API 进行转录
   */
  private static async transcribeWithServerAPI(
    audioBlob: Blob,
    options: TranscriptionOptions
  ): Promise<TranscriptionResult> {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.webm');
    formData.append('language', options.language || 'zh-CN');
    
    if (options.model) {
      formData.append('model', options.model);
    }

    const response = await fetch('/api/transcribe', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`转录服务错误: ${response.status}`);
    }

    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || '转录失败');
    }

    return {
      text: result.text,
      confidence: result.confidence || 0.8,
      language: result.language,
      duration: result.duration,
    };
  }

  /**
   * 获取模拟转录结果（用于开发和测试）
   */
  private static getMockTranscription(): TranscriptionResult {
    const mockTexts = [
      '今天心情不错，阳光很好，感觉一切都很美好。',
      '有点累了，工作压力比较大，希望能放松一下。',
      '刚刚和朋友聊天，聊得很开心，心情变好了很多。',
      '天气有点阴沉，心情也跟着有些低落。',
      '今天完成了一个重要的项目，感觉很有成就感。',
      '有些焦虑，对未来的不确定性感到担心。',
      '刚刚听了一首很好听的歌，心情平静了下来。',
    ];

    const randomText = mockTexts[Math.floor(Math.random() * mockTexts.length)];

    return {
      text: randomText,
      confidence: 0.85 + Math.random() * 0.1, // 0.85-0.95
      language: 'zh-CN',
      duration: 3 + Math.random() * 7, // 3-10秒
    };
  }

  /**
   * 预处理音频数据
   */
  static async preprocessAudio(audioBlob: Blob): Promise<Blob> {
    try {
      // 检查音频格式
      if (!audioBlob.type.startsWith('audio/')) {
        throw new Error('无效的音频格式');
      }

      // 检查文件大小 (限制为 25MB)
      const maxSize = 25 * 1024 * 1024;
      if (audioBlob.size > maxSize) {
        throw new Error('音频文件过大，请录制较短的音频');
      }

      // 如果需要，可以在这里添加音频格式转换逻辑
      // 例如转换为 WAV 或 MP3 格式

      return audioBlob;
    } catch (error) {
      console.error('Audio preprocessing error:', error);
      throw error;
    }
  }

  /**
   * 检测音频语言
   */
  static async detectLanguage(audioBlob: Blob): Promise<string> {
    try {
      // 这里可以集成语言检测服务
      // 暂时返回默认语言
      return 'zh-CN';
    } catch (error) {
      console.warn('Language detection failed:', error);
      return 'zh-CN';
    }
  }

  /**
   * 获取支持的语言列表
   */
  static getSupportedLanguages(): Array<{ code: string; name: string }> {
    return [
      { code: 'zh-CN', name: '中文（简体）' },
      { code: 'zh-TW', name: '中文（繁体）' },
      { code: 'en-US', name: 'English (US)' },
      { code: 'en-GB', name: 'English (UK)' },
      { code: 'ja-JP', name: '日本語' },
      { code: 'ko-KR', name: '한국어' },
      { code: 'fr-FR', name: 'Français' },
      { code: 'de-DE', name: 'Deutsch' },
      { code: 'es-ES', name: 'Español' },
    ];
  }

  /**
   * 验证转录结果
   */
  static validateTranscription(result: TranscriptionResult): boolean {
    // 检查文本长度
    if (!result.text || result.text.trim().length === 0) {
      return false;
    }

    // 检查置信度
    if (result.confidence < 0.3) {
      return false;
    }

    // 检查是否包含有意义的内容
    const meaningfulWords = result.text.replace(/[^\w\s\u4e00-\u9fff]/g, '').trim();
    if (meaningfulWords.length < 2) {
      return false;
    }

    return true;
  }
}
