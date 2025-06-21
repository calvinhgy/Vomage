/**
 * 直接语音识别服务
 * 使用Web Speech API进行实时语音识别，避免从Blob识别的问题
 */

export interface DirectSpeechResult {
  text: string;
  confidence: number;
  language?: string;
  isFinal: boolean;
}

export class DirectSpeechService {
  private recognition: SpeechRecognition | null = null;
  private isSupported: boolean = false;
  private isListening: boolean = false;

  constructor() {
    this.initializeSpeechRecognition();
  }

  /**
   * 初始化语音识别
   */
  private initializeSpeechRecognition() {
    if (typeof window === 'undefined') return;

    const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.isSupported = true;
      
      // 配置语音识别
      this.recognition.continuous = false;
      this.recognition.interimResults = true;
      this.recognition.lang = 'zh-CN';
      this.recognition.maxAlternatives = 3;
    } else {
      console.warn('浏览器不支持语音识别');
      this.isSupported = false;
    }
  }

  /**
   * 检查是否支持语音识别
   */
  isServiceSupported(): boolean {
    return this.isSupported;
  }

  /**
   * 开始实时语音识别
   */
  async startListening(): Promise<DirectSpeechResult> {
    if (!this.isSupported || !this.recognition) {
      throw new Error('浏览器不支持语音识别');
    }

    if (this.isListening) {
      throw new Error('语音识别已在进行中');
    }

    return new Promise((resolve, reject) => {
      let finalTranscript = '';
      let interimTranscript = '';
      let bestConfidence = 0;
      let hasResult = false;

      this.recognition!.onstart = () => {
        this.isListening = true;
        console.log('🎤 开始实时语音识别');
      };

      this.recognition!.onresult = (event) => {
        console.log('🎯 识别结果:', event);
        
        interimTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const transcript = result[0].transcript;
          const confidence = result[0].confidence || 0.8;

          if (result.isFinal) {
            finalTranscript += transcript;
            bestConfidence = Math.max(bestConfidence, confidence);
            hasResult = true;
            console.log('✅ 最终结果:', finalTranscript, '置信度:', confidence);
          } else {
            interimTranscript += transcript;
            console.log('🔄 临时结果:', interimTranscript);
          }
        }
      };

      this.recognition!.onend = () => {
        this.isListening = false;
        console.log('🏁 语音识别结束');
        
        const resultText = finalTranscript || interimTranscript;
        
        if (resultText && resultText.trim()) {
          resolve({
            text: resultText.trim(),
            confidence: bestConfidence || 0.8,
            language: 'zh-CN',
            isFinal: !!finalTranscript,
          });
        } else {
          reject(new Error('未识别到语音内容'));
        }
      };

      this.recognition!.onerror = (event) => {
        this.isListening = false;
        console.error('❌ 语音识别错误:', event.error);
        
        let errorMessage = '';
        switch (event.error) {
          case 'aborted':
            errorMessage = '语音识别被中断';
            break;
          case 'audio-capture':
            errorMessage = '无法访问麦克风';
            break;
          case 'network':
            errorMessage = '网络连接错误';
            break;
          case 'not-allowed':
            errorMessage = '麦克风权限被拒绝';
            break;
          case 'no-speech':
            errorMessage = '未检测到语音';
            break;
          default:
            errorMessage = `识别错误: ${event.error}`;
        }
        
        reject(new Error(errorMessage));
      };

      // 启动识别
      try {
        this.recognition!.start();
        
        // 设置超时
        setTimeout(() => {
          if (this.isListening) {
            this.stopListening();
            if (!hasResult) {
              reject(new Error('语音识别超时'));
            }
          }
        }, 10000);
        
      } catch (error) {
        this.isListening = false;
        reject(new Error(`启动语音识别失败: ${error}`));
      }
    });
  }

  /**
   * 停止语音识别
   */
  stopListening() {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
      this.isListening = false;
      console.log('⏹️ 停止语音识别');
    }
  }

  /**
   * 检查是否正在监听
   */
  isCurrentlyListening(): boolean {
    return this.isListening;
  }
}

// 全局实例
export const directSpeechService = new DirectSpeechService();
