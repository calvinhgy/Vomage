import React, { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { useAppStore } from '@/store/useAppStore';

export default function LoginPage() {
  const router = useRouter();
  const { login, addNotification, setLoading } = useAppStore();

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
  });
  const [loginType, setLoginType] = useState<'username' | 'email'>('username');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // 处理表单输入
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // 清除对应字段的错误
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  // 验证表单
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (loginType === 'username') {
      if (!formData.username.trim()) {
        newErrors.username = '请输入用户名';
      }
    } else {
      if (!formData.email.trim()) {
        newErrors.email = '请输入邮箱';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        newErrors.email = '邮箱格式不正确';
      }
    }

    if (!formData.password) {
      newErrors.password = '请输入密码';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 处理登录
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setLoading(true);

    try {
      const loginData = {
        [loginType]: loginType === 'username' ? formData.username : formData.email,
        password: formData.password,
      };

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(loginData),
      });

      const result = await response.json();

      if (result.success) {
        // 保存用户信息和令牌
        localStorage.setItem('accessToken', result.data.tokens.accessToken);
        localStorage.setItem('refreshToken', result.data.tokens.refreshToken);
        
        // 更新全局状态
        login(result.data.user);

        addNotification({
          type: 'success',
          message: '登录成功！',
          duration: 2000,
        });

        // 跳转到主页或返回页面
        const returnUrl = router.query.returnUrl as string || '/';
        router.push(returnUrl);
      } else {
        addNotification({
          type: 'error',
          message: result.error.message || '登录失败',
          duration: 4000,
        });
      }
    } catch (error) {
      console.error('Login error:', error);
      addNotification({
        type: 'error',
        message: '网络错误，请稍后重试',
        duration: 4000,
      });
    } finally {
      setIsSubmitting(false);
      setLoading(false);
    }
  };

  // 访客登录
  const handleGuestLogin = async () => {
    setIsSubmitting(true);
    setLoading(true);

    try {
      const response = await fetch('/api/auth/guest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (result.success) {
        localStorage.setItem('accessToken', result.data.tokens.accessToken);
        localStorage.setItem('refreshToken', result.data.tokens.refreshToken);
        
        login(result.data.user);

        addNotification({
          type: 'success',
          message: '以访客身份登录成功！',
          duration: 2000,
        });

        router.push('/');
      } else {
        addNotification({
          type: 'error',
          message: result.error.message || '访客登录失败',
          duration: 4000,
        });
      }
    } catch (error) {
      console.error('Guest login error:', error);
      addNotification({
        type: 'error',
        message: '网络错误，请稍后重试',
        duration: 4000,
      });
    } finally {
      setIsSubmitting(false);
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>登录 - Vomage</title>
        <meta name="description" content="登录到 Vomage，开始记录你的心情" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          {/* Logo */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Vomage
            </h1>
            <p className="text-neutral-600 mt-2">用声音记录心情</p>
          </div>

          {/* 登录表单 */}
          <div className="card p-6">
            <h2 className="text-xl font-semibold text-center mb-6">登录账户</h2>

            {/* 登录方式切换 */}
            <div className="flex mb-6 bg-neutral-100 rounded-lg p-1">
              <button
                type="button"
                onClick={() => setLoginType('username')}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                  loginType === 'username'
                    ? 'bg-white text-primary-600 shadow-sm'
                    : 'text-neutral-600 hover:text-neutral-800'
                }`}
              >
                用户名登录
              </button>
              <button
                type="button"
                onClick={() => setLoginType('email')}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                  loginType === 'email'
                    ? 'bg-white text-primary-600 shadow-sm'
                    : 'text-neutral-600 hover:text-neutral-800'
                }`}
              >
                邮箱登录
              </button>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              {/* 用户名/邮箱输入 */}
              {loginType === 'username' ? (
                <div>
                  <label htmlFor="username" className="block text-sm font-medium text-neutral-700 mb-1">
                    用户名
                  </label>
                  <input
                    type="text"
                    id="username"
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    className={`input ${errors.username ? 'input-error' : ''}`}
                    placeholder="请输入用户名"
                    disabled={isSubmitting}
                  />
                  {errors.username && (
                    <p className="text-red-500 text-xs mt-1">{errors.username}</p>
                  )}
                </div>
              ) : (
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-neutral-700 mb-1">
                    邮箱
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className={`input ${errors.email ? 'input-error' : ''}`}
                    placeholder="请输入邮箱"
                    disabled={isSubmitting}
                  />
                  {errors.email && (
                    <p className="text-red-500 text-xs mt-1">{errors.email}</p>
                  )}
                </div>
              )}

              {/* 密码输入 */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-neutral-700 mb-1">
                  密码
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className={`input pr-10 ${errors.password ? 'input-error' : ''}`}
                    placeholder="请输入密码"
                    disabled={isSubmitting}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                  >
                    {showPassword ? (
                      <EyeSlashIcon className="w-5 h-5" />
                    ) : (
                      <EyeIcon className="w-5 h-5" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-red-500 text-xs mt-1">{errors.password}</p>
                )}
              </div>

              {/* 登录按钮 */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn btn-primary w-full"
              >
                {isSubmitting ? '登录中...' : '登录'}
              </button>
            </form>

            {/* 分割线 */}
            <div className="flex items-center my-6">
              <div className="flex-1 border-t border-neutral-200"></div>
              <span className="px-4 text-sm text-neutral-500">或</span>
              <div className="flex-1 border-t border-neutral-200"></div>
            </div>

            {/* 访客登录 */}
            <button
              type="button"
              onClick={handleGuestLogin}
              disabled={isSubmitting}
              className="btn btn-secondary w-full"
            >
              访客体验
            </button>

            {/* 注册链接 */}
            <div className="text-center mt-6">
              <p className="text-sm text-neutral-600">
                还没有账户？{' '}
                <Link href="/auth/register" className="text-primary-600 hover:text-primary-700 font-medium">
                  立即注册
                </Link>
              </p>
            </div>
          </div>

          {/* 帮助信息 */}
          <div className="text-center mt-6">
            <p className="text-xs text-neutral-500">
              登录即表示您同意我们的{' '}
              <Link href="/terms" className="text-primary-600 hover:underline">
                服务条款
              </Link>{' '}
              和{' '}
              <Link href="/privacy" className="text-primary-600 hover:underline">
                隐私政策
              </Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
