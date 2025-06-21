/**
 * 完整语音旅程E2E测试
 * 测试从录音到图片生成的完整用户流程
 */

import { test, expect, Page } from '@playwright/test';

// Mock数据
const mockVoiceProcessingResponse = {
  success: true,
  data: {
    transcription: {
      text: '今天天气真好，心情很愉快',
      confidence: 0.95,
      language: 'zh-CN'
    },
    sentiment: {
      mood: 'happy',
      confidence: 0.92,
      emotions: ['joy', 'contentment']
    },
    generatedImage: {
      imageUrl: 'data:image/png;base64,mock-generated-image-data',
      metadata: {
        prompt: 'blue sky with white clouds, peaceful and happy mood',
        style: 'photorealistic'
      }
    },
    requestId: 'e2e_test_123'
  }
};

// 页面对象模式
class VomagePage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/');
  }

  async waitForLoad() {
    await this.page.waitForLoadState('networkidle');
  }

  async getRecordButton() {
    return this.page.locator('[data-testid="record-button"]');
  }

  async getRecordingIndicator() {
    return this.page.locator('[data-testid="recording-indicator"]');
  }

  async getTranscriptionDisplay() {
    return this.page.locator('[data-testid="transcription-display"]');
  }

  async getSentimentDisplay() {
    return this.page.locator('[data-testid="sentiment-display"]');
  }

  async getGeneratedImage() {
    return this.page.locator('[data-testid="generated-image"]');
  }

  async getLoadingIndicator() {
    return this.page.locator('[data-testid="loading-indicator"]');
  }

  async getErrorMessage() {
    return this.page.locator('[data-testid="error-message"]');
  }

  async startRecording() {
    const recordButton = await this.getRecordButton();
    await recordButton.dispatchEvent('mousedown');
  }

  async stopRecording() {
    const recordButton = await this.getRecordButton();
    await recordButton.dispatchEvent('mouseup');
  }

  async waitForProcessing() {
    const loadingIndicator = await this.getLoadingIndicator();
    await loadingIndicator.waitFor({ state: 'visible' });
    await loadingIndicator.waitFor({ state: 'hidden', timeout: 30000 });
  }
}

test.describe('完整语音旅程E2E测试', () => {
  let vomagePage: VomagePage;

  test.beforeEach(async ({ page }) => {
    vomagePage = new VomagePage(page);
    
    // Mock API响应
    await page.route('/api/voice/process', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockVoiceProcessingResponse)
      });
    });

    // Mock权限API
    await page.route('/api/permissions/microphone', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ granted: true })
      });
    });

    await vomagePage.goto();
    await vomagePage.waitForLoad();
  });

  test('应该完成完整的语音到图片生成流程', async ({ page }) => {
    // 1. 验证初始状态
    const recordButton = await vomagePage.getRecordButton();
    await expect(recordButton).toBeVisible();
    await expect(recordButton).toHaveText(/开始录音|Start Recording/);

    // 2. 开始录音
    await vomagePage.startRecording();
    
    // 验证录音状态
    const recordingIndicator = await vomagePage.getRecordingIndicator();
    await expect(recordingIndicator).toBeVisible();
    await expect(recordButton).toHaveText(/录音中|Recording/);

    // 3. 停止录音
    await page.waitForTimeout(2000); // 模拟录音2秒
    await vomagePage.stopRecording();

    // 验证录音停止
    await expect(recordingIndicator).not.toBeVisible();

    // 4. 等待处理完成
    await vomagePage.waitForProcessing();

    // 5. 验证转录结果
    const transcriptionDisplay = await vomagePage.getTranscriptionDisplay();
    await expect(transcriptionDisplay).toBeVisible();
    await expect(transcriptionDisplay).toContainText('今天天气真好，心情很愉快');

    // 6. 验证情感分析结果
    const sentimentDisplay = await vomagePage.getSentimentDisplay();
    await expect(sentimentDisplay).toBeVisible();
    await expect(sentimentDisplay).toContainText(/happy|愉快|开心/);

    // 7. 验证生成的图片
    const generatedImage = await vomagePage.getGeneratedImage();
    await expect(generatedImage).toBeVisible();
    await expect(generatedImage).toHaveAttribute('src', /data:image/);
    await expect(generatedImage).toHaveAttribute('alt', /生成的图片|Generated Image/);
  });

  test('应该处理录音权限被拒绝的情况', async ({ page }) => {
    // Mock权限被拒绝
    await page.route('/api/permissions/microphone', async route => {
      await route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({ granted: false, error: 'Permission denied' })
      });
    });

    await page.reload();
    await vomagePage.waitForLoad();

    // 尝试开始录音
    await vomagePage.startRecording();

    // 验证错误消息
    const errorMessage = await vomagePage.getErrorMessage();
    await expect(errorMessage).toBeVisible();
    await expect(errorMessage).toContainText(/权限|Permission/);
  });

  test('应该处理API处理失败的情况', async ({ page }) => {
    // Mock API失败响应
    await page.route('/api/voice/process', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: {
            code: 'PROCESSING_FAILED',
            message: 'Failed to process voice recording'
          }
        })
      });
    });

    // 执行录音流程
    await vomagePage.startRecording();
    await page.waitForTimeout(2000);
    await vomagePage.stopRecording();

    // 验证错误处理
    const errorMessage = await vomagePage.getErrorMessage();
    await expect(errorMessage).toBeVisible();
    await expect(errorMessage).toContainText(/处理失败|Processing Failed/);

    // 验证重试按钮
    const retryButton = page.locator('[data-testid="retry-button"]');
    await expect(retryButton).toBeVisible();
  });

  test('应该支持重新录音功能', async ({ page }) => {
    // 完成第一次录音
    await vomagePage.startRecording();
    await page.waitForTimeout(1000);
    await vomagePage.stopRecording();
    await vomagePage.waitForProcessing();

    // 验证结果显示
    const transcriptionDisplay = await vomagePage.getTranscriptionDisplay();
    await expect(transcriptionDisplay).toBeVisible();

    // 点击重新录音
    const reRecordButton = page.locator('[data-testid="re-record-button"]');
    await expect(reRecordButton).toBeVisible();
    await reRecordButton.click();

    // 验证界面重置
    await expect(transcriptionDisplay).not.toBeVisible();
    const recordButton = await vomagePage.getRecordButton();
    await expect(recordButton).toHaveText(/开始录音|Start Recording/);
  });

  test('应该在移动设备上正常工作', async ({ page }) => {
    // 模拟移动设备
    await page.setViewportSize({ width: 375, height: 667 });

    // 验证移动端布局
    const recordButton = await vomagePage.getRecordButton();
    await expect(recordButton).toBeVisible();

    // 使用触摸事件
    await recordButton.dispatchEvent('touchstart');
    
    const recordingIndicator = await vomagePage.getRecordingIndicator();
    await expect(recordingIndicator).toBeVisible();

    await page.waitForTimeout(2000);
    await recordButton.dispatchEvent('touchend');

    await expect(recordingIndicator).not.toBeVisible();
  });

  test('应该显示处理进度', async ({ page }) => {
    // Mock带进度的API响应
    let progressStep = 0;
    await page.route('/api/voice/status/*', async route => {
      progressStep += 25;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: progressStep < 100 ? 'processing' : 'completed',
          progress: Math.min(progressStep, 100),
          result: progressStep >= 100 ? mockVoiceProcessingResponse.data : null
        })
      });
    });

    await vomagePage.startRecording();
    await page.waitForTimeout(1000);
    await vomagePage.stopRecording();

    // 验证进度显示
    const progressBar = page.locator('[data-testid="progress-bar"]');
    await expect(progressBar).toBeVisible();

    const progressText = page.locator('[data-testid="progress-text"]');
    await expect(progressText).toBeVisible();
    await expect(progressText).toContainText(/处理中|Processing/);
  });

  test('应该支持键盘导航', async ({ page }) => {
    // 使用Tab键导航
    await page.keyboard.press('Tab');
    
    const recordButton = await vomagePage.getRecordButton();
    await expect(recordButton).toBeFocused();

    // 使用空格键开始录音
    await page.keyboard.press('Space');
    
    const recordingIndicator = await vomagePage.getRecordingIndicator();
    await expect(recordingIndicator).toBeVisible();

    // 再次按空格键停止录音
    await page.keyboard.press('Space');
    await expect(recordingIndicator).not.toBeVisible();
  });

  test('应该保存录音历史', async ({ page }) => {
    // 完成录音流程
    await vomagePage.startRecording();
    await page.waitForTimeout(1000);
    await vomagePage.stopRecording();
    await vomagePage.waitForProcessing();

    // 验证历史记录
    const historyButton = page.locator('[data-testid="history-button"]');
    await expect(historyButton).toBeVisible();
    await historyButton.click();

    const historyList = page.locator('[data-testid="history-list"]');
    await expect(historyList).toBeVisible();

    const historyItem = page.locator('[data-testid="history-item"]').first();
    await expect(historyItem).toBeVisible();
    await expect(historyItem).toContainText('今天天气真好');
  });

  test('应该支持分享功能', async ({ page }) => {
    // 完成录音流程
    await vomagePage.startRecording();
    await page.waitForTimeout(1000);
    await vomagePage.stopRecording();
    await vomagePage.waitForProcessing();

    // 点击分享按钮
    const shareButton = page.locator('[data-testid="share-button"]');
    await expect(shareButton).toBeVisible();
    await shareButton.click();

    // 验证分享选项
    const shareModal = page.locator('[data-testid="share-modal"]');
    await expect(shareModal).toBeVisible();

    const copyLinkButton = page.locator('[data-testid="copy-link-button"]');
    await expect(copyLinkButton).toBeVisible();

    const downloadButton = page.locator('[data-testid="download-button"]');
    await expect(downloadButton).toBeVisible();
  });
});
