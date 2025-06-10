/**
 * Amazon Nova AI 图像生成服务
 */

import { 
  BedrockRuntimeClient, 
  InvokeModelCommand,
  InvokeModelCommandInput 
} from '@aws-sdk/client-bedrock-runtime';

// 初始化 Bedrock 客户端
const bedrockClient = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export interface NovaImageGenerationParams {
  prompt: string;
  style?: string;
  width?: number;
  height?: number;
  quality?: 'standard' | 'premium';
  seed?: number;
}

export interface NovaImageResponse {
  imageUrl: string;
  seed: number;
  prompt: string;
}

export class NovaService {
  /**
   * 生成图像
   */
  static async generateImage(params: NovaImageGenerationParams): Promise<NovaImageResponse> {
    try {
      const {
        prompt,
        style = 'abstract',
        width = 512,
        height = 512,
        quality = 'standard',
        seed
      } = params;

      // 构建 Nova 请求参数
      const requestBody = {
        taskType: 'TEXT_IMAGE',
        textToImageParams: {
          text: prompt,
          negativeText: 'blurry, low quality, distorted, ugly, bad anatomy, extra limbs, text, watermark',
          images: [],
        },
        imageGenerationConfig: {
          numberOfImages: 1,
          quality: quality,
          height: height,
          width: width,
          cfgScale: 7.0,
          seed: seed || Math.floor(Math.random() * 1000000),
        }
      };

      const command: InvokeModelCommandInput = {
        modelId: 'amazon.nova-lite-v1:0',
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify(requestBody),
      };

      const response = await bedrockClient.send(new InvokeModelCommand(command));
      
      if (!response.body) {
        throw new Error('No response body from Nova API');
      }

      // 解析响应
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));
      
      if (responseBody.error) {
        throw new Error(`Nova API error: ${responseBody.error}`);
      }

      // 提取生成的图像数据
      const imageData = responseBody.images?.[0];
      if (!imageData) {
        throw new Error('No image data in Nova response');
      }

      // 将 base64 图像数据转换为可访问的 URL
      const imageUrl = await this.uploadImageToS3(imageData, `nova-${Date.now()}.png`);

      return {
        imageUrl,
        seed: requestBody.imageGenerationConfig.seed,
        prompt: prompt,
      };

    } catch (error) {
      console.error('Nova image generation error:', error);
      throw new Error(`图像生成失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 批量生成图像
   */
  static async generateMultipleImages(
    params: NovaImageGenerationParams,
    count: number = 3
  ): Promise<NovaImageResponse[]> {
    const promises = Array.from({ length: count }, (_, index) => 
      this.generateImage({
        ...params,
        seed: params.seed ? params.seed + index : undefined,
      })
    );

    try {
      const results = await Promise.allSettled(promises);
      
      return results
        .filter((result): result is PromiseFulfilledResult<NovaImageResponse> => 
          result.status === 'fulfilled'
        )
        .map(result => result.value);
    } catch (error) {
      console.error('Batch image generation error:', error);
      throw new Error('批量图像生成失败');
    }
  }

  /**
   * 根据情感优化提示词
   */
  static optimizePromptForMood(basePrompt: string, mood: string): string {
    const moodEnhancements = {
      happy: 'vibrant, cheerful, bright lighting, warm colors, uplifting atmosphere',
      sad: 'melancholic, soft blues and grays, gentle lighting, contemplative mood',
      angry: 'intense, dramatic, bold reds and oranges, strong contrasts, powerful energy',
      excited: 'dynamic, energetic, bright colors, movement, celebration, sparkling',
      calm: 'peaceful, serene, soft pastels, tranquil, harmonious, gentle',
      anxious: 'uncertain, swirling, muted tones, soft edges, introspective',
      neutral: 'balanced, natural colors, stable composition, moderate lighting'
    };

    const enhancement = moodEnhancements[mood as keyof typeof moodEnhancements] || moodEnhancements.neutral;
    
    return `${basePrompt}, ${enhancement}`;
  }

  /**
   * 上传图像到 S3
   */
  private static async uploadImageToS3(imageData: string, fileName: string): Promise<string> {
    try {
      // 这里应该实现实际的 S3 上传逻辑
      // 暂时返回一个模拟的 URL
      
      // 在实际应用中，你需要：
      // 1. 将 base64 数据转换为 Buffer
      // 2. 使用 AWS S3 SDK 上传文件
      // 3. 返回公开访问的 URL
      
      const buffer = Buffer.from(imageData, 'base64');
      
      // 模拟 S3 上传过程
      const mockS3Url = `https://vomage-storage.s3.amazonaws.com/images/${fileName}`;
      
      // 实际的 S3 上传代码应该在这里
      // const uploadParams = {
      //   Bucket: process.env.AWS_S3_BUCKET_NAME!,
      //   Key: `images/${fileName}`,
      //   Body: buffer,
      //   ContentType: 'image/png',
      //   ACL: 'public-read',
      // };
      // 
      // const uploadResult = await s3Client.upload(uploadParams).promise();
      // return uploadResult.Location;

      return mockS3Url;
      
    } catch (error) {
      console.error('S3 upload error:', error);
      throw new Error('图像上传失败');
    }
  }

  /**
   * 验证图像生成参数
   */
  static validateGenerationParams(params: NovaImageGenerationParams): boolean {
    const { prompt, width = 512, height = 512 } = params;

    // 检查提示词
    if (!prompt || prompt.trim().length === 0) {
      throw new Error('提示词不能为空');
    }

    if (prompt.length > 1000) {
      throw new Error('提示词过长，请控制在1000字符以内');
    }

    // 检查图像尺寸
    const validSizes = [256, 512, 768, 1024];
    if (!validSizes.includes(width) || !validSizes.includes(height)) {
      throw new Error('图像尺寸必须是 256, 512, 768, 或 1024');
    }

    return true;
  }

  /**
   * 获取支持的图像风格
   */
  static getSupportedStyles(): string[] {
    return [
      'abstract',
      'realistic', 
      'artistic',
      'minimalist',
      'cartoon',
      'watercolor',
      'oil-painting',
      'digital-art',
      'photography',
      'sketch'
    ];
  }

  /**
   * 获取推荐的图像尺寸
   */
  static getRecommendedSizes(): Array<{ width: number; height: number; label: string }> {
    return [
      { width: 512, height: 512, label: '正方形 (1:1)' },
      { width: 768, height: 512, label: '横向 (3:2)' },
      { width: 512, height: 768, label: '纵向 (2:3)' },
      { width: 1024, height: 1024, label: '高清正方形 (1:1)' },
    ];
  }
}
