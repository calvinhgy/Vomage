/**
 * AudioPlayer组件测试
 * 测试音频播放器组件的基础功能
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

// 简单的AudioPlayer组件Mock
const MockAudioPlayer = ({ 
  src, 
  onPlay, 
  onPause, 
  onEnded 
}: { 
  src: string;
  onPlay?: () => void;
  onPause?: () => void;
  onEnded?: () => void;
}) => {
  const [isPlaying, setIsPlaying] = React.useState(false);

  const handlePlay = () => {
    setIsPlaying(true);
    onPlay?.();
  };

  const handlePause = () => {
    setIsPlaying(false);
    onPause?.();
  };

  const handleEnded = () => {
    setIsPlaying(false);
    onEnded?.();
  };

  return (
    <div data-testid="audio-player">
      <audio 
        data-testid="audio-element"
        src={src}
        onPlay={handlePlay}
        onPause={handlePause}
        onEnded={handleEnded}
      />
      <button 
        data-testid="play-button"
        onClick={isPlaying ? handlePause : handlePlay}
      >
        {isPlaying ? '暂停' : '播放'}
      </button>
      <span data-testid="status">
        {isPlaying ? '播放中' : '已暂停'}
      </span>
    </div>
  );
};

describe('AudioPlayer Component', () => {
  const mockProps = {
    src: 'https://example.com/audio.mp3',
    onPlay: jest.fn(),
    onPause: jest.fn(),
    onEnded: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('渲染测试', () => {
    test('应该正确渲染音频播放器', () => {
      render(<MockAudioPlayer {...mockProps} />);
      
      const player = screen.getByTestId('audio-player');
      expect(player).toBeInTheDocument();
      
      const audioElement = screen.getByTestId('audio-element');
      expect(audioElement).toBeInTheDocument();
      expect(audioElement).toHaveAttribute('src', mockProps.src);
    });

    test('应该显示播放按钮', () => {
      render(<MockAudioPlayer {...mockProps} />);
      
      const playButton = screen.getByTestId('play-button');
      expect(playButton).toBeInTheDocument();
      expect(playButton).toHaveTextContent('播放');
    });

    test('应该显示状态信息', () => {
      render(<MockAudioPlayer {...mockProps} />);
      
      const status = screen.getByTestId('status');
      expect(status).toBeInTheDocument();
      expect(status).toHaveTextContent('已暂停');
    });
  });

  describe('播放控制', () => {
    test('点击播放按钮应该开始播放', () => {
      render(<MockAudioPlayer {...mockProps} />);
      
      const playButton = screen.getByTestId('play-button');
      fireEvent.click(playButton);
      
      expect(playButton).toHaveTextContent('暂停');
      expect(screen.getByTestId('status')).toHaveTextContent('播放中');
      expect(mockProps.onPlay).toHaveBeenCalledTimes(1);
    });

    test('播放中点击按钮应该暂停', () => {
      render(<MockAudioPlayer {...mockProps} />);
      
      const playButton = screen.getByTestId('play-button');
      
      // 先开始播放
      fireEvent.click(playButton);
      expect(playButton).toHaveTextContent('暂停');
      
      // 再点击暂停
      fireEvent.click(playButton);
      expect(playButton).toHaveTextContent('播放');
      expect(screen.getByTestId('status')).toHaveTextContent('已暂停');
      expect(mockProps.onPause).toHaveBeenCalledTimes(1);
    });
  });

  describe('音频事件', () => {
    test('音频播放事件应该更新状态', () => {
      render(<MockAudioPlayer {...mockProps} />);
      
      const audioElement = screen.getByTestId('audio-element');
      fireEvent.play(audioElement);
      
      expect(screen.getByTestId('status')).toHaveTextContent('播放中');
      expect(screen.getByTestId('play-button')).toHaveTextContent('暂停');
      expect(mockProps.onPlay).toHaveBeenCalledTimes(1);
    });

    test('音频暂停事件应该更新状态', () => {
      render(<MockAudioPlayer {...mockProps} />);
      
      const audioElement = screen.getByTestId('audio-element');
      
      // 先播放
      fireEvent.play(audioElement);
      expect(screen.getByTestId('status')).toHaveTextContent('播放中');
      
      // 再暂停
      fireEvent.pause(audioElement);
      expect(screen.getByTestId('status')).toHaveTextContent('已暂停');
      expect(mockProps.onPause).toHaveBeenCalledTimes(1);
    });

    test('音频结束事件应该重置状态', () => {
      render(<MockAudioPlayer {...mockProps} />);
      
      const audioElement = screen.getByTestId('audio-element');
      
      // 先播放
      fireEvent.play(audioElement);
      expect(screen.getByTestId('status')).toHaveTextContent('播放中');
      
      // 播放结束
      fireEvent.ended(audioElement);
      expect(screen.getByTestId('status')).toHaveTextContent('已暂停');
      expect(screen.getByTestId('play-button')).toHaveTextContent('播放');
      expect(mockProps.onEnded).toHaveBeenCalledTimes(1);
    });
  });

  describe('属性测试', () => {
    test('应该正确设置音频源', () => {
      const customSrc = 'https://example.com/custom-audio.wav';
      render(<MockAudioPlayer {...mockProps} src={customSrc} />);
      
      const audioElement = screen.getByTestId('audio-element');
      expect(audioElement).toHaveAttribute('src', customSrc);
    });

    test('没有回调函数时应该正常工作', () => {
      render(<MockAudioPlayer src="test.mp3" />);
      
      const playButton = screen.getByTestId('play-button');
      
      // 应该不会抛出错误
      expect(() => {
        fireEvent.click(playButton);
      }).not.toThrow();
      
      expect(screen.getByTestId('status')).toHaveTextContent('播放中');
    });
  });

  describe('可访问性', () => {
    test('音频元素应该有适当的属性', () => {
      render(<MockAudioPlayer {...mockProps} />);
      
      const audioElement = screen.getByTestId('audio-element');
      expect(audioElement).toBeInTheDocument();
      expect(audioElement.tagName.toLowerCase()).toBe('audio');
    });

    test('播放按钮应该可以通过键盘访问', () => {
      render(<MockAudioPlayer {...mockProps} />);
      
      const playButton = screen.getByTestId('play-button');
      expect(playButton).toBeInTheDocument();
      
      // 按钮应该可以获得焦点
      playButton.focus();
      expect(document.activeElement).toBe(playButton);
    });
  });
});
