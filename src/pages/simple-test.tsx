import React, { useState } from 'react';
import Head from 'next/head';

export default function SimpleTest() {
  const [status, setStatus] = useState('点击按钮开始测试');
  const [isLoading, setIsLoading] = useState(false);

  const testMicrophone = async () => {
    setIsLoading(true);
    setStatus('正在请求麦克风权限...');
    
    try {
      // 简单的麦克风测试
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setStatus('✅ 成功获取麦克风权限！');
      
      // 立即停止流
      stream.getTracks().forEach(track => track.stop());
      
    } catch (error: any) {
      setStatus(`❌ 错误: ${error.name} - ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>简单测试 - Vomage</title>
      </Head>
      
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full mx-4">
          <h1 className="text-2xl font-bold text-center mb-6">🎤 简单麦克风测试</h1>
          
          <div className="text-center mb-6">
            <p className="text-gray-600 mb-4">{status}</p>
            
            <button
              onClick={testMicrophone}
              disabled={isLoading}
              className={`px-6 py-3 rounded-lg font-semibold ${
                isLoading 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-blue-500 hover:bg-blue-600 text-white'
              }`}
            >
              {isLoading ? '测试中...' : '🎤 测试麦克风'}
            </button>
          </div>
          
          <div className="text-sm text-gray-500 space-y-1">
            <p>• 点击按钮会请求麦克风权限</p>
            <p>• 请在弹出的对话框中点击"允许"</p>
            <p>• 如果没有弹出对话框，请检查浏览器设置</p>
          </div>
          
          <div className="mt-6 text-center">
            <a href="/test-mic" className="text-blue-500 hover:text-blue-700 underline">
              → 完整测试页面
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
