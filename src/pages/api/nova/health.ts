/**
 * Amazon Nova服务健康检查API
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { novaSonicService } from '@/services/novaSonicService';
import { novaCanvasService } from '@/services/novaCanvasService';
import { getNovaConfig, validateNovaConfig, getServiceStatus } from '@/config/novaConfig';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
    });
  }

  try {
    console.log('开始Nova服务健康检查...');
    
    const config = getNovaConfig();
    const validation = validateNovaConfig(config);
    const serviceStatus = getServiceStatus();
    
    const healthCheck = {
      timestamp: new Date().toISOString(),
      config: {
        valid: validation.valid,
        errors: validation.errors,
      },
      services: {
        novaSonic: {
          status: serviceStatus.novaSonic,
          enabled: config.features.enableNovaSonic,
          modelId: 'amazon.transcribe + claude-3-haiku', // 实际使用的服务
          healthy: false,
          error: null as string | null,
        },
        novaCanvas: {
          status: serviceStatus.novaCanvas,
          enabled: config.features.enableNovaCanvas,
          modelId: 'amazon.titan-image-generator-v1:0', // 实际使用的模型
          healthy: false,
          error: null as string | null,
        },
        storage: {
          status: serviceStatus.storage,
          bucketName: config.storage.audioBucket, // 使用音频桶名称
          imageBucket: config.storage.imageBucket, // 添加图片桶名称
          region: config.storage.region,
        },
      },
      overall: {
        healthy: false,
        message: '',
      },
    };

    // 检查Nova Sonic服务 (实际是Transcribe + Claude)
    if (config.features.enableNovaSonic && validation.valid) {
      try {
        console.log('检查Nova Sonic服务健康状态...');
        const sonicHealthy = await novaSonicService.checkServiceHealth();
        healthCheck.services.novaSonic.healthy = sonicHealthy;
        if (!sonicHealthy) {
          healthCheck.services.novaSonic.error = 'Claude service not responding';
        }
        console.log('Nova Sonic健康检查结果:', sonicHealthy);
      } catch (error) {
        console.error('Nova Sonic健康检查失败:', error);
        healthCheck.services.novaSonic.healthy = false;
        healthCheck.services.novaSonic.error = error instanceof Error ? error.message : 'Unknown error';
      }
    } else {
      healthCheck.services.novaSonic.error = 'Service disabled or config invalid';
    }

    // 检查Nova Canvas服务 (实际是Titan Image Generator)
    if (config.features.enableNovaCanvas && validation.valid) {
      try {
        console.log('检查Nova Canvas服务健康状态...');
        const canvasHealthy = await novaCanvasService.checkServiceHealth();
        healthCheck.services.novaCanvas.healthy = canvasHealthy;
        if (!canvasHealthy) {
          healthCheck.services.novaCanvas.error = 'Titan Image Generator not responding';
        }
        console.log('Nova Canvas健康检查结果:', canvasHealthy);
      } catch (error) {
        console.error('Nova Canvas健康检查失败:', error);
        healthCheck.services.novaCanvas.healthy = false;
        healthCheck.services.novaCanvas.error = error instanceof Error ? error.message : 'Unknown error';
      }
    } else {
      healthCheck.services.novaCanvas.error = 'Service disabled or config invalid';
    }

    // 计算整体健康状态
    const sonicOk = !config.features.enableNovaSonic || healthCheck.services.novaSonic.healthy;
    const canvasOk = !config.features.enableNovaCanvas || healthCheck.services.novaCanvas.healthy;
    
    healthCheck.overall.healthy = validation.valid && sonicOk && canvasOk;
    
    if (!validation.valid) {
      healthCheck.overall.message = 'Configuration errors: ' + validation.errors.join(', ');
    } else if (!sonicOk) {
      healthCheck.overall.message = 'Nova Sonic (Transcribe + Claude) service unavailable';
    } else if (!canvasOk) {
      healthCheck.overall.message = 'Nova Canvas (Titan Image Generator) service unavailable';
    } else {
      healthCheck.overall.message = 'All services healthy';
    }

    console.log('Nova服务健康检查完成:', healthCheck);

    res.status(200).json({
      success: true,
      data: healthCheck,
    });

  } catch (error) {
    console.error('Nova健康检查失败:', error);
    
    res.status(500).json({
      success: false,
      error: {
        message: 'Health check failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
}
