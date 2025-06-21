/**
 * 异步语音处理服务 - AWS优化版本
 * 使用SQS队列、Step Functions和并行处理
 */

import { SQSClient, SendMessageCommand, ReceiveMessageCommand, DeleteMessageCommand } from '@aws-sdk/client-sqs';
import { SFNClient, StartExecutionCommand } from '@aws-sdk/client-sfn';
import { TranscribeClient, StartTranscriptionJobCommand, GetTranscriptionJobCommand } from '@aws-sdk/client-transcribe';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';
import { ApiGatewayManagementApiClient, PostToConnectionCommand } from '@aws-sdk/client-apigatewaymanagementapi';
import Redis from 'ioredis';

// AWS客户端初始化
const sqsClient = new SQSClient({ region: process.env.AWS_REGION });
const sfnClient = new SFNClient({ region: process.env.AWS_REGION });
const transcribeClient = new TranscribeClient({ region: process.env.AWS_REGION });
const bedrockClient = new BedrockRuntimeClient({ region: process.env.AWS_REGION });
const s3Client = new S3Client({ region: process.env.AWS_REGION });
const eventBridgeClient = new EventBridgeClient({ region: process.env.AWS_REGION });

// Redis缓存客户端
const redis = new Redis({
  host: process.env.REDIS_ENDPOINT,
  port: 6379,
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
  lazyConnect: true
});

// 处理状态枚举
enum ProcessingStage {
  UPLOADED = 'uploaded',
  TRANSCRIBING = 'transcribing',
  ANALYZING = 'analyzing',
  GENERATING = 'generating',
  COMPLETE = 'complete',
  ERROR = 'error'
}

// 处理任务接口
interface VoiceProcessingJob {
  jobId: string;
  userId: string;
  audioUrl: string;
  audioHash: string;
  metadata: {
    duration: number;
    format: string;
    size: number;
    location?: GeoLocation;
    weather?: WeatherInfo;
    timestamp: string;
  };
  connectionId?: string; // WebSocket连接ID
}

// 处理状态接口
interface ProcessingStatus {
  jobId: string;
  stage: ProcessingStage;
  progress: number;
  message: string;
  estimatedTime?: number;
  result?: {
    transcription?: string;
    sentiment?: SentimentAnalysis;
    imageUrl?: string;
  };
  error?: {
    code: string;
    message: string;
    retryable: boolean;
  };
}

/**
 * 异步语音处理服务类
 */
export class AsyncVoiceProcessor {
  private readonly queueUrl: string;
  private readonly stateMachineArn: string;
  private readonly websocketEndpoint: string;

  constructor() {
    this.queueUrl = process.env.VOICE_PROCESSING_QUEUE_URL!;
    this.stateMachineArn = process.env.VOICE_PROCESSING_STATE_MACHINE_ARN!;
    this.websocketEndpoint = process.env.WEBSOCKET_ENDPOINT!;
  }

  /**
   * 提交语音处理任务
   */
  async submitJob(job: VoiceProcessingJob): Promise<string> {
    try {
      // 1. 检查缓存是否已有结果
      const cachedResult = await this.getCachedResult(job.audioHash);
      if (cachedResult) {
        await this.updateStatus(job.jobId, {
          jobId: job.jobId,
          stage: ProcessingStage.COMPLETE,
          progress: 100,
          message: '从缓存获取结果',
          result: cachedResult
        });
        return job.jobId;
      }

      // 2. 初始化处理状态
      await this.updateStatus(job.jobId, {
        jobId: job.jobId,
        stage: ProcessingStage.UPLOADED,
        progress: 0,
        message: '开始处理语音文件',
        estimatedTime: 10000 // 预估10秒
      });

      // 3. 启动Step Functions工作流
      const executionInput = {
        jobId: job.jobId,
        userId: job.userId,
        audioUrl: job.audioUrl,
        audioHash: job.audioHash,
        metadata: job.metadata,
        connectionId: job.connectionId
      };

      const startExecutionCommand = new StartExecutionCommand({
        stateMachineArn: this.stateMachineArn,
        name: `voice-processing-${job.jobId}`,
        input: JSON.stringify(executionInput)
      });

      await sfnClient.send(startExecutionCommand);

      // 4. 发送到SQS队列进行并行处理
      const sqsMessage = {
        QueueUrl: this.queueUrl,
        MessageBody: JSON.stringify(job),
        MessageAttributes: {
          JobType: {
            StringValue: 'voice-processing',
            DataType: 'String'
          },
          Priority: {
            StringValue: 'high',
            DataType: 'String'
          }
        }
      };

      await sqsClient.send(new SendMessageCommand(sqsMessage));

      return job.jobId;
    } catch (error) {
      console.error('提交处理任务失败:', error);
      await this.updateStatus(job.jobId, {
        jobId: job.jobId,
        stage: ProcessingStage.ERROR,
        progress: 0,
        message: '提交任务失败',
        error: {
          code: 'SUBMIT_ERROR',
          message: error.message,
          retryable: true
        }
      });
      throw error;
    }
  }

  /**
   * 并行处理语音文件
   */
  async processVoiceParallel(job: VoiceProcessingJob): Promise<void> {
    try {
      // 更新状态：开始处理
      await this.updateStatus(job.jobId, {
        jobId: job.jobId,
        stage: ProcessingStage.TRANSCRIBING,
        progress: 10,
        message: '开始语音转录和上下文分析',
        estimatedTime: 8000
      });

      // 并行执行：语音转录 + 上下文分析
      const [transcriptionResult, contextResult] = await Promise.all([
        this.transcribeAudio(job.audioUrl, job.jobId),
        this.analyzeContext(job.metadata)
      ]);

      // 更新状态：转录完成
      await this.updateStatus(job.jobId, {
        jobId: job.jobId,
        stage: ProcessingStage.ANALYZING,
        progress: 40,
        message: '语音转录完成，开始AI分析',
        estimatedTime: 5000
      });

      // AI情感分析和提示词生成
      const analysisResult = await this.analyzeWithClaude(
        transcriptionResult.transcription,
        contextResult
      );

      // 更新状态：分析完成
      await this.updateStatus(job.jobId, {
        jobId: job.jobId,
        stage: ProcessingStage.GENERATING,
        progress: 70,
        message: 'AI分析完成，开始生成图片',
        estimatedTime: 3000
      });

      // 并行生成多个图片选项
      const imageResults = await this.generateImagesParallel(
        analysisResult.imagePrompt,
        job.jobId
      );

      // 选择最佳图片
      const bestImage = await this.selectBestImage(imageResults);

      // 缓存结果
      const finalResult = {
        transcription: transcriptionResult.transcription,
        sentiment: analysisResult.sentiment,
        imageUrl: bestImage.url
      };

      await this.cacheResult(job.audioHash, finalResult);

      // 更新状态：完成
      await this.updateStatus(job.jobId, {
        jobId: job.jobId,
        stage: ProcessingStage.COMPLETE,
        progress: 100,
        message: '处理完成',
        result: finalResult
      });

      // 发送完成事件
      await this.sendCompletionEvent(job.jobId, job.userId, finalResult);

    } catch (error) {
      console.error('并行处理失败:', error);
      await this.updateStatus(job.jobId, {
        jobId: job.jobId,
        stage: ProcessingStage.ERROR,
        progress: 0,
        message: '处理失败',
        error: {
          code: 'PROCESSING_ERROR',
          message: error.message,
          retryable: true
        }
      });
      throw error;
    }
  }

  /**
   * 优化的语音转录 - 使用流式转录
   */
  private async transcribeAudio(audioUrl: string, jobId: string): Promise<{ transcription: string }> {
    try {
      const transcriptionJobName = `vomage-${jobId}-${Date.now()}`;
      
      const startJobCommand = new StartTranscriptionJobCommand({
        TranscriptionJobName: transcriptionJobName,
        LanguageCode: 'zh-CN',
        MediaFormat: 'mp3',
        Media: {
          MediaFileUri: audioUrl
        },
        OutputBucketName: process.env.TRANSCRIBE_OUTPUT_BUCKET,
        Settings: {
          MaxSpeakerLabels: 1,
          ShowSpeakerLabels: false,
          // 启用实时转录优化
          MaxAlternatives: 1,
          ShowAlternatives: false
        },
        // 使用自定义词汇表
        JobExecutionSettings: {
          AllowDeferredExecution: false,
          DataAccessRoleArn: process.env.TRANSCRIBE_ROLE_ARN
        }
      });

      await transcribeClient.send(startJobCommand);

      // 轮询转录状态
      let transcriptionJob;
      let attempts = 0;
      const maxAttempts = 60; // 最多等待5分钟

      do {
        await new Promise(resolve => setTimeout(resolve, 5000)); // 等待5秒
        
        const getJobCommand = new GetTranscriptionJobCommand({
          TranscriptionJobName: transcriptionJobName
        });
        
        const response = await transcribeClient.send(getJobCommand);
        transcriptionJob = response.TranscriptionJob;
        attempts++;
        
        // 更新进度
        const progress = Math.min(10 + (attempts / maxAttempts) * 30, 40);
        await this.updateStatus(jobId, {
          jobId,
          stage: ProcessingStage.TRANSCRIBING,
          progress,
          message: `语音转录中... (${Math.round(progress)}%)`,
          estimatedTime: (maxAttempts - attempts) * 5000
        });
        
      } while (
        transcriptionJob?.TranscriptionJobStatus === 'IN_PROGRESS' && 
        attempts < maxAttempts
      );

      if (transcriptionJob?.TranscriptionJobStatus !== 'COMPLETED') {
        throw new Error(`转录失败: ${transcriptionJob?.TranscriptionJobStatus}`);
      }

      // 获取转录结果
      const transcriptUri = transcriptionJob.Transcript?.TranscriptFileUri;
      if (!transcriptUri) {
        throw new Error('转录结果URI为空');
      }

      // 从S3获取转录文件
      const transcriptResponse = await fetch(transcriptUri);
      const transcriptData = await transcriptResponse.json();
      
      const transcription = transcriptData.results.transcripts[0].transcript;

      return { transcription };
    } catch (error) {
      console.error('语音转录失败:', error);
      throw new Error(`语音转录失败: ${error.message}`);
    }
  }

  /**
   * 上下文分析 - 并行获取地理和天气信息
   */
  private async analyzeContext(metadata: VoiceProcessingJob['metadata']): Promise<any> {
    try {
      const contextPromises = [];

      // 如果有位置信息，获取详细地理信息
      if (metadata.location) {
        contextPromises.push(this.getLocationDetails(metadata.location));
      }

      // 如果有天气信息，获取详细天气数据
      if (metadata.weather) {
        contextPromises.push(this.getWeatherDetails(metadata.weather));
      }

      // 获取时间上下文
      contextPromises.push(this.getTimeContext(metadata.timestamp));

      const contextResults = await Promise.all(contextPromises);

      return {
        location: contextResults[0] || null,
        weather: contextResults[1] || null,
        time: contextResults[2] || null,
        duration: metadata.duration,
        timestamp: metadata.timestamp
      };
    } catch (error) {
      console.error('上下文分析失败:', error);
      return {
        duration: metadata.duration,
        timestamp: metadata.timestamp
      };
    }
  }

  /**
   * Claude AI分析 - 批处理优化
   */
  private async analyzeWithClaude(transcription: string, context: any): Promise<any> {
    try {
      // 检查缓存
      const cacheKey = `claude:${this.hashContent(transcription + JSON.stringify(context))}`;
      const cachedResult = await redis.get(cacheKey);
      
      if (cachedResult) {
        return JSON.parse(cachedResult);
      }

      const prompt = this.buildOptimizedPrompt(transcription, context);

      const invokeCommand = new InvokeModelCommand({
        modelId: 'anthropic.claude-3-haiku-20240307-v1:0', // 使用更快的Haiku模型
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify({
          anthropic_version: 'bedrock-2023-05-31',
          max_tokens: 1000,
          temperature: 0.7,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ]
        })
      });

      const response = await bedrockClient.send(invokeCommand);
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));
      
      const result = this.parseClaudeResponse(responseBody.content[0].text);

      // 缓存结果24小时
      await redis.setex(cacheKey, 86400, JSON.stringify(result));

      return result;
    } catch (error) {
      console.error('Claude分析失败:', error);
      throw new Error(`AI分析失败: ${error.message}`);
    }
  }

  /**
   * 并行图片生成 - 生成多个选项
   */
  private async generateImagesParallel(prompt: string, jobId: string): Promise<any[]> {
    try {
      // 生成3个不同风格的图片
      const imagePromises = [
        this.generateImageWithNova(prompt, 'photographic', jobId),
        this.generateImageWithNova(prompt, 'digital-art', jobId),
        this.generateImageWithNova(prompt, 'cinematic', jobId)
      ];

      const imageResults = await Promise.allSettled(imagePromises);
      
      return imageResults
        .filter(result => result.status === 'fulfilled')
        .map(result => (result as PromiseFulfilledResult<any>).value);
    } catch (error) {
      console.error('并行图片生成失败:', error);
      throw error;
    }
  }

  /**
   * Nova Canvas图片生成 - 优化配置
   */
  private async generateImageWithNova(prompt: string, style: string, jobId: string): Promise<any> {
    try {
      const cacheKey = `nova:${this.hashContent(prompt + style)}`;
      const cachedImage = await redis.get(cacheKey);
      
      if (cachedImage) {
        return JSON.parse(cachedImage);
      }

      const invokeCommand = new InvokeModelCommand({
        modelId: 'amazon.nova-canvas-v1:0',
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify({
          taskType: 'TEXT_IMAGE',
          textToImageParams: {
            text: prompt,
            images: [],
          },
          imageGenerationConfig: {
            numberOfImages: 1,
            quality: 'premium',
            width: 1024,
            height: 1024,
            cfgScale: 7.0,
            seed: Math.floor(Math.random() * 1000000)
          }
        })
      });

      const response = await bedrockClient.send(invokeCommand);
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));
      
      // 上传图片到S3
      const imageUrl = await this.uploadImageToS3(
        responseBody.images[0],
        `${jobId}-${style}-${Date.now()}.png`
      );

      const result = {
        url: imageUrl,
        style,
        prompt,
        quality: 'premium'
      };

      // 缓存结果7天
      await redis.setex(cacheKey, 604800, JSON.stringify(result));

      return result;
    } catch (error) {
      console.error('Nova图片生成失败:', error);
      throw error;
    }
  }

  /**
   * 更新处理状态并通知客户端
   */
  private async updateStatus(jobId: string, status: ProcessingStatus): Promise<void> {
    try {
      // 更新Redis缓存
      await redis.setex(`status:${jobId}`, 3600, JSON.stringify(status));

      // 如果有WebSocket连接，发送实时更新
      if (status.jobId) {
        await this.sendWebSocketUpdate(jobId, status);
      }

      // 发送CloudWatch指标
      await this.sendMetrics(status);

    } catch (error) {
      console.error('更新状态失败:', error);
    }
  }

  /**
   * WebSocket实时通知
   */
  private async sendWebSocketUpdate(jobId: string, status: ProcessingStatus): Promise<void> {
    try {
      // 获取连接ID
      const connectionId = await redis.get(`connection:${jobId}`);
      if (!connectionId) return;

      const apiGatewayClient = new ApiGatewayManagementApiClient({
        endpoint: this.websocketEndpoint
      });

      const postCommand = new PostToConnectionCommand({
        ConnectionId: connectionId,
        Data: JSON.stringify({
          type: 'processing_update',
          data: status
        })
      });

      await apiGatewayClient.send(postCommand);
    } catch (error) {
      console.error('WebSocket通知失败:', error);
    }
  }

  /**
   * 发送完成事件到EventBridge
   */
  private async sendCompletionEvent(jobId: string, userId: string, result: any): Promise<void> {
    try {
      const putEventsCommand = new PutEventsCommand({
        Entries: [
          {
            Source: 'vomage.voice-processing',
            DetailType: 'Processing Complete',
            Detail: JSON.stringify({
              jobId,
              userId,
              result,
              timestamp: new Date().toISOString()
            })
          }
        ]
      });

      await eventBridgeClient.send(putEventsCommand);
    } catch (error) {
      console.error('发送完成事件失败:', error);
    }
  }

  /**
   * 缓存处理结果
   */
  private async cacheResult(audioHash: string, result: any): Promise<void> {
    try {
      const cacheKey = `result:${audioHash}`;
      await redis.setex(cacheKey, 86400, JSON.stringify(result)); // 缓存24小时
    } catch (error) {
      console.error('缓存结果失败:', error);
    }
  }

  /**
   * 获取缓存结果
   */
  private async getCachedResult(audioHash: string): Promise<any | null> {
    try {
      const cacheKey = `result:${audioHash}`;
      const cachedResult = await redis.get(cacheKey);
      return cachedResult ? JSON.parse(cachedResult) : null;
    } catch (error) {
      console.error('获取缓存结果失败:', error);
      return null;
    }
  }

  /**
   * 工具方法
   */
  private hashContent(content: string): string {
    const crypto = require('crypto');
    return crypto.createHash('md5').update(content).digest('hex');
  }

  private buildOptimizedPrompt(transcription: string, context: any): string {
    return `请分析以下语音内容的情感和生成图片提示词：

语音内容：${transcription}

上下文信息：
- 时间：${context.time || '未知'}
- 地点：${context.location || '未知'}
- 天气：${context.weather || '未知'}
- 时长：${context.duration || 0}秒

请返回JSON格式：
{
  "sentiment": {
    "emotion": "情感类型",
    "intensity": 0.8,
    "keywords": ["关键词1", "关键词2"]
  },
  "imagePrompt": "详细的图片生成提示词"
}`;
  }

  private parseClaudeResponse(response: string): any {
    try {
      // 提取JSON部分
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error('无法解析Claude响应');
    } catch (error) {
      console.error('解析Claude响应失败:', error);
      return {
        sentiment: { emotion: 'neutral', intensity: 0.5, keywords: [] },
        imagePrompt: '一幅温馨的风景画'
      };
    }
  }

  private async uploadImageToS3(imageData: string, fileName: string): Promise<string> {
    try {
      const buffer = Buffer.from(imageData, 'base64');
      
      const putCommand = new PutObjectCommand({
        Bucket: process.env.IMAGES_BUCKET,
        Key: `generated/${fileName}`,
        Body: buffer,
        ContentType: 'image/png',
        CacheControl: 'max-age=31536000' // 1年缓存
      });

      await s3Client.send(putCommand);
      
      return `https://${process.env.IMAGES_BUCKET}.s3.amazonaws.com/generated/${fileName}`;
    } catch (error) {
      console.error('上传图片到S3失败:', error);
      throw error;
    }
  }

  private async selectBestImage(images: any[]): Promise<any> {
    // 简单选择第一个成功生成的图片
    // 可以后续添加更复杂的选择逻辑
    return images[0] || { url: '', style: 'default' };
  }

  private async getLocationDetails(location: any): Promise<any> {
    // 实现地理位置详情获取
    return location;
  }

  private async getWeatherDetails(weather: any): Promise<any> {
    // 实现天气详情获取
    return weather;
  }

  private async getTimeContext(timestamp: string): Promise<any> {
    const date = new Date(timestamp);
    return {
      hour: date.getHours(),
      dayOfWeek: date.getDay(),
      season: this.getSeason(date.getMonth())
    };
  }

  private getSeason(month: number): string {
    if (month >= 2 && month <= 4) return 'spring';
    if (month >= 5 && month <= 7) return 'summer';
    if (month >= 8 && month <= 10) return 'autumn';
    return 'winter';
  }

  private async sendMetrics(status: ProcessingStatus): Promise<void> {
    // 发送CloudWatch指标
    // 实现监控指标发送
  }
}

// 导出单例实例
export const asyncVoiceProcessor = new AsyncVoiceProcessor();
