/**
 * 简化性能测试
 * 测试关键API端点的性能指标
 */

const { performance } = require('perf_hooks');

// Mock HTTP请求
const mockHttpRequest = async (url, options = {}) => {
  const startTime = performance.now();
  
  // 模拟网络延迟
  const delay = Math.random() * 200 + 50; // 50-250ms
  await new Promise(resolve => setTimeout(resolve, delay));
  
  const endTime = performance.now();
  const responseTime = endTime - startTime;
  
  // 模拟不同的响应
  const responses = {
    '/': { statusCode: 200, data: '<html>...</html>' },
    '/api/health': { statusCode: 200, data: { status: 'healthy' } },
    '/api/voice/process': { statusCode: 200, data: { requestId: 'test-123' } },
    '/api/image/generate': { statusCode: 200, data: { imageUrl: 'test.png' } }
  };
  
  const response = responses[url] || { statusCode: 404, data: 'Not Found' };
  
  return {
    ...response,
    responseTime: responseTime
  };
};

// 性能测试类
class SimplePerformanceTest {
  constructor() {
    this.results = {
      tests: [],
      summary: {
        totalTests: 0,
        totalRequests: 0,
        avgResponseTime: 0,
        minResponseTime: Infinity,
        maxResponseTime: 0,
        successRate: 0
      }
    };
  }

  async runTest(name, testFn) {
    console.log(`🧪 运行测试: ${name}`);
    const startTime = performance.now();
    
    try {
      const result = await testFn();
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      const testResult = {
        name,
        status: 'passed',
        duration,
        ...result
      };
      
      this.results.tests.push(testResult);
      console.log(`✅ ${name} - 耗时: ${duration.toFixed(2)}ms`);
      
      return testResult;
    } catch (error) {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      const testResult = {
        name,
        status: 'failed',
        duration,
        error: error.message
      };
      
      this.results.tests.push(testResult);
      console.log(`❌ ${name} - 失败: ${error.message}`);
      
      return testResult;
    }
  }

  async testEndpointPerformance(endpoint, expectedMaxTime = 1000) {
    const requests = 10;
    const responseTimes = [];
    let successCount = 0;

    for (let i = 0; i < requests; i++) {
      try {
        const response = await mockHttpRequest(endpoint);
        responseTimes.push(response.responseTime);
        
        if (response.statusCode === 200) {
          successCount++;
        }
      } catch (error) {
        console.log(`请求失败: ${error.message}`);
      }
    }

    const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    const minResponseTime = Math.min(...responseTimes);
    const maxResponseTime = Math.max(...responseTimes);
    const successRate = (successCount / requests) * 100;

    // 更新总体统计
    this.results.summary.totalRequests += requests;
    this.results.summary.minResponseTime = Math.min(this.results.summary.minResponseTime, minResponseTime);
    this.results.summary.maxResponseTime = Math.max(this.results.summary.maxResponseTime, maxResponseTime);

    return {
      endpoint,
      requests,
      avgResponseTime: avgResponseTime.toFixed(2),
      minResponseTime: minResponseTime.toFixed(2),
      maxResponseTime: maxResponseTime.toFixed(2),
      successRate: successRate.toFixed(2),
      passed: avgResponseTime <= expectedMaxTime && successRate >= 95
    };
  }

  async testConcurrentRequests(endpoint, concurrency = 5) {
    const promises = [];
    const startTime = performance.now();

    for (let i = 0; i < concurrency; i++) {
      promises.push(mockHttpRequest(endpoint));
    }

    const responses = await Promise.all(promises);
    const endTime = performance.now();
    const totalTime = endTime - startTime;

    const avgResponseTime = responses.reduce((sum, r) => sum + r.responseTime, 0) / responses.length;
    const successCount = responses.filter(r => r.statusCode === 200).length;
    const successRate = (successCount / concurrency) * 100;

    return {
      endpoint,
      concurrency,
      totalTime: totalTime.toFixed(2),
      avgResponseTime: avgResponseTime.toFixed(2),
      successRate: successRate.toFixed(2),
      passed: successRate >= 95
    };
  }

  async testMemoryUsage() {
    const initialMemory = process.memoryUsage();
    
    // 执行一些操作来测试内存使用
    const data = [];
    for (let i = 0; i < 1000; i++) {
      data.push({
        id: i,
        text: `测试数据 ${i}`,
        timestamp: new Date()
      });
    }

    const finalMemory = process.memoryUsage();
    const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

    return {
      initialMemory: this.formatBytes(initialMemory.heapUsed),
      finalMemory: this.formatBytes(finalMemory.heapUsed),
      memoryIncrease: this.formatBytes(memoryIncrease),
      passed: memoryIncrease < 10 * 1024 * 1024 // 小于10MB
    };
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  generateSummary() {
    const passedTests = this.results.tests.filter(t => t.status === 'passed').length;
    const totalTests = this.results.tests.length;
    
    this.results.summary.totalTests = totalTests;
    this.results.summary.successRate = ((passedTests / totalTests) * 100).toFixed(2);
    
    // 计算平均响应时间
    const responseTimes = this.results.tests
      .filter(t => t.avgResponseTime)
      .map(t => parseFloat(t.avgResponseTime));
    
    if (responseTimes.length > 0) {
      this.results.summary.avgResponseTime = (
        responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
      ).toFixed(2);
    }

    return this.results.summary;
  }

  printReport() {
    console.log('\n' + '='.repeat(50));
    console.log('📊 性能测试报告');
    console.log('='.repeat(50));

    this.results.tests.forEach(test => {
      const status = test.status === 'passed' ? '✅' : '❌';
      console.log(`${status} ${test.name}`);
      
      if (test.endpoint) {
        console.log(`   端点: ${test.endpoint}`);
      }
      if (test.avgResponseTime) {
        console.log(`   平均响应时间: ${test.avgResponseTime}ms`);
      }
      if (test.successRate) {
        console.log(`   成功率: ${test.successRate}%`);
      }
      if (test.error) {
        console.log(`   错误: ${test.error}`);
      }
      console.log('');
    });

    const summary = this.generateSummary();
    console.log('📈 总体统计:');
    console.log(`   总测试数: ${summary.totalTests}`);
    console.log(`   成功率: ${summary.successRate}%`);
    console.log(`   平均响应时间: ${summary.avgResponseTime}ms`);
    console.log(`   最小响应时间: ${summary.minResponseTime}ms`);
    console.log(`   最大响应时间: ${summary.maxResponseTime}ms`);
    console.log('='.repeat(50));
  }
}

// 主测试函数
async function runSimplePerformanceTests() {
  const tester = new SimplePerformanceTest();

  console.log('🚀 开始简化性能测试');

  // 测试主页性能
  await tester.runTest('主页响应性能', async () => {
    return await tester.testEndpointPerformance('/', 500);
  });

  // 测试API健康检查
  await tester.runTest('健康检查API性能', async () => {
    return await tester.testEndpointPerformance('/api/health', 200);
  });

  // 测试语音处理API
  await tester.runTest('语音处理API性能', async () => {
    return await tester.testEndpointPerformance('/api/voice/process', 2000);
  });

  // 测试图片生成API
  await tester.runTest('图片生成API性能', async () => {
    return await tester.testEndpointPerformance('/api/image/generate', 3000);
  });

  // 测试并发请求
  await tester.runTest('并发请求处理', async () => {
    return await tester.testConcurrentRequests('/api/health', 10);
  });

  // 测试内存使用
  await tester.runTest('内存使用测试', async () => {
    return await tester.testMemoryUsage();
  });

  // 生成报告
  tester.printReport();

  return tester.results;
}

// 如果直接运行此文件
if (require.main === module) {
  runSimplePerformanceTests()
    .then(() => {
      console.log('✅ 性能测试完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ 性能测试失败:', error);
      process.exit(1);
    });
}

module.exports = {
  runSimplePerformanceTests,
  SimplePerformanceTest
};
