import React, { useState, useEffect } from 'react';
import { 
  SunIcon, 
  MoonIcon, 
  CloudIcon, 
  MapPinIcon 
} from '@heroicons/react/24/outline';
import { Context } from '@/types';

interface ContextDisplayProps {
  context: Context;
  className?: string;
}

export const ContextDisplay: React.FC<ContextDisplayProps> = ({
  context,
  className = '',
}) => {
  const { location, weather } = context;
  const [timeOfDay, setTimeOfDay] = useState<string>('');
  const [mounted, setMounted] = useState(false);

  // 只在客户端设置时间
  useEffect(() => {
    setMounted(true);
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) {
      setTimeOfDay('morning');
    } else if (hour >= 12 && hour < 17) {
      setTimeOfDay('afternoon');
    } else if (hour >= 17 && hour < 21) {
      setTimeOfDay('evening');
    } else {
      setTimeOfDay('night');
    }
  }, []);

  // 获取时间段图标
  const getTimeIcon = () => {
    if (!mounted) return <SunIcon className="w-5 h-5 text-neutral-500" />;
    
    switch (timeOfDay) {
      case 'morning':
        return <SunIcon className="w-5 h-5 text-yellow-500" />;
      case 'afternoon':
        return <SunIcon className="w-5 h-5 text-orange-500" />;
      case 'evening':
        return <SunIcon className="w-5 h-5 text-red-500" />;
      case 'night':
        return <MoonIcon className="w-5 h-5 text-blue-500" />;
      default:
        return <SunIcon className="w-5 h-5 text-neutral-500" />;
    }
  };

  // 获取时间段描述
  const getTimeDescription = () => {
    if (!mounted) return '你好';
    
    switch (timeOfDay) {
      case 'morning':
        return '早上好';
      case 'afternoon':
        return '下午好';
      case 'evening':
        return '傍晚好';
      case 'night':
        return '晚上好';
      default:
        return '你好';
    }
  };

  // 获取天气描述
  const getWeatherDescription = () => {
    if (!weather) return '获取天气中...';

    return `${weather.temperature}°C, ${weather.condition}`;
  };

  // 获取位置描述
  const getLocationDescription = () => {
    if (!location) return '获取位置中...';
    if (!location.city && !location.country) {
      return '未知位置';
    }
    return [location.city, location.country].filter(Boolean).join(', ');
  };

  return (
    <div className={`card p-4 ${className}`}>
      <div className="flex items-center justify-between">
        {/* 时间段 */}
        <div className="flex items-center space-x-2">
          {getTimeIcon()}
          <span className="text-sm text-neutral-700">
            {getTimeDescription()}
          </span>
        </div>

        {/* 天气 */}
        {weather && (
          <div className="flex items-center space-x-2">
            <CloudIcon className="w-5 h-5 text-neutral-500" />
            <span className="text-sm text-neutral-700">
              {getWeatherDescription()}
            </span>
          </div>
        )}

        {/* 位置 */}
        {location && (
          <div className="flex items-center space-x-2">
            <MapPinIcon className="w-5 h-5 text-neutral-500" />
            <span className="text-sm text-neutral-700">
              {getLocationDescription()}
            </span>
          </div>
        )}
      </div>

      {/* 环境提示 */}
      <div className="mt-2 text-xs text-neutral-500">
        {timeOfDay === 'morning' && '清晨是开启新一天的好时机'}
        {timeOfDay === 'afternoon' && '午后是放松心情的好时候'}
        {timeOfDay === 'evening' && '傍晚是回顾一天的好时光'}
        {timeOfDay === 'night' && '夜晚是沉淀思绪的好时刻'}
      </div>
    </div>
  );
};
