import { FullConfig } from '@playwright/test';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 全局测试清理完成');
}

export default globalTeardown;
