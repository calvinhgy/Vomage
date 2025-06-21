/**
 * Playwright全局设置
 */

import { FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('🚀 开始全局测试设置...');
  
  // 这里可以添加全局设置逻辑
  // 例如：启动测试数据库、清理缓存等
  
  console.log('✅ 全局测试设置完成');
}

export default globalSetup;
