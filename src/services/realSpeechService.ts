/**
 * 真实语音转文字服务
 * 使用Web Speech API实现浏览器端语音识别
 */

export interface RealTranscriptionResult {
  text: string;
  confidence: number;
  language?: string;
  duration?: number;
  isFinal: boolean;
}

export class RealSpeechService {
  private recognition: SpeechRecognition | null = null;
  private isSupported: boolean = false;

  constructor() {
    this.initializeSpeechRecognition();
  }

  /**
   * 初始化语音识别
   */
  private initializeSpeechRecognition() {
    if (typeof window === 'undefined') return;

    // 检查浏览器支持
    const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.isSupported = true;
      
      // 配置语音识别
      this.recognition.continuous = false;
      this.recognition.interimResults = true;
      this.recognition.lang = 'zh-CN'; // 中文识别
      this.recognition.maxAlternatives = 1;
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
   * 从音频Blob转录文字
   */
  async transcribeFromBlob(audioBlob: Blob): Promise<RealTranscriptionResult> {
    if (!this.isSupported || !this.recognition) {
      throw new Error('浏览器不支持语音识别');
    }

    return new Promise((resolve, reject) => {
      let finalTranscript = '';
      let confidence = 0;

      // 创建音频URL并播放（触发语音识别）
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);

      this.recognition!.onresult = (event) => {
        console.log('语音识别结果:', event);
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const transcript = result[0].transcript;
          confidence = result[0].confidence || 0.9;

          if (result.isFinal) {
            finalTranscript = transcript;
            console.log('最终识别结果:', finalTranscript, '置信度:', confidence);
          }
        }
      };

      this.recognition!.onend = () => {
        URL.revokeObjectURL(audioUrl);
        
        if (finalTranscript) {
          resolve({
            text: finalTranscript.trim(),
            confidence: confidence,
            language: 'zh-CN',
            duration: audioBlob.size / 8000,
            isFinal: true,
          });
        } else {
          reject(new Error('语音识别失败，未获取到文字'));
        }
      };

      this.recognition!.onerror = (event) => {
        console.error('语音识别错误:', event.error);
        URL.revokeObjectURL(audioUrl);
        reject(new Error(`语音识别失败: ${event.error}`));
      };

      // 开始识别
      try {
        this.recognition!.start();
        
        // 播放音频以触发识别
        audio.play().catch(error => {
          console.warn('音频播放失败，但识别可能仍然有效:', error);
        });
        
      } catch (error) {
        reject(new Error(`启动语音识别失败: ${error}`));
      }
    });
  }

  /**
   * 实时语音识别（从麦克风）
   */
  async startRealTimeRecognition(): Promise<AsyncGenerator<RealTranscriptionResult, void, unknown>> {
    if (!this.isSupported || !this.recognition) {
      throw new Error('浏览器不支持语音识别');
    }

    const self = this;
    
    return (async function* () {
      return new Promise<void>((resolve, reject) => {
        self.recognition!.continuous = true;
        self.recognition!.interimResults = true;

        self.recognition!.onresult = (event) => {
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const result = event.results[i];
            const transcript = result[0].transcript;
            const confidence = result[0].confidence || 0.8;

            // 返回实时结果
            return {
              text: transcript,
              confidence: confidence,
              language: 'zh-CN',
              isFinal: result.isFinal,
            };
          }
        };

        self.recognition!.onend = () => resolve();
        self.recognition!.onerror = (event) => reject(new Error(event.error));

        self.recognition!.start();
      });
    })();
  }

  /**
   * 停止语音识别
   */
  stopRecognition() {
    if (this.recognition) {
      this.recognition.stop();
    }
  }
}

// 全局实例
export const realSpeechService = new RealSpeechService();
