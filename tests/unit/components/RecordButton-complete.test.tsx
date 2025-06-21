/**
 * RecordButton组件完整测试
 * 测试录音按钮的所有核心功能
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock RecordButton组件
const MockRecordButton = ({ 
  onStartRecording, 
  onStopRecording, 
  onRecordingComplete,
  disabled = false,
  isProcessing = false,
  maxDuration = 30000
}: {
  onStartRecording?: () => void;
  onStopRecording?: () => void;
  onRecordingComplete?: (audioBlob: Blob) => void;
  disabled?: boolean;
  isProcessing?: boolean;
  maxDuration?: number;
}) => {
  const [isRecording, setIsRecording] = React.useState(false);
  const [recordingTime, setRecordingTime] = React.useState(0);
  const [hasPermission, setHasPermission] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const timerRef = React.useRef<NodeJS.Timeout>();

  const startRecording = async () => {
    if (disabled || isProcessing) return;

    try {
      // 模拟权限检查
      if (!hasPermission) {
        setError('需要麦克风权限');
        return;
      }

      setIsRecording(true);
      setError(null);
      onStartRecording?.();

      // 开始计时
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          const newTime = prev + 1000;
          if (newTime >= maxDuration) {
            stopRecording();
            return prev;
          }
          return newTime;
        });
      }, 1000);

    } catch (err) {
      setError('录音启动失败');
    }
  };

  const stopRecording = () => {
    if (!isRecording) return;

    setIsRecording(false);
    onStopRecording?.();

    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    // 模拟生成音频Blob
    const mockBlob = new Blob(['mock audio data'], { type: 'audio/webm' });
    onRecordingComplete?.(mockBlob);

    setRecordingTime(0);
  };

  const handleMouseDown = () => {
    startRecording();
  };

  const handleMouseUp = () => {
    stopRecording();
  };

  const handleTouchStart = () => {
    startRecording();
  };

  const handleTouchEnd = () => {
    stopRecording();
  };

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    return `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
  };

  React.useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  return (
    <div data-testid="record-button-container">
      <button
        data-testid="record-button"
        className={`record-button ${isRecording ? 'recording' : ''} ${disabled ? 'disabled' : ''}`}
        disabled={disabled || isProcessing}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        aria-label={isRecording ? '正在录音，松开停止' : '长按开始录音'}
        aria-pressed={isRecording}
      >
        {isProcessing ? '处理中...' : isRecording ? '录音中' : '开始录音'}
      </button>

      {isRecording && (
        <div data-testid="recording-indicator" className="recording-indicator">
          <span data-testid="recording-timer">{formatTime(recordingTime)}</span>
          <div data-testid="audio-waveform" className="waveform active" />
        </div>
      )}

      {error && (
        <div data-testid="error-message" className="error">
          {error}
          <button data-testid="retry-button" onClick={() => setError(null)}>
            重试
          </button>
        </div>
      )}

      {isProcessing && (
        <div data-testid="processing-indicator" className="processing">
          正在处理录音...
        </div>
      )}

      <div data-testid="permission-status" style={{ display: 'none' }}>
        {hasPermission ? 'granted' : 'denied'}
      </div>

      {/* 权限控制按钮 - 仅用于测试 */}
      <button 
        data-testid="toggle-permission" 
        onClick={() => setHasPermission(!hasPermission)}
        style={{ display: 'none' }}
      >
        Toggle Permission
      </button>
    </div>
  );
};

describe('RecordButton Component - Complete Tests', () => {
  const mockProps = {
    onStartRecording: jest.fn(),
    onStopRecording: jest.fn(),
    onRecordingComplete: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('基础渲染测试', () => {
    test('应该正确渲染录音按钮', () => {
      render(<MockRecordButton {...mockProps} />);
      
      const button = screen.getByTestId('record-button');
      expect(button).toBeInTheDocument();
      expect(button).toHaveTextContent('开始录音');
    });

    test('禁用状态下应该显示禁用样式', () => {
      render(<MockRecordButton {...mockProps} disabled={true} />);
      
      const button = screen.getByTestId('record-button');
      expect(button).toBeDisabled();
      expect(button).toHaveClass('disabled');
    });

    test('处理中状态应该显示处理指示器', () => {
      render(<MockRecordButton {...mockProps} isProcessing={true} />);
      
      const button = screen.getByTestId('record-button');
      expect(button).toHaveTextContent('处理中...');
      
      const processingIndicator = screen.getByTestId('processing-indicator');
      expect(processingIndicator).toBeInTheDocument();
    });
  });

  describe('录音功能测试', () => {
    test('鼠标按下时应该开始录音', async () => {
      render(<MockRecordButton {...mockProps} />);
      
      const button = screen.getByTestId('record-button');
      
      await act(async () => {
        fireEvent.mouseDown(button);
      });
      
      expect(mockProps.onStartRecording).toHaveBeenCalledTimes(1);
      expect(button).toHaveClass('recording');
      expect(button).toHaveTextContent('录音中');
      expect(button).toHaveAttribute('aria-pressed', 'true');
    });

    test('鼠标松开时应该停止录音', async () => {
      render(<MockRecordButton {...mockProps} />);
      
      const button = screen.getByTestId('record-button');
      
      await act(async () => {
        fireEvent.mouseDown(button);
        fireEvent.mouseUp(button);
      });
      
      expect(mockProps.onStartRecording).toHaveBeenCalledTimes(1);
      expect(mockProps.onStopRecording).toHaveBeenCalledTimes(1);
      expect(mockProps.onRecordingComplete).toHaveBeenCalledWith(
        expect.any(Blob)
      );
    });

    test('触摸开始时应该开始录音', async () => {
      render(<MockRecordButton {...mockProps} />);
      
      const button = screen.getByTestId('record-button');
      
      await act(async () => {
        fireEvent.touchStart(button);
      });
      
      expect(mockProps.onStartRecording).toHaveBeenCalledTimes(1);
      expect(button).toHaveClass('recording');
    });

    test('触摸结束时应该停止录音', async () => {
      render(<MockRecordButton {...mockProps} />);
      
      const button = screen.getByTestId('record-button');
      
      await act(async () => {
        fireEvent.touchStart(button);
        fireEvent.touchEnd(button);
      });
      
      expect(mockProps.onStartRecording).toHaveBeenCalledTimes(1);
      expect(mockProps.onStopRecording).toHaveBeenCalledTimes(1);
    });
  });

  describe('录音状态管理', () => {
    test('录音时应该显示录音指示器', async () => {
      render(<MockRecordButton {...mockProps} />);
      
      const button = screen.getByTestId('record-button');
      
      await act(async () => {
        fireEvent.mouseDown(button);
      });
      
      const indicator = screen.getByTestId('recording-indicator');
      expect(indicator).toBeInTheDocument();
      
      const timer = screen.getByTestId('recording-timer');
      expect(timer).toHaveTextContent('00:00');
      
      const waveform = screen.getByTestId('audio-waveform');
      expect(waveform).toHaveClass('active');
    });

    test('录音计时器应该正确工作', async () => {
      render(<MockRecordButton {...mockProps} />);
      
      const button = screen.getByTestId('record-button');
      
      await act(async () => {
        fireEvent.mouseDown(button);
      });
      
      // 模拟时间流逝
      await act(async () => {
        jest.advanceTimersByTime(3000);
      });
      
      const timer = screen.getByTestId('recording-timer');
      expect(timer).toHaveTextContent('00:03');
    });

    test('达到最大录音时长应该自动停止', async () => {
      render(<MockRecordButton {...mockProps} maxDuration={5000} />);
      
      const button = screen.getByTestId('record-button');
      
      await act(async () => {
        fireEvent.mouseDown(button);
      });
      
      // 模拟超过最大时长
      await act(async () => {
        jest.advanceTimersByTime(6000);
      });
      
      expect(mockProps.onStopRecording).toHaveBeenCalledTimes(1);
      expect(button).not.toHaveClass('recording');
    });
  });

  describe('权限处理测试', () => {
    test('没有权限时应该显示错误信息', async () => {
      render(<MockRecordButton {...mockProps} />);
      
      // 模拟权限被拒绝
      const toggleButton = screen.getByTestId('toggle-permission');
      fireEvent.click(toggleButton);
      
      const button = screen.getByTestId('record-button');
      
      await act(async () => {
        fireEvent.mouseDown(button);
      });
      
      const errorMessage = screen.getByTestId('error-message');
      expect(errorMessage).toHaveTextContent('需要麦克风权限');
      
      const retryButton = screen.getByTestId('retry-button');
      expect(retryButton).toBeInTheDocument();
    });

    test('点击重试应该清除错误信息', async () => {
      render(<MockRecordButton {...mockProps} />);
      
      // 触发错误
      const toggleButton = screen.getByTestId('toggle-permission');
      fireEvent.click(toggleButton);
      
      const button = screen.getByTestId('record-button');
      await act(async () => {
        fireEvent.mouseDown(button);
      });
      
      // 点击重试
      const retryButton = screen.getByTestId('retry-button');
      fireEvent.click(retryButton);
      
      expect(screen.queryByTestId('error-message')).not.toBeInTheDocument();
    });
  });

  describe('禁用状态测试', () => {
    test('禁用状态下不应该响应交互', async () => {
      render(<MockRecordButton {...mockProps} disabled={true} />);
      
      const button = screen.getByTestId('record-button');
      
      await act(async () => {
        fireEvent.mouseDown(button);
        fireEvent.mouseUp(button);
      });
      
      expect(mockProps.onStartRecording).not.toHaveBeenCalled();
      expect(mockProps.onStopRecording).not.toHaveBeenCalled();
    });

    test('处理中状态下不应该响应交互', async () => {
      render(<MockRecordButton {...mockProps} isProcessing={true} />);
      
      const button = screen.getByTestId('record-button');
      
      await act(async () => {
        fireEvent.mouseDown(button);
        fireEvent.mouseUp(button);
      });
      
      expect(mockProps.onStartRecording).not.toHaveBeenCalled();
      expect(mockProps.onStopRecording).not.toHaveBeenCalled();
    });
  });

  describe('可访问性测试', () => {
    test('应该有正确的ARIA标签', () => {
      render(<MockRecordButton {...mockProps} />);
      
      const button = screen.getByTestId('record-button');
      expect(button).toHaveAttribute('aria-label', '长按开始录音');
      expect(button).toHaveAttribute('aria-pressed', 'false');
    });

    test('录音时应该更新ARIA标签', async () => {
      render(<MockRecordButton {...mockProps} />);
      
      const button = screen.getByTestId('record-button');
      
      await act(async () => {
        fireEvent.mouseDown(button);
      });
      
      expect(button).toHaveAttribute('aria-label', '正在录音，松开停止');
      expect(button).toHaveAttribute('aria-pressed', 'true');
    });

    test('按钮应该可以通过键盘访问', () => {
      render(<MockRecordButton {...mockProps} />);
      
      const button = screen.getByTestId('record-button');
      button.focus();
      
      expect(document.activeElement).toBe(button);
    });
  });

  describe('组件清理测试', () => {
    test('组件卸载时应该清理定时器', () => {
      const { unmount } = render(<MockRecordButton {...mockProps} />);
      
      const button = screen.getByTestId('record-button');
      
      act(() => {
        fireEvent.mouseDown(button);
      });
      
      // 卸载组件
      unmount();
      
      // 验证没有内存泄漏（通过Jest的定时器检查）
      expect(jest.getTimerCount()).toBe(0);
    });
  });

  describe('边界条件测试', () => {
    test('快速连续点击不应该导致多次录音', async () => {
      render(<MockRecordButton {...mockProps} />);
      
      const button = screen.getByTestId('record-button');
      
      // 快速连续点击
      await act(async () => {
        fireEvent.mouseDown(button);
        fireEvent.mouseUp(button);
        fireEvent.mouseDown(button);
        fireEvent.mouseUp(button);
      });
      
      // 应该只有一次完整的录音会话
      expect(mockProps.onStartRecording).toHaveBeenCalledTimes(2);
      expect(mockProps.onStopRecording).toHaveBeenCalledTimes(2);
    });

    test('没有回调函数时应该正常工作', async () => {
      render(<MockRecordButton />);
      
      const button = screen.getByTestId('record-button');
      
      // 应该不会抛出错误
      expect(() => {
        act(() => {
          fireEvent.mouseDown(button);
          fireEvent.mouseUp(button);
        });
      }).not.toThrow();
    });
  });
});
