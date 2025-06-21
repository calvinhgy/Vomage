/**
 * Amazon Nova 图片生成服务
 * 仅使用Amazon Bedrock Nova Canvas生成图片，不接受其他模型
 */

import { BedrockNovaService } from './bedrockNova';

export interface NovaImageRequest {
  prompt: string;
  style?: string;
  width?: number;
  height?: number;
  quality?: 'standard' | 'hd';
}

export interface NovaImageResponse {
  imageUrl: string;
  imageData?: string; // base64 encoded
  metadata: {
    prompt: string;
    style: string;
    dimensions: {
      width: number;
      height: number;
    };
    generatedAt: Date;
    model?: string;
  };
}

export class NovaService {
  private static readonly AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
  private static readonly AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;
  private static readonly AWS_REGION = process.env.AWS_REGION || 'us-east-1';
  private static readonly NOVA_MODEL_ID = 'amazon.nova-canvas-v1:0'; // 固定使用Nova Canvas

  /**
   * 生成图片 - 仅使用Amazon Bedrock Nova Canvas
   * 重要：不接受使用其他模型
   */
  static async generateImage(request: NovaImageRequest): Promise<NovaImageResponse> {
    console.log('🚀 开始使用Amazon Bedrock Nova Canvas生成图片...');
    console.log('📝 重要说明: 仅使用Amazon Nova Canvas模型 (amazon.nova-canvas-v1:0)');
    console.log('📝 不接受使用其他任何图片生成模型');
    console.log('📝 请求参数:', {
      prompt: request.prompt.substring(0, 100) + (request.prompt.length > 100 ? '...' : ''),
      style: request.style,
      dimensions: { width: request.width || 512, height: request.height || 512 }
    });

    const {
      prompt,
      style = 'photorealistic',
      width = 512,
      height = 512,
      quality = 'standard'
    } = request;

    // 仅使用Amazon Bedrock Nova Canvas生成图片
    console.log('🎨 调用Amazon Bedrock Nova Canvas (amazon.nova-canvas-v1:0)...');
    
    try {
      const response = await BedrockNovaService.generateImage({
        prompt,
        width,
        height,
        style,
        quality
      });

      console.log('✅ Amazon Bedrock Nova Canvas图片生成成功!');
      console.log('🎨 确认使用模型: amazon.nova-canvas-v1:0');
      console.log('📊 图片大小:', response.imageData.length, '字符');

      return {
        imageUrl: response.imageUrl,
        imageData: response.imageData,
        metadata: {
          prompt,
          style,
          dimensions: { width, height },
          generatedAt: new Date(),
          model: 'amazon.nova-canvas-v1:0'
        }
      };

    } catch (error) {
      console.error('❌ Amazon Nova Canvas图片生成失败:', error);
      console.error('🚫 不使用其他模型进行回退，仅使用Amazon Nova Canvas');
      
      // 重新抛出错误，不进行回退
      throw new Error(`Amazon Nova Canvas图片生成失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 检查Amazon Nova Canvas服务可用性
   */
  static async checkNovaCanvasHealth(): Promise<boolean> {
    try {
      console.log('🔍 检查Amazon Nova Canvas服务可用性...');
      const isHealthy = await BedrockNovaService.checkServiceHealth();
      console.log('📊 Amazon Nova Canvas服务状态:', isHealthy ? '可用' : '不可用');
      return isHealthy;
    } catch (error) {
      console.error('❌ Amazon Nova Canvas健康检查失败:', error);
      return false;
    }
  }

  /**
   * 获取支持的模型信息
   */
  static getSupportedModel(): string {
    return 'amazon.nova-canvas-v1:0';
  }

  /**
   * 验证是否使用正确的模型
   */
  static validateModel(modelId: string): boolean {
    const supportedModel = this.getSupportedModel();
    const isValid = modelId === supportedModel;
    
    if (!isValid) {
      console.error('🚫 不支持的模型:', modelId);
      console.error('✅ 仅支持的模型:', supportedModel);
    }
    
    return isValid;
  }
}
