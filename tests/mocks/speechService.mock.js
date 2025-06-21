/**
 * Speech Service Mock
 * 模拟语音服务的行为
 */

export const SpeechService = {
  startRecording: jest.fn().mockResolvedValue(true),
  stopRecording: jest.fn().mockResolvedValue({
    audioBlob: new Blob(['mock audio data'], { type: 'audio/webm' }),
    duration: 3000
  }),
  isRecording: jest.fn().mockReturnValue(false),
  getPermissions: jest.fn().mockResolvedValue(true),
  
  // 模拟录音状态
  _isRecording: false,
  _setRecording: function(recording) {
    this._isRecording = recording;
    this.isRecording.mockReturnValue(recording);
  }
};

// 重置Mock状态的辅助函数
export const resetSpeechServiceMock = () => {
  SpeechService.startRecording.mockClear();
  SpeechService.stopRecording.mockClear();
  SpeechService.isRecording.mockClear();
  SpeechService.getPermissions.mockClear();
  SpeechService._setRecording(false);
};
