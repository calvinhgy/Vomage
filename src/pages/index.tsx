import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { RecordButton } from '@/components/RecordButton';
import { AudioPlayer } from '@/components/AudioPlayer';
import { SentimentDisplay } from '@/components/SentimentDisplay';
import { ImageGenerator } from '@/components/ImageGenerator';
import { ContextDisplay } from '@/components/ContextDisplay';
import { useAppStore } from '@/store/useAppStore';
import { AIService } from '@/services/aiService';
import { ContextService } from '@/services/contextService';
import { VoiceRecord, SentimentAnalysis, GeneratedImage } from '@/types';

export default function HomePage() {
  const { 
    recording, 
    context,
    setLocation,
    setWeather,
    addNotification, 
    setLoading, 
    setError,
    clearError 
  } = useAppStore();

  const [transcript, setTranscript] = useState<string>('');
  const [sentiment, setSentiment] = useState<SentimentAnalysis | null>(null);
  const [generatedImage, setGeneratedImage] = useState<GeneratedImage | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStage, setProcessingStage] = useState<string>('');

  // 初始化上下文信息
  useEffect(() => {
    const initializeContext = async () => {
      try {
        // 尝试获取缓存的上下文
        const cachedContext = ContextService.getCachedContext();
        if (cachedContext) {
          if (cachedContext.location) setLocation(cachedContext.location);
          if (cachedContext.weather) setWeather(cachedContext.weather);
          return;
        }

        // 获取新的上下文信息
        const fullContext = await ContextService.getFullContext();
        if (fullContext.location) setLocation(fullContext.location);
        if (fullContext.weather) setWeather(fullContext.weather);
        
        // 缓存上下文信息
        ContextService.cacheContext(fullContext);
      } catch (error) {
        console.warn('初始化上下文失败:', error);
      }
    };

    initializeContext();
  }, [setLocation, setWeather]);

  // 处理录音完成
  const handleRecordingComplete = async (audioBlob: Blob) => {
    setIsProcessing(true);
    setError(null);
    clearError();

    try {
      setProcessingStage('正在处理语音...');
      addNotification({
        type: 'info',
        message: '开始处理你的录音',
        duration: 3000,
      });

      // 使用 AI 服务处理语音 (暂时使用模拟服务)
      const result = await AIService.processVoice(audioBlob, context, {
        enableImageGeneration: true,
        imageStyle: 'abstract',
        timeout: 120000, // 2分钟超时
      });

      // 更新状态
      setTranscript(result.transcript);
      setSentiment(result.sentiment);
      
      if (result.generatedImage) {
        setGeneratedImage(result.generatedImage);
      }

      addNotification({
        type: 'success',
        message: '处理完成！',
        duration: 3000,
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '处理失败';
      setError(errorMessage);
      addNotification({
        type: 'error',
        message: errorMessage,
        duration: 5000,
      });
    } finally {
      setIsProcessing(false);
      setProcessingStage('');
    }
  };

  // 重新开始
  const handleReset = () => {
    setTranscript('');
    setSentiment(null);
    setGeneratedImage(null);
    setIsProcessing(false);
    setProcessingStage('');
    clearError();
  };

  // 重新生成图片
  const handleRegenerateImage = async () => {
    if (!sentiment || !transcript) return;

    try {
      setIsProcessing(true);
      setProcessingStage('重新生成图片...');

      const newImage = await AIService.generateImageOnly(
        transcript,
        sentiment,
        context,
        'abstract'
      );

      setGeneratedImage(newImage);
      
      addNotification({
        type: 'success',
        message: '新图片生成完成！',
        duration: 2000,
      });
    } catch (error) {
      addNotification({
        type: 'error',
        message: '重新生成失败',
        duration: 3000,
      });
    } finally {
      setIsProcessing(false);
      setProcessingStage('');
    }
  };

  return (
    <>
      <Head>
        <title>Vomage - 语音心情分享</title>
        <meta name="description" content="通过语音记录和分享你的心情" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
        {/* 头部 */}
        <header className="safe-top bg-white/80 backdrop-blur-sm border-b border-neutral-200">
          <div className="max-w-md mx-auto px-4 py-4">
            <h1 className="text-2xl font-bold text-center bg-gradient-primary bg-clip-text text-transparent">
              Vomage
            </h1>
            <p className="text-sm text-neutral-600 text-center mt-1">
              用声音记录心情
            </p>
          </div>
        </header>

        {/* 主要内容 */}
        <main className="max-w-md mx-auto px-4 py-6 space-y-6">
          {/* 上下文信息 */}
          <ContextDisplay context={context} />

          {/* 录音区域 */}
          <div className="card p-6 text-center">
            <h2 className="text-lg font-semibold mb-4">
              {recording.isRecording ? '正在录音...' : '记录你的心情'}
            </h2>
            
            <RecordButton
              onRecordingComplete={handleRecordingComplete}
              className="mx-auto"
            />

            {recording.audioUrl && !recording.isRecording && (
              <div className="mt-4">
                <AudioPlayer audioUrl={recording.audioUrl} />
              </div>
            )}
          </div>

          {/* 处理状态 */}
          {isProcessing && (
            <div className="card p-6 text-center">
              <div className="loading-spinner w-8 h-8 mx-auto mb-4" />
              <p className="text-neutral-600 mb-2">
                {processingStage || '正在处理你的录音...'}
              </p>
              <div className="text-xs text-neutral-500">
                这可能需要几分钟时间，请耐心等待
              </div>
            </div>
          )}

          {/* 转录结果 */}
          {transcript && !isProcessing && (
            <div className="card p-4">
              <h3 className="text-sm font-medium mb-2">语音内容</h3>
              <p className="text-neutral-700 text-sm bg-neutral-50 p-3 rounded">
                "{transcript}"
              </p>
            </div>
          )}

          {/* 情感分析结果 */}
          {sentiment && (
            <SentimentDisplay sentiment={sentiment} />
          )}

          {/* 生成的图片 */}
          {generatedImage && (
            <ImageGenerator image={generatedImage} />
          )}

          {/* 操作按钮 */}
          {(transcript || sentiment || generatedImage) && !isProcessing && (
            <div className="space-y-3">
              <div className="flex space-x-4">
                <button
                  onClick={handleReset}
                  className="btn btn-secondary flex-1"
                >
                  重新开始
                </button>
                
                {generatedImage && (
                  <button
                    onClick={() => {
                      // 分享功能
                      if (navigator.share) {
                        navigator.share({
                          title: 'Vomage - 我的心情',
                          text: `我的心情是${sentiment?.mood}`,
                          url: window.location.href,
                        });
                      } else {
                        addNotification({
                          type: 'info',
                          message: '分享功能暂不可用',
                          duration: 2000,
                        });
                      }
                    }}
                    className="btn btn-primary flex-1"
                  >
                    分享
                  </button>
                )}
              </div>

              {/* 重新生成图片按钮 */}
              {sentiment && (
                <button
                  onClick={handleRegenerateImage}
                  className="btn btn-ghost w-full text-sm"
                  disabled={isProcessing}
                >
                  {generatedImage ? '重新生成图片' : '生成图片'}
                </button>
              )}
            </div>
          )}
        </main>

        {/* 底部导航占位 */}
        <div className="safe-bottom h-16" />
      </div>
    </>
  );
}
