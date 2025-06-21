/**
 * Amazon Bedrock Nova Canvas 图片生成服务 - 修复版本
 * 使用真实的AI模型生成高质量图片
 */

import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

export interface NovaCanvasRequest {
  prompt: string;
  width?: number;
  height?: number;
  style?: string;
  quality?: string;
}

export interface NovaCanvasResponse {
  imageUrl: string;
  imageData: string;
  metadata: {
    prompt: string;
    style: string;
    dimensions: { width: number; height: number };
    generatedAt: Date;
    model: string;
  };
}

export class BedrockNovaService {
  private static client: BedrockRuntimeClient;

  /**
   * 初始化Bedrock客户端
   */
  private static getClient(): BedrockRuntimeClient {
    if (!this.client) {
      console.log('🔧 初始化Bedrock客户端...');
      
      // 获取环境变量
      const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
      const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
      const region = process.env.AWS_REGION || 'us-east-1';
      
      console.log('🔑 AWS凭证信息:', {
        accessKeyId: accessKeyId ? `${accessKeyId.substring(0, 8)}...` : 'undefined',
        secretAccessKey: secretAccessKey ? `${secretAccessKey.substring(0, 8)}...` : 'undefined',
        region,
        envCheck: {
          hasAccessKey: !!accessKeyId,
          hasSecretKey: !!secretAccessKey,
          keyLength: accessKeyId?.length || 0,
          secretLength: secretAccessKey?.length || 0
        }
      });
      
      if (!accessKeyId || !secretAccessKey) {
        console.error('❌ AWS凭证缺失:', {
          AWS_ACCESS_KEY_ID: !!accessKeyId,
          AWS_SECRET_ACCESS_KEY: !!secretAccessKey
        });
        throw new Error('AWS凭证未配置: AWS_ACCESS_KEY_ID或AWS_SECRET_ACCESS_KEY缺失');
      }
      
      // 验证凭证格式
      if (accessKeyId.length < 16 || secretAccessKey.length < 20) {
        console.error('❌ AWS凭证格式可能不正确:', {
          accessKeyIdLength: accessKeyId.length,
          secretAccessKeyLength: secretAccessKey.length
        });
        throw new Error('AWS凭证格式不正确');
      }
      
      try {
        this.client = new BedrockRuntimeClient({
          region: region,
          credentials: {
            accessKeyId: accessKeyId,
            secretAccessKey: secretAccessKey,
          },
          maxAttempts: 3,
          requestHandler: {
            requestTimeout: 30000,
            httpsAgent: undefined
          }
        });
        
        console.log('✅ Bedrock客户端初始化完成');
      } catch (error) {
        console.error('❌ Bedrock客户端初始化失败:', error);
        throw error;
      }
    }
    return this.client;
  }

  /**
   * 使用Amazon Nova Canvas生成图片
   */
  static async generateImage(request: NovaCanvasRequest): Promise<NovaCanvasResponse> {
    const {
      prompt,
      width = 512,
      height = 512,
      style = 'photorealistic',
      quality = 'standard'
    } = request;

    console.log('🎨 开始使用Amazon Nova Canvas生成图片...');
    console.log('📝 提示词:', prompt);
    console.log('📐 尺寸:', { width, height });
    console.log('🎭 风格:', style);

    try {
      const client = this.getClient();

      // 构建Nova Canvas请求 - 使用正确的格式
      const modelRequest = {
        taskType: 'TEXT_IMAGE',
        textToImageParams: {
          text: prompt
        },
        imageGenerationConfig: {
          numberOfImages: 1,
          quality: 'standard',
          height: height,
          width: width,
          cfgScale: 8.0,
          seed: Math.floor(Math.random() * 2147483647)
        }
      };

      console.log('🚀 发送请求到Amazon Nova Canvas...');
      console.log('📝 请求体:', JSON.stringify(modelRequest, null, 2));

      const command = new InvokeModelCommand({
        modelId: 'amazon.nova-canvas-v1:0',
        body: JSON.stringify(modelRequest),
        contentType: 'application/json',
        accept: 'application/json'
      });

      const response = await client.send(command);

      if (!response.body) {
        throw new Error('Nova Canvas响应为空');
      }

      // 解析响应
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));
      console.log('📦 Nova Canvas响应结构:', Object.keys(responseBody));

      if (!responseBody.images || responseBody.images.length === 0) {
        throw new Error('Nova Canvas未返回图片数据');
      }

      // 修复：Nova Canvas返回的是base64字符串数组，不是对象
      const base64Image = responseBody.images[0];
      console.log('📦 图片数据类型:', typeof base64Image);
      console.log('📦 图片数据长度:', base64Image?.length || 0);
      
      // 检查是否是字符串类型的base64数据
      if (typeof base64Image !== 'string') {
        console.error('❌ 图片数据不是字符串类型:', typeof base64Image);
        throw new Error('Nova Canvas返回的图片数据格式不正确');
      }

      console.log('✅ Amazon Nova Canvas图片生成成功!');
      console.log('📊 图片数据大小:', base64Image.length, '字符');

      return {
        imageUrl: `data:image/png;base64,${base64Image}`,
        imageData: base64Image,
        metadata: {
          prompt,
          style,
          dimensions: { width, height },
          generatedAt: new Date(),
          model: 'amazon.nova-canvas-v1:0'
        }
      };

    } catch (error) {
      console.error('❌ Amazon Nova Canvas生成失败:', error);
      
      // 如果Nova Canvas失败，回退到算法生成
      console.log('🔄 回退到算法生成...');
      return this.fallbackGeneration(request);
    }
  }

  /**
   * 回退到算法生成（如果Nova Canvas失败）
   */
  private static async fallbackGeneration(request: NovaCanvasRequest): Promise<NovaCanvasResponse> {
    const {
      prompt,
      width = 512,
      height = 512,
      style = 'abstract'
    } = request;

    console.log('🎨 使用回退算法生成图片...');

    // 生成一个改进的算法图片
    const algorithmicImage = this.generateImprovedAlgorithmicImage(width, height, prompt, style);

    return {
      imageUrl: `data:image/svg+xml;base64,${algorithmicImage}`,
      imageData: algorithmicImage,
      metadata: {
        prompt,
        style,
        dimensions: { width, height },
        generatedAt: new Date(),
        model: 'algorithmic-fallback'
      }
    };
  }

  /**
   * 生成改进的算法图片
   */
  private static generateImprovedAlgorithmicImage(
    width: number,
    height: number,
    prompt: string,
    style: string
  ): string {
    console.log('🎨 生成改进的算法图片:', { width, height, prompt: prompt.substring(0, 50) });

    // 根据提示词选择图片类型
    const lowerPrompt = prompt.toLowerCase();
    
    if (lowerPrompt.includes('blue sky') || lowerPrompt.includes('sky')) {
      return this.generateSkyImage(width, height);
    } else if (lowerPrompt.includes('ocean') || lowerPrompt.includes('sea') || lowerPrompt.includes('water')) {
      return this.generateOceanImage(width, height);
    } else if (lowerPrompt.includes('mountain') || lowerPrompt.includes('landscape')) {
      return this.generateMountainImage(width, height);
    } else if (lowerPrompt.includes('flower') || lowerPrompt.includes('garden')) {
      return this.generateFlowerImage(width, height);
    } else if (lowerPrompt.includes('sun') || lowerPrompt.includes('light')) {
      return this.generateSunlightImage(width, height);
    } else {
      return this.generateAbstractImage(width, height);
    }
  }

  /**
   * 生成天空图片
   */
  private static generateSkyImage(width: number, height: number): string {
    const svg = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="skyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style="stop-color:#87CEEB;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#E0F6FF;stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#skyGradient)"/>
        <circle cx="100" cy="80" r="30" fill="white" opacity="0.8"/>
        <circle cx="200" cy="120" r="25" fill="white" opacity="0.7"/>
        <circle cx="300" cy="90" r="35" fill="white" opacity="0.6"/>
      </svg>
    `;
    return Buffer.from(svg).toString('base64');
  }

  /**
   * 生成海洋图片
   */
  private static generateOceanImage(width: number, height: number): string {
    const svg = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="oceanGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style="stop-color:#006994;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#0099CC;stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#oceanGradient)"/>
        <path d="M0,${height*0.7} Q${width*0.25},${height*0.6} ${width*0.5},${height*0.7} T${width},${height*0.6} V${height} H0 Z" fill="#4DC8FF" opacity="0.6"/>
      </svg>
    `;
    return Buffer.from(svg).toString('base64');
  }

  /**
   * 生成山脉图片
   */
  private static generateMountainImage(width: number, height: number): string {
    const svg = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="mountainGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style="stop-color:#87CEEB;stop-opacity:1" />
            <stop offset="50%" style="stop-color:#98FB98;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#228B22;stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#mountainGradient)"/>
        <polygon points="0,${height} ${width*0.3},${height*0.3} ${width*0.6},${height*0.5} ${width},${height}" fill="#8B4513" opacity="0.8"/>
        <polygon points="${width*0.2},${height} ${width*0.5},${height*0.4} ${width*0.8},${height*0.6} ${width},${height}" fill="#A0522D" opacity="0.7"/>
      </svg>
    `;
    return Buffer.from(svg).toString('base64');
  }

  /**
   * 生成花朵图片
   */
  private static generateFlowerImage(width: number, height: number): string {
    const svg = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#90EE90"/>
        <circle cx="${width*0.3}" cy="${height*0.4}" r="40" fill="#FF69B4" opacity="0.8"/>
        <circle cx="${width*0.7}" cy="${height*0.6}" r="35" fill="#FFB6C1" opacity="0.8"/>
        <circle cx="${width*0.5}" cy="${height*0.3}" r="30" fill="#FF1493" opacity="0.8"/>
        <rect x="${width*0.45}" y="${height*0.6}" width="10" height="${height*0.3}" fill="#228B22"/>
      </svg>
    `;
    return Buffer.from(svg).toString('base64');
  }

  /**
   * 生成阳光图片
   */
  private static generateSunlightImage(width: number, height: number): string {
    const svg = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="sunGradient" cx="50%" cy="30%" r="50%">
            <stop offset="0%" style="stop-color:#FFD700;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#FFA500;stop-opacity:0.3" />
          </radialGradient>
        </defs>
        <rect width="100%" height="100%" fill="#87CEEB"/>
        <circle cx="${width*0.5}" cy="${height*0.3}" r="60" fill="url(#sunGradient)"/>
        <g stroke="#FFD700" stroke-width="3" opacity="0.8">
          <line x1="${width*0.5}" y1="50" x2="${width*0.5}" y2="10"/>
          <line x1="${width*0.7}" y1="${height*0.2}" x2="${width*0.75}" y2="${height*0.15}"/>
          <line x1="${width*0.3}" y1="${height*0.2}" x2="${width*0.25}" y2="${height*0.15}"/>
        </g>
      </svg>
    `;
    return Buffer.from(svg).toString('base64');
  }

  /**
   * 生成抽象图片
   */
  private static generateAbstractImage(width: number, height: number): string {
    const svg = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="abstractGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#FF6B6B;stop-opacity:0.8" />
            <stop offset="50%" style="stop-color:#4ECDC4;stop-opacity:0.8" />
            <stop offset="100%" style="stop-color:#45B7D1;stop-opacity:0.8" />
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#abstractGradient)"/>
        <circle cx="${width*0.3}" cy="${height*0.3}" r="50" fill="#FF9F43" opacity="0.7"/>
        <rect x="${width*0.6}" y="${height*0.5}" width="80" height="80" fill="#6C5CE7" opacity="0.6" transform="rotate(45 ${width*0.7} ${height*0.6})"/>
        <polygon points="${width*0.2},${height*0.8} ${width*0.4},${height*0.6} ${width*0.6},${height*0.9}" fill="#A29BFE" opacity="0.8"/>
      </svg>
    `;
    return Buffer.from(svg).toString('base64');
  }
}
