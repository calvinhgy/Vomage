/**
 * 测试数据固定装置
 * 提供测试中使用的标准数据
 */

export const mockVoiceRecord = {
  id: 'test-voice-record-id',
  userId: 'test-user-id',
  audioUrl: 'https://example.com/audio.webm',
  transcription: '今天天气真好，心情很愉快',
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
  createdAt: new Date('2025-06-21T00:00:00Z')
};

export const mockUser = {
  id: 'test-user-id',
  username: 'testuser',
  email: 'test@example.com',
  avatar: 'https://example.com/avatar.jpg',
  createdAt: new Date('2025-06-01T00:00:00Z')
};

export const mockAudioBlob = new Blob(['mock audio content'], {
  type: 'audio/webm'
});

export const mockTranscriptionResult = {
  text: '今天天气真好，心情很愉快',
  confidence: 0.96,
  language: 'zh-CN',
  duration: 3.5
};

export const mockSentimentResult = {
  mood: 'happy',
  confidence: 0.95,
  emotions: ['joy', 'excitement', 'contentment'],
  analysis: 'The user expresses positive emotions about the weather and their mood.'
};

export const mockImagePrompt = 'blue sky with white clouds, vast open sky, peaceful clouds floating, abstract artistic style, bright vibrant colors, warm golden lighting, fresh morning light, dawn atmosphere, new day energy, high quality artistic composition, professional digital art, detailed and beautiful';

export const mockGeneratedImage = {
  imageUrl: 'data:image/png;base64,mock-image-data',
  imageData: 'mock-image-data',
  metadata: {
    prompt: mockImagePrompt,
    style: 'abstract',
    dimensions: { width: 512, height: 512 },
    generatedAt: new Date()
  }
};
