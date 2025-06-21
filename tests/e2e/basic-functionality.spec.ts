/**
 * 基础功能端到端测试
 * 测试应用的基本可访问性和核心功能
 */

import { test, expect } from '@playwright/test';

test.describe('Vomage基础功能测试', () => {
  test('应用应该能够正常加载', async ({ page }) => {
    // 访问应用
    await page.goto('https://18.204.35.132:8443');
    
    // 等待页面加载
    await page.waitForLoadState('networkidle');
    
    // 验证页面标题
    await expect(page).toHaveTitle(/Vomage/);
    
    // 验证主要元素存在
    const recordButton = page.locator('[data-testid="record-button"]');
    await expect(recordButton).toBeVisible();
    
    console.log('✅ 应用基础加载测试通过');
  });

  test('录音按钮应该可见并可交互', async ({ page }) => {
    await page.goto('https://18.204.35.132:8443');
    await page.waitForLoadState('networkidle');
    
    const recordButton = page.locator('[data-testid="record-button"]');
    
    // 验证按钮可见
    await expect(recordButton).toBeVisible();
    
    // 验证按钮可点击
    await expect(recordButton).toBeEnabled();
    
    console.log('✅ 录音按钮交互测试通过');
  });

  test('页面应该响应移动端视口', async ({ page }) => {
    // 设置移动端视口
    await page.setViewportSize({ width: 375, height: 812 });
    
    await page.goto('https://18.204.35.132:8443');
    await page.waitForLoadState('networkidle');
    
    // 验证页面在移动端正常显示
    const recordButton = page.locator('[data-testid="record-button"]');
    await expect(recordButton).toBeVisible();
    
    // 验证响应式布局
    const boundingBox = await recordButton.boundingBox();
    expect(boundingBox?.width).toBeLessThanOrEqual(375);
    
    console.log('✅ 移动端响应式测试通过');
  });

  test('应用应该有基本的可访问性', async ({ page }) => {
    await page.goto('https://18.204.35.132:8443');
    await page.waitForLoadState('networkidle');
    
    // 检查页面是否有主要的语义元素
    const main = page.locator('main');
    if (await main.count() > 0) {
      await expect(main).toBeVisible();
    }
    
    // 检查录音按钮是否有适当的标签
    const recordButton = page.locator('[data-testid="record-button"]');
    const ariaLabel = await recordButton.getAttribute('aria-label');
    const buttonText = await recordButton.textContent();
    
    // 应该有aria-label或者按钮文本
    expect(ariaLabel || buttonText).toBeTruthy();
    
    console.log('✅ 基础可访问性测试通过');
  });
});
