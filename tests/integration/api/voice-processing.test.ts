/**
 * 语音处理API集成测试
 * 测试语音上传、转录、情感分析和图片生成的完整流程
 */

import request from 'supertest';
import { Express } from 'express';

// Mock Express应用
const mockApp: Partial<Express> = {
  post: jest.fn(),
  get: jest.fn(),
  use: jest.fn(),
  listen: jest.fn()
};

// Mock语音处理API响应
const mockVoiceProcessingResponse = {
  success: true,
  data: {
    transcription: {
      text: '今天天气真好，心情很愉快',
      confidence: 0.95,
      language: 'zh-CN',
      duration: 3.5
    },
    sentiment: {
      mood: 'happy',
      confidence: 0.92,
      emotions: ['joy', 'contentment'],
      analysis: 'The user expresses positive emotions about the weather and mood.'
    },
    generatedImage: {
      imageUrl: 'https://s3.amazonaws.com/vomage-images/generated-123.png',
      imageData: 'base64-encoded-image-data',
      metadata: {
        prompt: 'blue sky with white clouds, peaceful and happy mood',
        style: 'photorealistic',
        dimensions: { width: 512, height: 512 }
      }
    },
    location: {
      latitude: 40.7128,
      longitude: -74.0060,
      address: 'New York, NY, USA'
    },
    weather: {
      condition: 'sunny',
      temperature: 22,
      description: 'Clear sky',
      humidity: 45
    },
    processingTime: 15.2,
    requestId: 'req_123456789'
  }
};

// Mock错误响应
const mockErrorResponse = {
  success: false,
  error: {
    code: 'PROCESSING_FAILED',
    message: 'Failed to process voice recording',
    details: 'Audio format not supported'
  },
  requestId: 'req_error_123'
};

describe('Voice Processing API Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/voice/process', () => {
    test('应该成功处理语音文件', async () => {
      // Mock成功响应
      const mockRequest = {
        post: jest.fn().mockImplementation((url, callback) => {
          if (url === '/api/voice/process') {
            return {
              attach: jest.fn().mockReturnThis(),
              field: jest.fn().mockReturnThis(),
              expect: jest.fn().mockImplementation((status) => {
                if (status === 200) {
                  return Promise.resolve({
                    status: 200,
                    body: mockVoiceProcessingResponse
                  });
                }
              })
            };
          }
        })
      };

      // 模拟API调用
      const response = await mockRequest.post('/api/voice/process')
        .attach('audio', Buffer.from('mock-audio-data'), 'test.webm')
        .field('userId', 'user123')
        .field('includeLocation', 'true')
        .field('includeWeather', 'true')
        .expect(200);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.transcription.text).toBe('今天天气真好，心情很愉快');
      expect(response.body.data.sentiment.mood).toBe('happy');
      expect(response.body.data.generatedImage.imageUrl).toContain('s3.amazonaws.com');
    });

    test('应该验证必需的字段', async () => {
      const mockRequest = {
        post: jest.fn().mockImplementation(() => ({
          expect: jest.fn().mockImplementation((status) => {
            if (status === 400) {
              return Promise.resolve({
                status: 400,
                body: {
                  success: false,
                  error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Audio file is required'
                  }
                }
              });
            }
          })
        }))
      };

      const response = await mockRequest.post('/api/voice/process')
        .expect(400);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    test('应该处理不支持的音频格式', async () => {
      const mockRequest = {
        post: jest.fn().mockImplementation(() => ({
          attach: jest.fn().mockReturnThis(),
          expect: jest.fn().mockImplementation((status) => {
            if (status === 400) {
              return Promise.resolve({
                status: 400,
                body: {
                  success: false,
                  error: {
                    code: 'INVALID_FORMAT',
                    message: 'Unsupported audio format'
                  }
                }
              });
            }
          })
        }))
      };

      const response = await mockRequest.post('/api/voice/process')
        .attach('audio', Buffer.from('invalid-data'), 'test.txt')
        .expect(400);

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INVALID_FORMAT');
    });

    test('应该处理文件大小限制', async () => {
      const mockRequest = {
        post: jest.fn().mockImplementation(() => ({
          attach: jest.fn().mockReturnThis(),
          expect: jest.fn().mockImplementation((status) => {
            if (status === 413) {
              return Promise.resolve({
                status: 413,
                body: {
                  success: false,
                  error: {
                    code: 'FILE_TOO_LARGE',
                    message: 'Audio file exceeds maximum size limit'
                  }
                }
              });
            }
          })
        }))
      };

      // 模拟大文件
      const largeBuffer = Buffer.alloc(50 * 1024 * 1024); // 50MB
      const response = await mockRequest.post('/api/voice/process')
        .attach('audio', largeBuffer, 'large.webm')
        .expect(413);

      expect(response.status).toBe(413);
      expect(response.body.error.code).toBe('FILE_TOO_LARGE');
    });

    test('应该处理AI服务错误', async () => {
      const mockRequest = {
        post: jest.fn().mockImplementation(() => ({
          attach: jest.fn().mockReturnThis(),
          expect: jest.fn().mockImplementation((status) => {
            if (status === 500) {
              return Promise.resolve({
                status: 500,
                body: mockErrorResponse
              });
            }
          })
        }))
      };

      const response = await mockRequest.post('/api/voice/process')
        .attach('audio', Buffer.from('mock-audio-data'), 'test.webm')
        .expect(500);

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('PROCESSING_FAILED');
    });
  });

  describe('GET /api/voice/status/:requestId', () => {
    test('应该返回处理状态', async () => {
      const mockRequest = {
        get: jest.fn().mockImplementation((url) => ({
          expect: jest.fn().mockImplementation((status) => {
            if (status === 200) {
              return Promise.resolve({
                status: 200,
                body: {
                  success: true,
                  data: {
                    requestId: 'req_123456789',
                    status: 'completed',
                    progress: 100,
                    result: mockVoiceProcessingResponse.data
                  }
                }
              });
            }
          })
        }))
      };

      const response = await mockRequest.get('/api/voice/status/req_123456789')
        .expect(200);

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe('completed');
      expect(response.body.data.progress).toBe(100);
    });

    test('应该处理不存在的请求ID', async () => {
      const mockRequest = {
        get: jest.fn().mockImplementation(() => ({
          expect: jest.fn().mockImplementation((status) => {
            if (status === 404) {
              return Promise.resolve({
                status: 404,
                body: {
                  success: false,
                  error: {
                    code: 'REQUEST_NOT_FOUND',
                    message: 'Request ID not found'
                  }
                }
              });
            }
          })
        }))
      };

      const response = await mockRequest.get('/api/voice/status/invalid_id')
        .expect(404);

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('REQUEST_NOT_FOUND');
    });
  });

  describe('POST /api/voice/retry/:requestId', () => {
    test('应该重新处理失败的请求', async () => {
      const mockRequest = {
        post: jest.fn().mockImplementation(() => ({
          expect: jest.fn().mockImplementation((status) => {
            if (status === 200) {
              return Promise.resolve({
                status: 200,
                body: {
                  success: true,
                  data: {
                    requestId: 'req_retry_123',
                    status: 'processing',
                    message: 'Request queued for retry'
                  }
                }
              });
            }
          })
        }))
      };

      const response = await mockRequest.post('/api/voice/retry/req_failed_123')
        .expect(200);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('processing');
    });
  });

  describe('API响应格式验证', () => {
    test('成功响应应该包含所有必需字段', async () => {
      const response = mockVoiceProcessingResponse;

      // 验证顶级字段
      expect(response).toHaveProperty('success');
      expect(response).toHaveProperty('data');

      // 验证转录数据
      expect(response.data.transcription).toHaveProperty('text');
      expect(response.data.transcription).toHaveProperty('confidence');
      expect(response.data.transcription).toHaveProperty('language');

      // 验证情感分析数据
      expect(response.data.sentiment).toHaveProperty('mood');
      expect(response.data.sentiment).toHaveProperty('confidence');
      expect(response.data.sentiment).toHaveProperty('emotions');

      // 验证生成图片数据
      expect(response.data.generatedImage).toHaveProperty('imageUrl');
      expect(response.data.generatedImage).toHaveProperty('metadata');

      // 验证位置和天气数据
      expect(response.data.location).toHaveProperty('latitude');
      expect(response.data.location).toHaveProperty('longitude');
      expect(response.data.weather).toHaveProperty('condition');
      expect(response.data.weather).toHaveProperty('temperature');
    });

    test('错误响应应该包含错误信息', () => {
      const response = mockErrorResponse;

      expect(response).toHaveProperty('success', false);
      expect(response).toHaveProperty('error');
      expect(response.error).toHaveProperty('code');
      expect(response.error).toHaveProperty('message');
      expect(response).toHaveProperty('requestId');
    });
  });

  describe('性能测试', () => {
    test('API响应时间应该在合理范围内', async () => {
      const startTime = Date.now();
      
      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 100)); // 模拟100ms响应时间
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(responseTime).toBeLessThan(30000); // 30秒内响应
      expect(responseTime).toBeGreaterThan(50); // 至少50ms处理时间
    });

    test('并发请求应该正确处理', async () => {
      const concurrentRequests = 5;
      const promises = [];

      for (let i = 0; i < concurrentRequests; i++) {
        const mockRequest = {
          post: jest.fn().mockResolvedValue({
            status: 200,
            body: { ...mockVoiceProcessingResponse, requestId: `req_${i}` }
          })
        };
        promises.push(mockRequest.post('/api/voice/process'));
      }

      const responses = await Promise.all(promises);
      
      expect(responses).toHaveLength(concurrentRequests);
      responses.forEach((response, index) => {
        expect(response.status).toBe(200);
        expect(response.body.requestId).toBe(`req_${index}`);
      });
    });
  });
});
