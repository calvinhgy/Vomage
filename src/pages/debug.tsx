import React, { useState, useEffect } from 'react';
import Head from 'next/head';

export default function Debug() {
  const [logs, setLogs] = useState<string[]>([]);
  const [isClient, setIsClient] = useState(false);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
    console.log(message);
  };

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (isClient) {
      addLog('页面加载完成');
      addLog(`协议: ${window.location.protocol}`);
      addLog(`主机: ${window.location.hostname}`);
      addLog(`端口: ${window.location.port}`);
      addLog(`安全上下文: ${window.isSecureContext}`);
      addLog(`User Agent: ${window.navigator.userAgent}`);
      addLog(`是否iOS: ${/iPad|iPhone|iPod/.test(window.navigator.userAgent)}`);
      addLog(`支持getUserMedia: ${!!(window.navigator.mediaDevices && window.navigator.mediaDevices.getUserMedia)}`);
    }
  }, [isClient]);

  const testMicrophone = async () => {
    addLog('开始测试麦克风...');
    
    try {
      if (!window.navigator.mediaDevices || !window.navigator.mediaDevices.getUserMedia) {
        throw new Error('不支持getUserMedia');
      }

      addLog('请求麦克风权限...');
      const stream = await window.navigator.mediaDevices.getUserMedia({ 
        audio: true 
      });
      
      addLog('✅ 成功获取麦克风权限');
      addLog(`音频轨道数量: ${stream.getAudioTracks().length}`);
      
      // 停止流
      stream.getTracks().forEach(track => {
        addLog(`停止音频轨道: ${track.kind}`);
        track.stop();
      });
      
    } catch (error: any) {
      addLog(`❌ 错误: ${error.name} - ${error.message}`);
    }
  };

  const testWithConstraints = async () => {
    addLog('使用约束测试麦克风...');
    
    try {
      const isIOS = /iPad|iPhone|iPod/.test(window.navigator.userAgent);
      const constraints = isIOS ? {
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }
      } : {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      };
      
      addLog(`使用约束: ${JSON.stringify(constraints)}`);
      
      const stream = await window.navigator.mediaDevices.getUserMedia(constraints);
      addLog('✅ 使用约束成功获取权限');
      
      stream.getTracks().forEach(track => track.stop());
      
    } catch (error: any) {
      addLog(`❌ 约束测试错误: ${error.name} - ${error.message}`);
    }
  };

  const clearLogs = () => {
    setLogs([]);
  };

  if (!isClient) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">调试页面加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>调试页面 - Vomage</title>
      </Head>
      
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-2xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h1 className="text-2xl font-bold text-center mb-6">🔧 调试页面</h1>
            
            <div className="space-y-4 mb-6">
              <button
                onClick={testMicrophone}
                className="w-full px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg"
              >
                🎤 测试基本麦克风权限
              </button>
              
              <button
                onClick={testWithConstraints}
                className="w-full px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg"
              >
                🎛️ 测试带约束的麦克风权限
              </button>
              
              <button
                onClick={clearLogs}
                className="w-full px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg"
              >
                🗑️ 清除日志
              </button>
            </div>
            
            <div className="bg-black text-green-400 p-4 rounded-lg font-mono text-sm max-h-96 overflow-y-auto">
              <h3 className="text-white mb-2">调试日志:</h3>
              {logs.length === 0 ? (
                <p>暂无日志...</p>
              ) : (
                logs.map((log, index) => (
                  <div key={index} className="mb-1">
                    {log}
                  </div>
                ))
              )}
            </div>
            
            <div className="mt-6 text-center">
              <a
                href="/test-mic"
                className="text-blue-500 hover:text-blue-700 underline"
              >
                ← 返回测试页面
              </a>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
