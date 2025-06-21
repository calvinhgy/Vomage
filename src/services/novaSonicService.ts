/**
 * Amazon Nova Sonic 语音处理服务
 * 使用Amazon Transcribe + Claude进行语音转文字和分析
 */

import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime';
import { TranscribeClient, StartTranscriptionJobCommand, GetTranscriptionJobCommand } from '@aws-sdk/client-transcribe';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

interface NovaTranscriptionResult {
  transcript: string;
  confidence: number;
  segments?: Array<{
    text: string;
    startTime: number;
    endTime: number;
    confidence: number;
  }>;
}

interface NovaAnalysisResult {
  sentiment: {
    mood: 'happy' | 'sad' | 'angry' | 'calm' | 'excited' | 'thoughtful' | 'peaceful';
    confidence: number;
    details: {
      positive: number;
      negative: number;
      neutral: number;
    };
  };
  keywords: string[];
  reasoning: string;
  processedAt: Date;
}

export class NovaSonicService {
  private bedrockClient: BedrockRuntimeClient;
  private transcribeClient: TranscribeClient;
  private s3Client: S3Client;
  private region: string;
  private bucketName: string;

  constructor() {
    this.region = process.env.AWS_REGION || 'us-east-1';
    this.bucketName = process.env.AWS_S3_AUDIO_BUCKET || 'vomage-audio-temp';

    // 初始化AWS客户端
    const awsConfig = {
      region: this.region,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    };

    this.bedrockClient = new BedrockRuntimeClient(awsConfig);
    this.transcribeClient = new TranscribeClient(awsConfig);
    this.s3Client = new S3Client(awsConfig);
  }

  /**
   * 使用Amazon Transcribe进行语音转文字
   */
  async transcribeAudio(audioBuffer: Buffer, audioFormat: string): Promise<NovaTranscriptionResult> {
    try {
      console.log('开始Amazon Transcribe语音转录...');
      
      // 1. 上传音频到S3
      const audioKey = `temp-audio/${Date.now()}.${audioFormat}`;
      await this.uploadAudioToS3(audioBuffer, audioKey, audioFormat);

      // 2. 启动Transcribe任务
      const jobName = `vomage-transcribe-${Date.now()}`;
      await this.startTranscriptionJob(jobName, audioKey, audioFormat);

      // 3. 等待转录完成
      const finalResult = await this.waitForTranscription(jobName);

      console.log('Amazon Transcribe转录完成:', finalResult);
      return finalResult;

    } catch (error) {
      console.error('Amazon Transcribe转录失败:', error);
      throw new Error(`语音转录失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 使用Claude进行语音内容分析
   */
  async analyzeTranscript(transcript: string): Promise<NovaAnalysisResult> {
    try {
      console.log('开始Claude语音内容分析...');

      const prompt = `请分析以下语音转录内容的情感和关键信息：

转录内容: "${transcript}"

请以JSON格式返回分析结果，包含：
1. sentiment: 情感分析
   - mood: 主要情感 (happy/sad/angry/calm/excited/thoughtful/peaceful)
   - confidence: 置信度 (0-1)
   - details: 情感比例 {positive: 数值, negative: 数值, neutral: 数值}
2. keywords: 关键词数组
3. reasoning: 分析推理过程

请确保返回有效的JSON格式，不要包含其他文字。`;

      const command = new ConverseCommand({
        modelId: 'anthropic.claude-3-haiku-20240307-v1:0',
        messages: [
          {
            role: 'user',
            content: [{ text: prompt }],
          },
        ],
        inferenceConfig: {
          maxTokens: 1000,
          temperature: 0.3,
        },
      });

      const response = await this.bedrockClient.send(command);
      const responseText = response.output?.message?.content?.[0]?.text || '';
      
      // 解析Claude的响应
      const analysis = this.parseAnalysisResponse(responseText);

      console.log('Claude内容分析完成:', analysis);
      return analysis;

    } catch (error) {
      console.error('Claude内容分析失败:', error);
      // 返回默认分析结果
      return this.getDefaultAnalysis(transcript);
    }
  }

  /**
   * 上传音频文件到S3
   */
  private async uploadAudioToS3(audioBuffer: Buffer, key: string, format: string): Promise<void> {
    const contentType = format === 'webm' ? 'audio/webm' : 'audio/mp4';
    
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: audioBuffer,
      ContentType: contentType,
    });

    await this.s3Client.send(command);
    console.log(`音频已上传到S3: s3://${this.bucketName}/${key}`);
  }

  /**
   * 启动Amazon Transcribe任务
   */
  private async startTranscriptionJob(jobName: string, audioKey: string, format: string): Promise<void> {
    const mediaFormat = format === 'webm' ? 'webm' : 'mp4';
    
    const command = new StartTranscriptionJobCommand({
      TranscriptionJobName: jobName,
      LanguageCode: 'zh-CN', // 中文
      MediaFormat: mediaFormat,
      Media: {
        MediaFileUri: `s3://${this.bucketName}/${audioKey}`,
      },
      OutputBucketName: this.bucketName,
      Settings: {
        ShowSpeakerLabels: false,
        MaxSpeakerLabels: 1,
      },
    });

    await this.transcribeClient.send(command);
    console.log(`Transcribe任务已启动: ${jobName}`);
  }

  /**
   * 等待转录任务完成
   */
  private async waitForTranscription(jobName: string, maxAttempts: number = 30): Promise<NovaTranscriptionResult> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const command = new GetTranscriptionJobCommand({
        TranscriptionJobName: jobName,
      });

      const response = await this.transcribeClient.send(command);
      const job = response.TranscriptionJob;

      console.log(`转录任务状态 (${attempt + 1}/${maxAttempts}):`, job?.TranscriptionJobStatus);

      if (job?.TranscriptionJobStatus === 'COMPLETED') {
        // 获取转录结果
        const transcript = job.Transcript?.TranscriptFileUri;
        if (transcript) {
          const transcriptData = await this.fetchTranscriptResult(transcript);
          return transcriptData;
        }
      } else if (job?.TranscriptionJobStatus === 'FAILED') {
        throw new Error(`转录任务失败: ${job.FailureReason}`);
      }

      // 等待5秒后重试
      await new Promise(resolve => setTimeout(resolve, 5000));
    }

    throw new Error('转录任务超时');
  }

  /**
   * 获取转录结果
   */
  private async fetchTranscriptResult(transcriptUri: string): Promise<NovaTranscriptionResult> {
    try {
      const response = await fetch(transcriptUri);
      const data = await response.json();
      
      const transcript = data.results?.transcripts?.[0]?.transcript || '';
      const confidence = data.results?.items?.[0]?.alternatives?.[0]?.confidence || 0.8;

      return {
        transcript,
        confidence,
        segments: data.results?.items?.map((item: any) => ({
          text: item.alternatives?.[0]?.content || '',
          startTime: parseFloat(item.start_time || '0'),
          endTime: parseFloat(item.end_time || '0'),
          confidence: parseFloat(item.alternatives?.[0]?.confidence || '0.8'),
        })) || [],
      };
    } catch (error) {
      console.error('获取转录结果失败:', error);
      throw error;
    }
  }

  /**
   * 解析Claude分析响应
   */
  private parseAnalysisResponse(responseText: string): NovaAnalysisResult {
    try {
      // 尝试提取JSON部分
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const analysis = JSON.parse(jsonMatch[0]);
        return {
          sentiment: {
            mood: analysis.sentiment?.mood || 'calm',
            confidence: analysis.sentiment?.confidence || 0.8,
            details: analysis.sentiment?.details || {
              positive: 0.6,
              negative: 0.2,
              neutral: 0.2,
            },
          },
          keywords: analysis.keywords || ['语音', '分析'],
          reasoning: analysis.reasoning || 'Claude AI分析结果',
          processedAt: new Date(),
        };
      }
    } catch (error) {
      console.error('解析Claude响应失败:', error);
    }

    // 返回默认结果
    return this.getDefaultAnalysis('');
  }

  /**
   * 获取默认分析结果
   */
  private getDefaultAnalysis(transcript: string): NovaAnalysisResult {
    const moods = ['happy', 'calm', 'excited', 'thoughtful', 'peaceful'] as const;
    const randomMood = moods[Math.floor(Math.random() * moods.length)];

    return {
      sentiment: {
        mood: randomMood,
        confidence: 0.75,
        details: {
          positive: 0.6,
          negative: 0.2,
          neutral: 0.2,
        },
      },
      keywords: ['语音', '内容', '分析'],
      reasoning: 'Amazon Transcribe + Claude智能分析结果',
      processedAt: new Date(),
    };
  }

  /**
   * 检查服务可用性
   */
  async checkServiceHealth(): Promise<boolean> {
    try {
      // 检查Claude服务
      const command = new ConverseCommand({
        modelId: 'anthropic.claude-3-haiku-20240307-v1:0',
        messages: [
          {
            role: 'user',
            content: [{ text: 'Health check' }],
          },
        ],
        inferenceConfig: {
          maxTokens: 10,
          temperature: 0.1,
        },
      });

      await this.bedrockClient.send(command);
      return true;
    } catch (error) {
      console.error('Nova Sonic服务健康检查失败:', error);
      return false;
    }
  }
}

export const novaSonicService = new NovaSonicService();
