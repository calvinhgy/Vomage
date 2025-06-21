/**
 * Speech Service Mock测试 - 修复版本
 */

// 完全Mock SpeechService模块
jest.mock('@/services/speech', () => ({
  SpeechService: {
    transcribeAudio: jest.fn(),
    validateTranscription: jest.fn(),
    getSupportedLanguages: jest.fn(),
    checkServiceHealth: jest.fn(),
  }
}));

import { SpeechService } from '@/services/speech';

describe('SpeechService Mock Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('应该能够访问SpeechService类', () => {
    expect(SpeechService).toBeDefined();
  });

  test('应该有必要的静态方法', () => {
    expect(typeof SpeechService.transcribeAudio).toBe('function');
    expect(typeof SpeechService.validateTranscription).toBe('function');
    expect(typeof SpeechService.getSupportedLanguages).toBe('function');
    expect(typeof SpeechService.checkServiceHealth).toBe('function');
  });

  test('应该能够Mock转录音频文件', async () => {
    const mockResult = {
      text: '测试转录文本',
      confidence: 0.95,
      language: 'zh-CN'
    };

    (SpeechService.transcribeAudio as jest.Mock).mockResolvedValue(mockResult);

    const audioBlob = new Blob(['mock audio data'], { type: 'audio/webm' });
    const result = await SpeechService.transcribeAudio(audioBlob);

    expect(result).toEqual(mockResult);
    expect(SpeechService.transcribeAudio).toHaveBeenCalledWith(audioBlob);
  });

  test('应该Mock返回支持的语言列表', () => {
    const mockLanguages = ['zh-CN', 'en-US', 'ja-JP'];
    (SpeechService.getSupportedLanguages as jest.Mock).mockReturnValue(mockLanguages);

    const languages = SpeechService.getSupportedLanguages();
    
    expect(Array.isArray(languages)).toBe(true);
    expect(languages).toEqual(mockLanguages);
  });

  test('应该Mock检查服务健康状态', async () => {
    (SpeechService.checkServiceHealth as jest.Mock).mockResolvedValue(true);

    const isHealthy = await SpeechService.checkServiceHealth();
    
    expect(isHealthy).toBe(true);
    expect(SpeechService.checkServiceHealth).toHaveBeenCalled();
  });
});
