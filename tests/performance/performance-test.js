/**
 * 性能测试套件
 * 使用Node.js原生模块进行性能测试
 */

const http = require('http');
const https = require('https');
const { performance } = require('perf_hooks');

// 性能测试配置
const config = {
  baseUrl: 'http://localhost:3000',
  concurrency: 10,
  duration: 60000, // 60秒
  endpoints: [
    { path: '/', method: 'GET', name: '主页访问' },
    { path: '/api/health', method: 'GET', name: '健康检查' },
    { path: '/api/voice/status/test', method: 'GET', name: '状态查询' },
  ]
};

// 性能指标收集器
class PerformanceCollector {
  constructor() {
    this.metrics = {
      requests: 0,
      responses: 0,
      errors: 0,
      responseTimes: [],
      errorTypes: {},
      startTime: null,
      endTime: null
    };
  }

  start() {
    this.metrics.startTime = performance.now();
    console.log('🚀 性能测试开始...');
  }

  recordRequest() {
    this.metrics.requests++;
  }

  recordResponse(responseTime) {
    this.metrics.responses++;
    this.metrics.responseTimes.push(responseTime);
  }

  recordError(error) {
    this.metrics.errors++;
    const errorType = error.code || error.message || 'UNKNOWN';
    this.metrics.errorTypes[errorType] = (this.metrics.errorTypes[errorType] || 0) + 1;
  }

  end() {
    this.metrics.endTime = performance.now();
    return this.generateReport();
  }

  generateReport() {
    const duration = (this.metrics.endTime - this.metrics.startTime) / 1000;
    const responseTimes = this.metrics.responseTimes.sort((a, b) => a - b);
    
    const report = {
      duration: duration,
      totalRequests: this.metrics.requests,
      totalResponses: this.metrics.responses,
      totalErrors: this.metrics.errors,
      successRate: ((this.metrics.responses / this.metrics.requests) * 100).toFixed(2),
      errorRate: ((this.metrics.errors / this.metrics.requests) * 100).toFixed(2),
      requestsPerSecond: (this.metrics.requests / duration).toFixed(2),
      responsesPerSecond: (this.metrics.responses / duration).toFixed(2),
      responseTime: {
        min: Math.min(...responseTimes) || 0,
        max: Math.max(...responseTimes) || 0,
        avg: (responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length) || 0,
        p50: this.percentile(responseTimes, 50),
        p95: this.percentile(responseTimes, 95),
        p99: this.percentile(responseTimes, 99)
      },
      errorTypes: this.metrics.errorTypes
    };

    return report;
  }

  percentile(arr, p) {
    if (arr.length === 0) return 0;
    const index = Math.ceil((p / 100) * arr.length) - 1;
    return arr[index] || 0;
  }
}

// HTTP请求工具
class HttpClient {
  static async request(url, options = {}) {
    return new Promise((resolve, reject) => {
      const startTime = performance.now();
      const client = url.startsWith('https') ? https : http;
      
      const req = client.request(url, options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          const endTime = performance.now();
          const responseTime = endTime - startTime;
          
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: data,
            responseTime: responseTime
          });
        });
      });

      req.on('error', (error) => {
        const endTime = performance.now();
        const responseTime = endTime - startTime;
        
        reject({
          error: error,
          responseTime: responseTime
        });
      });

      req.setTimeout(10000, () => {
        req.destroy();
        reject({
          error: new Error('Request timeout'),
          responseTime: 10000
        });
      });

      if (options.body) {
        req.write(options.body);
      }
      
      req.end();
    });
  }
}

// 负载测试执行器
class LoadTester {
  constructor(config, collector) {
    this.config = config;
    this.collector = collector;
    this.workers = [];
    this.isRunning = false;
  }

  async start() {
    this.isRunning = true;
    this.collector.start();

    console.log(`📊 启动 ${this.config.concurrency} 个并发工作线程`);
    console.log(`⏱️  测试持续时间: ${this.config.duration / 1000} 秒`);

    // 启动并发工作线程
    for (let i = 0; i < this.config.concurrency; i++) {
      this.workers.push(this.createWorker(i));
    }

    // 等待测试完成
    setTimeout(() => {
      this.stop();
    }, this.config.duration);

    await Promise.all(this.workers);
    return this.collector.end();
  }

  async createWorker(workerId) {
    while (this.isRunning) {
      for (const endpoint of this.config.endpoints) {
        if (!this.isRunning) break;

        try {
          this.collector.recordRequest();
          
          const url = `${this.config.baseUrl}${endpoint.path}`;
          const options = {
            method: endpoint.method,
            headers: {
              'User-Agent': `LoadTester-Worker-${workerId}`,
              'Accept': 'application/json,text/html,*/*'
            }
          };

          const response = await HttpClient.request(url, options);
          this.collector.recordResponse(response.responseTime);

          // 简单的响应验证
          if (response.statusCode >= 400) {
            this.collector.recordError(new Error(`HTTP ${response.statusCode}`));
          }

        } catch (error) {
          this.collector.recordError(error.error || error);
        }

        // 随机延迟，模拟真实用户行为
        await this.sleep(Math.random() * 1000);
      }
    }
  }

  stop() {
    this.isRunning = false;
    console.log('🛑 停止性能测试...');
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 性能测试报告生成器
class ReportGenerator {
  static generateConsoleReport(report) {
    console.log('\n' + '='.repeat(60));
    console.log('📈 性能测试报告');
    console.log('='.repeat(60));
    
    console.log(`⏱️  测试持续时间: ${report.duration.toFixed(2)} 秒`);
    console.log(`📊 总请求数: ${report.totalRequests}`);
    console.log(`✅ 成功响应数: ${report.totalResponses}`);
    console.log(`❌ 错误数: ${report.totalErrors}`);
    console.log(`📈 成功率: ${report.successRate}%`);
    console.log(`📉 错误率: ${report.errorRate}%`);
    console.log(`🚀 请求速率: ${report.requestsPerSecond} req/s`);
    console.log(`📥 响应速率: ${report.responsesPerSecond} resp/s`);
    
    console.log('\n📊 响应时间统计 (ms):');
    console.log(`  最小值: ${report.responseTime.min.toFixed(2)}`);
    console.log(`  最大值: ${report.responseTime.max.toFixed(2)}`);
    console.log(`  平均值: ${report.responseTime.avg.toFixed(2)}`);
    console.log(`  P50: ${report.responseTime.p50.toFixed(2)}`);
    console.log(`  P95: ${report.responseTime.p95.toFixed(2)}`);
    console.log(`  P99: ${report.responseTime.p99.toFixed(2)}`);

    if (Object.keys(report.errorTypes).length > 0) {
      console.log('\n❌ 错误类型统计:');
      Object.entries(report.errorTypes).forEach(([type, count]) => {
        console.log(`  ${type}: ${count}`);
      });
    }

    console.log('\n' + '='.repeat(60));
    
    // 性能评估
    this.generatePerformanceAssessment(report);
  }

  static generatePerformanceAssessment(report) {
    console.log('🎯 性能评估:');
    
    const assessments = [];
    
    // 成功率评估
    if (parseFloat(report.successRate) >= 99) {
      assessments.push('✅ 成功率优秀 (≥99%)');
    } else if (parseFloat(report.successRate) >= 95) {
      assessments.push('🟡 成功率良好 (≥95%)');
    } else {
      assessments.push('❌ 成功率需要改进 (<95%)');
    }

    // 响应时间评估
    if (report.responseTime.p95 <= 1000) {
      assessments.push('✅ 响应时间优秀 (P95 ≤1s)');
    } else if (report.responseTime.p95 <= 2000) {
      assessments.push('🟡 响应时间良好 (P95 ≤2s)');
    } else {
      assessments.push('❌ 响应时间需要优化 (P95 >2s)');
    }

    // 吞吐量评估
    if (parseFloat(report.requestsPerSecond) >= 100) {
      assessments.push('✅ 吞吐量优秀 (≥100 req/s)');
    } else if (parseFloat(report.requestsPerSecond) >= 50) {
      assessments.push('🟡 吞吐量良好 (≥50 req/s)');
    } else {
      assessments.push('❌ 吞吐量需要提升 (<50 req/s)');
    }

    assessments.forEach(assessment => console.log(`  ${assessment}`));
    
    console.log('='.repeat(60));
  }

  static async generateJSONReport(report, filename = 'performance-report.json') {
    const fs = require('fs').promises;
    const reportData = {
      timestamp: new Date().toISOString(),
      testConfig: config,
      results: report
    };

    try {
      await fs.writeFile(filename, JSON.stringify(reportData, null, 2));
      console.log(`📄 JSON报告已保存: ${filename}`);
    } catch (error) {
      console.error('❌ 保存JSON报告失败:', error.message);
    }
  }
}

// 主测试函数
async function runPerformanceTest() {
  console.log('🎯 Vomage性能测试套件');
  console.log('='.repeat(60));

  const collector = new PerformanceCollector();
  const tester = new LoadTester(config, collector);

  try {
    const report = await tester.start();
    
    // 生成控制台报告
    ReportGenerator.generateConsoleReport(report);
    
    // 生成JSON报告
    await ReportGenerator.generateJSONReport(report);
    
    return report;
  } catch (error) {
    console.error('❌ 性能测试执行失败:', error);
    throw error;
  }
}

// 如果直接运行此文件
if (require.main === module) {
  runPerformanceTest()
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
  runPerformanceTest,
  PerformanceCollector,
  LoadTester,
  ReportGenerator
};
