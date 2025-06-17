import React, { useState, useEffect } from 'react';
import Head from 'next/head';

export default function AudioDebugPage() {
  const [supportedFormats, setSupportedFormats] = useState<string[]>([]);
  const [deviceInfo, setDeviceInfo] = useState<any>({});
  const [testResults, setTestResults] = useState<any>({});

  useEffect(() => {
    checkAudioSupport();
    getDeviceInfo();
  }, []);

  const checkAudioSupport = () => {
    const formats = [
      'audio/webm;codecs=opus',
      'audio/webm;codecs=vp8',
      'audio/webm',
      'audio/mp4;codecs=aac',
      'audio/mp4',
      'audio/aac',
      'audio/mpeg',
      'audio/wav',
      'audio/ogg',
      'audio/3gpp',
      'audio/3gpp2',
    ];

    const supported = formats.filter(format => {
      const isSupported = MediaRecorder.isTypeSupported(format);
      console.log(`${format}: ${isSupported ? '✅' : '❌'}`);
      return isSupported;
    });

    setSupportedFormats(supported);
  };

  const getDeviceInfo = () => {
    const info = {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      isIOS: /iPad|iPhone|iPod/.test(navigator.userAgent),
      isSafari: /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent),
      hasMediaDevices: !!navigator.mediaDevices,
      hasGetUserMedia: !!navigator.mediaDevices?.getUserMedia,
      isSecureContext: window.isSecureContext,
    };

    setDeviceInfo(info);
  };

  const testRecording = async () => {
    try {
      setTestResults({ status: '测试中...', error: null });

      // 请求麦克风权限
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // 尝试不同的格式
      const formats = supportedFormats.length > 0 ? supportedFormats : ['audio/webm', 'audio/mp4'];
      
      for (const format of formats) {
        try {
          const mediaRecorder = new MediaRecorder(stream, { mimeType: format });
          const chunks: Blob[] = [];

          mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
              chunks.push(event.data);
            }
          };

          mediaRecorder.onstop = () => {
            const blob = new Blob(chunks, { type: format });
            setTestResults({
              status: '测试成功',
              format: format,
              size: blob.size,
              type: blob.type,
              error: null
            });
          };

          mediaRecorder.start();
          
          // 录制2秒
          setTimeout(() => {
            mediaRecorder.stop();
            stream.getTracks().forEach(track => track.stop());
          }, 2000);

          break; // 成功就退出循环
        } catch (formatError) {
          console.error(`格式 ${format} 测试失败:`, formatError);
          continue;
        }
      }
    } catch (error) {
      setTestResults({
        status: '测试失败',
        error: error instanceof Error ? error.message : '未知错误'
      });
    }
  };

  return (
    <>
      <Head>
        <title>音频格式调试 - Vomage</title>
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h1 className="text-2xl font-bold mb-6">音频格式调试工具</h1>

            {/* 设备信息 */}
            <div className="mb-6">
              <h2 className="text-lg font-semibold mb-3">设备信息</h2>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                  <div><strong>平台:</strong> {deviceInfo.platform}</div>
                  <div><strong>是否iOS:</strong> {deviceInfo.isIOS ? '是' : '否'}</div>
                  <div><strong>是否Safari:</strong> {deviceInfo.isSafari ? '是' : '否'}</div>
                  <div><strong>安全上下文:</strong> {deviceInfo.isSecureContext ? '是' : '否'}</div>
                  <div><strong>支持MediaDevices:</strong> {deviceInfo.hasMediaDevices ? '是' : '否'}</div>
                  <div><strong>支持getUserMedia:</strong> {deviceInfo.hasGetUserMedia ? '是' : '否'}</div>
                </div>
                <div className="mt-2">
                  <strong>User Agent:</strong>
                  <div className="text-xs text-gray-600 mt-1 break-all">
                    {deviceInfo.userAgent}
                  </div>
                </div>
              </div>
            </div>

            {/* 支持的格式 */}
            <div className="mb-6">
              <h2 className="text-lg font-semibold mb-3">支持的音频格式</h2>
              <div className="bg-gray-50 p-4 rounded-lg">
                {supportedFormats.length > 0 ? (
                  <ul className="space-y-1">
                    {supportedFormats.map((format, index) => (
                      <li key={index} className="text-sm">
                        ✅ {format}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-red-600">❌ 没有找到支持的音频格式</p>
                )}
              </div>
            </div>

            {/* 录音测试 */}
            <div className="mb-6">
              <h2 className="text-lg font-semibold mb-3">录音测试</h2>
              <button
                onClick={testRecording}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                开始测试录音
              </button>
              
              {testResults.status && (
                <div className="mt-4 bg-gray-50 p-4 rounded-lg">
                  <div><strong>状态:</strong> {testResults.status}</div>
                  {testResults.format && <div><strong>使用格式:</strong> {testResults.format}</div>}
                  {testResults.size && <div><strong>文件大小:</strong> {testResults.size} bytes</div>}
                  {testResults.type && <div><strong>实际类型:</strong> {testResults.type}</div>}
                  {testResults.error && (
                    <div className="text-red-600">
                      <strong>错误:</strong> {testResults.error}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 返回主页 */}
            <div className="text-center">
              <a
                href="/"
                className="text-blue-600 hover:text-blue-800 underline"
              >
                返回主页
              </a>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
