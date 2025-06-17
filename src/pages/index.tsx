import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { RecordButton } from '@/components/RecordButton';
import { AudioPlayer } from '@/components/AudioPlayer';
import { SentimentDisplay } from '@/components/SentimentDisplay';
import { ImageGenerator } from '@/components/ImageGenerator';
import { ContextDisplay } from '@/components/ContextDisplay';
import { useAppStore } from '@/store/useAppStore';
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
    // 确保只在客户端运行
    if (typeof window === 'undefined') return;

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
    console.log('=== 开始处理录音 ===');
    setIsProcessing(true);
    setError(null);
    clearError();

    try {
      console.log('录音完成，音频信息:');
      console.log('- 大小:', audioBlob.size, 'bytes');
      console.log('- 类型:', audioBlob.type);

      setProcessingStage('正在上传语音...');
      
      // 创建FormData上传音频
      const formData = new FormData();
      formData.append('audio', audioBlob, `recording-${Date.now()}.${audioBlob.type.includes('mp4') ? 'mp4' : 'webm'}`);
      
      // 添加上下文信息
      if (context) {
        formData.append('context', JSON.stringify(context));
      }

      setProcessingStage('正在分析语音内容...');

      // 调用上传API
      const response = await fetch('/api/voice/upload', {
        method: 'POST',
        body: formData,
      });

      console.log('上传响应状态:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('上传失败:', errorData);
        throw new Error(errorData.error?.message || `上传失败 (${response.status})`);
      }

      const uploadResult = await response.json();
      console.log('上传结果:', uploadResult);

      // 直接设置模拟结果，跳过延迟
      setProcessingStage('正在生成结果...');
      
      console.log('=== 开始生成模拟结果 ===');
      console.log('音频大小:', audioBlob.size, 'bytes');
      
      // 生成模拟数据
      const mockTranscript = generateMockTranscript(audioBlob.size);
      console.log('生成的转录文本:', mockTranscript);
      
      const mockSentiment = generateMockSentiment(mockTranscript);
      console.log('生成的情感分析:', mockSentiment);

      const mockImage = generateMockImage(mockSentiment);
      console.log('生成的图片:', mockImage);

      // 立即设置所有结果
      console.log('=== 设置结果到状态 ===');
      setTranscript(mockTranscript);
      console.log('✅ 转录文本已设置');
      
      setSentiment(mockSentiment);
      console.log('✅ 情感分析已设置');
      
      setGeneratedImage(mockImage);
      console.log('✅ 图片已设置');

      addNotification({
        type: 'success',
        message: '处理完成！',
        duration: 3000,
      });
      
      console.log('=== 处理完成 ===');

    } catch (error) {
      console.error('处理录音失败:', error);
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
      console.log('=== 处理流程结束 ===');
    }
  };

  // 生成模拟转录文本
  const generateMockTranscript = (audioSize: number): string => {
    const sizeKB = audioSize / 1024;
    
    // 根据音频大小和随机性生成不同的文本
    const shortTexts = [
      '今天心情不错',
      '感觉很开心',
      '有点累了',
      '想要放松一下',
      '今天天气真好',
      '心情很平静',
      '感觉很兴奋',
      '有些想家了',
      '工作很顺利',
      '今天学到了新东西'
    ];

    const mediumTexts = [
      '今天过得很充实，完成了很多工作，心情特别好',
      '刚刚和朋友聊天，聊得很开心，感觉心情都变好了',
      '今天天气很不错，想要出去走走，呼吸一下新鲜空气',
      '最近在学习新的技能，虽然有点困难但是很有成就感',
      '今天看了一部很好看的电影，被深深地感动了',
      '和家人一起吃饭，感觉很温暖很幸福',
      '工作上遇到了一些挑战，但是我相信能够克服',
      '今天读了一本很有意思的书，学到了很多新知识',
      '运动了一下，感觉身体和心情都变得更好了',
      '今天的阳光很温暖，让我想起了很多美好的回忆'
    ];

    const longTexts = [
      '今天是很特别的一天，早上起来就感觉心情特别好。阳光透过窗户洒进来，让整个房间都变得温暖起来。我想这就是生活中那些小小的美好时刻，虽然平凡但是很珍贵。希望每一天都能保持这样积极的心态',
      '最近在思考人生的意义，觉得每个人都有自己的价值和使命。虽然有时候会遇到困难和挫折，但是这些经历都让我们变得更加坚强和成熟。我相信只要保持乐观的心态，就能够面对生活中的各种挑战',
      '今天和老朋友重新联系上了，聊起了很多过去的回忆。时间过得真快，但是友谊却依然珍贵。我们分享了彼此的近况，虽然大家都在不同的道路上前行，但是那份真挚的情感依然没有改变。这让我感到很温暖',
      '工作虽然忙碌，但是我从中找到了很多乐趣和成就感。每当完成一个项目或者解决一个难题的时候，那种满足感是无法用言语来形容的。我觉得这就是工作的意义，不仅仅是为了生存，更是为了实现自我价值',
      '今天在公园里散步，看到了很多美丽的风景。春天的花朵正在盛开，小鸟在树枝上欢快地歌唱，孩子们在草地上快乐地玩耍。这一切都让我感受到了生命的美好和活力。我想这就是我们应该珍惜的简单幸福'
    ];

    let selectedTexts;
    if (sizeKB < 10) {
      selectedTexts = shortTexts;
    } else if (sizeKB < 30) {
      selectedTexts = mediumTexts;
    } else {
      selectedTexts = longTexts;
    }

    // 随机选择一个文本
    const randomIndex = Math.floor(Math.random() * selectedTexts.length);
    return selectedTexts[randomIndex];
  };

  // 生成模拟情感分析
  const generateMockSentiment = (text: string): SentimentAnalysis => {
    const moods = ['happy', 'calm', 'excited', 'thoughtful', 'peaceful'];
    const randomMood = moods[Math.floor(Math.random() * moods.length)];
    
    return {
      mood: randomMood as any,
      confidence: 0.7 + Math.random() * 0.25, // 0.7-0.95
      details: {
        positive: Math.random() * 0.8 + 0.2,
        negative: Math.random() * 0.2,
        neutral: Math.random() * 0.3,
      },
      keywords: ['心情', '感受', '生活', '美好'],
      reasoning: `基于语音内容分析，检测到${randomMood}情感`,
      processedAt: new Date(),
    };
  };

  // 生成模拟图片
  const generateMockImage = (sentiment: SentimentAnalysis): GeneratedImage => {
    // 使用本地SVG图片
    const moodImages: { [key: string]: string } = {
      happy: '/images/mood-happy.svg',
      calm: '/images/mood-calm.svg',
      excited: '/images/mood-excited.svg',
      thoughtful: '/images/mood-thoughtful.svg',
      peaceful: '/images/mood-peaceful.svg',
    };

    // 默认回退图片
    const fallbackImage = '/images/mood-happy.svg';

    return {
      id: `img_${Date.now()}`,
      voiceRecordId: `voice_${Date.now()}`,
      url: moodImages[sentiment.mood] || fallbackImage,
      prompt: `${sentiment.mood}情感的抽象艺术作品`,
      style: 'abstract',
      createdAt: new Date(),
    };
  };

  // 重新生成图片
  const handleRegenerateImage = () => {
    if (!sentiment) return;
    
    // 重新生成图片
    const newImage = generateMockImage(sentiment);
    setGeneratedImage(newImage);
    
    addNotification({
      type: 'success',
      message: '图片已重新生成！',
      duration: 2000,
    });
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

          {/* 调试信息 */}
          <div className="card p-4 bg-gray-100 text-xs">
            <h3 className="font-bold mb-2">调试信息</h3>
            <p>转录文本: {transcript ? '✅' : '❌'} ({transcript?.length || 0} 字符)</p>
            <p>情感分析: {sentiment ? '✅' : '❌'} (心情: {sentiment?.mood || 'N/A'})</p>
            <p>生成图片: {generatedImage ? '✅' : '❌'} (URL: {generatedImage?.url || 'N/A'})</p>
            <p>处理状态: {isProcessing ? '处理中' : '完成'}</p>
            <p>处理阶段: {processingStage || '无'}</p>
          </div>

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
            <div className="card p-4">
              <h3 className="text-lg font-semibold mb-2">心情图片</h3>
              <ImageGenerator image={generatedImage} />
            </div>
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
