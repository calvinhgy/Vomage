import React, { useRef, useState, useEffect } from 'react';
import { 
  PlayIcon, 
  PauseIcon, 
  SpeakerWaveIcon, 
  SpeakerXMarkIcon 
} from '@heroicons/react/24/solid';
import { formatDuration } from '@/utils/audio';

interface AudioPlayerProps {
  audioUrl: string;
  className?: string;
  autoPlay?: boolean;
  showWaveform?: boolean;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  audioUrl,
  className = '',
  autoPlay = false,
  showWaveform = true,
}) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [waveformData, setWaveformData] = useState<number[]>([]);

  // 初始化音频
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      setIsLoading(false);
      if (autoPlay) {
        handlePlay();
      }
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    const handleError = () => {
      setIsLoading(false);
      console.error('音频加载失败');
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
    };
  }, [audioUrl, autoPlay]);

  // 生成波形数据（模拟）
  useEffect(() => {
    if (showWaveform && duration > 0) {
      // 生成模拟波形数据
      const points = Math.min(100, Math.floor(duration * 10));
      const data = Array.from({ length: points }, () => 
        Math.random() * 0.8 + 0.2
      );
      setWaveformData(data);
    }
  }, [duration, showWaveform]);

  // 播放/暂停
  const handlePlayPause = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    try {
      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
      } else {
        await audio.play();
        setIsPlaying(true);
      }
    } catch (error) {
      console.error('播放失败:', error);
    }
  };

  // 直接播放
  const handlePlay = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    try {
      await audio.play();
      setIsPlaying(true);
    } catch (error) {
      console.error('播放失败:', error);
    }
  };

  // 跳转到指定时间
  const handleSeek = (time: number) => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.currentTime = time;
    setCurrentTime(time);
  };

  // 音量控制
  const handleVolumeChange = (newVolume: number) => {
    const audio = audioRef.current;
    if (!audio) return;

    setVolume(newVolume);
    audio.volume = newVolume;
    
    if (newVolume === 0) {
      setIsMuted(true);
    } else if (isMuted) {
      setIsMuted(false);
    }
  };

  // 静音切换
  const handleMuteToggle = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isMuted) {
      audio.volume = volume;
      setIsMuted(false);
    } else {
      audio.volume = 0;
      setIsMuted(true);
    }
  };

  // 进度条点击处理
  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    const clickTime = (clickX / width) * duration;
    handleSeek(clickTime);
  };

  // 波形点击处理
  const handleWaveformClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    const clickTime = (clickX / width) * duration;
    handleSeek(clickTime);
  };

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center p-4 ${className}`}>
        <div className="loading-spinner w-6 h-6" />
        <span className="ml-2 text-sm text-neutral-500">加载中...</span>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg p-4 shadow-sm border ${className}`}>
      <audio ref={audioRef} src={audioUrl} preload="metadata" />
      
      <div className="flex items-center space-x-4">
        {/* 播放/暂停按钮 */}
        <button
          onClick={handlePlayPause}
          className="flex-shrink-0 w-10 h-10 bg-primary-600 text-white rounded-full flex items-center justify-center hover:bg-primary-700 transition-colors"
        >
          {isPlaying ? (
            <PauseIcon className="w-5 h-5" />
          ) : (
            <PlayIcon className="w-5 h-5 ml-0.5" />
          )}
        </button>

        {/* 时间显示 */}
        <div className="flex-shrink-0 text-sm text-neutral-600 font-mono">
          {formatDuration(currentTime)} / {formatDuration(duration)}
        </div>

        {/* 波形或进度条 */}
        <div className="flex-1">
          {showWaveform && waveformData.length > 0 ? (
            <div
              className="flex items-end justify-between h-8 cursor-pointer"
              onClick={handleWaveformClick}
            >
              {waveformData.map((height, index) => {
                const progress = currentTime / duration;
                const isActive = index / waveformData.length <= progress;
                
                return (
                  <div
                    key={index}
                    className={`w-1 rounded-full transition-colors ${
                      isActive ? 'bg-primary-600' : 'bg-neutral-300'
                    }`}
                    style={{ height: `${height * 100}%` }}
                  />
                );
              })}
            </div>
          ) : (
            <div
              className="relative h-2 bg-neutral-200 rounded-full cursor-pointer"
              onClick={handleProgressClick}
            >
              <div
                className="absolute top-0 left-0 h-full bg-primary-600 rounded-full transition-all duration-100"
                style={{ width: `${(currentTime / duration) * 100}%` }}
              />
            </div>
          )}
        </div>

        {/* 音量控制 */}
        <div className="flex items-center space-x-2">
          <button
            onClick={handleMuteToggle}
            className="text-neutral-600 hover:text-neutral-800 transition-colors"
          >
            {isMuted || volume === 0 ? (
              <SpeakerXMarkIcon className="w-5 h-5" />
            ) : (
              <SpeakerWaveIcon className="w-5 h-5" />
            )}
          </button>
          
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={isMuted ? 0 : volume}
            onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
            className="w-16 h-1 bg-neutral-200 rounded-full appearance-none cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
};
