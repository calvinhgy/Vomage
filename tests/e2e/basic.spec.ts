import { test, expect } from '@playwright/test';

test('应用基础加载测试', async ({ page }) => {
  await page.goto('https://18.204.35.132:8443');
  await page.waitForLoadState('networkidle');
  await expect(page).toHaveTitle(/Vomage/);
  console.log('✅ 基础测试通过');
});
