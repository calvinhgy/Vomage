/**
 * 智能图片预加载Hook
 * 在用户开始录音时预加载心情图片，避免不必要的预加载警告
 */

import { useEffect, useCallback } from 'react';

interface ImagePreloaderOptions {
  enabled?: boolean;
  priority?: 'high' | 'low';
}

export const useImagePreloader = (options: ImagePreloaderOptions = {}) => {
  const { enabled = true, priority = 'low' } = options;

  // 心情图片列表
  const moodImages = [
    '/images/mood-happy.svg',
    '/images/mood-calm.svg',
    '/images/mood-excited.svg',
    '/images/mood-thoughtful.svg',
    '/images/mood-peaceful.svg',
  ];

  // 预加载单个图片
  const preloadImage = useCallback((src: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve();
      img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
      img.src = src;
    });
  }, []);

  // 预加载所有心情图片
  const preloadMoodImages = useCallback(async () => {
    if (!enabled) return;

    try {
      console.log('开始预加载心情图片...');
      const startTime = Date.now();
      
      // 并行预加载所有图片
      await Promise.all(moodImages.map(preloadImage));
      
      const loadTime = Date.now() - startTime;
      console.log(`心情图片预加载完成，耗时: ${loadTime}ms`);
    } catch (error) {
      console.warn('心情图片预加载失败:', error);
    }
  }, [enabled, moodImages, preloadImage]);

  // 预加载特定心情的图片
  const preloadMoodImage = useCallback(async (mood: string) => {
    if (!enabled) return;

    const moodImageMap: Record<string, string> = {
      happy: '/images/mood-happy.svg',
      calm: '/images/mood-calm.svg',
      excited: '/images/mood-excited.svg',
      thoughtful: '/images/mood-thoughtful.svg',
      peaceful: '/images/mood-peaceful.svg',
    };

    const imageSrc = moodImageMap[mood];
    if (imageSrc) {
      try {
        await preloadImage(imageSrc);
        console.log(`预加载${mood}心情图片完成`);
      } catch (error) {
        console.warn(`预加载${mood}心情图片失败:`, error);
      }
    }
  }, [enabled, preloadImage]);

  // 在录音开始时触发预加载
  const triggerPreloadOnRecording = useCallback(() => {
    if (priority === 'high') {
      // 高优先级：立即预加载所有图片
      preloadMoodImages();
    } else {
      // 低优先级：延迟预加载，避免影响录音性能
      setTimeout(preloadMoodImages, 1000);
    }
  }, [priority, preloadMoodImages]);

  return {
    preloadMoodImages,
    preloadMoodImage,
    triggerPreloadOnRecording,
  };
};
