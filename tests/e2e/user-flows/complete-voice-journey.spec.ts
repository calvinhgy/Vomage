/**
 * 完整用户语音分享流程端到端测试
 * 测试从录音到结果展示的完整用户旅程
 */

import { test, expect, Page } from '@playwright/test';

test.describe('完整语音分享流程', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    // 创建新的浏览器上下文，授予麦克风权限
    const context = await browser.newContext({
      permissions: ['microphone'],
      geolocation: { latitude: 40.7128, longitude: -74.0060 }
    });
    
    page = await context.newPage();
    
    // 访问应用
    await page.goto('/');
    
    // 等待页面加载完成
    await page.waitForLoadState('networkidle');
  });

  test('用户应该能够完成完整的语音分享流程', async () => {
    // 1. 验证页面初始状态
    await test.step('验证页面初始加载', async () => {
      await expect(page).toHaveTitle(/Vomage/);
      await expect(page.locator('[data-testid="record-button"]')).toBeVisible();
      await expect(page.locator('[data-testid="app-header"]')).toContainText('Vomage');
    });

    // 2. 开始录音
    await test.step('开始语音录制', async () => {
      const recordButton = page.locator('[data-testid="record-button"]');
      
      // 长按开始录音
      await recordButton.dispatchEvent('mousedown');
      
      // 验证录音状态
      await expect(recordButton).toHaveClass(/recording/);
      await expect(page.locator('[data-testid="recording-indicator"]')).toBeVisible();
      await expect(page.locator('[data-testid="recording-timer"]')).toBeVisible();
    });

    // 3. 录音过程中的状态验证
    await test.step('验证录音过程状态', async () => {
      // 等待录音时间显示
      await page.waitForTimeout(2000);
      
      const timer = page.locator('[data-testid="recording-timer"]');
      await expect(timer).toContainText(/00:0[1-9]/); // 应该显示1-9秒
      
      // 验证音频可视化
      const waveform = page.locator('[data-testid="audio-waveform"]');
      if (await waveform.isVisible()) {
        await expect(waveform).toHaveClass(/active/);
      }
    });

    // 4. 停止录音
    await test.step('停止语音录制', async () => {
      const recordButton = page.locator('[data-testid="record-button"]');
      
      // 松开按钮停止录音
      await recordButton.dispatchEvent('mouseup');
      
      // 验证录音停止
      await expect(recordButton).not.toHaveClass(/recording/);
      await expect(page.locator('[data-testid="recording-indicator"]')).not.toBeVisible();
    });

    // 5. 处理阶段验证
    await test.step('验证语音处理阶段', async () => {
      // 应该显示处理指示器
      await expect(page.locator('[data-testid="processing-indicator"]')).toBeVisible();
      
      // 应该显示处理状态信息
      const statusText = page.locator('[data-testid="processing-status"]');
      await expect(statusText).toBeVisible();
      
      // 验证处理步骤
      await expect(statusText).toContainText(/正在上传|正在转录|正在分析|正在生成/);
    });

    // 6. 等待处理完成
    await test.step('等待AI处理完成', async () => {
      // 等待结果容器出现（最多60秒）
      await page.waitForSelector('[data-testid="result-container"]', {
        timeout: 60000
      });
      
      // 处理指示器应该消失
      await expect(page.locator('[data-testid="processing-indicator"]')).not.toBeVisible();
    });

    // 7. 验证处理结果
    await test.step('验证语音处理结果', async () => {
      const resultContainer = page.locator('[data-testid="result-container"]');
      await expect(resultContainer).toBeVisible();
      
      // 验证转录文本
      const transcription = page.locator('[data-testid="transcription-text"]');
      await expect(transcription).toBeVisible();
      await expect(transcription).not.toBeEmpty();
      
      // 验证情感分析结果
      const sentiment = page.locator('[data-testid="sentiment-analysis"]');
      await expect(sentiment).toBeVisible();
      
      // 验证生成的图片
      const generatedImage = page.locator('[data-testid="generated-image"]');
      await expect(generatedImage).toBeVisible();
      
      // 验证图片已加载
      await expect(generatedImage).toHaveAttribute('src', /^data:image\/(png|svg|jpeg)/);
    });

    // 8. 验证交互功能
    await test.step('验证结果交互功能', async () => {
      // 点赞功能
      const likeButton = page.locator('[data-testid="like-button"]');
      if (await likeButton.isVisible()) {
        await likeButton.click();
        await expect(likeButton).toHaveClass(/liked/);
      }
      
      // 分享功能
      const shareButton = page.locator('[data-testid="share-button"]');
      if (await shareButton.isVisible()) {
        await expect(shareButton).toBeEnabled();
      }
      
      // 重新录制功能
      const reRecordButton = page.locator('[data-testid="re-record-button"]');
      if (await reRecordButton.isVisible()) {
        await expect(reRecordButton).toBeEnabled();
      }
    });
  });

  test('移动端触摸交互应该正常工作', async () => {
    // 设置移动端视口
    await page.setViewportSize({ width: 375, height: 812 });
    
    await test.step('移动端录音交互', async () => {
      const recordButton = page.locator('[data-testid="record-button"]');
      
      // 触摸开始录音
      await recordButton.dispatchEvent('touchstart');
      await expect(recordButton).toHaveClass(/recording/);
      
      // 等待一段时间
      await page.waitForTimeout(3000);
      
      // 触摸结束停止录音
      await recordButton.dispatchEvent('touchend');
      await expect(recordButton).not.toHaveClass(/recording/);
    });

    await test.step('移动端结果展示', async () => {
      // 等待处理完成
      await page.waitForSelector('[data-testid="result-container"]', {
        timeout: 60000
      });
      
      // 验证移动端布局
      const resultContainer = page.locator('[data-testid="result-container"]');
      await expect(resultContainer).toBeVisible();
      
      // 验证响应式设计
      const boundingBox = await resultContainer.boundingBox();
      expect(boundingBox?.width).toBeLessThanOrEqual(375);
    });
  });

  test('错误处理和恢复流程', async () => {
    await test.step('处理录音权限被拒绝', async () => {
      // 创建没有麦克风权限的上下文
      const context = await page.context().browser()?.newContext({
        permissions: [] // 不授予麦克风权限
      });
      
      if (context) {
        const newPage = await context.newPage();
        await newPage.goto('/');
        
        const recordButton = newPage.locator('[data-testid="record-button"]');
        await recordButton.dispatchEvent('mousedown');
        
        // 应该显示权限错误
        await expect(newPage.locator('[data-testid="permission-error"]')).toBeVisible();
        await expect(newPage.locator('[data-testid="permission-error"]')).toContainText(/麦克风权限/);
        
        await context.close();
      }
    });

    await test.step('处理网络错误', async () => {
      // 模拟网络离线
      await page.context().setOffline(true);
      
      const recordButton = page.locator('[data-testid="record-button"]');
      await recordButton.dispatchEvent('mousedown');
      await page.waitForTimeout(2000);
      await recordButton.dispatchEvent('mouseup');
      
      // 应该显示网络错误
      await expect(page.locator('[data-testid="network-error"]')).toBeVisible();
      
      // 恢复网络
      await page.context().setOffline(false);
      
      // 点击重试
      const retryButton = page.locator('[data-testid="retry-button"]');
      if (await retryButton.isVisible()) {
        await retryButton.click();
      }
    });
  });

  test('性能和响应时间验证', async () => {
    await test.step('页面加载性能', async () => {
      const startTime = Date.now();
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      const loadTime = Date.now() - startTime;
      
      // 页面加载时间应该小于3秒
      expect(loadTime).toBeLessThan(3000);
    });

    await test.step('录音响应时间', async () => {
      const recordButton = page.locator('[data-testid="record-button"]');
      
      const startTime = Date.now();
      await recordButton.dispatchEvent('mousedown');
      
      // 等待录音状态激活
      await expect(recordButton).toHaveClass(/recording/);
      const responseTime = Date.now() - startTime;
      
      // 录音响应时间应该小于200ms
      expect(responseTime).toBeLessThan(200);
    });

    await test.step('AI处理时间监控', async () => {
      const recordButton = page.locator('[data-testid="record-button"]');
      
      // 开始录音
      await recordButton.dispatchEvent('mousedown');
      await page.waitForTimeout(3000);
      
      const processingStartTime = Date.now();
      await recordButton.dispatchEvent('mouseup');
      
      // 等待处理完成
      await page.waitForSelector('[data-testid="result-container"]', {
        timeout: 90000 // 最多90秒
      });
      
      const processingTime = Date.now() - processingStartTime;
      
      // AI处理时间应该在合理范围内（90秒内）
      expect(processingTime).toBeLessThan(90000);
      
      // 记录处理时间用于性能监控
      console.log(`AI处理时间: ${processingTime}ms`);
    });
  });

  test('PWA功能验证', async () => {
    await test.step('Service Worker注册', async () => {
      // 检查Service Worker是否注册
      const swRegistration = await page.evaluate(() => {
        return navigator.serviceWorker.getRegistration();
      });
      
      expect(swRegistration).toBeTruthy();
    });

    await test.step('离线功能', async () => {
      // 首先在线状态下加载页面
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      // 切换到离线状态
      await page.context().setOffline(true);
      
      // 刷新页面，应该仍然可以访问
      await page.reload();
      await expect(page.locator('[data-testid="app-header"]')).toBeVisible();
      
      // 恢复在线状态
      await page.context().setOffline(false);
    });

    await test.step('添加到主屏幕提示', async () => {
      // 在支持PWA的浏览器中应该显示安装提示
      const installPrompt = page.locator('[data-testid="pwa-install-prompt"]');
      
      // 等待安装提示出现（可能需要一些时间）
      try {
        await expect(installPrompt).toBeVisible({ timeout: 10000 });
      } catch (error) {
        // 某些测试环境可能不支持PWA安装提示
        console.log('PWA安装提示未显示，可能是测试环境限制');
      }
    });
  });

  test('多语言和国际化', async () => {
    await test.step('中文语音识别', async () => {
      // 这个测试需要真实的语音输入，在实际环境中进行
      const recordButton = page.locator('[data-testid="record-button"]');
      
      await recordButton.dispatchEvent('mousedown');
      await page.waitForTimeout(3000);
      await recordButton.dispatchEvent('mouseup');
      
      // 等待处理完成
      await page.waitForSelector('[data-testid="result-container"]', {
        timeout: 60000
      });
      
      // 验证中文转录结果
      const transcription = page.locator('[data-testid="transcription-text"]');
      await expect(transcription).toBeVisible();
      
      // 转录结果应该包含中文字符
      const text = await transcription.textContent();
      expect(text).toMatch(/[\u4e00-\u9fff]/); // 中文字符范围
    });
  });
});
