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
    console.log('🎨 基于语音内容生成图片提示词:', { text, mood: sentiment.mood, style });

    // 基于用户语音内容的核心提示词
    let corePrompt = '';
    
    console.log('🎯 分析完整语音内容:', text);
    
    // 首先尝试直接翻译和理解完整的语音内容
    const lowerText = text.toLowerCase();
    
    // 优先处理完整的场景描述
    if (text.includes('小木屋')) {
      corePrompt = `small wooden cabin, cozy log house, rustic cottage in nature, wooden cabin surrounded by trees, forest cabin, traditional log cabin architecture, cabin in the woods`;
      console.log('🎯 识别场景: 小木屋场景');
    } else if (text.includes('雪山') && text.includes('红旗')) {
      corePrompt = `snow-capped mountain peak with a red flag planted on top, majestic mountain summit, red flag waving in the wind, mountaineering achievement, snowy mountain landscape, dramatic mountain scene`;
      console.log('🎯 识别场景: 雪山红旗场景');
    } else if (text.includes('红旗') || text.includes('旗帜')) {
      corePrompt = `red flag waving, bright red banner, flag on pole, patriotic symbol, red fabric fluttering in wind`;
      console.log('🎯 识别场景: 红旗场景');
    } else if (text.includes('雪山')) {
      corePrompt = `snow-capped mountain, mountain peak covered in snow, majestic snowy mountain, alpine landscape, mountain summit`;
      console.log('🎯 识别场景: 雪山场景');
    } else if (text.includes('房子') || text.includes('建筑物')) {
      corePrompt = `house, residential building, home architecture, detailed building structure`;
      console.log('🎯 识别场景: 房子场景');
    } else if (text.includes('城堡')) {
      corePrompt = `castle, medieval fortress, stone castle, fairy tale castle, majestic castle architecture`;
      console.log('🎯 识别场景: 城堡场景');
    } else if (lowerText.includes('蓝天') || lowerText.includes('白云') || lowerText.includes('天空')) {
      corePrompt = 'blue sky with white clouds, vast open sky, peaceful clouds floating';
      console.log('🎯 识别场景: 天空场景');
    } else if (lowerText.includes('青山') || lowerText.includes('绿水') || lowerText.includes('山水')) {
      corePrompt = 'green mountains and clear water, natural landscape, serene nature scene';
      console.log('🎯 识别场景: 山水场景');
    } else if (lowerText.includes('阳光') || lowerText.includes('太阳') || lowerText.includes('光明')) {
      corePrompt = 'bright sunlight, golden rays, warm illumination, radiant light';
      console.log('🎯 识别场景: 阳光场景');
    } else if (lowerText.includes('花') || lowerText.includes('花朵') || lowerText.includes('鲜花')) {
      corePrompt = 'beautiful flowers, colorful blossoms, floral arrangement, garden scene';
      console.log('🎯 识别场景: 花朵场景');
    } else if (lowerText.includes('海') || lowerText.includes('大海') || lowerText.includes('海洋')) {
      corePrompt = 'ocean waves, vast sea, blue water, maritime scene';
      console.log('🎯 识别场景: 海洋场景');
    } else if (lowerText.includes('森林') || lowerText.includes('树木') || lowerText.includes('绿色')) {
      corePrompt = 'lush forest, green trees, natural woodland, verdant landscape';
      console.log('🎯 识别场景: 森林场景');
    } else if (lowerText.includes('城市') || lowerText.includes('建筑') || lowerText.includes('街道')) {
      corePrompt = 'urban cityscape, modern buildings, city streets, architectural scene';
      console.log('🎯 识别场景: 城市场景');
    } else if (lowerText.includes('夜晚') || lowerText.includes('星空') || lowerText.includes('月亮')) {
      corePrompt = 'night sky with stars, moonlight, peaceful evening, celestial scene';
      console.log('🎯 识别场景: 夜空场景');
    } else if (lowerText.includes('雨') || lowerText.includes('下雨') || lowerText.includes('雨天')) {
      corePrompt = 'gentle rain, raindrops, wet atmosphere, rainy day scene';
      console.log('🎯 识别场景: 雨天场景');
    } else if (lowerText.includes('雪') || lowerText.includes('下雪') || lowerText.includes('雪花')) {
      corePrompt = 'falling snow, snowflakes, winter scene, snowy landscape';
      console.log('🎯 识别场景: 雪花场景');
    } else {
      // 🔥 关键修复：如果没有匹配到具体内容，确保用户语音内容完整包含在提示词中
      console.log('🎯 未匹配到预定义场景，直接使用用户语音内容');
      
      // 直接将用户的语音内容作为核心提示词，并添加视觉描述
      corePrompt = `${text}, detailed realistic scene, visual representation of "${text}", high quality artistic interpretation`;
      console.log('🎯 识别场景: 直接使用用户完整语音内容');
    }
    
    // 🔥 验证：确保用户的原始语音内容包含在核心提示词中
    if (!corePrompt.includes(text) && text.length > 0) {
      console.log('⚠️ 警告：核心提示词中未包含用户语音内容，正在添加...');
      corePrompt = `${text}, ${corePrompt}`;
    }
    
    console.log('✨ 最终核心提示词:', corePrompt);
    console.log('🔍 验证：是否包含用户语音内容?', corePrompt.includes(text));

    // 情感色彩映射
    const moodPrompts: Record<string, string> = {
      happy: 'bright vibrant colors, warm golden lighting, joyful uplifting atmosphere',
      sad: 'soft muted colors, gentle diffused lighting, melancholic peaceful atmosphere',
      neutral: 'balanced natural colors, soft natural lighting, calm serene atmosphere',
      thoughtful: 'deep contemplative colors, soft introspective lighting, meditative atmosphere',
      calm: 'pastel soothing colors, gentle warm lighting, tranquil peaceful atmosphere',
      excited: 'vibrant energetic colors, dynamic bright lighting, lively enthusiastic atmosphere',
      angry: 'intense bold colors, dramatic contrasting lighting, powerful dynamic atmosphere',
      surprised: 'bright contrasting colors, sharp clear lighting, dynamic engaging atmosphere'
    };

    // 风格映射
    const stylePrompts: Record<string, string> = {
      abstract: 'abstract artistic style, flowing organic shapes, creative interpretation',
      realistic: 'photorealistic detailed style, natural accurate representation, high definition',
      minimalist: 'minimalist clean style, simple elegant lines, uncluttered composition',
      artistic: 'artistic expressive style, creative brushwork, painterly interpretation',
      dreamy: 'dreamy ethereal style, soft romantic focus, magical atmosphere'
    };

    const moodPrompt = moodPrompts[sentiment.mood] || moodPrompts.neutral;
    const stylePrompt = stylePrompts[style] || stylePrompts.abstract;

    // 添加上下文信息
    let contextPrompt = '';
    if (context?.weather) {
      const weatherMap: Record<string, string> = {
        'sunny': 'bright sunny weather, clear skies',
        'cloudy': 'cloudy overcast weather, soft diffused light',
        'rainy': 'rainy weather atmosphere, wet reflective surfaces',
        'snowy': 'snowy winter weather, pristine white landscape'
      };
      contextPrompt += `, ${weatherMap[context.weather.condition] || context.weather.condition + ' weather'}`;
    }

    if (context?.time) {
      const hour = new Date(context.time).getHours();
      if (hour < 6) {
        contextPrompt += ', deep night atmosphere, starlit darkness, peaceful nocturnal scene';
      } else if (hour < 12) {
        contextPrompt += ', fresh morning light, dawn atmosphere, new day energy';
      } else if (hour < 18) {
        contextPrompt += ', warm afternoon light, midday brightness, active daytime scene';
      } else {
        contextPrompt += ', golden evening light, sunset atmosphere, peaceful twilight';
      }
    }

    // 🔥 组合最终提示词：确保用户语音内容在最前面
    const finalPrompt = `${corePrompt}, ${stylePrompt}, ${moodPrompt}${contextPrompt}, high quality artistic composition, professional digital art, detailed and beautiful, masterpiece`;

    console.log('✨ 生成的完整图片提示词:', finalPrompt);
    console.log('🔍 最终验证：提示词是否包含用户语音内容?', finalPrompt.includes(text));
    console.log('📝 用户原始语音内容:', `"${text}"`);
    console.log('📝 提示词开头部分:', finalPrompt.substring(0, 100) + '...');
    
    // 🔥 强制验证：如果提示词中不包含用户语音内容，强制添加
    if (!finalPrompt.includes(text) && text.trim().length > 0) {
      console.log('🚨 紧急修复：强制将用户语音内容添加到提示词开头');
      const correctedPrompt = `${text}, ${finalPrompt}`;
      console.log('🔧 修正后的提示词:', correctedPrompt);
      return correctedPrompt;
    }
    
    return finalPrompt;
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
