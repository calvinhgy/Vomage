/**
 * Amazon Nova服务配置
 */

export interface NovaConfig {
  // AWS基础配置
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  
  // Bedrock配置
  bedrockRegion: string;
  
  // Nova Sonic配置
  sonic: {
    modelId: string;
    transcribeLanguage: string;
    maxAudioSize: number;
    timeoutMs: number;
  };
  
  // Nova Canvas配置
  canvas: {
    modelId: string;
    defaultStyle: string;
    imageSize: {
      width: number;
      height: number;
    };
    quality: 'standard' | 'premium';
    maxImages: number;
  };
  
  // S3存储配置
  storage: {
    bucketName: string;
    region: string;
    audioBucket: string;
    imageBucket: string;
  };
  
  // 服务开关
  features: {
    enableNovaSonic: boolean;
    enableNovaCanvas: boolean;
    fallbackToLocal: boolean;
    enableHealthCheck: boolean;
  };
}

/**
 * 获取Nova服务配置
 */
export function getNovaConfig(): NovaConfig {
  return {
    // AWS基础配置
    region: process.env.AWS_REGION || 'us-east-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    
    // Bedrock配置
    bedrockRegion: process.env.BEDROCK_REGION || 'us-east-1',
    
    // Nova Sonic配置
    sonic: {
      modelId: process.env.NOVA_SONIC_MODEL_ID || 'amazon.nova-lite-v1:0',
      transcribeLanguage: process.env.TRANSCRIBE_LANGUAGE || 'zh-CN',
      maxAudioSize: parseInt(process.env.MAX_AUDIO_SIZE || '25') * 1024 * 1024, // 25MB
      timeoutMs: parseInt(process.env.NOVA_TIMEOUT_MS || '300000'), // 5分钟
    },
    
    // Nova Canvas配置
    canvas: {
      modelId: process.env.NOVA_CANVAS_MODEL_ID || 'amazon.nova-canvas-v1:0',
      defaultStyle: process.env.NOVA_DEFAULT_STYLE || 'abstract',
      imageSize: {
        width: parseInt(process.env.NOVA_IMAGE_WIDTH || '512'),
        height: parseInt(process.env.NOVA_IMAGE_HEIGHT || '512'),
      },
      quality: (process.env.NOVA_IMAGE_QUALITY as 'standard' | 'premium') || 'premium',
      maxImages: parseInt(process.env.NOVA_MAX_IMAGES || '3'),
    },
    
    // S3存储配置
    storage: {
      bucketName: process.env.AWS_S3_BUCKET_NAME || 'vomage-storage',
      region: process.env.AWS_S3_REGION || 'us-east-1',
      audioBucket: process.env.AWS_S3_AUDIO_BUCKET || 'vomage-audio',
      imageBucket: process.env.AWS_S3_IMAGE_BUCKET || 'vomage-images',
    },
    
    // 服务开关
    features: {
      enableNovaSonic: process.env.ENABLE_NOVA_SONIC === 'true',
      enableNovaCanvas: process.env.ENABLE_NOVA_CANVAS === 'true',
      fallbackToLocal: process.env.FALLBACK_TO_LOCAL !== 'false', // 默认启用备用方案
      enableHealthCheck: process.env.ENABLE_HEALTH_CHECK !== 'false', // 默认启用健康检查
    },
  };
}

/**
 * 验证Nova配置
 */
export function validateNovaConfig(config: NovaConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // 检查AWS凭证
  if (!config.accessKeyId || config.accessKeyId === 'demo-key') {
    errors.push('AWS Access Key ID未配置或使用演示值');
  }
  
  if (!config.secretAccessKey || config.secretAccessKey === 'demo-secret') {
    errors.push('AWS Secret Access Key未配置或使用演示值');
  }
  
  // 检查必要的配置
  if (!config.region) {
    errors.push('AWS Region未配置');
  }
  
  if (!config.storage.bucketName) {
    errors.push('S3 Bucket名称未配置');
  }
  
  // 检查模型ID
  if (config.features.enableNovaSonic && !config.sonic.modelId) {
    errors.push('Nova Sonic模型ID未配置');
  }
  
  if (config.features.enableNovaCanvas && !config.canvas.modelId) {
    errors.push('Nova Canvas模型ID未配置');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * 获取服务状态
 */
export function getServiceStatus(): {
  novaSonic: 'enabled' | 'disabled' | 'demo';
  novaCanvas: 'enabled' | 'disabled' | 'demo';
  storage: 'aws' | 'local';
} {
  const config = getNovaConfig();
  const validation = validateNovaConfig(config);
  
  return {
    novaSonic: validation.valid && config.features.enableNovaSonic 
      ? 'enabled' 
      : config.accessKeyId === 'demo-key' 
        ? 'demo' 
        : 'disabled',
    novaCanvas: validation.valid && config.features.enableNovaCanvas 
      ? 'enabled' 
      : config.accessKeyId === 'demo-key' 
        ? 'demo' 
        : 'disabled',
    storage: validation.valid ? 'aws' : 'local',
  };
}
