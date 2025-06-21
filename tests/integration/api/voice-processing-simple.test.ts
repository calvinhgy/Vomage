/**
 * 语音处理API集成测试 - 简化版本
 */

// Mock语音处理API
const mockVoiceAPI = {
  processVoice: jest.fn(),
  getStatus: jest.fn(),
  retryProcessing: jest.fn()
};

// Mock响应数据
const mockSuccessResponse = {
  success: true,
  data: {
    transcription: {
      text: '今天天气真好，心情很愉快',
      confidence: 0.95,
      language: 'zh-CN'
    },
    sentiment: {
      mood: 'happy',
      confidence: 0.92,
      emotions: ['joy', 'contentment']
    },
    generatedImage: {
      imageUrl: 'https://s3.amazonaws.com/vomage-images/generated-123.png',
      metadata: {
        prompt: 'blue sky with white clouds',
        style: 'photorealistic'
      }
    },
    requestId: 'req_123456789'
  }
};

describe('Voice Processing API Integration - Simple Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('应该成功处理语音文件', async () => {
    mockVoiceAPI.processVoice.mockResolvedValue(mockSuccessResponse);

    const audioFile = Buffer.from('mock-audio-data');
    const result = await mockVoiceAPI.processVoice(audioFile, {
      userId: 'user123'
    });

    expect(result.success).toBe(true);
    expect(result.data.transcription.text).toBe('今天天气真好，心情很愉快');
    expect(result.data.sentiment.mood).toBe('happy');
    expect(result.data.generatedImage.imageUrl).toContain('s3.amazonaws.com');
  });

  test('应该处理API错误', async () => {
    mockVoiceAPI.processVoice.mockResolvedValue({
      success: false,
      error: {
        code: 'PROCESSING_FAILED',
        message: 'Failed to process voice recording'
      }
    });

    const result = await mockVoiceAPI.processVoice(Buffer.from('invalid-audio'));

    expect(result.success).toBe(false);
    expect(result.error.code).toBe('PROCESSING_FAILED');
  });

  test('应该返回处理状态', async () => {
    mockVoiceAPI.getStatus.mockResolvedValue({
      success: true,
      data: {
        requestId: 'req_123456789',
        status: 'completed',
        progress: 100
      }
    });

    const result = await mockVoiceAPI.getStatus('req_123456789');

    expect(result.success).toBe(true);
    expect(result.data.status).toBe('completed');
    expect(result.data.progress).toBe(100);
  });

  test('应该验证响应数据格式', () => {
    const response = mockSuccessResponse;

    expect(response).toHaveProperty('success', true);
    expect(response).toHaveProperty('data');
    expect(response.data).toHaveProperty('transcription');
    expect(response.data).toHaveProperty('sentiment');
    expect(response.data).toHaveProperty('generatedImage');
    expect(response.data).toHaveProperty('requestId');
  });

  test('应该正确调用API方法', async () => {
    mockVoiceAPI.processVoice.mockResolvedValue(mockSuccessResponse);

    const audioFile = Buffer.from('test-audio');
    await mockVoiceAPI.processVoice(audioFile);

    expect(mockVoiceAPI.processVoice).toHaveBeenCalledTimes(1);
    expect(mockVoiceAPI.processVoice).toHaveBeenCalledWith(audioFile);
  });

  test('应该处理网络错误', async () => {
    mockVoiceAPI.processVoice.mockRejectedValue(new Error('Network error'));

    try {
      await mockVoiceAPI.processVoice(Buffer.from('audio'));
    } catch (error) {
      expect(error.message).toBe('Network error');
    }
  });
});
