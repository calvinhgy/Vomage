import React, { useState } from 'react';
import Head from 'next/head';
import Image from 'next/image';

export default function TestPage() {
  const [transcript, setTranscript] = useState<string>('');
  const [sentiment, setSentiment] = useState<any>(null);
  const [generatedImage, setGeneratedImage] = useState<any>(null);

  const handleTest = () => {
    console.log('开始测试...');
    
    // 设置测试数据
    const testTranscript = '这是一个测试语音转录内容，用来验证功能是否正常工作。';
    const testSentiment = {
      mood: 'happy',
      confidence: 0.85,
      details: {
        positive: 0.8,
        negative: 0.1,
        neutral: 0.1,
      },
      keywords: ['测试', '功能', '正常'],
      reasoning: '基于测试内容分析，检测到积极情感',
      processedAt: new Date(),
    };
    const testImage = {
      id: 'test-img-1',
      voiceRecordId: 'test-voice-1',
      url: '/images/mood-happy.svg',
      prompt: '测试图片生成',
      style: 'abstract',
      createdAt: new Date(),
    };

    console.log('设置测试数据...');
    setTranscript(testTranscript);
    setSentiment(testSentiment);
    setGeneratedImage(testImage);
    
    console.log('测试数据设置完成');
  };

  const handleClear = () => {
    setTranscript('');
    setSentiment(null);
    setGeneratedImage(null);
  };

  return (
    <>
      <Head>
        <title>功能测试 - Vomage</title>
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4">
        <div className="max-w-md mx-auto space-y-6">
          <div className="card p-6 text-center">
            <h1 className="text-2xl font-bold mb-4">功能测试页面</h1>
            
            <div className="space-y-4">
              <button
                onClick={handleTest}
                className="btn btn-primary w-full"
              >
                测试功能
              </button>
              
              <button
                onClick={handleClear}
                className="btn btn-secondary w-full"
              >
                清除数据
              </button>
            </div>
          </div>

          {/* 调试信息 */}
          <div className="card p-4 bg-gray-100 text-xs">
            <h3 className="font-bold mb-2">调试信息</h3>
            <p>转录文本: {transcript ? '✅' : '❌'} ({transcript?.length || 0} 字符)</p>
            <p>情感分析: {sentiment ? '✅' : '❌'} (心情: {sentiment?.mood || 'N/A'})</p>
            <p>生成图片: {generatedImage ? '✅' : '❌'} (URL: {generatedImage?.url || 'N/A'})</p>
          </div>

          {/* 转录结果 */}
          {transcript && (
            <div className="card p-4">
              <h3 className="text-sm font-medium mb-2">语音内容</h3>
              <p className="text-neutral-700 text-sm bg-neutral-50 p-3 rounded">
                "{transcript}"
              </p>
            </div>
          )}

          {/* 情感分析结果 */}
          {sentiment && (
            <div className="card p-4">
              <h3 className="text-sm font-medium mb-2">情感分析</h3>
              <div className="space-y-2">
                <p><strong>心情:</strong> {sentiment.mood}</p>
                <p><strong>置信度:</strong> {(sentiment.confidence * 100).toFixed(1)}%</p>
                <p><strong>关键词:</strong> {sentiment.keywords.join(', ')}</p>
              </div>
            </div>
          )}

          {/* 生成的图片 */}
          {generatedImage && (
            <div className="card p-4">
              <h3 className="text-lg font-semibold mb-2">心情图片</h3>
              <div className="relative aspect-square bg-neutral-100 rounded-lg overflow-hidden">
                <Image
                  src={generatedImage.url}
                  alt="Test mood image"
                  fill
                  className="object-cover"
                  unoptimized={generatedImage.url.endsWith('.svg')}
                />
              </div>
              <div className="mt-2">
                <p className="text-xs text-neutral-600">
                  {generatedImage.prompt}
                </p>
              </div>
            </div>
          )}

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
    </>
  );
}
