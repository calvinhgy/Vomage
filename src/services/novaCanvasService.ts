/**
 * Amazon Nova Canvas 图片生成服务
 * 使用Amazon Titan Image Generator生成个性化心情图片
 */

import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

interface NovaCanvasRequest {
  sentiment: {
    mood: string;
    confidence: number;
    details: {
      positive: number;
      negative: number;
      neutral: number;
    };
  };
  context?: {
    weather?: string;
    timeOfDay?: string;
    location?: string;
  };
  style?: 'abstract' | 'realistic' | 'artistic' | 'minimalist';
}

interface NovaCanvasResult {
  id: string;
  voiceRecordId: string;
  url: string;
  prompt: string;
  style: string;
  metadata: {
    model: string;
    generatedAt: Date;
    processingTime: number;
  };
  createdAt: Date;
}

export class NovaCanvasService {
  private bedrockClient: BedrockRuntimeClient;
  private s3Client: S3Client;
  private region: string;
  private bucketName: string;

  constructor() {
    this.region = process.env.AWS_REGION || 'us-east-1';
    this.bucketName = process.env.AWS_S3_IMAGE_BUCKET || 'vomage-generated-images';

    // 初始化AWS客户端
    const awsConfig = {
      region: this.region,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    };

    this.bedrockClient = new BedrockRuntimeClient(awsConfig);
    this.s3Client = new S3Client(awsConfig);
  }

  /**
   * 使用Amazon Titan Image Generator生成心情图片
   */
  async generateMoodImage(request: NovaCanvasRequest, voiceRecordId: string): Promise<NovaCanvasResult> {
    const startTime = Date.now();
    
    try {
      console.log('开始Titan Image Generator图片生成...');
      console.log('生成参数:', request);

      // 1. 生成图片提示词
      const prompt = this.generateImagePrompt(request);
      console.log('图片提示词:', prompt);

      // 2. 调用Titan Image Generator生成图片
      const imageData = await this.invokeTitanImageGenerator(prompt, request.style || 'abstract');

      // 3. 上传图片到S3
      const imageUrl = await this.uploadImageToS3(imageData, voiceRecordId);

      const processingTime = Date.now() - startTime;
      
      const result: NovaCanvasResult = {
        id: `titan_img_${Date.now()}`,
        voiceRecordId,
        url: imageUrl,
        prompt,
        style: request.style || 'abstract',
        metadata: {
          model: 'amazon.titan-image-generator-v1:0',
          generatedAt: new Date(),
          processingTime,
        },
        createdAt: new Date(),
      };

      console.log('Titan Image Generator图片生成完成:', result);
      return result;

    } catch (error) {
      console.error('Titan Image Generator图片生成失败:', error);
      
      // 返回本地备用图片
      return this.getFallbackImage(request, voiceRecordId);
    }
  }

  /**
   * 生成图片提示词
   */
  private generateImagePrompt(request: NovaCanvasRequest): string {
    const { sentiment, context, style } = request;
    
    // 基础情感描述
    const moodDescriptions = {
      happy: 'bright, joyful, warm colors, uplifting energy, sunshine, smiling elements',
      sad: 'cool blues, gentle rain, soft melancholy, peaceful solitude, contemplative mood',
      angry: 'intense reds, dynamic movement, powerful energy, storm elements, bold contrasts',
      calm: 'serene blues and greens, peaceful water, gentle waves, tranquil atmosphere',
      excited: 'vibrant colors, dynamic movement, celebration, fireworks, energetic patterns',
      thoughtful: 'deep purples and blues, contemplative elements, books, quiet spaces, introspection',
      peaceful: 'soft pastels, nature elements, gentle breeze, harmony, balance',
    };

    // 风格描述
    const styleDescriptions = {
      abstract: 'abstract art, flowing shapes, artistic interpretation, non-representational',
      realistic: 'photorealistic, detailed, natural lighting, high definition',
      artistic: 'painterly style, artistic brushstrokes, creative interpretation',
      minimalist: 'clean lines, simple composition, minimal elements, elegant simplicity',
    };

    // 上下文描述
    let contextDescription = '';
    if (context) {
      if (context.weather) {
        contextDescription += `, ${context.weather} weather`;
      }
      if (context.timeOfDay) {
        contextDescription += `, ${context.timeOfDay} lighting`;
      }
    }

    // 组合提示词
    const moodDesc = moodDescriptions[sentiment.mood as keyof typeof moodDescriptions] || moodDescriptions.calm;
    const styleDesc = styleDescriptions[style as keyof typeof styleDescriptions] || styleDescriptions.abstract;
    
    return `${styleDesc}, ${moodDesc}${contextDescription}, high quality, artistic composition, emotional expression, beautiful colors, professional artwork`;
  }

  /**
   * 调用Titan Image Generator API
   */
  private async invokeTitanImageGenerator(prompt: string, style: string): Promise<Buffer> {
    try {
      const requestBody = {
        taskType: 'TEXT_IMAGE',
        textToImageParams: {
          text: prompt,
          negativeText: 'low quality, blurry, distorted, ugly, bad composition, text, watermark',
        },
        imageGenerationConfig: {
          numberOfImages: 1,
          height: 512,
          width: 512,
          cfgScale: 8.0,
          seed: Math.floor(Math.random() * 1000000),
          quality: 'premium',
        },
      };

      console.log('Titan请求参数:', requestBody);

      const command = new InvokeModelCommand({
        modelId: 'amazon.titan-image-generator-v1:0',
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify(requestBody),
      });

      const response = await this.bedrockClient.send(command);
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));
      
      console.log('Titan响应:', responseBody);
      
      // 提取图片数据
      const imageBase64 = responseBody.images?.[0] || responseBody.image;
      if (!imageBase64) {
        throw new Error('Titan Image Generator未返回图片数据');
      }

      // 转换为Buffer
      const imageBuffer = Buffer.from(imageBase64, 'base64');
      console.log('Titan图片生成成功，大小:', imageBuffer.length, 'bytes');
      
      return imageBuffer;

    } catch (error) {
      console.error('调用Titan Image Generator失败:', error);
      throw error;
    }
  }

  /**
   * 上传图片到S3
   */
  private async uploadImageToS3(imageBuffer: Buffer, voiceRecordId: string): Promise<string> {
    try {
      const imageKey = `mood-images/${voiceRecordId}/${Date.now()}.png`;
      
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: imageKey,
        Body: imageBuffer,
        ContentType: 'image/png',
      });

      await this.s3Client.send(command);
      
      // 返回S3 URL（注意：需要配置桶策略或使用预签名URL）
      const imageUrl = `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${imageKey}`;
      console.log('图片已上传到S3:', imageUrl);
      
      return imageUrl;

    } catch (error) {
      console.error('上传图片到S3失败:', error);
      throw error;
    }
  }

  /**
   * 获取备用图片（本地SVG）
   */
  private getFallbackImage(request: NovaCanvasRequest, voiceRecordId: string): NovaCanvasResult {
    const moodImages = {
      happy: '/images/mood-happy.svg',
      sad: '/images/mood-sad.svg',
      angry: '/images/mood-angry.svg',
      calm: '/images/mood-calm.svg',
      excited: '/images/mood-excited.svg',
      thoughtful: '/images/mood-thoughtful.svg',
      peaceful: '/images/mood-peaceful.svg',
    };

    const fallbackUrl = moodImages[request.sentiment.mood as keyof typeof moodImages] || moodImages.calm;

    return {
      id: `fallback_img_${Date.now()}`,
      voiceRecordId,
      url: fallbackUrl,
      prompt: `Fallback image for ${request.sentiment.mood} mood`,
      style: request.style || 'abstract',
      metadata: {
        model: 'local-svg-fallback',
        generatedAt: new Date(),
        processingTime: 0,
      },
      createdAt: new Date(),
    };
  }

  /**
   * 批量生成多种风格的图片
   */
  async generateMultipleStyles(
    request: NovaCanvasRequest, 
    voiceRecordId: string,
    styles: string[] = ['abstract', 'artistic', 'minimalist']
  ): Promise<NovaCanvasResult[]> {
    const results: NovaCanvasResult[] = [];

    for (const style of styles) {
      try {
        const styleRequest = { ...request, style };
        const result = await this.generateMoodImage(styleRequest, voiceRecordId);
        results.push(result);
      } catch (error) {
        console.error(`生成${style}风格图片失败:`, error);
        // 继续生成其他风格
      }
    }

    return results;
  }

  /**
   * 检查服务可用性
   */
  async checkServiceHealth(): Promise<boolean> {
    try {
      // 简单的健康检查 - 生成一个小的测试图片
      const testPrompt = 'simple abstract art, health check';
      
      const requestBody = {
        taskType: 'TEXT_IMAGE',
        textToImageParams: {
          text: testPrompt,
        },
        imageGenerationConfig: {
          numberOfImages: 1,
          height: 256,
          width: 256,
          quality: 'standard',
        },
      };

      const command = new InvokeModelCommand({
        modelId: 'amazon.titan-image-generator-v1:0',
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify(requestBody),
      });

      await this.bedrockClient.send(command);
      return true;
    } catch (error) {
      console.error('Titan Image Generator服务健康检查失败:', error);
      return false;
    }
  }
}

export const novaCanvasService = new NovaCanvasService();
