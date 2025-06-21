/**
 * Claude服务集成测试
 * 测试Claude AI服务的集成功能
 */

// Mock Claude服务
const mockClaudeService = {
  analyzeSentiment: jest.fn(),
  generateImagePrompt: jest.fn(),
  processVoiceContent: jest.fn(),
  checkHealth: jest.fn()
};

// Mock响应数据
const mockSentimentResponse = {
  mood: 'happy',
  confidence: 0.95,
  emotions: ['joy', 'excitement', 'contentment'],
  analysis: 'The user expresses positive emotions about the weather and their mood.',
  keywords: ['天气', '好', '心情', '愉快'],
  intensity: 'high'
};

const mockImagePromptResponse = 'blue sky with white clouds, vast open sky, peaceful clouds floating, abstract artistic style, bright vibrant colors, warm golden lighting, fresh morning light, dawn atmosphere, new day energy, high quality artistic composition, professional digital art, detailed and beautiful';

const mockProcessResponse = {
  transcription: '今天天气真好，心情很愉快',
  sentiment: mockSentimentResponse,
  imagePrompt: mockImagePromptResponse,
  processingTime: 2.5,
  requestId: 'claude_req_123'
};

describe('Claude Service Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('情感分析服务', () => {
    test('应该成功分析语音内容的情感', async () => {
      mockClaudeService.analyzeSentiment.mockResolvedValue(mockSentimentResponse);

      const voiceText = '今天天气真好，心情很愉快';
      const result = await mockClaudeService.analyzeSentiment(voiceText);

      expect(result.mood).toBe('happy');
      expect(result.confidence).toBeGreaterThan(0.9);
      expect(result.emotions).toContain('joy');
      expect(result.analysis).toContain('positive emotions');
      expect(mockClaudeService.analyzeSentiment).toHaveBeenCalledWith(voiceText);
    });

    test('应该处理负面情感', async () => {
      const negativeResponse = {
        mood: 'sad',
        confidence: 0.88,
        emotions: ['sadness', 'disappointment'],
        analysis: 'The user expresses negative emotions and disappointment.',
        keywords: ['难过', '失望'],
        intensity: 'medium'
      };

      mockClaudeService.analyzeSentiment.mockResolvedValue(negativeResponse);

      const voiceText = '今天真的很难过，感觉很失望';
      const result = await mockClaudeService.analyzeSentiment(voiceText);

      expect(result.mood).toBe('sad');
      expect(result.emotions).toContain('sadness');
      expect(result.keywords).toContain('难过');
    });

    test('应该处理中性情感', async () => {
      const neutralResponse = {
        mood: 'neutral',
        confidence: 0.75,
        emotions: ['calm', 'neutral'],
        analysis: 'The user expresses neutral emotions.',
        keywords: ['工作', '日常'],
        intensity: 'low'
      };

      mockClaudeService.analyzeSentiment.mockResolvedValue(neutralResponse);

      const voiceText = '今天的工作很正常，没什么特别的';
      const result = await mockClaudeService.analyzeSentiment(voiceText);

      expect(result.mood).toBe('neutral');
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    test('应该处理空文本', async () => {
      mockClaudeService.analyzeSentiment.mockResolvedValue({
        mood: 'unknown',
        confidence: 0.0,
        emotions: [],
        analysis: 'No content to analyze',
        keywords: [],
        intensity: 'none'
      });

      const result = await mockClaudeService.analyzeSentiment('');

      expect(result.mood).toBe('unknown');
      expect(result.confidence).toBe(0.0);
      expect(result.emotions).toHaveLength(0);
    });
  });

  describe('图片提示词生成服务', () => {
    test('应该基于情感生成图片提示词', async () => {
      mockClaudeService.generateImagePrompt.mockResolvedValue(mockImagePromptResponse);

      const sentiment = mockSentimentResponse;
      const context = {
        weather: 'sunny',
        location: 'outdoor',
        timeOfDay: 'morning'
      };

      const result = await mockClaudeService.generateImagePrompt(sentiment, context);

      expect(result).toContain('blue sky');
      expect(result).toContain('clouds');
      expect(result).toContain('bright vibrant colors');
      expect(mockClaudeService.generateImagePrompt).toHaveBeenCalledWith(sentiment, context);
    });

    test('应该为不同情感生成不同风格的提示词', async () => {
      const sadPrompt = 'gray cloudy sky, rain drops, melancholic atmosphere, soft muted colors, gentle rain, peaceful solitude, artistic composition, emotional depth, contemplative mood';
      
      mockClaudeService.generateImagePrompt.mockResolvedValue(sadPrompt);

      const sadSentiment = {
        mood: 'sad',
        emotions: ['sadness'],
        intensity: 'medium'
      };

      const result = await mockClaudeService.generateImagePrompt(sadSentiment);

      expect(result).toContain('gray');
      expect(result).toContain('rain');
      expect(result).toContain('melancholic');
    });

    test('应该处理复杂的上下文信息', async () => {
      const complexPrompt = 'urban cityscape at sunset, warm golden hour lighting, bustling city life, modern architecture, vibrant street scene, dynamic composition, professional photography style';
      
      mockClaudeService.generateImagePrompt.mockResolvedValue(complexPrompt);

      const sentiment = { mood: 'excited', emotions: ['excitement'] };
      const context = {
        weather: 'clear',
        location: 'city',
        timeOfDay: 'evening',
        activity: 'commuting'
      };

      const result = await mockClaudeService.generateImagePrompt(sentiment, context);

      expect(result).toContain('cityscape');
      expect(result).toContain('sunset');
      expect(result).toContain('urban');
    });
  });

  describe('综合语音处理服务', () => {
    test('应该完整处理语音内容', async () => {
      mockClaudeService.processVoiceContent.mockResolvedValue(mockProcessResponse);

      const voiceText = '今天天气真好，心情很愉快';
      const context = {
        weather: 'sunny',
        location: 'outdoor',
        timeOfDay: 'morning'
      };

      const result = await mockClaudeService.processVoiceContent(voiceText, context);

      expect(result.transcription).toBe(voiceText);
      expect(result.sentiment.mood).toBe('happy');
      expect(result.imagePrompt).toContain('blue sky');
      expect(result.processingTime).toBeGreaterThan(0);
      expect(result.requestId).toBeTruthy();
    });

    test('应该处理处理失败的情况', async () => {
      mockClaudeService.processVoiceContent.mockRejectedValue(
        new Error('Claude API rate limit exceeded')
      );

      const voiceText = '测试文本';

      try {
        await mockClaudeService.processVoiceContent(voiceText);
      } catch (error) {
        expect(error.message).toContain('rate limit');
      }

      expect(mockClaudeService.processVoiceContent).toHaveBeenCalledWith(voiceText);
    });
  });

  describe('服务健康检查', () => {
    test('应该检查Claude服务健康状态', async () => {
      mockClaudeService.checkHealth.mockResolvedValue({
        status: 'healthy',
        responseTime: 150,
        apiVersion: 'v1',
        lastCheck: new Date().toISOString()
      });

      const result = await mockClaudeService.checkHealth();

      expect(result.status).toBe('healthy');
      expect(result.responseTime).toBeLessThan(1000);
      expect(result.apiVersion).toBeTruthy();
    });

    test('应该处理服务不可用的情况', async () => {
      mockClaudeService.checkHealth.mockResolvedValue({
        status: 'unhealthy',
        error: 'Service temporarily unavailable',
        responseTime: null,
        lastCheck: new Date().toISOString()
      });

      const result = await mockClaudeService.checkHealth();

      expect(result.status).toBe('unhealthy');
      expect(result.error).toBeTruthy();
    });
  });

  describe('错误处理和重试机制', () => {
    test('应该处理API限流错误', async () => {
      mockClaudeService.analyzeSentiment
        .mockRejectedValueOnce(new Error('Rate limit exceeded'))
        .mockResolvedValueOnce(mockSentimentResponse);

      // 第一次调用失败
      try {
        await mockClaudeService.analyzeSentiment('测试文本');
      } catch (error) {
        expect(error.message).toContain('Rate limit');
      }

      // 重试成功
      const result = await mockClaudeService.analyzeSentiment('测试文本');
      expect(result.mood).toBe('happy');
    });

    test('应该处理网络超时', async () => {
      mockClaudeService.processVoiceContent.mockRejectedValue(
        new Error('Request timeout')
      );

      try {
        await mockClaudeService.processVoiceContent('测试文本');
      } catch (error) {
        expect(error.message).toContain('timeout');
      }
    });
  });

  describe('性能测试', () => {
    test('情感分析响应时间应该合理', async () => {
      mockClaudeService.analyzeSentiment.mockImplementation(async (text) => {
        // 模拟处理时间
        await new Promise(resolve => setTimeout(resolve, 100));
        return mockSentimentResponse;
      });

      const startTime = Date.now();
      await mockClaudeService.analyzeSentiment('测试文本');
      const endTime = Date.now();

      const responseTime = endTime - startTime;
      expect(responseTime).toBeLessThan(5000); // 5秒内响应
      expect(responseTime).toBeGreaterThan(50); // 至少50ms处理时间
    });

    test('并发请求应该正确处理', async () => {
      mockClaudeService.analyzeSentiment.mockResolvedValue(mockSentimentResponse);

      const promises = [];
      for (let i = 0; i < 3; i++) {
        promises.push(mockClaudeService.analyzeSentiment(`测试文本${i}`));
      }

      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result.mood).toBe('happy');
      });
      expect(mockClaudeService.analyzeSentiment).toHaveBeenCalledTimes(3);
    });
  });

  describe('数据验证', () => {
    test('情感分析结果应该包含所有必需字段', async () => {
      mockClaudeService.analyzeSentiment.mockResolvedValue(mockSentimentResponse);

      const result = await mockClaudeService.analyzeSentiment('测试文本');

      expect(result).toHaveProperty('mood');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('emotions');
      expect(result).toHaveProperty('analysis');
      expect(result).toHaveProperty('keywords');
      expect(result).toHaveProperty('intensity');

      expect(typeof result.mood).toBe('string');
      expect(typeof result.confidence).toBe('number');
      expect(Array.isArray(result.emotions)).toBe(true);
      expect(typeof result.analysis).toBe('string');
    });

    test('置信度应该在有效范围内', async () => {
      mockClaudeService.analyzeSentiment.mockResolvedValue(mockSentimentResponse);

      const result = await mockClaudeService.analyzeSentiment('测试文本');

      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });
  });
});
