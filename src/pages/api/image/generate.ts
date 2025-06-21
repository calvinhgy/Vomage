import { NextApiRequest, NextApiResponse } from 'next';
import { BedrockNovaService } from '@/services/bedrockNova';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🎨 收到图片生成请求');
    
    const { prompt, style = 'photorealistic', width = 512, height = 512, quality = 'standard' } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: '缺少prompt参数' });
    }

    console.log('📝 图片生成参数:', {
      prompt: prompt.substring(0, 100) + (prompt.length > 100 ? '...' : ''),
      style,
      width,
      height,
      quality
    });

    // 调用Bedrock Nova Canvas服务
    const result = await BedrockNovaService.generateImage({
      prompt,
      style,
      width,
      height,
      quality
    });

    console.log('✅ 图片生成成功');
    
    return res.status(200).json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('❌ 图片生成API失败:', error);
    
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '图片生成失败'
    });
  }
}
