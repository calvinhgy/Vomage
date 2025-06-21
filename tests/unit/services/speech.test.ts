/**
 * Speech Service 单元测试
 * 测试语音服务的核心功能
 */

import { SpeechService } from '@/services/speech';

// Mock MediaRecorder
global.MediaRecorder = jest.fn().mockImplementation(() => ({
  start: jest.fn(),
  stop: jest.fn(),
  pause: jest.fn(),
  resume: jest.fn(),
  state: 'inactive',
  ondataavailable: null,
  onstop: null,
  onstart: null,
  onerror: null
}));

describe('SpeechService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('基础功能测试', () => {
    test('应该能够创建SpeechService实例', () => {
      expect(SpeechService).toBeDefined();
    });

    test('应该有必要的方法', () => {
      expect(typeof SpeechService.startRecording).toBe('function');
      expect(typeof SpeechService.stopRecording).toBe('function');
      expect(typeof SpeechService.isRecording).toBe('function');
    });
  });

  describe('权限检查', () => {
    test('应该能够检查麦克风权限', async () => {
      // Mock navigator.mediaDevices.getUserMedia
      Object.defineProperty(navigator, 'mediaDevices', {
        value: {
          getUserMedia: jest.fn().mockResolvedValue({
            getTracks: () => [{ stop: jest.fn() }]
          })
        },
        writable: true
      });

      const hasPermission = await SpeechService.checkPermissions();
      expect(typeof hasPermission).toBe('boolean');
    });
  });

  describe('录音状态管理', () => {
    test('初始状态应该是未录音', () => {
      expect(SpeechService.isRecording()).toBe(false);
    });

    test('应该能够正确报告录音状态', () => {
      // 这里测试录音状态的逻辑
      const isRecording = SpeechService.isRecording();
      expect(typeof isRecording).toBe('boolean');
    });
  });
});
