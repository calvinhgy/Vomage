/**
 * 上下文服务
 * 获取地理位置、天气等环境信息
 */

import { Context } from '@/types';

export interface LocationInfo {
  latitude: number;
  longitude: number;
  city?: string;
  country?: string;
  region?: string;
  timezone?: string;
}

export interface WeatherInfo {
  temperature: number;
  condition: string;
  humidity: number;
  windSpeed?: number;
  pressure?: number;
  visibility?: number;
  uvIndex?: number;
}

export class ContextService {
  /**
   * 获取完整的上下文信息
   */
  static async getFullContext(): Promise<Context> {
    const context: Context = {
      // 移除timeOfDay，让客户端组件自己处理
    };

    try {
      // 获取地理位置
      const location = await this.getCurrentLocation();
      context.location = location;

      // 获取天气信息
      if (location) {
        const weather = await this.getWeatherInfo(location.latitude, location.longitude);
        context.weather = weather;
      }
    } catch (error) {
      console.warn('获取上下文信息失败:', error);
    }

    return context;
  }

  /**
   * 获取当前地理位置
   */
  static async getCurrentLocation(): Promise<LocationInfo> {
    return new Promise((resolve, reject) => {
      // 检查是否在浏览器环境中
      if (typeof window === 'undefined' || !navigator?.geolocation) {
        reject(new Error('浏览器不支持地理位置服务'));
        return;
      }

      const options: PositionOptions = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000, // 5分钟缓存
      };

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          
          try {
            // 获取详细地址信息
            const addressInfo = await this.reverseGeocode(latitude, longitude);
            
            resolve({
              latitude,
              longitude,
              ...addressInfo,
            });
          } catch (error) {
            // 即使地址解析失败，也返回基本的坐标信息
            resolve({
              latitude,
              longitude,
            });
          }
        },
        (error) => {
          let errorMessage = '获取位置失败';
          
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = '用户拒绝了位置访问请求';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = '位置信息不可用';
              break;
            case error.TIMEOUT:
              errorMessage = '获取位置超时';
              break;
          }
          
          reject(new Error(errorMessage));
        },
        options
      );
    });
  }

  /**
   * 反向地理编码（坐标转地址）
   */
  static async reverseGeocode(lat: number, lon: number): Promise<{
    city?: string;
    country?: string;
    region?: string;
    timezone?: string;
  }> {
    try {
      // 使用服务端 API 进行地理编码
      const response = await fetch(`/api/geocode?lat=${lat}&lon=${lon}`);
      
      if (!response.ok) {
        throw new Error('地理编码服务不可用');
      }

      const data = await response.json();
      
      return {
        city: data.city,
        country: data.country,
        region: data.region,
        timezone: data.timezone,
      };
    } catch (error) {
      console.warn('反向地理编码失败:', error);
      
      // 返回模拟数据，不影响主要功能
      return {
        city: '未知城市',
        country: '未知国家',
        region: '未知地区',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      };
    }
  }

  /**
   * 获取天气信息
   */
  static async getWeatherInfo(lat: number, lon: number): Promise<WeatherInfo> {
    try {
      const response = await fetch(`/api/weather?lat=${lat}&lon=${lon}`);
      
      if (!response.ok) {
        throw new Error('天气服务不可用');
      }

      const data = await response.json();
      
      return {
        temperature: data.temperature,
        condition: this.translateWeatherCondition(data.condition),
        humidity: data.humidity,
        windSpeed: data.windSpeed,
        pressure: data.pressure,
        visibility: data.visibility,
        uvIndex: data.uvIndex,
      };
    } catch (error) {
      console.warn('获取天气信息失败:', error);
      
      // 返回模拟天气信息
      const mockWeatherConditions = ['晴朗', '多云', '阴天', '小雨', '晴转多云'];
      const randomCondition = mockWeatherConditions[Math.floor(Math.random() * mockWeatherConditions.length)];
      
      return {
        temperature: Math.floor(Math.random() * 20) + 15, // 15-35度
        condition: randomCondition,
        humidity: Math.floor(Math.random() * 40) + 40, // 40-80%
        windSpeed: Math.floor(Math.random() * 10) + 5, // 5-15 km/h
      };
    }
  }

  /**
   * 获取当前时间段
   */
  static getTimeOfDay(): 'morning' | 'afternoon' | 'evening' | 'night' {
    const hour = new Date().getHours();
    
    if (hour >= 5 && hour < 12) {
      return 'morning';
    } else if (hour >= 12 && hour < 17) {
      return 'afternoon';
    } else if (hour >= 17 && hour < 21) {
      return 'evening';
    } else {
      return 'night';
    }
  }

  /**
   * 获取详细的时间信息
   */
  static getDetailedTimeInfo(): {
    timeOfDay: Context['timeOfDay'];
    hour: number;
    minute: number;
    dayOfWeek: string;
    date: string;
    season: string;
  } {
    const now = new Date();
    const hour = now.getHours();
    const minute = now.getMinutes();
    
    const dayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const dayOfWeek = dayNames[now.getDay()];
    
    const date = now.toLocaleDateString('zh-CN');
    
    // 判断季节
    const month = now.getMonth() + 1;
    let season = '';
    if (month >= 3 && month <= 5) {
      season = '春季';
    } else if (month >= 6 && month <= 8) {
      season = '夏季';
    } else if (month >= 9 && month <= 11) {
      season = '秋季';
    } else {
      season = '冬季';
    }

    return {
      timeOfDay: this.getTimeOfDay(),
      hour,
      minute,
      dayOfWeek,
      date,
      season,
    };
  }

  /**
   * 翻译天气状况
   */
  private static translateWeatherCondition(condition: string): string {
    const translations: Record<string, string> = {
      'clear': '晴朗',
      'sunny': '晴天',
      'partly-cloudy': '多云',
      'cloudy': '阴天',
      'overcast': '阴霾',
      'rain': '雨天',
      'drizzle': '小雨',
      'heavy-rain': '大雨',
      'thunderstorm': '雷雨',
      'snow': '雪天',
      'fog': '雾天',
      'windy': '大风',
      'hot': '炎热',
      'cold': '寒冷',
    };

    return translations[condition.toLowerCase()] || condition;
  }

  /**
   * 检查位置权限状态
   */
  static async checkLocationPermission(): Promise<'granted' | 'denied' | 'prompt' | 'unsupported'> {
    if (typeof window === 'undefined' || !navigator?.permissions) {
      return 'unsupported';
    }

    try {
      const permission = await navigator.permissions.query({ name: 'geolocation' });
      return permission.state;
    } catch (error) {
      return 'unsupported';
    }
  }

  /**
   * 请求位置权限
   */
  static async requestLocationPermission(): Promise<boolean> {
    if (typeof window === 'undefined' || !navigator?.geolocation) {
      return false;
    }

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout: 5000,
        });
      });
      
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * 获取时区信息
   */
  static getTimezoneInfo(): {
    timezone: string;
    offset: number;
    offsetString: string;
  } {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const offset = new Date().getTimezoneOffset();
    const offsetHours = Math.abs(offset) / 60;
    const offsetString = `UTC${offset <= 0 ? '+' : '-'}${offsetHours}`;

    return {
      timezone,
      offset,
      offsetString,
    };
  }

  /**
   * 根据上下文生成描述文本
   */
  static generateContextDescription(context: Context): string {
    const parts: string[] = [];

    // 时间描述
    const timeDescriptions = {
      morning: '在这个清晨',
      afternoon: '在这个午后',
      evening: '在这个傍晚',
      night: '在这个夜晚',
    };
    parts.push(timeDescriptions[context.timeOfDay]);

    // 天气描述
    if (context.weather) {
      const { temperature, condition } = context.weather;
      parts.push(`天气${condition}，气温${temperature}°C`);
    }

    // 位置描述
    if (context.location?.city) {
      parts.push(`在${context.location.city}`);
    }

    return parts.join('，');
  }

  /**
   * 缓存上下文信息
   */
  static cacheContext(context: Context): void {
    try {
      const cacheData = {
        context,
        timestamp: Date.now(),
      };
      
      localStorage.setItem('vomage_context_cache', JSON.stringify(cacheData));
    } catch (error) {
      console.warn('缓存上下文信息失败:', error);
    }
  }

  /**
   * 获取缓存的上下文信息
   */
  static getCachedContext(): Context | null {
    try {
      const cached = localStorage.getItem('vomage_context_cache');
      if (!cached) return null;

      const cacheData = JSON.parse(cached);
      const age = Date.now() - cacheData.timestamp;
      
      // 缓存有效期为 10 分钟
      if (age > 10 * 60 * 1000) {
        localStorage.removeItem('vomage_context_cache');
        return null;
      }

      return cacheData.context;
    } catch (error) {
      console.warn('获取缓存上下文失败:', error);
      return null;
    }
  }
}
