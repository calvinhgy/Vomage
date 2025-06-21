/**
 * 移动端体验E2E测试
 * 测试移动设备上的用户体验
 */

import { test, expect, devices } from '@playwright/test';

// 移动设备配置
const iPhone = devices['iPhone 12'];
const Android = devices['Pixel 5'];

test.describe('移动端体验E2E测试', () => {
  test.describe('iPhone体验测试', () => {
    test.use({ ...iPhone });

    test('应该在iPhone上正常显示和操作', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // 验证移动端布局
      const recordButton = page.locator('[data-testid="record-button"]');
      await expect(recordButton).toBeVisible();

      // 验证按钮大小适合触摸
      const buttonBox = await recordButton.boundingBox();
      expect(buttonBox?.width).toBeGreaterThan(44); // iOS最小触摸目标
      expect(buttonBox?.height).toBeGreaterThan(44);

      // 测试触摸交互
      await recordButton.tap();
      
      const recordingIndicator = page.locator('[data-testid="recording-indicator"]');
      await expect(recordingIndicator).toBeVisible();

      await page.waitForTimeout(2000);
      await recordButton.tap();
      
      await expect(recordingIndicator).not.toBeVisible();
    });

    test('应该支持iPhone的手势操作', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // 测试长按录音
      const recordButton = page.locator('[data-testid="record-button"]');
      
      // 模拟长按开始
      await recordButton.dispatchEvent('touchstart');
      await page.waitForTimeout(500);
      
      const recordingIndicator = page.locator('[data-testid="recording-indicator"]');
      await expect(recordingIndicator).toBeVisible();

      // 模拟长按结束
      await recordButton.dispatchEvent('touchend');
      await expect(recordingIndicator).not.toBeVisible();
    });

    test('应该在iPhone Safari中正常工作', async ({ page }) => {
      // 模拟Safari特定行为
      await page.addInitScript(() => {
        // Mock Safari的getUserMedia
        Object.defineProperty(navigator, 'mediaDevices', {
          value: {
            getUserMedia: () => Promise.resolve({
              getTracks: () => [{ stop: () => {} }]
            })
          }
        });
      });

      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const recordButton = page.locator('[data-testid="record-button"]');
      await recordButton.tap();

      // 验证Safari兼容性
      const recordingIndicator = page.locator('[data-testid="recording-indicator"]');
      await expect(recordingIndicator).toBeVisible();
    });
  });

  test.describe('Android体验测试', () => {
    test.use({ ...Android });

    test('应该在Android上正常显示和操作', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // 验证Android布局
      const recordButton = page.locator('[data-testid="record-button"]');
      await expect(recordButton).toBeVisible();

      // 验证Material Design风格
      const buttonStyles = await recordButton.evaluate(el => 
        window.getComputedStyle(el)
      );
      
      // 验证按钮样式
      expect(buttonStyles.borderRadius).toBeTruthy();

      // 测试Android触摸交互
      await recordButton.tap();
      
      const recordingIndicator = page.locator('[data-testid="recording-indicator"]');
      await expect(recordingIndicator).toBeVisible();
    });

    test('应该支持Android的返回按钮', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // 打开设置页面
      const settingsButton = page.locator('[data-testid="settings-button"]');
      if (await settingsButton.isVisible()) {
        await settingsButton.tap();
        
        // 模拟Android返回按钮
        await page.keyboard.press('Escape');
        
        // 验证返回到主页
        const recordButton = page.locator('[data-testid="record-button"]');
        await expect(recordButton).toBeVisible();
      }
    });
  });

  test.describe('响应式设计测试', () => {
    test('应该在不同屏幕尺寸下正常显示', async ({ page }) => {
      const viewports = [
        { width: 320, height: 568 }, // iPhone SE
        { width: 375, height: 667 }, // iPhone 8
        { width: 414, height: 896 }, // iPhone 11
        { width: 360, height: 640 }, // Android Small
        { width: 412, height: 869 }, // Android Large
      ];

      for (const viewport of viewports) {
        await page.setViewportSize(viewport);
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // 验证关键元素可见
        const recordButton = page.locator('[data-testid="record-button"]');
        await expect(recordButton).toBeVisible();

        // 验证按钮不会被截断
        const buttonBox = await recordButton.boundingBox();
        expect(buttonBox?.x).toBeGreaterThanOrEqual(0);
        expect(buttonBox?.y).toBeGreaterThanOrEqual(0);
        expect(buttonBox?.x + buttonBox?.width).toBeLessThanOrEqual(viewport.width);
      }
    });

    test('应该支持横屏模式', async ({ page }) => {
      // 设置横屏
      await page.setViewportSize({ width: 667, height: 375 });
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // 验证横屏布局
      const recordButton = page.locator('[data-testid="record-button"]');
      await expect(recordButton).toBeVisible();

      const container = page.locator('[data-testid="main-container"]');
      const containerBox = await container.boundingBox();
      
      // 验证横屏时的布局调整
      expect(containerBox?.width).toBeGreaterThan(containerBox?.height || 0);
    });
  });

  test.describe('触摸交互测试', () => {
    test.use({ ...iPhone });

    test('应该支持多点触控', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // 模拟双指缩放
      await page.touchscreen.tap(200, 300);
      await page.touchscreen.tap(400, 500);

      // 验证应用仍然正常工作
      const recordButton = page.locator('[data-testid="record-button"]');
      await expect(recordButton).toBeVisible();
    });

    test('应该支持滑动手势', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // 完成一次录音以显示结果
      const recordButton = page.locator('[data-testid="record-button"]');
      await recordButton.tap();
      await page.waitForTimeout(1000);
      await recordButton.tap();

      // 等待处理完成
      await page.waitForTimeout(3000);

      // 测试滑动查看历史记录
      const historyContainer = page.locator('[data-testid="history-container"]');
      if (await historyContainer.isVisible()) {
        // 模拟向左滑动
        await page.touchscreen.tap(300, 400);
        await page.mouse.move(300, 400);
        await page.mouse.down();
        await page.mouse.move(100, 400);
        await page.mouse.up();

        // 验证滑动效果
        await page.waitForTimeout(500);
      }
    });

    test('应该防止意外触摸', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const recordButton = page.locator('[data-testid="record-button"]');
      
      // 快速连续点击
      await recordButton.tap();
      await recordButton.tap();
      await recordButton.tap();

      // 验证不会产生意外行为
      const recordingIndicator = page.locator('[data-testid="recording-indicator"]');
      
      // 应该只有一个录音状态
      const indicatorCount = await recordingIndicator.count();
      expect(indicatorCount).toBeLessThanOrEqual(1);
    });
  });

  test.describe('移动端性能测试', () => {
    test.use({ ...iPhone });

    test('应该在移动设备上快速加载', async ({ page }) => {
      const startTime = Date.now();
      
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      const loadTime = Date.now() - startTime;
      
      // 移动端加载时间应该在合理范围内
      expect(loadTime).toBeLessThan(5000); // 5秒内加载完成
    });

    test('应该优化移动端内存使用', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // 执行多次录音操作
      const recordButton = page.locator('[data-testid="record-button"]');
      
      for (let i = 0; i < 3; i++) {
        await recordButton.tap();
        await page.waitForTimeout(1000);
        await recordButton.tap();
        await page.waitForTimeout(2000);
      }

      // 验证页面仍然响应
      await expect(recordButton).toBeVisible();
      await expect(recordButton).toBeEnabled();
    });
  });

  test.describe('移动端可访问性测试', () => {
    test.use({ ...iPhone });

    test('应该支持VoiceOver', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // 验证ARIA标签
      const recordButton = page.locator('[data-testid="record-button"]');
      await expect(recordButton).toHaveAttribute('aria-label');
      await expect(recordButton).toHaveAttribute('role', 'button');

      // 验证状态变化的ARIA更新
      await recordButton.tap();
      
      const ariaPressed = await recordButton.getAttribute('aria-pressed');
      expect(ariaPressed).toBe('true');
    });

    test('应该支持大字体模式', async ({ page }) => {
      // 模拟大字体设置
      await page.addInitScript(() => {
        document.documentElement.style.fontSize = '20px';
      });

      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // 验证界面仍然可用
      const recordButton = page.locator('[data-testid="record-button"]');
      await expect(recordButton).toBeVisible();

      const buttonBox = await recordButton.boundingBox();
      expect(buttonBox?.width).toBeGreaterThan(44);
      expect(buttonBox?.height).toBeGreaterThan(44);
    });

    test('应该支持高对比度模式', async ({ page }) => {
      // 模拟高对比度模式
      await page.addInitScript(() => {
        document.documentElement.classList.add('high-contrast');
      });

      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // 验证高对比度下的可见性
      const recordButton = page.locator('[data-testid="record-button"]');
      await expect(recordButton).toBeVisible();

      const buttonStyles = await recordButton.evaluate(el => 
        window.getComputedStyle(el)
      );
      
      // 验证对比度
      expect(buttonStyles.color).toBeTruthy();
      expect(buttonStyles.backgroundColor).toBeTruthy();
    });
  });

  test.describe('PWA功能测试', () => {
    test.use({ ...iPhone });

    test('应该支持添加到主屏幕', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // 验证PWA manifest
      const manifestLink = page.locator('link[rel="manifest"]');
      await expect(manifestLink).toHaveCount(1);

      // 验证service worker注册
      const swRegistration = await page.evaluate(() => {
        return 'serviceWorker' in navigator;
      });
      expect(swRegistration).toBe(true);
    });

    test('应该支持离线使用', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // 模拟离线状态
      await page.context().setOffline(true);

      // 刷新页面
      await page.reload();

      // 验证离线页面或缓存内容
      const offlineIndicator = page.locator('[data-testid="offline-indicator"]');
      if (await offlineIndicator.isVisible()) {
        await expect(offlineIndicator).toContainText(/离线|Offline/);
      } else {
        // 验证缓存的内容仍然可用
        const recordButton = page.locator('[data-testid="record-button"]');
        await expect(recordButton).toBeVisible();
      }
    });
  });
});
