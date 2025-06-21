/**
 * AI 服务整合层
 * 统一管理所有 AI 相关的服务调用
 */

import { ClaudeService } from './claude';
import { NovaService } from './nova';
import { SpeechService } from './speech';
import { AmazonTranscribeService } from './transcribe';
import { AmazonNovaCanvasService } from './novaCanvas';
import { SentimentAnalysis, GeneratedImage, Context } from '@/types';

export interface ProcessVoiceResult {
  transcript: string;
  sentiment: SentimentAnalysis;
  imagePrompt: string;
  generatedImage?: GeneratedImage;
}

export interface AIServiceOptions {
  enableImageGeneration?: boolean;
  imageStyle?: string;
  maxRetries?: number;
  timeout?: number;
  useAmazonServices?: boolean;
}

export class AIService {
  private static transcribeService = new AmazonTranscribeService();
  private static novaCanvasService = new AmazonNovaCanvasService();

  /**
   * 完整的语音处理流程
   * 1. 语音转文字
   * 2. 情感分析
   * 3. 生成图片提示词
   * 4. 生成图片（可选）
   */
  static async processVoice(
    audioBlob: Blob,
    context?: Context,
    options: AIServiceOptions = {}
  ): Promise<ProcessVoiceResult> {
    const {
      enableImageGeneration = true,
      imageStyle = 'abstract',
      maxRetries = 3,
      timeout = 60000,
      useAmazonServices = process.env.USE_AMAZON_AI_SERVICES === 'true'
    } = options;

    let transcript = '';
    let sentiment: SentimentAnalysis;
    let imagePrompt = '';
    let generatedImage: GeneratedImage | undefined;

    try {
      // 步骤1: 语音转文字
      console.log('开始语音转文字...');
      const transcriptionResult = await this.withTimeout(
        useAmazonServices 
          ? this.transcribeService.transcribeAudio(audioBlob)
          : SpeechService.transcribeAudio(audioBlob),
        timeout / 4,
        '语音转文字超时'
      );

      transcript = transcriptionResult.text;
      console.log('语音转文字完成:', transcript);

      // 验证转录结果
      if (!transcript || transcript.trim().length === 0) {
        throw new Error('语音转文字结果为空，请重新录制');
      }

      // 步骤2: 情感分析
      console.log('开始情感分析...');
      sentiment = await this.withTimeout(
        ClaudeService.analyzeSentiment(transcript, context),
        timeout / 3,
        '情感分析超时'
      );
      console.log('情感分析完成:', sentiment);

      // 步骤3: 生成图片提示词
      console.log('生成图片提示词...');
      imagePrompt = await this.withTimeout(
        ClaudeService.generateImagePrompt(transcript, sentiment, context, imageStyle),
        timeout / 4,
        '图片提示词生成超时'
      );
      console.log('图片提示词生成完成:', imagePrompt);

      // 步骤4: 生成图片（可选）
      if (enableImageGeneration) {
        console.log('开始生成图片...');
        try {
          const imageResult = await this.withTimeout(
            useAmazonServices 
              ? this.novaCanvasService.generateImage(transcript, sentiment, { style: imageStyle as any })
              : this.generateImageViaAPI({
                  prompt: imagePrompt,
                  style: imageStyle,
                  width: 512,
                  height: 512,
                }),
            timeout / 2,
            '图片生成超时'
          );

          if (useAmazonServices) {
            generatedImage = {
              id: `img_${Date.now()}`,
              voiceRecordId: `voice_${Date.now()}`,
              url: imageResult.url,
              prompt: imageResult.prompt,
              style: imageResult.style as any,
              createdAt: new Date(),
            };
          } else {
            generatedImage = {
              id: `img_${Date.now()}`,
              voiceRecordId: `voice_${Date.now()}`,
              url: (imageResult as any).imageUrl,
              prompt: imagePrompt,
              style: imageStyle as any,
              createdAt: new Date(),
            };
          }
          console.log('图片生成完成:', generatedImage.url);
        } catch (imageError) {
          console.warn('图片生成失败，但继续处理:', imageError);
          // 图片生成失败不影响整体流程
        }
      }

      return {
        transcript,
        sentiment,
        imagePrompt,
        generatedImage,
      };

    } catch (error) {
      console.error('AI 服务处理失败:', error);
      throw new Error(`AI 处理失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 仅进行情感分析（不生成图片）
   */
  static async analyzeSentimentOnly(
    audioBlob: Blob,
    context?: Context
  ): Promise<{ transcript: string; sentiment: SentimentAnalysis }> {
    try {
      // 语音转文字
      const transcriptionResult = await SpeechService.transcribeAudio(audioBlob);
      
      if (!SpeechService.validateTranscription(transcriptionResult)) {
        throw new Error('语音转文字结果质量不佳');
      }

      // 情感分析
      const sentiment = await ClaudeService.analyzeSentiment(
        transcriptionResult.text,
        context
      );

      return {
        transcript: transcriptionResult.text,
        sentiment,
      };
    } catch (error) {
      console.error('情感分析失败:', error);
      throw new Error(`情感分析失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 仅生成图片
   */
  static async generateImageOnly(
    transcript: string,
    sentiment: SentimentAnalysis,
    context?: Context,
    style: string = 'abstract'
  ): Promise<GeneratedImage> {
    try {
      // 生成图片提示词
      const imagePrompt = await ClaudeService.generateImagePrompt(
        transcript,
        sentiment,
        context,
        style
      );

      // 生成图片 - 通过API路由调用，避免在前端访问AWS凭证
      const novaResponse = await this.generateImageViaAPI({
        prompt: imagePrompt,
        style,
        width: 512,
        height: 512,
      });

      return {
        id: `img_${Date.now()}`,
        voiceRecordId: `voice_${Date.now()}`,
        url: novaResponse.imageUrl,
        prompt: imagePrompt,
        style: style as any,
        createdAt: new Date(),
      };
    } catch (error) {
      console.error('图片生成失败:', error);
      throw new Error(`图片生成失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 批量生成多种风格的图片
   */
  static async generateMultipleStyles(
    transcript: string,
    sentiment: SentimentAnalysis,
    context?: Context,
    styles: string[] = ['abstract', 'artistic', 'minimalist']
  ): Promise<GeneratedImage[]> {
    const promises = styles.map(style =>
      this.generateImageOnly(transcript, sentiment, context, style)
        .catch(error => {
          console.warn(`生成 ${style} 风格图片失败:`, error);
          return null;
        })
    );

    const results = await Promise.all(promises);
    return results.filter((result): result is GeneratedImage => result !== null);
  }

  /**
   * 重新生成图片（使用不同的种子值）
   */
  static async regenerateImage(
    imagePrompt: string,
    style: string = 'abstract'
  ): Promise<GeneratedImage> {
    try {
      const novaResponse = await this.generateImageViaAPI({
        prompt: imagePrompt,
        style,
        width: 512,
        height: 512,
      });

      return {
        id: `img_${Date.now()}`,
        voiceRecordId: `voice_${Date.now()}`,
        url: novaResponse.imageUrl,
        prompt: imagePrompt,
        style: style as any,
        createdAt: new Date(),
      };
    } catch (error) {
      console.error('重新生成图片失败:', error);
      throw new Error(`重新生成图片失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 获取处理进度（模拟）
   */
  static async getProcessingProgress(taskId: string): Promise<{
    progress: number;
    stage: string;
    completed: boolean;
  }> {
    // 这里可以实现真实的进度跟踪
    // 暂时返回模拟数据
    return {
      progress: 100,
      stage: 'completed',
      completed: true,
    };
  }

  /**
   * 通过API路由生成图片（避免在前端访问AWS凭证）
   */
  private static async generateImageViaAPI(request: {
    prompt: string;
    style?: string;
    width?: number;
    height?: number;
  }): Promise<{ imageUrl: string; imageData?: string; metadata: any }> {
    console.log('🎨 通过API路由生成图片:', {
      prompt: request.prompt.substring(0, 100) + (request.prompt.length > 100 ? '...' : ''),
      style: request.style
    });

    try {
      const response = await fetch('/api/image/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`图片生成API调用失败: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log('✅ API路由图片生成成功，响应数据:', result);
      
      // API返回的数据结构是 { success: true, data: {...} }
      const imageData = result.data || result;
      
      return {
        imageUrl: imageData.imageUrl,
        imageData: imageData.imageData,
        metadata: imageData.metadata
      };
    } catch (error) {
      console.error('❌ API路由图片生成失败:', error);
      throw error;
    }
  }

  /**
   * 验证 AI 服务配置
   */
  static validateConfiguration(): {
    isValid: boolean;
    missingServices: string[];
    warnings: string[];
  } {
    const missingServices: string[] = [];
    const warnings: string[] = [];

    // 检查 Claude API
    if (!process.env.CLAUDE_API_KEY) {
      missingServices.push('Claude API Key');
    }

    // 检查 AWS 配置
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
      missingServices.push('AWS Credentials');
    }

    // 检查浏览器支持
    if (typeof window !== 'undefined') {
      if (!navigator.mediaDevices?.getUserMedia) {
        warnings.push('浏览器不支持音频录制');
      }

      if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        warnings.push('浏览器不支持语音识别');
      }
    }

    return {
      isValid: missingServices.length === 0,
      missingServices,
      warnings,
    };
  }

  /**
   * 超时包装器
   */
  private static withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    errorMessage: string
  ): Promise<T> {
    return Promise.race([
      promise,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
      ),
    ]);
  }

  /**
   * 获取服务状态
   */
  static async getServiceStatus(): Promise<{
    speech: boolean;
    sentiment: boolean;
    imageGeneration: boolean;
  }> {
    const status = {
      speech: false,
      sentiment: false,
      imageGeneration: false,
    };

    try {
      // 测试语音服务
      const mockBlob = new Blob(['test'], { type: 'audio/wav' });
      await SpeechService.transcribeAudio(mockBlob);
      status.speech = true;
    } catch {
      // 语音服务不可用
    }

    try {
      // 测试情感分析服务
      await ClaudeService.analyzeSentiment('测试文本');
      status.sentiment = true;
    } catch {
      // 情感分析服务不可用
    }

    try {
      // 测试图片生成服务 - 通过API路由
      await this.generateImageViaAPI({ prompt: 'test prompt' });
      status.imageGeneration = true;
    } catch {
      // 图片生成服务不可用
    }

    return status;
  }
}
