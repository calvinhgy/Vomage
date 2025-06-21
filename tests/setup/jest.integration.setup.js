/**
 * Jest集成测试设置
 * 专门为集成测试配置的环境设置
 */

// 扩展Jest匹配器
import '@testing-library/jest-dom';

// 全局变量设置
global.console = {
  ...console,
  // 在测试中静默某些日志
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock环境变量
process.env.NODE_ENV = 'test';
process.env.NEXT_PUBLIC_API_URL = 'http://localhost:3000/api';

// Mock fetch API
global.fetch = jest.fn();

// Mock Buffer (Node.js环境)
if (typeof Buffer === 'undefined') {
  global.Buffer = require('buffer').Buffer;
}

// 测试超时设置
jest.setTimeout(30000);

// 清理函数
afterEach(() => {
  jest.clearAllMocks();
});

console.log('🧪 集成测试环境设置完成');
