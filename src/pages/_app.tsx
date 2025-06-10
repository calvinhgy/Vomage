import type { AppProps } from 'next/app';
import { useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { NotificationContainer } from '@/components/NotificationContainer';
import '@/styles/globals.css';

export default function App({ Component, pageProps }: AppProps) {
  const { setTimeOfDay, setLocation, setWeather } = useAppStore();

  // 初始化应用上下文
  useEffect(() => {
    // 设置时间段
    const hour = new Date().getHours();
    let timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
    
    if (hour >= 5 && hour < 12) {
      timeOfDay = 'morning';
    } else if (hour >= 12 && hour < 17) {
      timeOfDay = 'afternoon';
    } else if (hour >= 17 && hour < 21) {
      timeOfDay = 'evening';
    } else {
      timeOfDay = 'night';
    }
    
    setTimeOfDay(timeOfDay);

    // 获取地理位置
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setLocation({
            latitude,
            longitude,
          });
          
          // 获取天气信息
          fetchWeatherInfo(latitude, longitude);
        },
        (error) => {
          console.warn('无法获取地理位置:', error);
        }
      );
    }
  }, [setTimeOfDay, setLocation, setWeather]);

  // 获取天气信息
  const fetchWeatherInfo = async (lat: number, lon: number) => {
    try {
      // 这里将调用天气API
      // 暂时使用模拟数据
      setWeather({
        temperature: 22,
        condition: 'sunny',
        humidity: 65,
      });
    } catch (error) {
      console.warn('无法获取天气信息:', error);
    }
  };

  return (
    <>
      <Component {...pageProps} />
      <NotificationContainer />
    </>
  );
}
