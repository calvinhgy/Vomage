/**
 * RecordButton组件单元测试
 * 测试语音录制按钮的核心功能
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RecordButton } from '@/components/RecordButton';

// Mock音频相关服务
jest.mock('@/services/speech', () => ({
  SpeechService: {
    startRecording: jest.fn(),
    stopRecording: jest.fn(),
    isRecording: jest.fn(() => false),
    getPermissions: jest.fn(() => Promise.resolve(true))
  }
}));

describe('RecordButton Component', () => {
  const mockProps = {
    onStartRecording: jest.fn(),
    onStopRecording: jest.fn(),
    onRecordingComplete: jest.fn(),
    disabled: false,
    isProcessing: false
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('渲染测试', () => {
    test('应该正确渲染录音按钮', () => {
      render(<RecordButton {...mockProps} />);
      
      const button = screen.getByRole('button', { name: /开始录音|录音/i });
      expect(button).toBeInTheDocument();
      expect(button).toHaveClass('record-button');
    });

    test('禁用状态下应该显示禁用样式', () => {
      render(<RecordButton {...mockProps} disabled={true} />);
      
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      expect(button).toHaveClass('disabled');
    });

    test('处理中状态应该显示加载指示器', () => {
      render(<RecordButton {...mockProps} isProcessing={true} />);
      
      const loadingIndicator = screen.getByTestId('processing-indicator');
      expect(loadingIndicator).toBeInTheDocument();
    });
  });

  describe('交互测试', () => {
    test('鼠标按下时应该开始录音', async () => {
      const user = userEvent.setup();
      render(<RecordButton {...mockProps} />);
      
      const button = screen.getByRole('button');
      
      await act(async () => {
        fireEvent.mouseDown(button);
      });
      
      expect(mockProps.onStartRecording).toHaveBeenCalledTimes(1);
      expect(button).toHaveClass('recording');
    });

    test('鼠标松开时应该停止录音', async () => {
      const user = userEvent.setup();
      render(<RecordButton {...mockProps} />);
      
      const button = screen.getByRole('button');
      
      await act(async () => {
        fireEvent.mouseDown(button);
        fireEvent.mouseUp(button);
      });
      
      expect(mockProps.onStartRecording).toHaveBeenCalledTimes(1);
      expect(mockProps.onStopRecording).toHaveBeenCalledTimes(1);
    });

    test('触摸开始时应该开始录音', async () => {
      render(<RecordButton {...mockProps} />);
      
      const button = screen.getByRole('button');
      
      await act(async () => {
        fireEvent.touchStart(button);
      });
      
      expect(mockProps.onStartRecording).toHaveBeenCalledTimes(1);
      expect(button).toHaveClass('recording');
    });

    test('触摸结束时应该停止录音', async () => {
      render(<RecordButton {...mockProps} />);
      
      const button = screen.getByRole('button');
      
      await act(async () => {
        fireEvent.touchStart(button);
        fireEvent.touchEnd(button);
      });
      
      expect(mockProps.onStartRecording).toHaveBeenCalledTimes(1);
      expect(mockProps.onStopRecording).toHaveBeenCalledTimes(1);
    });

    test('禁用状态下不应该响应交互', async () => {
      render(<RecordButton {...mockProps} disabled={true} />);
      
      const button = screen.getByRole('button');
      
      await act(async () => {
        fireEvent.mouseDown(button);
        fireEvent.mouseUp(button);
      });
      
      expect(mockProps.onStartRecording).not.toHaveBeenCalled();
      expect(mockProps.onStopRecording).not.toHaveBeenCalled();
    });
  });

  describe('状态管理测试', () => {
    test('录音状态应该正确切换', async () => {
      render(<RecordButton {...mockProps} />);
      
      const button = screen.getByRole('button');
      
      // 开始录音
      await act(async () => {
        fireEvent.mouseDown(button);
      });
      
      expect(button).toHaveClass('recording');
      expect(screen.getByTestId('recording-indicator')).toBeInTheDocument();
      
      // 停止录音
      await act(async () => {
        fireEvent.mouseUp(button);
      });
      
      expect(button).not.toHaveClass('recording');
      expect(screen.queryByTestId('recording-indicator')).not.toBeInTheDocument();
    });

    test('长按录音应该显示录音时长', async () => {
      jest.useFakeTimers();
      
      render(<RecordButton {...mockProps} />);
      
      const button = screen.getByRole('button');
      
      await act(async () => {
        fireEvent.mouseDown(button);
      });
      
      // 模拟时间流逝
      act(() => {
        jest.advanceTimersByTime(3000);
      });
      
      const timer = screen.getByTestId('recording-timer');
      expect(timer).toHaveTextContent('00:03');
      
      jest.useRealTimers();
    });

    test('录音超过最大时长应该自动停止', async () => {
      jest.useFakeTimers();
      
      render(<RecordButton {...mockProps} maxDuration={5000} />);
      
      const button = screen.getByRole('button');
      
      await act(async () => {
        fireEvent.mouseDown(button);
      });
      
      // 模拟超过最大时长
      act(() => {
        jest.advanceTimersByTime(6000);
      });
      
      expect(mockProps.onStopRecording).toHaveBeenCalledTimes(1);
      expect(button).not.toHaveClass('recording');
      
      jest.useRealTimers();
    });
  });

  describe('权限处理测试', () => {
    test('没有麦克风权限时应该显示权限提示', async () => {
      // Mock权限被拒绝
      const mockSpeechService = require('@/services/speech').SpeechService;
      mockSpeechService.getPermissions.mockResolvedValue(false);
      
      render(<RecordButton {...mockProps} />);
      
      const button = screen.getByRole('button');
      
      await act(async () => {
        fireEvent.mouseDown(button);
      });
      
      await waitFor(() => {
        expect(screen.getByText(/需要麦克风权限/i)).toBeInTheDocument();
      });
      
      expect(mockProps.onStartRecording).not.toHaveBeenCalled();
    });

    test('权限获取失败时应该显示错误信息', async () => {
      const mockSpeechService = require('@/services/speech').SpeechService;
      mockSpeechService.getPermissions.mockRejectedValue(new Error('Permission denied'));
      
      render(<RecordButton {...mockProps} />);
      
      const button = screen.getByRole('button');
      
      await act(async () => {
        fireEvent.mouseDown(button);
      });
      
      await waitFor(() => {
        expect(screen.getByText(/权限获取失败/i)).toBeInTheDocument();
      });
    });
  });

  describe('音频可视化测试', () => {
    test('录音时应该显示音频波形', async () => {
      render(<RecordButton {...mockProps} showWaveform={true} />);
      
      const button = screen.getByRole('button');
      
      await act(async () => {
        fireEvent.mouseDown(button);
      });
      
      const waveform = screen.getByTestId('audio-waveform');
      expect(waveform).toBeInTheDocument();
      expect(waveform).toHaveClass('active');
    });

    test('音量指示器应该响应音频输入', async () => {
      render(<RecordButton {...mockProps} showVolumeIndicator={true} />);
      
      const button = screen.getByRole('button');
      
      await act(async () => {
        fireEvent.mouseDown(button);
      });
      
      const volumeIndicator = screen.getByTestId('volume-indicator');
      expect(volumeIndicator).toBeInTheDocument();
      
      // 模拟音量变化
      act(() => {
        fireEvent(volumeIndicator, new CustomEvent('volumechange', {
          detail: { volume: 0.8 }
        }));
      });
      
      expect(volumeIndicator).toHaveStyle('--volume: 0.8');
    });
  });

  describe('错误处理测试', () => {
    test('录音失败时应该显示错误信息', async () => {
      const mockSpeechService = require('@/services/speech').SpeechService;
      mockSpeechService.startRecording.mockRejectedValue(new Error('Recording failed'));
      
      render(<RecordButton {...mockProps} />);
      
      const button = screen.getByRole('button');
      
      await act(async () => {
        fireEvent.mouseDown(button);
      });
      
      await waitFor(() => {
        expect(screen.getByText(/录音失败/i)).toBeInTheDocument();
      });
      
      expect(button).toHaveClass('error');
    });

    test('网络错误时应该显示重试选项', async () => {
      const mockSpeechService = require('@/services/speech').SpeechService;
      mockSpeechService.startRecording.mockRejectedValue(new Error('Network error'));
      
      render(<RecordButton {...mockProps} />);
      
      const button = screen.getByRole('button');
      
      await act(async () => {
        fireEvent.mouseDown(button);
      });
      
      await waitFor(() => {
        expect(screen.getByText(/网络错误/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /重试/i })).toBeInTheDocument();
      });
    });
  });

  describe('可访问性测试', () => {
    test('应该有正确的ARIA标签', () => {
      render(<RecordButton {...mockProps} />);
      
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label');
      expect(button).toHaveAttribute('aria-describedby');
    });

    test('键盘操作应该正常工作', async () => {
      const user = userEvent.setup();
      render(<RecordButton {...mockProps} />);
      
      const button = screen.getByRole('button');
      
      // 空格键开始录音
      await user.type(button, ' ');
      expect(mockProps.onStartRecording).toHaveBeenCalledTimes(1);
      
      // 再次按空格键停止录音
      await user.type(button, ' ');
      expect(mockProps.onStopRecording).toHaveBeenCalledTimes(1);
    });

    test('屏幕阅读器应该能够获取状态信息', async () => {
      render(<RecordButton {...mockProps} />);
      
      const button = screen.getByRole('button');
      
      await act(async () => {
        fireEvent.mouseDown(button);
      });
      
      expect(button).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByRole('status')).toHaveTextContent(/正在录音/i);
    });
  });

  describe('性能测试', () => {
    test('快速连续点击不应该导致多次录音', async () => {
      render(<RecordButton {...mockProps} />);
      
      const button = screen.getByRole('button');
      
      // 快速连续点击
      await act(async () => {
        fireEvent.mouseDown(button);
        fireEvent.mouseUp(button);
        fireEvent.mouseDown(button);
        fireEvent.mouseUp(button);
        fireEvent.mouseDown(button);
        fireEvent.mouseUp(button);
      });
      
      // 应该只有一次录音会话
      expect(mockProps.onStartRecording).toHaveBeenCalledTimes(1);
      expect(mockProps.onStopRecording).toHaveBeenCalledTimes(1);
    });

    test('组件卸载时应该清理资源', () => {
      const { unmount } = render(<RecordButton {...mockProps} />);
      
      const button = screen.getByRole('button');
      
      act(() => {
        fireEvent.mouseDown(button);
      });
      
      // 卸载组件
      unmount();
      
      // 验证清理函数被调用
      expect(mockProps.onStopRecording).toHaveBeenCalledTimes(1);
    });
  });
});
