import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright配置 - Vomage端到端测试
 * 专为移动端PWA应用优化
 */
export default defineConfig({
  // 测试目录
  testDir: './tests/e2e',
  
  // 全局设置
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  
  // 报告配置
  reporter: [
    ['html', { outputFolder: 'test-results/playwright-report' }],
    ['json', { outputFile: 'test-results/playwright-results.json' }],
    ['junit', { outputFile: 'test-results/playwright-junit.xml' }],
    process.env.CI ? ['github'] : ['list']
  ],

  // 全局测试配置
  use: {
    // 基础URL
    baseURL: process.env.TEST_BASE_URL || 'https://18.204.35.132:8443',
    
    // 浏览器配置
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    
    // 忽略HTTPS错误（测试环境使用自签名证书）
    ignoreHTTPSErrors: true,
    
    // 权限设置
    permissions: ['microphone', 'geolocation'],
    
    // 超时设置
    actionTimeout: 30000,
    navigationTimeout: 60000,
  },

  // 项目配置 - 多设备测试
  projects: [
    // 桌面浏览器测试
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    // 移动设备测试 - 重点关注
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
    {
      name: 'iPhone 13',
      use: { ...devices['iPhone 13'] },
    },
    {
      name: 'iPhone SE',
      use: { ...devices['iPhone SE'] },
    },
    {
      name: 'iPad',
      use: { ...devices['iPad Pro'] },
    },

    // 特定测试场景
    {
      name: 'PWA Tests',
      use: { 
        ...devices['iPhone 12'],
        // PWA特定设置
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
      },
      testMatch: '**/pwa/*.spec.ts'
    },

    // 性能测试
    {
      name: 'Performance Tests',
      use: { 
        ...devices['Desktop Chrome'],
        // 性能测试特定设置
        launchOptions: {
          args: ['--enable-precise-memory-info']
        }
      },
      testMatch: '**/performance/*.spec.ts'
    }
  ],

  // 全局设置和清理
  globalSetup: require.resolve('./tests/setup/global-setup.ts'),
  globalTeardown: require.resolve('./tests/setup/global-teardown.ts'),

  // Web服务器配置（如果需要启动本地服务器）
  webServer: process.env.CI ? undefined : {
    command: 'npm run dev',
    port: 3000,
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },

  // 测试超时
  timeout: 60000,
  expect: {
    timeout: 10000,
  },

  // 输出目录
  outputDir: 'test-results/playwright-artifacts',
});
