/**
 * PNG图片生成服务
 * 生成高质量的PNG格式图片，而不是简单的SVG色块
 */

export interface PNGGenerationRequest {
  prompt: string;
  width?: number;
  height?: number;
  style?: string;
}

export interface PNGGenerationResponse {
  imageUrl: string;
  imageData: string;
  metadata: {
    prompt: string;
    style: string;
    dimensions: { width: number; height: number };
    generatedAt: Date;
  };
}

export class PNGGenerator {
  /**
   * 生成高质量PNG图片
   */
  static async generatePNG(request: PNGGenerationRequest): Promise<PNGGenerationResponse> {
    const {
      prompt,
      width = 512,
      height = 512,
      style = 'abstract'
    } = request;

    console.log('🎨 开始生成PNG图片:', { prompt: prompt.substring(0, 100), width, height, style });

    // 创建Canvas来生成真实的PNG图片
    const canvas = this.createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('无法创建Canvas上下文');
    }

    // 基于提示词内容生成图片
    await this.drawImageContent(ctx, width, height, prompt, style);

    // 转换为PNG格式
    const pngDataUrl = canvas.toDataURL('image/png', 0.9);
    const base64Data = pngDataUrl.split(',')[1];

    console.log('✅ PNG图片生成完成，大小:', base64Data.length, '字符');

    return {
      imageUrl: pngDataUrl,
      imageData: base64Data,
      metadata: {
        prompt,
        style,
        dimensions: { width, height },
        generatedAt: new Date()
      }
    };
  }

  /**
   * 创建Canvas元素
   */
  private static createCanvas(width: number, height: number): HTMLCanvasElement {
    // 在Node.js环境中，我们需要使用canvas库
    // 这里先创建一个模拟的Canvas
    if (typeof window !== 'undefined') {
      // 浏览器环境
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      return canvas;
    } else {
      // Node.js环境 - 使用node-canvas库
      const { createCanvas } = require('canvas');
      return createCanvas(width, height);
    }
  }

  /**
   * 基于提示词内容绘制图片
   */
  private static async drawImageContent(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    prompt: string,
    style: string
  ): Promise<void> {
    const lowerPrompt = prompt.toLowerCase();

    // 清空画布
    ctx.clearRect(0, 0, width, height);

    // 根据提示词内容选择绘制方法
    if (lowerPrompt.includes('blue sky') || lowerPrompt.includes('蓝天')) {
      await this.drawSkyScene(ctx, width, height, prompt);
    } else if (lowerPrompt.includes('green mountains') || lowerPrompt.includes('青山')) {
      await this.drawMountainScene(ctx, width, height, prompt);
    } else if (lowerPrompt.includes('ocean') || lowerPrompt.includes('sea') || lowerPrompt.includes('海')) {
      await this.drawOceanScene(ctx, width, height, prompt);
    } else if (lowerPrompt.includes('sunlight') || lowerPrompt.includes('阳光')) {
      await this.drawSunlightScene(ctx, width, height, prompt);
    } else if (lowerPrompt.includes('flowers') || lowerPrompt.includes('花')) {
      await this.drawFlowerScene(ctx, width, height, prompt);
    } else {
      await this.drawAbstractScene(ctx, width, height, prompt);
    }

    // 添加提示词文本
    this.addPromptText(ctx, width, height, prompt);
  }

  /**
   * 绘制天空场景
   */
  private static async drawSkyScene(ctx: CanvasRenderingContext2D, width: number, height: number, prompt: string): Promise<void> {
    // 天空渐变背景
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#87CEEB'); // 天蓝色
    gradient.addColorStop(0.7, '#4169E1'); // 皇家蓝
    gradient.addColorStop(1, '#191970'); // 午夜蓝

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // 绘制云朵
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    this.drawCloud(ctx, width * 0.2, height * 0.3, 80);
    this.drawCloud(ctx, width * 0.6, height * 0.25, 100);
    this.drawCloud(ctx, width * 0.8, height * 0.4, 60);

    // 添加太阳
    if (prompt.includes('sun') || prompt.includes('阳光')) {
      ctx.fillStyle = 'rgba(255, 215, 0, 0.9)';
      ctx.beginPath();
      ctx.arc(width * 0.8, height * 0.2, 40, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /**
   * 绘制山脉场景
   */
  private static async drawMountainScene(ctx: CanvasRenderingContext2D, width: number, height: number, prompt: string): Promise<void> {
    // 天空背景
    const skyGradient = ctx.createLinearGradient(0, 0, 0, height * 0.6);
    skyGradient.addColorStop(0, '#87CEEB');
    skyGradient.addColorStop(1, '#98FB98');

    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, width, height * 0.6);

    // 远山
    ctx.fillStyle = 'rgba(34, 139, 34, 0.6)';
    this.drawMountain(ctx, 0, height * 0.4, width, height * 0.3);

    // 近山
    ctx.fillStyle = 'rgba(34, 139, 34, 0.8)';
    this.drawMountain(ctx, 0, height * 0.5, width, height * 0.4);

    // 前景山
    ctx.fillStyle = 'rgba(0, 100, 0, 1)';
    this.drawMountain(ctx, 0, height * 0.6, width, height * 0.3);

    // 如果提示词包含水，添加水面
    if (prompt.includes('water') || prompt.includes('水')) {
      const waterGradient = ctx.createLinearGradient(0, height * 0.8, 0, height);
      waterGradient.addColorStop(0, 'rgba(0, 191, 255, 0.8)');
      waterGradient.addColorStop(1, 'rgba(0, 100, 148, 0.9)');
      
      ctx.fillStyle = waterGradient;
      ctx.fillRect(0, height * 0.8, width, height * 0.2);
    }
  }

  /**
   * 绘制海洋场景
   */
  private static async drawOceanScene(ctx: CanvasRenderingContext2D, width: number, height: number, prompt: string): Promise<void> {
    // 海洋渐变
    const oceanGradient = ctx.createLinearGradient(0, 0, 0, height);
    oceanGradient.addColorStop(0, '#87CEEB'); // 天蓝色
    oceanGradient.addColorStop(0.3, '#4682B4'); // 钢蓝色
    oceanGradient.addColorStop(0.7, '#006994'); // 深海蓝
    oceanGradient.addColorStop(1, '#003366'); // 深蓝色

    ctx.fillStyle = oceanGradient;
    ctx.fillRect(0, 0, width, height);

    // 绘制波浪
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 3;
    this.drawWave(ctx, width, height * 0.4, 0.3);
    
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 2;
    this.drawWave(ctx, width, height * 0.5, 0.4);
    
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    this.drawWave(ctx, width, height * 0.6, 0.5);
  }

  /**
   * 绘制阳光场景
   */
  private static async drawSunlightScene(ctx: CanvasRenderingContext2D, width: number, height: number, prompt: string): Promise<void> {
    // 阳光渐变背景
    const sunGradient = ctx.createRadialGradient(width * 0.7, height * 0.3, 0, width * 0.7, height * 0.3, width * 0.8);
    sunGradient.addColorStop(0, '#FFD700'); // 金色
    sunGradient.addColorStop(0.3, '#FFA500'); // 橙色
    sunGradient.addColorStop(0.6, '#FF8C00'); // 深橙色
    sunGradient.addColorStop(1, '#FF6347'); // 番茄红

    ctx.fillStyle = sunGradient;
    ctx.fillRect(0, 0, width, height);

    // 绘制太阳
    ctx.fillStyle = '#FFFF00';
    ctx.beginPath();
    ctx.arc(width * 0.7, height * 0.3, 60, 0, Math.PI * 2);
    ctx.fill();

    // 绘制光线
    ctx.strokeStyle = 'rgba(255, 255, 0, 0.6)';
    ctx.lineWidth = 4;
    for (let i = 0; i < 12; i++) {
      const angle = (i * Math.PI * 2) / 12;
      const startX = width * 0.7 + Math.cos(angle) * 80;
      const startY = height * 0.3 + Math.sin(angle) * 80;
      const endX = width * 0.7 + Math.cos(angle) * 120;
      const endY = height * 0.3 + Math.sin(angle) * 120;
      
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
    }
  }

  /**
   * 绘制花朵场景
   */
  private static async drawFlowerScene(ctx: CanvasRenderingContext2D, width: number, height: number, prompt: string): Promise<void> {
    // 花园背景
    const gardenGradient = ctx.createLinearGradient(0, 0, 0, height);
    gardenGradient.addColorStop(0, '#98FB98'); // 浅绿色
    gardenGradient.addColorStop(0.7, '#90EE90'); // 浅绿色
    gardenGradient.addColorStop(1, '#228B22'); // 森林绿

    ctx.fillStyle = gardenGradient;
    ctx.fillRect(0, 0, width, height);

    // 绘制花朵
    const flowerColors = ['#FF69B4', '#FFB6C1', '#FFC0CB', '#FF1493', '#DC143C'];
    
    for (let i = 0; i < 8; i++) {
      const x = Math.random() * width;
      const y = height * 0.4 + Math.random() * height * 0.5;
      const color = flowerColors[Math.floor(Math.random() * flowerColors.length)];
      this.drawFlower(ctx, x, y, color);
    }
  }

  /**
   * 绘制抽象场景
   */
  private static async drawAbstractScene(ctx: CanvasRenderingContext2D, width: number, height: number, prompt: string): Promise<void> {
    // 抽象渐变背景
    const abstractGradient = ctx.createLinearGradient(0, 0, width, height);
    abstractGradient.addColorStop(0, '#DDA0DD'); // 紫色
    abstractGradient.addColorStop(0.5, '#DA70D6'); // 兰花紫
    abstractGradient.addColorStop(1, '#9370DB'); // 中紫色

    ctx.fillStyle = abstractGradient;
    ctx.fillRect(0, 0, width, height);

    // 添加抽象形状
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.beginPath();
    ctx.arc(width * 0.3, height * 0.3, 80, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.fillRect(width * 0.5, height * 0.2, 100, 100);
  }

  // 辅助绘制方法
  private static drawCloud(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
    ctx.beginPath();
    ctx.arc(x, y, size * 0.5, 0, Math.PI * 2);
    ctx.arc(x + size * 0.3, y, size * 0.4, 0, Math.PI * 2);
    ctx.arc(x - size * 0.3, y, size * 0.4, 0, Math.PI * 2);
    ctx.arc(x, y - size * 0.3, size * 0.3, 0, Math.PI * 2);
    ctx.fill();
  }

  private static drawMountain(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number): void {
    ctx.beginPath();
    ctx.moveTo(x, y + height);
    ctx.lineTo(x + width * 0.2, y);
    ctx.lineTo(x + width * 0.4, y + height * 0.3);
    ctx.lineTo(x + width * 0.6, y + height * 0.1);
    ctx.lineTo(x + width * 0.8, y + height * 0.4);
    ctx.lineTo(x + width, y);
    ctx.lineTo(x + width, y + height);
    ctx.closePath();
    ctx.fill();
  }

  private static drawWave(ctx: CanvasRenderingContext2D, width: number, y: number, amplitude: number): void {
    ctx.beginPath();
    ctx.moveTo(0, y);
    
    for (let x = 0; x <= width; x += 10) {
      const waveY = y + Math.sin((x / width) * Math.PI * 4) * amplitude * 20;
      ctx.lineTo(x, waveY);
    }
    
    ctx.stroke();
  }

  private static drawFlower(ctx: CanvasRenderingContext2D, x: number, y: number, color: string): void {
    // 花瓣
    ctx.fillStyle = color;
    for (let i = 0; i < 5; i++) {
      const angle = (i * Math.PI * 2) / 5;
      const petalX = x + Math.cos(angle) * 15;
      const petalY = y + Math.sin(angle) * 15;
      
      ctx.beginPath();
      ctx.ellipse(petalX, petalY, 8, 15, angle, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // 花心
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  private static addPromptText(ctx: CanvasRenderingContext2D, width: number, height: number, prompt: string): void {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.font = '12px Arial, sans-serif';
    ctx.textAlign = 'center';
    
    const text = prompt.length > 50 ? prompt.substring(0, 47) + '...' : prompt;
    ctx.fillText(text, width / 2, height - 10);
  }
}
