/**
 * AI服务测试API
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { AIService } from '@/services/aiService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 创建一个模拟的音频Blob
    const mockAudioData = new Uint8Array(1024 * 10); // 10KB的模拟音频数据
    mockAudioData.fill(128); // 填充一些数据
    
    const mockAudioBlob = new Blob([mockAudioData], { type: 'audio/webm' });

    console.log('开始测试AI服务...');
    console.log('模拟音频大小:', mockAudioBlob.size, 'bytes');

    // 调用AI服务
    const result = await AIService.processVoice(mockAudioBlob, undefined, {
      enableImageGeneration: true,
      imageStyle: 'abstract',
      useAmazonServices: false, // 强制使用模拟服务
    });

    console.log('AI服务测试结果:', result);

    res.status(200).json({
      success: true,
      data: {
        transcript: result.transcript,
        sentiment: result.sentiment,
        imagePrompt: result.imagePrompt,
        hasGeneratedImage: !!result.generatedImage,
        generatedImageUrl: result.generatedImage?.url,
      },
    });
  } catch (error) {
    console.error('AI服务测试失败:', error);
    
    res.status(500).json({
      success: false,
      error: {
        message: error instanceof Error ? error.message : '测试失败',
        stack: error instanceof Error ? error.stack : undefined,
      },
    });
  }
}
