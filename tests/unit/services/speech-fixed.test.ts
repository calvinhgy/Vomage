/**
 * Speech Service 单元测试 - 修复版本
 * 测试语音服务的核心功能，匹配实际API
 */

import { SpeechService, TranscriptionResult, TranscriptionOptions } from '@/services/speech';

// Mock fetch for API calls
global.fetch = jest.fn();

describe('SpeechService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (fetch as jest.MockedFunction<typeof fetch>).mockClear();
  });

  describe('基础功能测试', () => {
    test('应该能够访问SpeechService类', () => {
      expect(SpeechService).toBeDefined();
    });

    test('应该有必要的静态方法', () => {
      expect(typeof SpeechService.transcribeAudio).toBe('function');
      expect(typeof SpeechService.validateTranscription).toBe('function');
      expect(typeof SpeechService.getSupportedLanguages).toBe('function');
      expect(typeof SpeechService.checkServiceHealth).toBe('function');
    });
  });

  describe('语音转录功能', () => {
    test('应该能够转录音频文件', async () => {
      // Mock successful API response
      const mockResponse = {
        text: '测试转录文本',
        confidence: 0.95,
        language: 'zh-CN',
        duration: 3.5,
        isExact: true
      };

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const audioBlob = new Blob(['mock audio data'], { type: 'audio/webm' });
      const result = await SpeechService.transcribeAudio(audioBlob);

      expect(result).toEqual(mockResponse);
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    test('应该处理转录选项', async () => {
      const mockResponse = {
        text: '测试文本',
        confidence: 0.9,
        language: 'en-US',
        isExact: true
      };

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const audioBlob = new Blob(['mock audio data'], { type: 'audio/webm' });
      const options: TranscriptionOptions = {
        language: 'en-US',
        requireExact: true
      };

      const result = await SpeechService.transcribeAudio(audioBlob, options);

      expect(result.language).toBe('en-US');
      expect(result.isExact).toBe(true);
    });

    test('应该处理API错误', async () => {
      (fetch as jest.MockedFunction<typeof fetch>).mockRejectedValueOnce(
        new Error('Network error')
      );

      const audioBlob = new Blob(['mock audio data'], { type: 'audio/webm' });

      await expect(SpeechService.transcribeAudio(audioBlob)).rejects.toThrow();
    });
  });

  describe('转录结果验证', () => {
    test('应该验证有效的转录结果', () => {
      const validResult: TranscriptionResult = {
        text: '有效的转录文本',
        confidence: 0.9,
        language: 'zh-CN'
      };

      expect(SpeechService.validateTranscription(validResult)).toBe(true);
    });

    test('应该拒绝无效的转录结果', () => {
      const invalidResult: TranscriptionResult = {
        text: '',
        confidence: 0.5
      };

      expect(SpeechService.validateTranscription(invalidResult)).toBe(false);
    });

    test('应该拒绝置信度过低的结果', () => {
      const lowConfidenceResult: TranscriptionResult = {
        text: '低置信度文本',
        confidence: 0.3
      };

      expect(SpeechService.validateTranscription(lowConfidenceResult)).toBe(false);
    });
  });

  describe('支持的语言', () => {
    test('应该返回支持的语言列表', () => {
      const languages = SpeechService.getSupportedLanguages();
      
      expect(Array.isArray(languages)).toBe(true);
      expect(languages.length).toBeGreaterThan(0);
      expect(languages).toContain('zh-CN');
    });
  });

  describe('服务健康检查', () => {
    test('应该检查服务健康状态', async () => {
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'healthy' }),
      } as Response);

      const isHealthy = await SpeechService.checkServiceHealth();
      
      expect(typeof isHealthy).toBe('boolean');
    });

    test('应该处理健康检查失败', async () => {
      (fetch as jest.MockedFunction<typeof fetch>).mockRejectedValueOnce(
        new Error('Service unavailable')
      );

      const isHealthy = await SpeechService.checkServiceHealth();
      
      expect(isHealthy).toBe(false);
    });
  });

  describe('错误处理', () => {
    test('应该处理空音频文件', async () => {
      const emptyBlob = new Blob([], { type: 'audio/webm' });

      await expect(SpeechService.transcribeAudio(emptyBlob)).rejects.toThrow();
    });

    test('应该处理不支持的音频格式', async () => {
      const invalidBlob = new Blob(['invalid'], { type: 'text/plain' });

      await expect(SpeechService.transcribeAudio(invalidBlob)).rejects.toThrow();
    });
  });
});
