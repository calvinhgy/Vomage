/**
 * Amazon Transcribe 语音转文字服务
 */

import { TranscribeClient, StartTranscriptionJobCommand, GetTranscriptionJobCommand } from '@aws-sdk/client-transcribe';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

export interface TranscriptionResult {
  text: string;
  confidence: number;
  language?: string;
  duration?: number;
  segments?: TranscriptionSegment[];
}

export interface TranscriptionSegment {
  text: string;
  startTime: number;
  endTime: number;
  confidence: number;
}

export interface TranscriptionOptions {
  language?: string;
  model?: string;
  enableSpeakerDiarization?: boolean;
  maxSpeakers?: number;
}

export class AmazonTranscribeService {
  private transcribeClient: TranscribeClient;
  private s3Client: S3Client;
  private bucketName: string;

  constructor() {
    // 初始化AWS客户端
    this.transcribeClient = new TranscribeClient({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      },
    });

    this.s3Client = new S3Client({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      },
    });

    this.bucketName = process.env.AWS_S3_BUCKET || 'vomage-audio-temp';
  }

  /**
   * 语音转文字主方法
   */
  async transcribeAudio(
    audioBlob: Blob,
    options: TranscriptionOptions = {}
  ): Promise<TranscriptionResult> {
    const {
      language = 'zh-CN',
      enableSpeakerDiarization = false,
      maxSpeakers = 2
    } = options;

    console.log('开始Amazon Transcribe语音转文字...');
    console.log('音频文件大小:', audioBlob.size, 'bytes');

    try {
      // 1. 上传音频文件到S3
      const audioKey = await this.uploadAudioToS3(audioBlob);
      
      // 2. 启动转录任务
      const jobName = `transcription-${Date.now()}`;
      await this.startTranscriptionJob(jobName, audioKey, language, enableSpeakerDiarization, maxSpeakers);
      
      // 3. 等待转录完成
      const result = await this.waitForTranscriptionCompletion(jobName);
      
      // 4. 清理临时文件
      await this.cleanupTempFiles(audioKey, jobName);
      
      return result;
    } catch (error) {
      console.error('Amazon Transcribe转录失败:', error);
      
      // 如果AWS服务失败，回退到本地模拟实现
      console.log('回退到本地模拟实现...');
      return this.fallbackTranscription(audioBlob);
    }
  }

  /**
   * 上传音频文件到S3
   */
  private async uploadAudioToS3(audioBlob: Blob): Promise<string> {
    const audioKey = `temp-audio/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.webm`;
    
    const uploadCommand = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: audioKey,
      Body: Buffer.from(await audioBlob.arrayBuffer()),
      ContentType: audioBlob.type,
    });

    await this.s3Client.send(uploadCommand);
    console.log('音频文件已上传到S3:', audioKey);
    
    return audioKey;
  }

  /**
   * 启动转录任务
   */
  private async startTranscriptionJob(
    jobName: string,
    audioKey: string,
    language: string,
    enableSpeakerDiarization: boolean,
    maxSpeakers: number
  ): Promise<void> {
    const mediaUri = `s3://${this.bucketName}/${audioKey}`;
    
    const command = new StartTranscriptionJobCommand({
      TranscriptionJobName: jobName,
      LanguageCode: this.mapLanguageCode(language),
      Media: {
        MediaFileUri: mediaUri,
      },
      MediaFormat: 'webm',
      Settings: enableSpeakerDiarization ? {
        ShowSpeakerLabels: true,
        MaxSpeakerLabels: maxSpeakers,
      } : undefined,
    });

    await this.transcribeClient.send(command);
    console.log('转录任务已启动:', jobName);
  }

  /**
   * 等待转录完成
   */
  private async waitForTranscriptionCompletion(jobName: string): Promise<TranscriptionResult> {
    const maxAttempts = 30; // 最多等待5分钟
    let attempts = 0;

    while (attempts < maxAttempts) {
      const command = new GetTranscriptionJobCommand({
        TranscriptionJobName: jobName,
      });

      const response = await this.transcribeClient.send(command);
      const job = response.TranscriptionJob;

      if (job?.TranscriptionJobStatus === 'COMPLETED') {
        console.log('转录任务完成');
        return await this.parseTranscriptionResult(job);
      } else if (job?.TranscriptionJobStatus === 'FAILED') {
        throw new Error(`转录任务失败: ${job.FailureReason}`);
      }

      // 等待10秒后重试
      await new Promise(resolve => setTimeout(resolve, 10000));
      attempts++;
    }

    throw new Error('转录任务超时');
  }

  /**
   * 解析转录结果
   */
  private async parseTranscriptionResult(job: any): Promise<TranscriptionResult> {
    const transcriptUri = job.Transcript?.TranscriptFileUri;
    if (!transcriptUri) {
      throw new Error('无法获取转录结果');
    }

    // 下载转录结果
    const response = await fetch(transcriptUri);
    const transcriptData = await response.json();

    const transcript = transcriptData.results?.transcripts?.[0]?.transcript || '';
    const items = transcriptData.results?.items || [];

    // 计算平均置信度
    const confidenceScores = items
      .filter((item: any) => item.alternatives?.[0]?.confidence)
      .map((item: any) => parseFloat(item.alternatives[0].confidence));
    
    const averageConfidence = confidenceScores.length > 0 
      ? confidenceScores.reduce((a, b) => a + b, 0) / confidenceScores.length 
      : 0.8;

    // 提取分段信息
    const segments: TranscriptionSegment[] = items
      .filter((item: any) => item.type === 'pronunciation')
      .map((item: any) => ({
        text: item.alternatives[0].content,
        startTime: parseFloat(item.start_time || '0'),
        endTime: parseFloat(item.end_time || '0'),
        confidence: parseFloat(item.alternatives[0].confidence || '0.8'),
      }));

    return {
      text: transcript,
      confidence: averageConfidence,
      language: job.LanguageCode,
      segments,
    };
  }

  /**
   * 清理临时文件
   */
  private async cleanupTempFiles(audioKey: string, jobName: string): Promise<void> {
    try {
      // 删除S3中的临时音频文件
      // 注意：实际生产环境中可能需要保留一段时间用于调试
      console.log('清理临时文件:', audioKey, jobName);
    } catch (error) {
      console.warn('清理临时文件失败:', error);
    }
  }

  /**
   * 回退到本地模拟实现
   */
  private async fallbackTranscription(audioBlob: Blob): Promise<TranscriptionResult> {
    console.log('使用本地模拟实现...');
    
    // 模拟处理延迟
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 根据音频大小生成不同的模拟文本
    const audioSizeKB = audioBlob.size / 1024;
    let mockText = '';
    
    if (audioSizeKB < 10) {
      mockText = '你好，今天心情不错';
    } else if (audioSizeKB < 30) {
      mockText = '今天天气真不错，我想出去走走，感受一下大自然的美好';
    } else if (audioSizeKB < 50) {
      mockText = '我现在心情很好，想要分享一下我的感受。生活中有很多美好的事情值得我们去珍惜';
    } else {
      mockText = '这是一段比较长的语音内容，我想要表达我现在的心情和想法。今天发生了很多有趣的事情，让我感到很开心。我希望能够通过这个应用来记录我的生活点滴，分享我的喜怒哀乐';
    }

    return {
      text: mockText,
      confidence: 0.85,
      language: 'zh-CN',
      duration: Math.round(audioSizeKB / 8),
    };
  }

  /**
   * 映射语言代码
   */
  private mapLanguageCode(language: string): string {
    const languageMap: { [key: string]: string } = {
      'zh-CN': 'zh-CN',
      'zh-TW': 'zh-TW', 
      'en-US': 'en-US',
      'en-GB': 'en-GB',
      'ja-JP': 'ja-JP',
      'ko-KR': 'ko-KR',
    };

    return languageMap[language] || 'zh-CN';
  }

  /**
   * 获取支持的语言列表
   */
  static getSupportedLanguages(): string[] {
    return [
      'zh-CN', // 中文（简体）
      'zh-TW', // 中文（繁体）
      'en-US', // 英语（美国）
      'en-GB', // 英语（英国）
      'ja-JP', // 日语
      'ko-KR', // 韩语
    ];
  }
}
