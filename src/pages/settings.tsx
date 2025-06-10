import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { 
  UserIcon,
  BellIcon,
  EyeIcon,
  PaintBrushIcon,
  GlobeAltIcon,
  MoonIcon,
  SunIcon,
  ComputerDesktopIcon,
  ArrowRightOnRectangleIcon
} from '@heroicons/react/24/outline';
import { useAppStore } from '@/store/useAppStore';

interface UserSettings {
  theme: 'light' | 'dark' | 'system';
  language: string;
  notifications: boolean;
  privacyLevel: 'public' | 'private' | 'friends';
  imageStyle: string;
}

export default function SettingsPage() {
  const router = useRouter();
  const { user, isAuthenticated, logout, addNotification, updateSettings } = useAppStore();

  const [settings, setSettings] = useState<UserSettings>({
    theme: 'system',
    language: 'zh-CN',
    notifications: true,
    privacyLevel: 'public',
    imageStyle: 'abstract',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // 获取用户设置
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login?returnUrl=/settings');
      return;
    }

    fetchUserSettings();
  }, [isAuthenticated, router]);

  const fetchUserSettings = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch('/api/user/settings', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const result = await response.json();
      if (result.success) {
        setSettings(result.data.settings);
      } else {
        addNotification({
          type: 'error',
          message: '获取设置失败',
          duration: 3000,
        });
      }
    } catch (error) {
      console.error('Fetch settings error:', error);
      addNotification({
        type: 'error',
        message: '网络错误',
        duration: 3000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 保存设置
  const saveSettings = async (newSettings: Partial<UserSettings>) => {
    setIsSaving(true);

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch('/api/user/settings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(newSettings),
      });

      const result = await response.json();
      if (result.success) {
        setSettings(result.data.settings);
        updateSettings(result.data.settings);
        addNotification({
          type: 'success',
          message: '设置已保存',
          duration: 2000,
        });
      } else {
        addNotification({
          type: 'error',
          message: result.error.message || '保存设置失败',
          duration: 3000,
        });
      }
    } catch (error) {
      console.error('Save settings error:', error);
      addNotification({
        type: 'error',
        message: '网络错误',
        duration: 3000,
      });
    } finally {
      setIsSaving(false);
    }
  };

  // 处理设置变更
  const handleSettingChange = (key: keyof UserSettings, value: any) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    saveSettings({ [key]: value });
  };

  // 处理登出
  const handleLogout = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (token) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      logout();
      router.push('/');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="loading-spinner w-8 h-8" />
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>设置 - Vomage</title>
        <meta name="description" content="管理你的账户设置和偏好" />
      </Head>

      <div className="min-h-screen bg-neutral-50">
        {/* 头部 */}
        <header className="bg-white border-b border-neutral-200">
          <div className="max-w-2xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <button
                onClick={() => router.back()}
                className="text-neutral-600 hover:text-neutral-800"
              >
                ← 返回
              </button>
              <h1 className="text-lg font-semibold">设置</h1>
              <div className="w-6" /> {/* 占位符 */}
            </div>
          </div>
        </header>

        <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
          {/* 账户信息 */}
          <div className="card">
            <div className="p-4 border-b border-neutral-200">
              <h2 className="text-lg font-semibold flex items-center">
                <UserIcon className="w-5 h-5 mr-2" />
                账户信息
              </h2>
            </div>
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{user?.username}</p>
                  <p className="text-sm text-neutral-600">用户名</p>
                </div>
                <button
                  onClick={() => router.push('/profile')}
                  className="text-primary-600 hover:text-primary-700 text-sm"
                >
                  编辑资料
                </button>
              </div>
            </div>
          </div>

          {/* 外观设置 */}
          <div className="card">
            <div className="p-4 border-b border-neutral-200">
              <h2 className="text-lg font-semibold flex items-center">
                <PaintBrushIcon className="w-5 h-5 mr-2" />
                外观设置
              </h2>
            </div>
            <div className="p-4 space-y-4">
              {/* 主题设置 */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  主题
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'light', label: '浅色', icon: SunIcon },
                    { value: 'dark', label: '深色', icon: MoonIcon },
                    { value: 'system', label: '跟随系统', icon: ComputerDesktopIcon },
                  ].map(({ value, label, icon: Icon }) => (
                    <button
                      key={value}
                      onClick={() => handleSettingChange('theme', value)}
                      disabled={isSaving}
                      className={`p-3 rounded-lg border text-sm font-medium transition-colors ${
                        settings.theme === value
                          ? 'border-primary-500 bg-primary-50 text-primary-700'
                          : 'border-neutral-200 hover:border-neutral-300'
                      }`}
                    >
                      <Icon className="w-5 h-5 mx-auto mb-1" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 图片风格 */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  默认图片风格
                </label>
                <select
                  value={settings.imageStyle}
                  onChange={(e) => handleSettingChange('imageStyle', e.target.value)}
                  disabled={isSaving}
                  className="input"
                >
                  <option value="abstract">抽象</option>
                  <option value="realistic">写实</option>
                  <option value="artistic">艺术</option>
                  <option value="minimalist">极简</option>
                  <option value="cartoon">卡通</option>
                </select>
              </div>
            </div>
          </div>

          {/* 隐私设置 */}
          <div className="card">
            <div className="p-4 border-b border-neutral-200">
              <h2 className="text-lg font-semibold flex items-center">
                <EyeIcon className="w-5 h-5 mr-2" />
                隐私设置
              </h2>
            </div>
            <div className="p-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  默认隐私级别
                </label>
                <select
                  value={settings.privacyLevel}
                  onChange={(e) => handleSettingChange('privacyLevel', e.target.value)}
                  disabled={isSaving}
                  className="input"
                >
                  <option value="public">公开 - 所有人可见</option>
                  <option value="friends">好友 - 仅好友可见</option>
                  <option value="private">私密 - 仅自己可见</option>
                </select>
                <p className="text-xs text-neutral-500 mt-1">
                  设置新语音记录的默认隐私级别
                </p>
              </div>
            </div>
          </div>

          {/* 通知设置 */}
          <div className="card">
            <div className="p-4 border-b border-neutral-200">
              <h2 className="text-lg font-semibold flex items-center">
                <BellIcon className="w-5 h-5 mr-2" />
                通知设置
              </h2>
            </div>
            <div className="p-4">
              <label className="flex items-center justify-between">
                <div>
                  <p className="font-medium">推送通知</p>
                  <p className="text-sm text-neutral-600">接收点赞、评论等通知</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.notifications}
                  onChange={(e) => handleSettingChange('notifications', e.target.checked)}
                  disabled={isSaving}
                  className="rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                />
              </label>
            </div>
          </div>

          {/* 语言设置 */}
          <div className="card">
            <div className="p-4 border-b border-neutral-200">
              <h2 className="text-lg font-semibold flex items-center">
                <GlobeAltIcon className="w-5 h-5 mr-2" />
                语言设置
              </h2>
            </div>
            <div className="p-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  界面语言
                </label>
                <select
                  value={settings.language}
                  onChange={(e) => handleSettingChange('language', e.target.value)}
                  disabled={isSaving}
                  className="input"
                >
                  <option value="zh-CN">中文（简体）</option>
                  <option value="zh-TW">中文（繁体）</option>
                  <option value="en-US">English</option>
                  <option value="ja-JP">日本語</option>
                  <option value="ko-KR">한국어</option>
                </select>
              </div>
            </div>
          </div>

          {/* 账户操作 */}
          <div className="card">
            <div className="p-4">
              <button
                onClick={handleLogout}
                className="flex items-center justify-center w-full py-3 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
              >
                <ArrowRightOnRectangleIcon className="w-5 h-5 mr-2" />
                退出登录
              </button>
            </div>
          </div>

          {/* 版本信息 */}
          <div className="text-center text-sm text-neutral-500">
            <p>Vomage v1.0.0</p>
            <p className="mt-1">
              <Link href="/about" className="text-primary-600 hover:underline">
                关于我们
              </Link>
              {' · '}
              <Link href="/privacy" className="text-primary-600 hover:underline">
                隐私政策
              </Link>
              {' · '}
              <Link href="/terms" className="text-primary-600 hover:underline">
                服务条款
              </Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
