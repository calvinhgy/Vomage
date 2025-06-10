import React, { useEffect, useRef, useState } from 'react';
import { MicrophoneIcon, StopIcon } from '@heroicons/react/24/solid';
import { useAppStore } from '@/store/useAppStore';
import { AudioRecorder, AudioVisualizer, formatDuration } from '@/utils/audio';

interface RecordButtonProps {
  onRecordingComplete?: (audioBlob: Blob) => void;
  maxDuration?: number;
  minDuration?: number;
  className?: string;
}

export const RecordButton: React.FC<RecordButtonProps> = ({
  onRecordingComplete,
  maxDuration = 300, // 5分钟
  minDuration = 1, // 1秒
  className = '',
}) => {
  const {
    recording,
    startRecording,
    stopRecording,
    setRecordingDuration,
    setAudioBlob,
    clearRecording,
    addNotification,
  } = useAppStore();

  const [isPressed, setIsPressed] = useState(false);
  const [volumeLevel, setVolumeLevel] = useState(0);
  
  const recorderRef = useRef<AudioRecorder | null>(null);
  const visualizerRef = useRef<AudioVisualizer | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const animationRef = useRef<number | null>(null);

  // 初始化录音器
  useEffect(() => {
    const initializeRecorder = async () => {
      try {
        const hasPermission = await AudioRecorder.checkPermission();
        if (!hasPermission) {
          addNotification({
            type: 'error',
            message: '需要麦克风权限才能录音，请在浏览器设置中允许访问',
            duration: 5000,
          });
          return;
        }

        recorderRef.current = new AudioRecorder();
        await recorderRef.current.initialize();
      } catch (error) {
        addNotification({
          type: 'error',
          message: error instanceof Error ? error.message : '录音器初始化失败',
        });
      }
    };

    initializeRecorder();

    return () => {
      if (recorderRef.current) {
        recorderRef.current.cleanup();
      }
      if (visualizerRef.current) {
        visualizerRef.current.cleanup();
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [addNotification]);

  // 开始录音
  const handleStartRecording = async () => {
    if (!recorderRef.current) {
      addNotification({
        type: 'error',
        message: '录音器未准备就绪',
      });
      return;
    }

    try {
      clearRecording();
      startRecording();
      setIsPressed(true);

      // 开始录音
      recorderRef.current.startRecording();

      // 初始化可视化器
      const stream = (recorderRef.current as any).stream;
      if (stream) {
        visualizerRef.current = new AudioVisualizer();
        visualizerRef.current.initialize(stream);
        startVolumeAnimation();
      }

      // 开始计时
      let duration = 0;
      timerRef.current = setInterval(() => {
        duration += 0.1;
        setRecordingDuration(duration);

        // 检查最大录音时长
        if (duration >= maxDuration) {
          handleStopRecording();
        }
      }, 100);

      addNotification({
        type: 'info',
        message: '开始录音...',
        duration: 2000,
      });
    } catch (error) {
      addNotification({
        type: 'error',
        message: error instanceof Error ? error.message : '开始录音失败',
      });
      setIsPressed(false);
    }
  };

  // 停止录音
  const handleStopRecording = async () => {
    if (!recorderRef.current || !recording.isRecording) {
      return;
    }

    try {
      // 检查最小录音时长
      if (recording.duration < minDuration) {
        addNotification({
          type: 'warning',
          message: `录音时长至少需要${minDuration}秒`,
        });
        clearRecording();
        setIsPressed(false);
        return;
      }

      // 停止录音
      const audioBlob = await recorderRef.current.stopRecording();
      setAudioBlob(audioBlob);
      stopRecording();
      setIsPressed(false);

      // 清理定时器和动画
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      if (visualizerRef.current) {
        visualizerRef.current.cleanup();
        visualizerRef.current = null;
      }

      setVolumeLevel(0);

      addNotification({
        type: 'success',
        message: '录音完成',
        duration: 2000,
      });

      // 回调处理
      onRecordingComplete?.(audioBlob);
    } catch (error) {
      addNotification({
        type: 'error',
        message: error instanceof Error ? error.message : '停止录音失败',
      });
      setIsPressed(false);
    }
  };

  // 音量可视化动画
  const startVolumeAnimation = () => {
    const animate = () => {
      if (visualizerRef.current && recording.isRecording) {
        const level = visualizerRef.current.getVolumeLevel();
        setVolumeLevel(level);
        animationRef.current = requestAnimationFrame(animate);
      }
    };
    animate();
  };

  // 触摸事件处理
  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    if (!recording.isRecording) {
      handleStartRecording();
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault();
    if (recording.isRecording) {
      handleStopRecording();
    }
  };

  // 鼠标事件处理
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!recording.isRecording) {
      handleStartRecording();
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    e.preventDefault();
    if (recording.isRecording) {
      handleStopRecording();
    }
  };

  // 计算按钮样式
  const getButtonStyle = () => {
    const baseStyle = 'record-button touch-manipulation select-none';
    const recordingStyle = recording.isRecording ? 'recording' : '';
    const pressedStyle = isPressed ? 'scale-95' : '';
    
    return `${baseStyle} ${recordingStyle} ${pressedStyle} ${className}`;
  };

  // 计算音量指示器样式
  const getVolumeIndicatorStyle = () => {
    const scale = 1 + (volumeLevel / 100) * 0.3; // 最大放大30%
    return {
      transform: `scale(${scale})`,
      transition: 'transform 0.1s ease-out',
    };
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      {/* 录音时长显示 */}
      {recording.isRecording && (
        <div className="text-lg font-mono text-red-600 animate-pulse">
          {formatDuration(recording.duration)}
        </div>
      )}

      {/* 录音按钮 */}
      <div className="relative">
        <button
          className={getButtonStyle()}
          style={recording.isRecording ? getVolumeIndicatorStyle() : undefined}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          disabled={!recorderRef.current}
        >
          {recording.isRecording ? (
            <StopIcon className="w-8 h-8" />
          ) : (
            <MicrophoneIcon className="w-8 h-8" />
          )}
        </button>

        {/* 音量可视化环 */}
        {recording.isRecording && (
          <div
            className="absolute inset-0 rounded-full border-4 border-red-300 animate-ping"
            style={{
              opacity: volumeLevel / 100,
            }}
          />
        )}
      </div>

      {/* 提示文字 */}
      <div className="text-center text-sm text-neutral-600 max-w-xs">
        {recording.isRecording ? (
          <p>松开停止录音</p>
        ) : (
          <p>长按开始录音</p>
        )}
      </div>

      {/* 音量条 */}
      {recording.isRecording && (
        <div className="flex items-center space-x-2">
          <div className="w-32 h-2 bg-neutral-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-red-500 transition-all duration-100 ease-out"
              style={{ width: `${volumeLevel}%` }}
            />
          </div>
          <span className="text-xs text-neutral-500 w-8">
            {volumeLevel}%
          </span>
        </div>
      )}
    </div>
  );
};
