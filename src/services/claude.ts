/**
 * Claude AI 服务集成
 */

import Anthropic from '@anthropic-ai/sdk';
import { SentimentAnalysis, Context, Mood } from '@/types';

// 初始化 Claude 客户端
const anthropic = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY!,
});

export class ClaudeService {
  /**
   * 语音转文字
   */
  static async transcribeAudio(audioBuffer: ArrayBuffer): Promise<string> {
    // 注意：Claude 本身不支持直接的语音转文字
    // 这里需要先使用其他服务（如 OpenAI Whisper）进行转录
    // 然后将文本发送给 Claude 进行分析
    
    // 暂时返回模拟文本，实际应用中需要集成语音转文字服务
    return "这是一段模拟的语音转文字结果，用户表达了他们的心情和感受。";
  }

  /**
   * 分析语音内容的情感
   */
  static async analyzeSentiment(
    transcript: string, 
    context?: Context
  ): Promise<SentimentAnalysis> {
    try {
      const contextInfo = this.buildContextPrompt(context);
      
      const prompt = `
请分析以下语音内容的情感状态，并提供详细的情感分析结果。

语音内容：
"${transcript}"

${contextInfo}

请按照以下JSON格式返回分析结果：
{
  "mood": "主要情感（happy/sad/angry/excited/calm/anxious/neutral之一）",
  "confidence": "置信度（0-1之间的数字）",
  "details": {
    "positive": "积极情感比例（0-1）",
    "negative": "消极情感比例（0-1）", 
    "neutral": "中性情感比例（0-1）"
  },
  "reasoning": "分析推理过程",
  "keywords": ["关键词1", "关键词2", "关键词3"]
}

分析要求：
1. 仔细分析语音内容的情感倾向
2. 考虑上下文信息（时间、天气、位置等）
3. 提供准确的情感分类和置信度
4. 确保三个情感比例之和为1
5. 提供简洁的分析推理
`;

      const response = await anthropic.messages.create({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 1000,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type from Claude');
      }

      // 解析 Claude 的响应
      const analysisResult = this.parseClaudeResponse(content.text);
      
      return {
        mood: analysisResult.mood as Mood,
        confidence: analysisResult.confidence,
        details: analysisResult.details
      };

    } catch (error) {
      console.error('Claude sentiment analysis error:', error);
      
      // 返回默认的情感分析结果
      return {
        mood: 'neutral',
        confidence: 0.5,
        details: {
          positive: 0.3,
          negative: 0.2,
          neutral: 0.5
        }
      };
    }
  }

  /**
   * 生成图片描述提示词
   */
  static async generateImagePrompt(
    transcript: string,
    sentiment: SentimentAnalysis,
    context?: Context,
    style: string = 'abstract'
  ): Promise<string> {
    try {
      const contextInfo = this.buildContextPrompt(context);
      
      const prompt = `
基于以下信息，为AI图像生成器创建一个详细的英文提示词：

语音内容：
"${transcript}"

情感分析结果：
- 主要情感：${sentiment.mood}
- 置信度：${sentiment.confidence}
- 情感分布：积极${Math.round(sentiment.details.positive * 100)}%，消极${Math.round(sentiment.details.negative * 100)}%，中性${Math.round(sentiment.details.neutral * 100)}%

${contextInfo}

图片风格：${style}

请生成一个适合的英文图像生成提示词，要求：
1. 体现用户的情感状态
2. 融合环境上下文信息
3. 符合指定的艺术风格
4. 避免包含人物面部特征
5. 注重色彩和氛围的表达
6. 长度控制在100个单词以内

直接返回英文提示词，不需要其他解释：
`;

      const response = await anthropic.messages.create({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 500,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type from Claude');
      }

      return content.text.trim();

    } catch (error) {
      console.error('Claude image prompt generation error:', error);
      
      // 返回默认提示词
      return this.getDefaultImagePrompt(sentiment.mood, style);
    }
  }

  /**
   * 构建上下文提示信息
   */
  private static buildContextPrompt(context?: Context): string {
    if (!context) return '';

    let contextInfo = '上下文信息：\n';
    
    if (context.timeOfDay) {
      const timeDescriptions = {
        morning: '早晨',
        afternoon: '下午',
        evening: '傍晚',
        night: '夜晚'
      };
      contextInfo += `- 时间：${timeDescriptions[context.timeOfDay]}\n`;
    }

    if (context.weather) {
      contextInfo += `- 天气：${context.weather.temperature}°C，${context.weather.condition}\n`;
    }

    if (context.location?.city) {
      contextInfo += `- 位置：${context.location.city}\n`;
    }

    return contextInfo;
  }

  /**
   * 解析 Claude 的 JSON 响应
   */
  private static parseClaudeResponse(responseText: string): any {
    try {
      // 尝试提取 JSON 部分
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      // 如果没有找到 JSON，返回默认值
      throw new Error('No JSON found in response');
    } catch (error) {
      console.error('Failed to parse Claude response:', error);
      
      // 返回默认分析结果
      return {
        mood: 'neutral',
        confidence: 0.5,
        details: {
          positive: 0.3,
          negative: 0.2,
          neutral: 0.5
        }
      };
    }
  }

  /**
   * 获取默认图片提示词
   */
  private static getDefaultImagePrompt(mood: Mood, style: string): string {
    const moodPrompts = {
      happy: 'bright sunny landscape with warm colors, joyful atmosphere, golden light',
      sad: 'melancholic blue tones, gentle rain, soft shadows, peaceful solitude',
      angry: 'dramatic red and orange colors, stormy weather, intense energy',
      excited: 'vibrant colors, dynamic movement, celebration, sparkling lights',
      calm: 'serene nature scene, soft pastels, tranquil water, gentle breeze',
      anxious: 'swirling patterns, muted colors, uncertain atmosphere, soft edges',
      neutral: 'balanced composition, natural colors, simple forms, harmony'
    };

    const styleModifiers = {
      abstract: 'abstract art style, geometric shapes, flowing forms',
      realistic: 'photorealistic style, detailed textures, natural lighting',
      artistic: 'artistic interpretation, painterly style, expressive brushstrokes',
      minimalist: 'minimalist design, clean lines, simple composition',
      cartoon: 'cartoon style, playful elements, bright colors'
    };

    return `${moodPrompts[mood]}, ${styleModifiers[style] || styleModifiers.abstract}`;
  }
}
