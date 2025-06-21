/**
 * Claude Service Mock
 * 模拟Claude AI服务的行为
 */

export const ClaudeService = {
  analyzeSentiment: jest.fn().mockResolvedValue({
    mood: 'happy',
    confidence: 0.95,
    emotions: ['joy', 'excitement'],
    analysis: 'The user expresses positive emotions and happiness.'
  }),
  
  generateImagePrompt: jest.fn().mockResolvedValue(
    'blue sky with white clouds, vast open sky, peaceful clouds floating, abstract artistic style, bright vibrant colors, warm golden lighting, fresh morning light, dawn atmosphere, new day energy, high quality artistic composition, professional digital art, detailed and beautiful'
  ),
  
  processVoiceContent: jest.fn().mockResolvedValue({
    transcription: 'Test transcription text',
    sentiment: {
      mood: 'happy',
      confidence: 0.95,
      emotions: ['joy']
    },
    imagePrompt: 'beautiful landscape with blue sky and white clouds'
  })
};

// 重置Mock状态的辅助函数
export const resetClaudeServiceMock = () => {
  ClaudeService.analyzeSentiment.mockClear();
  ClaudeService.generateImagePrompt.mockClear();
  ClaudeService.processVoiceContent.mockClear();
};
