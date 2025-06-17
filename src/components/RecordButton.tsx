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
  const [currentDuration, setCurrentDuration] = useState(0); // 添加本地状态跟踪
  
  const recorderRef = useRef<AudioRecorder | null>(null);
  const visualizerRef = useRef<AudioVisualizer | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const animationRef = useRef<number | null>(null);
  const isMouseDownRef = useRef(false);
  const isTouchActiveRef = useRef(false);

  // 初始化录音器
  useEffect(() => {
    // 确保只在客户端运行
    if (typeof window === 'undefined') return;

    const initializeRecorder = async () => {
      try {
        // 只检查基本环境，不请求权限
        if (!navigator?.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          addNotification({
            type: 'error',
            message: '您的浏览器不支持录音功能',
            duration: 5000,
          });
          return;
        }

        // 检查是否在安全上下文中
        if (!window.isSecureContext) {
          addNotification({
            type: 'error',
            message: '需要 HTTPS 环境才能使用录音功能',
            duration: 5000,
          });
          return;
        }

        // 创建录音器实例，但不立即初始化
        recorderRef.current = new AudioRecorder();
      } catch (error) {
        addNotification({
          type: 'error',
          message: error instanceof Error ? error.message : '录音器初始化失败',
        });
      }
    };

    initializeRecorder();

    // 添加全局事件监听器
    const handleGlobalMouseUp = () => {
      if (isMouseDownRef.current) {
        // 使用ref来检查状态，避免闭包问题
        handleStopRecording();
      }
      isMouseDownRef.current = false;
    };

    const handleGlobalTouchEnd = () => {
      if (isTouchActiveRef.current) {
        // 使用ref来检查状态，避免闭包问题
        handleStopRecording();
      }
      isTouchActiveRef.current = false;
    };

    document.addEventListener('mouseup', handleGlobalMouseUp);
    document.addEventListener('touchend', handleGlobalTouchEnd);
    document.addEventListener('touchcancel', handleGlobalTouchEnd);

    return () => {
      console.log('useEffect清理函数执行，清理计时器:', timerRef.current);
      if (recorderRef.current) {
        recorderRef.current.cleanup();
      }
      if (visualizerRef.current) {
        visualizerRef.current.cleanup();
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      
      document.removeEventListener('mouseup', handleGlobalMouseUp);
      document.removeEventListener('touchend', handleGlobalTouchEnd);
      document.removeEventListener('touchcancel', handleGlobalTouchEnd);
    };
  }, [addNotification]); // 移除 recording.isRecording 依赖

  // 开始录音
  const handleStartRecording = async () => {
    if (!recorderRef.current || recording.isRecording) {
      return;
    }

    console.log('开始录音...');

    try {
      clearRecording();
      setIsPressed(true);
      
      // 在用户交互时初始化录音器（请求权限）
      await recorderRef.current.initialize();
      
      // 开始录音
      recorderRef.current.startRecording();

      // 初始化可视化器
      const stream = recorderRef.current.stream;
      if (stream) {
        visualizerRef.current = new AudioVisualizer();
        visualizerRef.current.initialize(stream);
        startVolumeAnimation();
      }

      // 录音器准备就绪后，更新store状态并开始计时
      startRecording();

      // 开始计时 - 确保在状态更新后启动
      let duration = 0;
      setCurrentDuration(0); // 重置本地状态
      console.log('准备启动计时器...');
      timerRef.current = setInterval(() => {
        duration += 0.1;
        console.log('计时器更新:', duration, '计时器ID:', timerRef.current); // 添加调试日志
        setCurrentDuration(duration); // 更新本地状态
        setRecordingDuration(duration); // 更新store状态

        // 检查最大录音时长
        if (duration >= maxDuration) {
          handleStopRecording();
        }
      }, 100);
      console.log('计时器已启动，ID:', timerRef.current);

      addNotification({
        type: 'info',
        message: '开始录音...',
        duration: 2000,
      });

      console.log('录音已开始，store状态更新完成');
    } catch (error) {
      let errorMessage = '开始录音失败';
      
      if (error instanceof Error) {
        console.error('录音错误详情:', error);
        if (error.message.includes('Permission denied') || error.message.includes('NotAllowedError')) {
          errorMessage = '麦克风权限被拒绝，请在浏览器设置中允许访问麦克风';
        } else if (error.message.includes('NotFoundError')) {
          errorMessage = '未找到麦克风设备，请检查设备连接';
        } else if (error.message.includes('NotSupportedError')) {
          errorMessage = '浏览器不支持录音功能，请使用现代浏览器';
        } else {
          errorMessage = error.message;
        }
      }
      
      addNotification({
        type: 'error',
        message: errorMessage,
        duration: 5000,
      });
      
      // 清理状态
      clearRecording();
      setIsPressed(false);
    }
  };

  // 停止录音
  const handleStopRecording = async () => {
    if (!recorderRef.current || !recording.isRecording) {
      return;
    }

    console.log('停止录音...');

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
      setCurrentDuration(0); // 清理本地状态

      addNotification({
        type: 'success',
        message: '录音完成',
        duration: 2000,
      });

      // 回调处理
      onRecordingComplete?.(audioBlob);

      console.log('录音已停止，store状态:', recording);
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
    e.stopPropagation();
    console.log('Touch start, current recording state:', recording.isRecording);
    
    if (!recording.isRecording) {
      isTouchActiveRef.current = true;
      handleStartRecording();
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Touch end, current recording state:', recording.isRecording);
    
    if (isTouchActiveRef.current && recording.isRecording) {
      handleStopRecording();
    }
    isTouchActiveRef.current = false;
  };

  // 鼠标事件处理
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Mouse down, current recording state:', recording.isRecording);
    
    if (!recording.isRecording) {
      isMouseDownRef.current = true;
      handleStartRecording();
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Mouse up, current recording state:', recording.isRecording);
    
    if (isMouseDownRef.current && recording.isRecording) {
      handleStopRecording();
    }
    isMouseDownRef.current = false;
  };

  const handleMouseLeave = (e: React.MouseEvent) => {
    e.preventDefault();
    console.log('Mouse leave, current recording state:', recording.isRecording);
    
    if (isMouseDownRef.current && recording.isRecording) {
      handleStopRecording();
    }
    isMouseDownRef.current = false;
  };

  // 计算按钮样式
  const getButtonStyle = () => {
    const baseClasses = [
      'relative',
      'w-20 h-20',
      'rounded-full',
      'flex items-center justify-center',
      'text-white',
      'transition-all duration-200',
      'touch-manipulation',
      'select-none',
      'focus:outline-none',
      'active:scale-95'
    ];

    if (recording.isRecording) {
      baseClasses.push('bg-red-600', 'shadow-lg', 'shadow-red-500/50');
    } else {
      baseClasses.push('bg-blue-600', 'hover:bg-blue-700', 'shadow-lg', 'shadow-blue-500/50');
    }

    if (isPressed) {
      baseClasses.push('scale-95');
    }

    return baseClasses.join(' ') + ' ' + className;
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
      {/* 调试信息 */}
      <div className="text-xs text-gray-500 text-center space-y-1">
        <p>录音状态: {recording.isRecording ? '录音中' : '未录音'}</p>
        <p>时长: {recording.duration.toFixed(1)}s (本地: {currentDuration.toFixed(1)}s)</p>
        <p>按钮状态: {isPressed ? '按下' : '未按下'}</p>
        <p>录音器: {recorderRef.current ? '已初始化' : '未初始化'}</p>
        <p>计时器: {timerRef.current ? '运行中' : '已停止'}</p>
        <p>状态: {recording.isRecording ? '活跃' : '待机'}</p>
      </div>

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
          onMouseLeave={handleMouseLeave}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
          disabled={false}
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
          <p className="text-red-600 font-semibold">松开停止录音</p>
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
            {Math.round(volumeLevel)}%
          </span>
        </div>
      )}
    </div>
  );
};
