/**
 * Claude AI 服务
 * 用于情感分析和内容理解
 */

import { SentimentAnalysis, Context } from '@/types';

export interface ClaudeResponse {
  content: string;
  usage?: {
    input_tokens: number;
    output_tokens: number;
  };
}

export class ClaudeService {
  private static readonly API_KEY = process.env.CLAUDE_API_KEY;
  private static readonly API_URL = process.env.CLAUDE_API_URL || 'https://api.anthropic.com';
  private static readonly MODEL = process.env.CLAUDE_MODEL || 'claude-3-sonnet-20240229';

  /**
   * 分析文本情感
   */
  static async analyzeSentiment(
    text: string,
    context?: Context
  ): Promise<SentimentAnalysis> {
    console.log('开始情感分析...');
    console.log('输入文本:', text);
    console.log('上下文:', context);

    // 模拟处理延迟
    await new Promise(resolve => setTimeout(resolve, 800));

    // 基于文本内容的简单情感分析
    const sentiment = this.analyzeSentimentLocally(text);
    
    console.log('情感分析完成:', sentiment);
    return sentiment;
  }

  /**
   * 生成图片提示词
   */
  static async generateImagePrompt(
    text: string,
    sentiment: SentimentAnalysis,
    context?: Context,
    style: string = 'abstract'
  ): Promise<string> {
    console.log('生成图片提示词...');
    
    // 模拟处理延迟
    await new Promise(resolve => setTimeout(resolve, 500));

    // 基于情感和文本生成提示词
    const prompt = this.generatePromptLocally(text, sentiment, context, style);
    
    console.log('图片提示词生成完成:', prompt);
    return prompt;
  }

  /**
   * 本地情感分析（简化版）
   */
  private static analyzeSentimentLocally(text: string): SentimentAnalysis {
    // 定义情感关键词
    const positiveWords = ['好', '棒', '开心', '高兴', '快乐', '喜欢', '爱', '美好', '不错', '满意'];
    const negativeWords = ['坏', '糟', '难过', '伤心', '生气', '讨厌', '恨', '痛苦', '失望', '沮丧'];
    const neutralWords = ['还行', '一般', '普通', '平常', '正常'];

    let positiveScore = 0;
    let negativeScore = 0;
    let neutralScore = 0;

    // 计算各类情感词汇的出现次数
    positiveWords.forEach(word => {
      if (text.includes(word)) positiveScore++;
    });

    negativeWords.forEach(word => {
      if (text.includes(word)) negativeScore++;
    });

    neutralWords.forEach(word => {
      if (text.includes(word)) neutralScore++;
    });

    // 确定主要情感
    let mood: string;
    let confidence: number;

    if (positiveScore > negativeScore && positiveScore > neutralScore) {
      mood = 'happy';
      confidence = Math.min(0.9, 0.6 + positiveScore * 0.1);
    } else if (negativeScore > positiveScore && negativeScore > neutralScore) {
      mood = 'sad';
      confidence = Math.min(0.9, 0.6 + negativeScore * 0.1);
    } else if (neutralScore > 0) {
      mood = 'neutral';
      confidence = 0.7;
    } else {
      // 默认基于文本长度判断
      if (text.length > 20) {
        mood = 'thoughtful';
        confidence = 0.6;
      } else {
        mood = 'calm';
        confidence = 0.5;
      }
    }

    return {
      mood,
      confidence,
      details: {
        positiveScore,
        negativeScore,
        neutralScore,
        textLength: text.length,
        analysis: `基于关键词分析，检测到${mood}情感，置信度${confidence.toFixed(2)}`
      },
      processedAt: new Date()
    };
  }

  /**
   * 本地生成图片提示词
   */
  private static generatePromptLocally(
    text: string,
    sentiment: SentimentAnalysis,
    context?: Context,
    style: string = 'abstract'
  ): string {
    const moodPrompts: Record<string, string> = {
      happy: 'bright colors, warm lighting, joyful atmosphere, uplifting mood',
      sad: 'cool colors, soft lighting, melancholic atmosphere, gentle mood',
      neutral: 'balanced colors, natural lighting, calm atmosphere, peaceful mood',
      thoughtful: 'deep colors, contemplative lighting, introspective atmosphere',
      calm: 'pastel colors, soft lighting, serene atmosphere, tranquil mood',
      excited: 'vibrant colors, dynamic lighting, energetic atmosphere',
      angry: 'intense colors, dramatic lighting, powerful atmosphere',
      surprised: 'bright contrasts, sharp lighting, dynamic atmosphere'
    };

    const stylePrompts: Record<string, string> = {
      abstract: 'abstract art, flowing shapes, artistic interpretation',
      realistic: 'photorealistic, detailed, natural representation',
      minimalist: 'minimalist design, clean lines, simple composition',
      artistic: 'artistic style, creative interpretation, expressive brushstrokes',
      dreamy: 'dreamy atmosphere, soft focus, ethereal quality'
    };

    const moodPrompt = moodPrompts[sentiment.mood] || moodPrompts.neutral;
    const stylePrompt = stylePrompts[style] || stylePrompts.abstract;

    // 添加时间和天气信息
    let contextPrompt = '';
    if (context?.weather) {
      contextPrompt += `, ${context.weather.condition} weather`;
    }
    if (context?.time) {
      const hour = new Date(context.time).getHours();
      if (hour < 6) {
        contextPrompt += ', night time, dark sky';
      } else if (hour < 12) {
        contextPrompt += ', morning light, fresh atmosphere';
      } else if (hour < 18) {
        contextPrompt += ', afternoon light, warm atmosphere';
      } else {
        contextPrompt += ', evening light, golden hour';
      }
    }

    return `${stylePrompt}, ${moodPrompt}${contextPrompt}, high quality, artistic composition`;
  }

  /**
   * 调用真实的Claude API（需要API密钥）
   */
  private static async callClaudeAPI(prompt: string): Promise<ClaudeResponse> {
    if (!this.API_KEY) {
      throw new Error('Claude API key not configured');
    }

    const response = await fetch(`${this.API_URL}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: this.MODEL,
        max_tokens: 1000,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`Claude API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return {
      content: data.content[0].text,
      usage: data.usage
    };
  }

  /**
   * 检查API是否可用
   */
  static isConfigured(): boolean {
    return !!this.API_KEY;
  }

  /**
   * 获取配置状态
   */
  static getStatus(): { configured: boolean; model: string; apiUrl: string } {
    return {
      configured: this.isConfigured(),
      model: this.MODEL,
      apiUrl: this.API_URL
    };
  }
}
