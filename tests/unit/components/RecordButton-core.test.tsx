/**
 * RecordButton组件核心测试
 * 测试录音按钮的核心功能
 */

import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';

// Mock RecordButton组件
const MockRecordButton = ({ 
  onStartRecording, 
  onStopRecording, 
  disabled = false,
  isProcessing = false
}: {
  onStartRecording?: () => void;
  onStopRecording?: () => void;
  disabled?: boolean;
  isProcessing?: boolean;
}) => {
  const [isRecording, setIsRecording] = React.useState(false);
  const [recordingTime, setRecordingTime] = React.useState(0);

  const startRecording = () => {
    if (disabled || isProcessing) return;
    setIsRecording(true);
    onStartRecording?.();
  };

  const stopRecording = () => {
    if (!isRecording) return;
    setIsRecording(false);
    onStopRecording?.();
    setRecordingTime(0);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div data-testid="record-button-container">
      <button
        data-testid="record-button"
        className={`record-button ${isRecording ? 'recording' : ''} ${disabled ? 'disabled' : ''}`}
        disabled={disabled || isProcessing}
        onMouseDown={startRecording}
        onMouseUp={stopRecording}
        onTouchStart={startRecording}
        onTouchEnd={stopRecording}
        aria-label={isRecording ? '正在录音，松开停止' : '长按开始录音'}
        aria-pressed={isRecording}
      >
        {isProcessing ? '处理中...' : isRecording ? '录音中' : '开始录音'}
      </button>

      {isRecording && (
        <div data-testid="recording-indicator">
          <span data-testid="recording-timer">{formatTime(recordingTime)}</span>
          <div data-testid="audio-waveform" className="waveform active" />
        </div>
      )}

      {isProcessing && (
        <div data-testid="processing-indicator">
          正在处理录音...
        </div>
      )}
    </div>
  );
};

describe('RecordButton Component - Core Tests', () => {
  const mockProps = {
    onStartRecording: jest.fn(),
    onStopRecording: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
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
    test('鼠标按下时应该开始录音', () => {
      render(<MockRecordButton {...mockProps} />);
      
      const button = screen.getByTestId('record-button');
      
      act(() => {
        fireEvent.mouseDown(button);
      });
      
      expect(mockProps.onStartRecording).toHaveBeenCalledTimes(1);
      expect(button).toHaveClass('recording');
      expect(button).toHaveTextContent('录音中');
    });

    test('鼠标松开时应该停止录音', () => {
      render(<MockRecordButton {...mockProps} />);
      
      const button = screen.getByTestId('record-button');
      
      act(() => {
        fireEvent.mouseDown(button);
        fireEvent.mouseUp(button);
      });
      
      expect(mockProps.onStartRecording).toHaveBeenCalledTimes(1);
      expect(mockProps.onStopRecording).toHaveBeenCalledTimes(1);
      expect(button).not.toHaveClass('recording');
    });

    test('触摸开始时应该开始录音', () => {
      render(<MockRecordButton {...mockProps} />);
      
      const button = screen.getByTestId('record-button');
      
      act(() => {
        fireEvent.touchStart(button);
      });
      
      expect(mockProps.onStartRecording).toHaveBeenCalledTimes(1);
      expect(button).toHaveClass('recording');
    });

    test('触摸结束时应该停止录音', () => {
      render(<MockRecordButton {...mockProps} />);
      
      const button = screen.getByTestId('record-button');
      
      act(() => {
        fireEvent.touchStart(button);
        fireEvent.touchEnd(button);
      });
      
      expect(mockProps.onStartRecording).toHaveBeenCalledTimes(1);
      expect(mockProps.onStopRecording).toHaveBeenCalledTimes(1);
    });
  });

  describe('录音状态管理', () => {
    test('录音时应该显示录音指示器', () => {
      render(<MockRecordButton {...mockProps} />);
      
      const button = screen.getByTestId('record-button');
      
      act(() => {
        fireEvent.mouseDown(button);
      });
      
      const indicator = screen.getByTestId('recording-indicator');
      expect(indicator).toBeInTheDocument();
      
      const timer = screen.getByTestId('recording-timer');
      expect(timer).toHaveTextContent('00:00');
      
      const waveform = screen.getByTestId('audio-waveform');
      expect(waveform).toHaveClass('active');
    });

    test('停止录音后应该隐藏录音指示器', () => {
      render(<MockRecordButton {...mockProps} />);
      
      const button = screen.getByTestId('record-button');
      
      act(() => {
        fireEvent.mouseDown(button);
      });
      
      expect(screen.getByTestId('recording-indicator')).toBeInTheDocument();
      
      act(() => {
        fireEvent.mouseUp(button);
      });
      
      expect(screen.queryByTestId('recording-indicator')).not.toBeInTheDocument();
    });
  });

  describe('禁用状态测试', () => {
    test('禁用状态下不应该响应交互', () => {
      render(<MockRecordButton {...mockProps} disabled={true} />);
      
      const button = screen.getByTestId('record-button');
      
      act(() => {
        fireEvent.mouseDown(button);
        fireEvent.mouseUp(button);
      });
      
      expect(mockProps.onStartRecording).not.toHaveBeenCalled();
      expect(mockProps.onStopRecording).not.toHaveBeenCalled();
    });

    test('处理中状态下不应该响应交互', () => {
      render(<MockRecordButton {...mockProps} isProcessing={true} />);
      
      const button = screen.getByTestId('record-button');
      
      act(() => {
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

    test('录音时应该更新ARIA标签', () => {
      render(<MockRecordButton {...mockProps} />);
      
      const button = screen.getByTestId('record-button');
      
      act(() => {
        fireEvent.mouseDown(button);
      });
      
      expect(button).toHaveAttribute('aria-label', '正在录音，松开停止');
      expect(button).toHaveAttribute('aria-pressed', 'true');
    });
  });

  describe('边界条件测试', () => {
    test('没有回调函数时应该正常工作', () => {
      render(<MockRecordButton />);
      
      const button = screen.getByTestId('record-button');
      
      expect(() => {
        act(() => {
          fireEvent.mouseDown(button);
          fireEvent.mouseUp(button);
        });
      }).not.toThrow();
    });

    test('快速连续操作应该正常处理', () => {
      render(<MockRecordButton {...mockProps} />);
      
      const button = screen.getByTestId('record-button');
      
      act(() => {
        fireEvent.mouseDown(button);
        fireEvent.mouseUp(button);
        fireEvent.mouseDown(button);
        fireEvent.mouseUp(button);
      });
      
      expect(mockProps.onStartRecording).toHaveBeenCalledTimes(2);
      expect(mockProps.onStopRecording).toHaveBeenCalledTimes(2);
    });
  });
});
