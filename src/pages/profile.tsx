import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { 
  UserIcon, 
  Cog6ToothIcon, 
  HeartIcon, 
  ShareIcon,
  CalendarIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';
import { useAppStore } from '@/store/useAppStore';

interface UserProfile {
  id: string;
  username: string;
  email?: string;
  avatar?: string;
  stats: {
    totalRecordings: number;
    totalImages: number;
    joinDate: string;
    lastActive?: string;
  };
  moodDistribution: Record<string, number>;
  settings?: any;
}

interface VoiceRecord {
  id: string;
  audioUrl: string;
  duration: number;
  transcript?: string;
  sentiment?: {
    mood: string;
    confidence: number;
  };
  likes: number;
  shares: number;
  createdAt: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const { user, isAuthenticated, addNotification } = useAppStore();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [userRecords, setUserRecords] = useState<VoiceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'records' | 'stats'>('records');

  // 获取用户资料
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login?returnUrl=/profile');
      return;
    }

    fetchUserProfile();
    fetchUserRecords();
  }, [isAuthenticated, router]);

  const fetchUserProfile = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch('/api/user/profile', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const result = await response.json();
      if (result.success) {
        setProfile(result.data);
      } else {
        addNotification({
          type: 'error',
          message: '获取用户资料失败',
          duration: 3000,
        });
      }
    } catch (error) {
      console.error('Fetch profile error:', error);
      addNotification({
        type: 'error',
        message: '网络错误',
        duration: 3000,
      });
    }
  };

  const fetchUserRecords = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`/api/voice/records?userId=${user?.id}&limit=10`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const result = await response.json();
      if (result.success) {
        setUserRecords(result.data.records);
      }
    } catch (error) {
      console.error('Fetch records error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 心情图标映射
  const moodEmojis: Record<string, string> = {
    happy: '😊',
    sad: '😢',
    angry: '😠',
    excited: '🤩',
    calm: '😌',
    anxious: '😰',
    neutral: '😐',
  };

  // 心情颜色映射
  const moodColors: Record<string, string> = {
    happy: 'bg-yellow-100 text-yellow-800',
    sad: 'bg-blue-100 text-blue-800',
    angry: 'bg-red-100 text-red-800',
    excited: 'bg-purple-100 text-purple-800',
    calm: 'bg-green-100 text-green-800',
    anxious: 'bg-orange-100 text-orange-800',
    neutral: 'bg-neutral-100 text-neutral-800',
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="loading-spinner w-8 h-8" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-neutral-600">无法加载用户资料</p>
          <button
            onClick={() => router.push('/')}
            className="btn btn-primary mt-4"
          >
            返回首页
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>个人中心 - Vomage</title>
        <meta name="description" content="查看你的个人资料和语音记录" />
      </Head>

      <div className="min-h-screen bg-neutral-50">
        {/* 头部 */}
        <header className="bg-white border-b border-neutral-200">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <button
                onClick={() => router.back()}
                className="text-neutral-600 hover:text-neutral-800"
              >
                ← 返回
              </button>
              <h1 className="text-lg font-semibold">个人中心</h1>
              <button
                onClick={() => router.push('/settings')}
                className="text-neutral-600 hover:text-neutral-800"
              >
                <Cog6ToothIcon className="w-6 h-6" />
              </button>
            </div>
          </div>
        </header>

        <div className="max-w-4xl mx-auto px-4 py-6">
          {/* 用户信息卡片 */}
          <div className="card p-6 mb-6">
            <div className="flex items-center space-x-4">
              {/* 头像 */}
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center">
                {profile.avatar ? (
                  <img
                    src={profile.avatar}
                    alt={profile.username}
                    className="w-16 h-16 rounded-full object-cover"
                  />
                ) : (
                  <UserIcon className="w-8 h-8 text-primary-600" />
                )}
              </div>

              {/* 用户信息 */}
              <div className="flex-1">
                <h2 className="text-xl font-semibold">{profile.username}</h2>
                {profile.email && (
                  <p className="text-neutral-600 text-sm">{profile.email}</p>
                )}
                <div className="flex items-center space-x-4 mt-2 text-sm text-neutral-500">
                  <div className="flex items-center space-x-1">
                    <CalendarIcon className="w-4 h-4" />
                    <span>加入于 {new Date(profile.stats.joinDate).toLocaleDateString('zh-CN')}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 统计信息 */}
            <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-neutral-200">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary-600">
                  {profile.stats.totalRecordings}
                </div>
                <div className="text-sm text-neutral-600">语音记录</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-secondary-600">
                  {profile.stats.totalImages}
                </div>
                <div className="text-sm text-neutral-600">生成图片</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-accent-600">
                  {Object.values(profile.moodDistribution).reduce((sum, count) => sum + count, 0)}
                </div>
                <div className="text-sm text-neutral-600">总互动</div>
              </div>
            </div>
          </div>

          {/* 标签页 */}
          <div className="flex space-x-1 mb-6">
            <button
              onClick={() => setActiveTab('records')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'records'
                  ? 'bg-primary-100 text-primary-700'
                  : 'text-neutral-600 hover:text-neutral-800 hover:bg-neutral-100'
              }`}
            >
              我的记录
            </button>
            <button
              onClick={() => setActiveTab('stats')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'stats'
                  ? 'bg-primary-100 text-primary-700'
                  : 'text-neutral-600 hover:text-neutral-800 hover:bg-neutral-100'
              }`}
            >
              心情统计
            </button>
          </div>

          {/* 内容区域 */}
          {activeTab === 'records' ? (
            <div className="space-y-4">
              {userRecords.length > 0 ? (
                userRecords.map((record) => (
                  <div key={record.id} className="card p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        {/* 心情标签 */}
                        {record.sentiment && (
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="text-lg">
                              {moodEmojis[record.sentiment.mood]}
                            </span>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              moodColors[record.sentiment.mood]
                            }`}>
                              {record.sentiment.mood}
                            </span>
                          </div>
                        )}

                        {/* 转录文本 */}
                        {record.transcript && (
                          <p className="text-neutral-700 mb-3 line-clamp-3">
                            "{record.transcript}"
                          </p>
                        )}

                        {/* 元信息 */}
                        <div className="flex items-center space-x-4 text-sm text-neutral-500">
                          <span>{Math.round(record.duration)}秒</span>
                          <div className="flex items-center space-x-1">
                            <HeartIcon className="w-4 h-4" />
                            <span>{record.likes}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <ShareIcon className="w-4 h-4" />
                            <span>{record.shares}</span>
                          </div>
                          <span>{new Date(record.createdAt).toLocaleDateString('zh-CN')}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12">
                  <p className="text-neutral-500">还没有语音记录</p>
                  <button
                    onClick={() => router.push('/')}
                    className="btn btn-primary mt-4"
                  >
                    开始录制
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {/* 心情分布 */}
              <div className="card p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <ChartBarIcon className="w-5 h-5 mr-2" />
                  心情分布
                </h3>
                
                {Object.keys(profile.moodDistribution).length > 0 ? (
                  <div className="space-y-3">
                    {Object.entries(profile.moodDistribution)
                      .sort(([,a], [,b]) => b - a)
                      .map(([mood, count]) => (
                        <div key={mood} className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span className="text-lg">{moodEmojis[mood]}</span>
                            <span className="capitalize">{mood}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className="w-24 h-2 bg-neutral-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary-500 transition-all duration-500"
                                style={{
                                  width: `${(count / Math.max(...Object.values(profile.moodDistribution))) * 100}%`
                                }}
                              />
                            </div>
                            <span className="text-sm text-neutral-600 w-8 text-right">
                              {count}
                            </span>
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <p className="text-neutral-500 text-center py-8">
                    暂无心情数据
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
