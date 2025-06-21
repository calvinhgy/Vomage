/**
 * Audio Utils 单元测试
 * 测试音频工具函数
 */

import { formatDuration, validateAudioFile, convertBlobToBase64 } from '@/utils/audio';

describe('Audio Utils', () => {
  describe('formatDuration', () => {
    test('应该正确格式化秒数为时间字符串', () => {
      expect(formatDuration(0)).toBe('00:00');
      expect(formatDuration(30)).toBe('00:30');
      expect(formatDuration(60)).toBe('01:00');
      expect(formatDuration(90)).toBe('01:30');
      expect(formatDuration(3661)).toBe('61:01');
    });

    test('应该处理小数秒数', () => {
      expect(formatDuration(30.5)).toBe('00:30');
      expect(formatDuration(59.9)).toBe('00:59');
    });

    test('应该处理负数', () => {
      expect(formatDuration(-10)).toBe('00:00');
    });
  });

  describe('validateAudioFile', () => {
    test('应该验证有效的音频文件', () => {
      const validFile = new File(['audio content'], 'test.webm', {
        type: 'audio/webm'
      });
      
      expect(validateAudioFile(validFile)).toBe(true);
    });

    test('应该拒绝无效的文件类型', () => {
      const invalidFile = new File(['text content'], 'test.txt', {
        type: 'text/plain'
      });
      
      expect(validateAudioFile(invalidFile)).toBe(false);
    });

    test('应该拒绝过大的文件', () => {
      const largeFile = new File([new ArrayBuffer(50 * 1024 * 1024)], 'large.webm', {
        type: 'audio/webm'
      });
      
      expect(validateAudioFile(largeFile, 25 * 1024 * 1024)).toBe(false);
    });
  });

  describe('convertBlobToBase64', () => {
    test('应该将Blob转换为base64字符串', async () => {
      const blob = new Blob(['test content'], { type: 'audio/webm' });
      const base64 = await convertBlobToBase64(blob);
      
      expect(typeof base64).toBe('string');
      expect(base64.startsWith('data:audio/webm;base64,')).toBe(true);
    });

    test('应该处理空Blob', async () => {
      const emptyBlob = new Blob([], { type: 'audio/webm' });
      const base64 = await convertBlobToBase64(emptyBlob);
      
      expect(typeof base64).toBe('string');
      expect(base64.startsWith('data:audio/webm;base64,')).toBe(true);
    });
  });
});
