/**
 * 格式化工具函数测试
 */

// 简单的格式化函数
export const formatDuration = (seconds: number): string => {
  if (seconds < 0) return '00:00';
  
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const formatDate = (date: Date): string => {
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

describe('Format Utils', () => {
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

    test('应该处理大数值', () => {
      expect(formatDuration(7200)).toBe('120:00'); // 2小时
      expect(formatDuration(3723)).toBe('62:03'); // 1小时2分3秒
    });
  });

  describe('formatFileSize', () => {
    test('应该正确格式化字节大小', () => {
      expect(formatFileSize(0)).toBe('0 B');
      expect(formatFileSize(1024)).toBe('1 KB');
      expect(formatFileSize(1048576)).toBe('1 MB');
      expect(formatFileSize(1073741824)).toBe('1 GB');
    });

    test('应该处理小数值', () => {
      expect(formatFileSize(1536)).toBe('1.5 KB'); // 1.5KB
      expect(formatFileSize(2621440)).toBe('2.5 MB'); // 2.5MB
    });

    test('应该处理不规则大小', () => {
      expect(formatFileSize(1234)).toBe('1.21 KB');
      expect(formatFileSize(5678901)).toBe('5.41 MB');
    });
  });

  describe('formatDate', () => {
    test('应该正确格式化日期', () => {
      const testDate = new Date('2025-06-21T10:30:00');
      const formatted = formatDate(testDate);
      
      expect(formatted).toMatch(/2025/);
      expect(formatted).toMatch(/06/);
      expect(formatted).toMatch(/21/);
      expect(formatted).toMatch(/10:30/);
    });

    test('应该处理不同的日期', () => {
      const date1 = new Date('2024-01-01T00:00:00');
      const date2 = new Date('2024-12-31T23:59:59');
      
      const formatted1 = formatDate(date1);
      const formatted2 = formatDate(date2);
      
      expect(formatted1).toMatch(/2024/);
      expect(formatted1).toMatch(/01/);
      expect(formatted1).toMatch(/01/);
      
      expect(formatted2).toMatch(/2024/);
      expect(formatted2).toMatch(/12/);
      expect(formatted2).toMatch(/31/);
    });
  });

  describe('边界条件测试', () => {
    test('formatDuration应该处理极值', () => {
      expect(formatDuration(0)).toBe('00:00');
      expect(formatDuration(Number.MAX_SAFE_INTEGER)).toMatch(/^\d+:\d{2}$/);
    });

    test('formatFileSize应该处理极值', () => {
      expect(formatFileSize(0)).toBe('0 B');
      expect(formatFileSize(1)).toBe('1 B');
      expect(formatFileSize(Number.MAX_SAFE_INTEGER)).toMatch(/^\d+(\.\d+)? [KMGT]?B$/);
    });

    test('formatDate应该处理有效日期', () => {
      const validDate = new Date();
      const result = formatDate(validDate);
      
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });
  });
});
