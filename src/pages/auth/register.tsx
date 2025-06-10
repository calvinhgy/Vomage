import React, { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { EyeIcon, EyeSlashIcon, CheckIcon } from '@heroicons/react/24/outline';
import { useAppStore } from '@/store/useAppStore';

export default function RegisterPage() {
  const router = useRouter();
  const { login, addNotification, setLoading } = useAppStore();

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [agreedToTerms, setAgreedToTerms] = useState(false);

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

    // 用户名验证
    if (!formData.username.trim()) {
      newErrors.username = '请输入用户名';
    } else if (formData.username.length < 2) {
      newErrors.username = '用户名至少需要2个字符';
    } else if (formData.username.length > 50) {
      newErrors.username = '用户名不能超过50个字符';
    } else if (!/^[a-zA-Z0-9_\u4e00-\u9fff]+$/.test(formData.username)) {
      newErrors.username = '用户名只能包含字母、数字、下划线和中文';
    }

    // 邮箱验证（可选）
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = '邮箱格式不正确';
    }

    // 密码验证
    if (!formData.password) {
      newErrors.password = '请输入密码';
    } else if (formData.password.length < 6) {
      newErrors.password = '密码至少需要6个字符';
    } else if (formData.password.length > 128) {
      newErrors.password = '密码不能超过128个字符';
    }

    // 确认密码验证
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = '请确认密码';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = '两次输入的密码不一致';
    }

    // 服务条款验证
    if (!agreedToTerms) {
      newErrors.terms = '请同意服务条款和隐私政策';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 处理注册
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setLoading(true);

    try {
      const registerData = {
        username: formData.username.trim(),
        email: formData.email.trim() || undefined,
        password: formData.password,
      };

      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(registerData),
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
          message: '注册成功！欢迎使用 Vomage',
          duration: 3000,
        });

        // 跳转到主页
        router.push('/');
      } else {
        addNotification({
          type: 'error',
          message: result.error.message || '注册失败',
          duration: 4000,
        });
      }
    } catch (error) {
      console.error('Register error:', error);
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

  // 密码强度检查
  const getPasswordStrength = (password: string) => {
    if (!password) return { strength: 0, text: '', color: '' };
    
    let strength = 0;
    if (password.length >= 6) strength++;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;

    if (strength <= 2) {
      return { strength, text: '弱', color: 'text-red-500' };
    } else if (strength <= 4) {
      return { strength, text: '中等', color: 'text-yellow-500' };
    } else {
      return { strength, text: '强', color: 'text-green-500' };
    }
  };

  const passwordStrength = getPasswordStrength(formData.password);

  return (
    <>
      <Head>
        <title>注册 - Vomage</title>
        <meta name="description" content="注册 Vomage 账户，开始记录你的心情" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center px-4 py-8">
        <div className="max-w-md w-full">
          {/* Logo */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Vomage
            </h1>
            <p className="text-neutral-600 mt-2">用声音记录心情</p>
          </div>

          {/* 注册表单 */}
          <div className="card p-6">
            <h2 className="text-xl font-semibold text-center mb-6">创建账户</h2>

            <form onSubmit={handleRegister} className="space-y-4">
              {/* 用户名输入 */}
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-neutral-700 mb-1">
                  用户名 <span className="text-red-500">*</span>
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
                <p className="text-xs text-neutral-500 mt-1">
                  2-50个字符，支持中文、英文、数字和下划线
                </p>
              </div>

              {/* 邮箱输入 */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-neutral-700 mb-1">
                  邮箱 <span className="text-neutral-400">(可选)</span>
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
                <p className="text-xs text-neutral-500 mt-1">
                  用于找回密码和接收通知
                </p>
              </div>

              {/* 密码输入 */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-neutral-700 mb-1">
                  密码 <span className="text-red-500">*</span>
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
                {formData.password && (
                  <div className="flex items-center mt-1">
                    <span className="text-xs text-neutral-500">密码强度: </span>
                    <span className={`text-xs ml-1 ${passwordStrength.color}`}>
                      {passwordStrength.text}
                    </span>
                  </div>
                )}
              </div>

              {/* 确认密码输入 */}
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-neutral-700 mb-1">
                  确认密码 <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    id="confirmPassword"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    className={`input pr-10 ${errors.confirmPassword ? 'input-error' : ''}`}
                    placeholder="请再次输入密码"
                    disabled={isSubmitting}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                  >
                    {showConfirmPassword ? (
                      <EyeSlashIcon className="w-5 h-5" />
                    ) : (
                      <EyeIcon className="w-5 h-5" />
                    )}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-red-500 text-xs mt-1">{errors.confirmPassword}</p>
                )}
                {formData.confirmPassword && formData.password === formData.confirmPassword && (
                  <div className="flex items-center mt-1">
                    <CheckIcon className="w-4 h-4 text-green-500" />
                    <span className="text-xs text-green-500 ml-1">密码匹配</span>
                  </div>
                )}
              </div>

              {/* 服务条款同意 */}
              <div>
                <label className="flex items-start space-x-2">
                  <input
                    type="checkbox"
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                    className="mt-1 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                    disabled={isSubmitting}
                  />
                  <span className="text-sm text-neutral-600">
                    我已阅读并同意{' '}
                    <Link href="/terms" className="text-primary-600 hover:underline">
                      服务条款
                    </Link>{' '}
                    和{' '}
                    <Link href="/privacy" className="text-primary-600 hover:underline">
                      隐私政策
                    </Link>
                  </span>
                </label>
                {errors.terms && (
                  <p className="text-red-500 text-xs mt-1">{errors.terms}</p>
                )}
              </div>

              {/* 注册按钮 */}
              <button
                type="submit"
                disabled={isSubmitting || !agreedToTerms}
                className="btn btn-primary w-full"
              >
                {isSubmitting ? '注册中...' : '创建账户'}
              </button>
            </form>

            {/* 登录链接 */}
            <div className="text-center mt-6">
              <p className="text-sm text-neutral-600">
                已有账户？{' '}
                <Link href="/auth/login" className="text-primary-600 hover:text-primary-700 font-medium">
                  立即登录
                </Link>
              </p>
            </div>
          </div>

          {/* 帮助信息 */}
          <div className="text-center mt-6">
            <p className="text-xs text-neutral-500">
              注册即表示您同意我们收集和使用您的信息来提供服务
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
