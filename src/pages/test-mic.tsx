import React, { useState, useEffect } from 'react';
import Head from 'next/head';

export default function TestMic() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string>('');
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);

  useEffect(() => {
    checkMicrophonePermission();
  }, []);

  const checkMicrophonePermission = async () => {
    try {
      // 检查是否在 HTTPS 环境
      const isSecure = location.protocol === 'https:' || location.hostname === 'localhost';
      console.log('Is secure context:', isSecure);
      console.log('Protocol:', location.protocol);
      console.log('Hostname:', location.hostname);

      // 检查 getUserMedia 是否可用
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError('您的浏览器不支持录音功能');
        setHasPermission(false);
        return;
      }

      // 尝试获取麦克风权限
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('Successfully got microphone access');
      setHasPermission(true);
      
      // 立即停止流以释放资源
      stream.getTracks().forEach(track => track.stop());
    } catch (err: any) {
      console.error('Microphone access error:', err);
      setError(`麦克风访问失败: ${err.message}`);
      setHasPermission(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });

      const recorder = new MediaRecorder(stream);
      setMediaRecorder(recorder);
      setIsRecording(true);
      
      recorder.start();
      console.log('Recording started');

      recorder.ondataavailable = (event) => {
        console.log('Data available:', event.data.size);
      };

      recorder.onstop = () => {
        console.log('Recording stopped');
        stream.getTracks().forEach(track => track.stop());
        setIsRecording(false);
      };

    } catch (err: any) {
      console.error('Start recording error:', err);
      setError(`开始录音失败: ${err.message}`);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
    }
  };

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
              <p className="text-sm">协议: {typeof window !== 'undefined' ? window.location.protocol : 'N/A'}</p>
              <p className="text-sm">主机: {typeof window !== 'undefined' ? window.location.hostname : 'N/A'}</p>
              <p className="text-sm">端口: {typeof window !== 'undefined' ? window.location.port : 'N/A'}</p>
              <p className="text-sm">
                安全上下文: {typeof window !== 'undefined' && window.isSecureContext ? '是' : '否'}
              </p>
            </div>

            {/* 权限状态 */}
            <div className="mb-6">
              <h3 className="font-semibold mb-2">麦克风权限状态:</h3>
              {hasPermission === null && (
                <p className="text-yellow-600">检查中...</p>
              )}
              {hasPermission === true && (
                <p className="text-green-600">✅ 已获得麦克风权限</p>
              )}
              {hasPermission === false && (
                <p className="text-red-600">❌ 无法获得麦克风权限</p>
              )}
            </div>

            {/* 错误信息 */}
            {error && (
              <div className="mb-6 p-4 bg-red-100 border border-red-300 rounded-lg">
                <p className="text-red-700">{error}</p>
              </div>
            )}

            {/* 录音测试 */}
            {hasPermission && (
              <div className="text-center">
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`px-6 py-3 rounded-lg font-semibold ${
                    isRecording
                      ? 'bg-red-500 hover:bg-red-600 text-white'
                      : 'bg-blue-500 hover:bg-blue-600 text-white'
                  }`}
                >
                  {isRecording ? '停止录音' : '开始录音'}
                </button>
                
                {isRecording && (
                  <p className="mt-2 text-sm text-gray-600 animate-pulse">
                    正在录音...
                  </p>
                )}
              </div>
            )}

            {/* 重新检查按钮 */}
            <div className="mt-6 text-center">
              <button
                onClick={checkMicrophonePermission}
                className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg text-sm"
              >
                重新检查权限
              </button>
            </div>

            {/* 说明 */}
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-semibold text-blue-800 mb-2">使用说明:</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• 现代浏览器需要 HTTPS 环境才能访问麦克风</li>
                <li>• 首次访问时浏览器会询问麦克风权限</li>
                <li>• 如果被拒绝，需要在浏览器设置中手动允许</li>
                <li>• 某些浏览器可能需要用户交互后才能访问麦克风</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
