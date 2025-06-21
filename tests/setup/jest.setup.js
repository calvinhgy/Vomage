/**
 * Jest测试环境设置
 * 为Vomage项目配置测试环境和全局Mock
 */

import '@testing-library/jest-dom';
import 'jest-canvas-mock';

// 全局测试配置
global.console = {
  ...console,
  // 在测试中静默某些日志
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: console.warn,
  error: console.error,
};

// Mock Web APIs
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock MediaRecorder API
global.MediaRecorder = class MockMediaRecorder {
  constructor(stream, options) {
    this.stream = stream;
    this.options = options;
    this.state = 'inactive';
    this.ondataavailable = null;
    this.onstop = null;
    this.onstart = null;
    this.onerror = null;
  }

  start(timeslice) {
    this.state = 'recording';
    if (this.onstart) {
      this.onstart();
    }
    
    // 模拟数据可用事件
    setTimeout(() => {
      if (this.ondataavailable) {
        const mockBlob = new Blob(['mock audio data'], { type: 'audio/webm' });
        this.ondataavailable({ data: mockBlob });
      }
    }, 100);
  }

  stop() {
    this.state = 'inactive';
    if (this.onstop) {
      this.onstop();
    }
  }

  pause() {
    this.state = 'paused';
  }

  resume() {
    this.state = 'recording';
  }

  static isTypeSupported(mimeType) {
    return ['audio/webm', 'audio/mp4'].includes(mimeType);
  }
};

// Mock getUserMedia
Object.defineProperty(navigator, 'mediaDevices', {
  writable: true,
  value: {
    getUserMedia: jest.fn().mockResolvedValue({
      getTracks: () => [
        {
          kind: 'audio',
          stop: jest.fn(),
          getSettings: () => ({ sampleRate: 44100, channelCount: 1 })
        }
      ],
      getAudioTracks: () => [
        {
          kind: 'audio',
          stop: jest.fn(),
          getSettings: () => ({ sampleRate: 44100, channelCount: 1 })
        }
      ]
    }),
    enumerateDevices: jest.fn().mockResolvedValue([
      {
        deviceId: 'default',
        kind: 'audioinput',
        label: 'Default Microphone',
        groupId: 'default'
      }
    ])
  },
});

// Mock Geolocation API
Object.defineProperty(navigator, 'geolocation', {
  writable: true,
  value: {
    getCurrentPosition: jest.fn().mockImplementation((success, error) => {
      success({
        coords: {
          latitude: 40.7128,
          longitude: -74.0060,
          accuracy: 10
        },
        timestamp: Date.now()
      });
    }),
    watchPosition: jest.fn(),
    clearWatch: jest.fn()
  },
});

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor(callback, options) {
    this.callback = callback;
    this.options = options;
  }

  observe() {
    return null;
  }

  disconnect() {
    return null;
  }

  unobserve() {
    return null;
  }
};

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor(callback) {
    this.callback = callback;
  }

  observe() {
    return null;
  }

  disconnect() {
    return null;
  }

  unobserve() {
    return null;
  }
};

// Mock Web Audio API
global.AudioContext = class MockAudioContext {
  constructor() {
    this.state = 'running';
    this.sampleRate = 44100;
    this.currentTime = 0;
  }

  createAnalyser() {
    return {
      fftSize: 2048,
      frequencyBinCount: 1024,
      getByteFrequencyData: jest.fn(),
      getByteTimeDomainData: jest.fn(),
      connect: jest.fn(),
      disconnect: jest.fn()
    };
  }

  createMediaStreamSource(stream) {
    return {
      connect: jest.fn(),
      disconnect: jest.fn()
    };
  }

  close() {
    this.state = 'closed';
    return Promise.resolve();
  }

  resume() {
    this.state = 'running';
    return Promise.resolve();
  }

  suspend() {
    this.state = 'suspended';
    return Promise.resolve();
  }
};

// Mock Blob和File
global.Blob = class MockBlob {
  constructor(parts, options) {
    this.parts = parts || [];
    this.type = options?.type || '';
    this.size = this.parts.reduce((size, part) => size + (part.length || 0), 0);
  }

  slice(start, end, contentType) {
    return new MockBlob(this.parts.slice(start, end), { type: contentType });
  }

  stream() {
    return new ReadableStream();
  }

  text() {
    return Promise.resolve(this.parts.join(''));
  }

  arrayBuffer() {
    return Promise.resolve(new ArrayBuffer(this.size));
  }
};

// Mock URL.createObjectURL
global.URL.createObjectURL = jest.fn(() => 'mock-object-url');
global.URL.revokeObjectURL = jest.fn();

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn()
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Mock sessionStorage
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn()
};
Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock
});

// Mock fetch
global.fetch = jest.fn();

// 测试环境变量
process.env.NODE_ENV = 'test';
process.env.NEXT_PUBLIC_APP_ENV = 'test';

// 全局测试工具函数
global.createMockAudioFile = () => {
  return new File(['mock audio content'], 'test-audio.webm', {
    type: 'audio/webm'
  });
};

global.createMockVoiceRecord = (overrides = {}) => {
  return {
    id: 'test-voice-record-id',
    userId: 'test-user-id',
    audioUrl: 'https://example.com/audio.webm',
    transcription: 'Test transcription',
    sentiment: {
      mood: 'happy',
      confidence: 0.95,
      emotions: ['joy', 'excitement']
    },
    generatedImage: 'data:image/png;base64,mock-image-data',
    location: {
      latitude: 40.7128,
      longitude: -74.0060,
      address: 'New York, NY'
    },
    weather: {
      condition: 'sunny',
      temperature: 22,
      description: 'Clear sky'
    },
    createdAt: new Date('2025-06-21T00:00:00Z'),
    ...overrides
  };
};

// 清理函数
afterEach(() => {
  jest.clearAllMocks();
  localStorageMock.clear();
  sessionStorageMock.clear();
});

// 全局错误处理
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

console.log('🧪 Jest测试环境设置完成 - Vomage项目');
