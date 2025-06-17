import React, { useState, useEffect } from 'react';
import Head from 'next/head';

export default function TestMic() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string>('');
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState({
    protocol: 'N/A',
    hostname: 'N/A',
    port: 'N/A',
    isSecure: false,
    isIOS: false,
    browser: 'N/A'
  });

  // 在组件挂载时立即设置 isClient
  useEffect(() => {
    setIsClient(true);
  }, []);

  // 在客户端加载后获取设备信息
  useEffect(() => {
    if (isClient) {
      const isIOS = /iPad|iPhone|iPod/.test(window.navigator.userAgent);
      const browser = /Safari/.test(window.navigator.userAgent) && !/Chrome/.test(window.navigator.userAgent) ? 'Safari' :
                     /Chrome/.test(window.navigator.userAgent) ? 'Chrome' :
                     /Firefox/.test(window.navigator.userAgent) ? 'Firefox' : '其他';
      
      setDeviceInfo({
        protocol: window.location.protocol,
        hostname: window.location.hostname,
        port: window.location.port || (window.location.protocol === 'https:' ? '443' : '80'),
        isSecure: window.isSecureContext,
        isIOS: isIOS,
        browser: browser
      });

      // 检查基本环境
      checkEnvironment();
    }
  }, [isClient]);

  const checkEnvironment = () => {
    if (!window.navigator.mediaDevices || !window.navigator.mediaDevices.getUserMedia) {
      setError('您的浏览器不支持录音功能');
      setHasPermission(false);
      return;
    }

    if (!window.isSecureContext) {
      setError('需要 HTTPS 环境才能访问麦克风');
      setHasPermission(false);
      return;
    }

    setError('');
  };

  const checkMicrophonePermission = async () => {
    if (!isClient) return;
    
    try {
      setHasPermission(null);
      setError('');

      console.log('Requesting microphone access...');
      console.log('User agent:', window.navigator.userAgent);
      console.log('Is iOS:', deviceInfo.isIOS);

      const audioConstraints = deviceInfo.isIOS ? {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
        sampleRate: 44100
      } : {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      };

      const stream = await window.navigator.mediaDevices.getUserMedia({ 
        audio: audioConstraints
      });
      
      console.log('Successfully got microphone access');
      setHasPermission(true);
      
      stream.getTracks().forEach(track => {
        console.log('Stopping track:', track.kind);
        track.stop();
      });
      
    } catch (err: any) {
      console.error('Microphone access error:', err);
      
      if (err.name === 'NotAllowedError') {
        if (deviceInfo.isIOS) {
          setError('麦克风权限被拒绝。在iPhone上：\n1. 打开"设置" → "Safari" → "网站设置"\n2. 找到"麦克风"选项并允许访问\n3. 或者在Safari地址栏左侧点击"aA"图标，选择"网站设置"');
        } else {
          setError('麦克风权限被拒绝。请点击地址栏左侧的图标，允许麦克风访问。');
        }
      } else if (err.name === 'NotFoundError') {
        setError('未找到麦克风设备。请检查您的设备麦克风是否正常工作。');
      } else if (err.name === 'NotSupportedError') {
        setError('浏览器不支持麦克风访问。请确保使用最新版本的Safari浏览器。');
      } else if (err.name === 'SecurityError') {
        setError('安全错误：请确保使用HTTPS访问，并且网站证书被信任。');
      } else {
        setError(`麦克风访问失败: ${err.message}\n\n如果是iPhone用户，请确保：\n1. 使用最新版Safari\n2. 在设置中允许Safari访问麦克风\n3. 网站权限设置正确`);
      }
      
      setHasPermission(false);
    }
  };

  // 如果在服务器端渲染，显示加载状态
  if (!isClient) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">页面加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>麦克风测试 - Vomage</title>
      </Head>
      
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-md mx-auto px-4">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h1 className="text-2xl font-bold text-center mb-6">麦克风权限测试</h1>
            
            {/* 环境信息 */}
            <div className="mb-6 p-4 bg-gray-100 rounded-lg">
              <h3 className="font-semibold mb-2">环境信息:</h3>
              <p className="text-sm">协议: {deviceInfo.protocol}</p>
              <p className="text-sm">主机: {deviceInfo.hostname}</p>
              <p className="text-sm">端口: {deviceInfo.port}</p>
              <p className="text-sm">
                安全上下文: {deviceInfo.isSecure ? '是' : '否'}
              </p>
              <p className="text-sm">
                设备类型: {deviceInfo.isIOS ? 'iOS设备' : '其他设备'}
              </p>
              <p className="text-sm">
                浏览器: {deviceInfo.browser}
              </p>
            </div>

            {/* 权限状态 */}
            <div className="mb-6">
              <h3 className="font-semibold mb-2">麦克风权限状态:</h3>
              {hasPermission === null && (
                <div>
                  <p className="text-gray-600 mb-3">点击下方按钮检查麦克风权限</p>
                  <button
                    onClick={checkMicrophonePermission}
                    className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold"
                  >
                    🎤 检查麦克风权限
                  </button>
                </div>
              )}
              {hasPermission === true && (
                <p className="text-green-600">✅ 已获得麦克风权限</p>
              )}
              {hasPermission === false && (
                <div>
                  <p className="text-red-600">❌ 无法获得麦克风权限</p>
                  <button
                    onClick={checkMicrophonePermission}
                    className="mt-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg"
                  >
                    🔄 重新尝试
                  </button>
                </div>
              )}
            </div>

            {/* 错误信息 */}
            {error && (
              <div className="mb-6 p-4 bg-red-100 border border-red-300 rounded-lg">
                <p className="text-red-700 whitespace-pre-line">{error}</p>
              </div>
            )}

            {/* 说明 */}
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-semibold text-blue-800 mb-2">使用说明:</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• 点击"检查麦克风权限"按钮开始测试</li>
                <li>• 浏览器会弹出权限请求，请点击"允许"</li>
                {deviceInfo.isIOS && (
                  <>
                    <li>• <strong>iPhone用户特别注意：</strong></li>
                    <li>• 确保使用最新版Safari浏览器</li>
                    <li>• 在弹出权限对话框时点击"允许"</li>
                    <li>• 如果没有弹出对话框，请检查Safari设置</li>
                  </>
                )}
                <li>• 如果被拒绝，可以在浏览器设置中重新允许</li>
                <li>• 确保使用 HTTPS 访问才能使用麦克风功能</li>
              </ul>
            </div>

            {/* iOS特殊说明 */}
            {deviceInfo.isIOS && (
              <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <h4 className="font-semibold text-green-800 mb-2">📱 iPhone/iPad 用户指南:</h4>
                <ol className="text-sm text-green-700 space-y-1 list-decimal list-inside">
                  <li>确保Safari浏览器已更新到最新版本</li>
                  <li>点击下方的"检查麦克风权限"按钮</li>
                  <li>Safari会弹出权限对话框，点击"允许"</li>
                  <li>如果没有弹出对话框，请检查以下设置：</li>
                  <li className="ml-4">• 设置 → Safari → 网站设置 → 麦克风 → 允许</li>
                  <li className="ml-4">• 或在Safari地址栏左侧点击"aA" → 网站设置</li>
                </ol>
              </div>
            )}

            {/* 故障排除 */}
            {hasPermission === false && (
              <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <h4 className="font-semibold text-yellow-800 mb-2">🔧 故障排除:</h4>
                {deviceInfo.isIOS ? (
                  <ul className="text-sm text-yellow-700 space-y-1">
                    <li>• <strong>iPhone/iPad 专用解决方案：</strong></li>
                    <li>• 1. 打开"设置" → "Safari" → "网站设置" → "麦克风" → 选择"允许"</li>
                    <li>• 2. 在Safari中点击地址栏左侧的"aA"图标 → "网站设置" → 允许麦克风</li>
                    <li>• 3. 确保Safari浏览器是最新版本</li>
                    <li>• 4. 尝试关闭Safari并重新打开</li>
                    <li>• 5. 重启iPhone后再次尝试</li>
                  </ul>
                ) : (
                  <ul className="text-sm text-yellow-700 space-y-1">
                    <li>• 检查地址栏是否显示 🔒 或 🔐 图标</li>
                    <li>• 点击地址栏左侧图标，将麦克风设置为"允许"</li>
                    <li>• 刷新页面后重新尝试</li>
                    <li>• 尝试使用无痕模式访问</li>
                    <li>• 确保麦克风设备正常工作</li>
                  </ul>
                )}
              </div>
            )}

            {/* 调试链接 */}
            <div className="mt-6 text-center">
              <a
                href="/debug"
                className="text-blue-500 hover:text-blue-700 underline"
              >
                🔧 打开调试页面
              </a>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
