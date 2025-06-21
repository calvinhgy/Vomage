/**
 * Vomage AWS性能优化测试脚本
 * 使用Artillery进行负载测试和性能验证
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 测试配置
const TEST_CONFIG = {
  target: process.env.API_ENDPOINT || 'https://api.vomage.com',
  phases: [
    // 预热阶段
    { duration: 60, arrivalRate: 5, name: 'warm-up' },
    // 负载测试阶段
    { duration: 300, arrivalRate: 20, name: 'load-test' },
    // 压力测试阶段
    { duration: 120, arrivalRate: 50, name: 'stress-test' },
    // 峰值测试阶段
    { duration: 60, arrivalRate: 100, name: 'spike-test' }
  ],
  processor: './performance-processor.js'
};

// Artillery配置文件
const ARTILLERY_CONFIG = {
  config: {
    target: TEST_CONFIG.target,
    phases: TEST_CONFIG.phases,
    processor: TEST_CONFIG.processor,
    // 性能指标配置
    metrics: {
      // 自定义指标
      custom: {
        voiceProcessingTime: 'histogram',
        imageGenerationTime: 'histogram',
        transcriptionAccuracy: 'counter',
        cacheHitRate: 'rate'
      }
    },
    // 插件配置
    plugins: {
      'artillery-plugin-cloudwatch': {
        namespace: 'Vomage/LoadTest',
        dimensions: [
          ['TestType', 'PerformanceTest'],
          ['Environment', process.env.ENVIRONMENT || 'production']
        ]
      },
      'artillery-plugin-statsd': {
        host: 'localhost',
        port: 8125,
        prefix: 'vomage.loadtest'
      }
    },
    // HTTP配置
    http: {
      timeout: 120,
      pool: 50
    },
    // WebSocket配置
    ws: {
      timeout: 30
    }
  },
  scenarios: [
    {
      name: '完整语音处理流程',
      weight: 40,
      flow: [
        {
          post: {
            url: '/api/v1/auth/login',
            json: {
              username: '{{ $randomString() }}@test.com',
              password: 'testpassword123'
            },
            capture: {
              json: '$.token',
              as: 'authToken'
            }
          }
        },
        {
          post: {
            url: '/api/v1/voice/upload',
            headers: {
              'Authorization': 'Bearer {{ authToken }}',
              'Content-Type': 'multipart/form-data'
            },
            formData: {
              audio: '@./test-audio/sample-voice.mp3',
              metadata: JSON.stringify({
                duration: 5000,
                location: { lat: 39.9042, lng: 116.4074 },
                weather: { temperature: 25, condition: 'sunny' }
              })
            },
            capture: {
              json: '$.jobId',
              as: 'jobId'
            }
          }
        },
        {
          loop: [
            {
              get: {
                url: '/api/v1/voice/status/{{ jobId }}',
                headers: {
                  'Authorization': 'Bearer {{ authToken }}'
                },
                capture: {
                  json: '$.stage',
                  as: 'processingStage'
                }
              }
            },
            {
              think: 2
            }
          ],
          whileTrue: '{{ processingStage !== "complete" && processingStage !== "error" }}',
          count: 30
        }
      ]
    },
    {
      name: 'API健康检查',
      weight: 20,
      flow: [
        {
          get: {
            url: '/api/health'
          }
        }
      ]
    },
    {
      name: '缓存性能测试',
      weight: 20,
      flow: [
        {
          post: {
            url: '/api/v1/auth/login',
            json: {
              username: 'cache-test@test.com',
              password: 'testpassword123'
            },
            capture: {
              json: '$.token',
              as: 'authToken'
            }
          }
        },
        {
          get: {
            url: '/api/v1/voice/records',
            headers: {
              'Authorization': 'Bearer {{ authToken }}'
            }
          }
        },
        {
          get: {
            url: '/api/v1/user/profile',
            headers: {
              'Authorization': 'Bearer {{ authToken }}'
            }
          }
        }
      ]
    },
    {
      name: 'WebSocket实时通信',
      weight: 20,
      engine: 'ws',
      flow: [
        {
          connect: {
            url: '/ws'
          }
        },
        {
          send: {
            payload: JSON.stringify({
              action: 'subscribe',
              channel: 'processing-updates'
            })
          }
        },
        {
          think: 10
        },
        {
          send: {
            payload: JSON.stringify({
              action: 'getStatus',
              jobId: '{{ $randomString() }}'
            })
          }
        }
      ]
    }
  ]
};

// 性能处理器
const PERFORMANCE_PROCESSOR = `
const AWS = require('aws-sdk');
const cloudwatch = new AWS.CloudWatch({ region: process.env.AWS_REGION || 'us-east-1' });

// 自定义指标发送函数
async function sendCustomMetric(metricName, value, unit = 'Count', dimensions = []) {
  const params = {
    Namespace: 'Vomage/Performance',
    MetricData: [
      {
        MetricName: metricName,
        Value: value,
        Unit: unit,
        Dimensions: dimensions,
        Timestamp: new Date()
      }
    ]
  };
  
  try {
    await cloudwatch.putMetricData(params).promise();
  } catch (error) {
    console.error('发送指标失败:', error);
  }
}

// 请求前处理
function beforeRequest(requestParams, context, ee, next) {
  // 记录请求开始时间
  context.vars.requestStartTime = Date.now();
  return next();
}

// 请求后处理
function afterResponse(requestParams, response, context, ee, next) {
  const responseTime = Date.now() - context.vars.requestStartTime;
  
  // 发送响应时间指标
  sendCustomMetric('APIResponseTime', responseTime, 'Milliseconds', [
    { Name: 'Endpoint', Value: requestParams.url },
    { Name: 'StatusCode', Value: response.statusCode.toString() }
  ]);
  
  // 检查特定端点的性能
  if (requestParams.url.includes('/voice/upload')) {
    sendCustomMetric('VoiceUploadTime', responseTime, 'Milliseconds');
  }
  
  if (requestParams.url.includes('/voice/status')) {
    // 检查处理状态
    try {
      const body = JSON.parse(response.body);
      if (body.stage === 'complete') {
        const processingTime = body.result?.processingTime || 0;
        sendCustomMetric('VoiceProcessingDuration', processingTime, 'Milliseconds', [
          { Name: 'ProcessingStage', Value: 'total' }
        ]);
      }
    } catch (error) {
      console.error('解析响应失败:', error);
    }
  }
  
  return next();
}

// WebSocket消息处理
function onWebSocketMessage(message, context, ee, next) {
  try {
    const data = JSON.parse(message);
    
    if (data.type === 'processing_update') {
      const stage = data.data.stage;
      const progress = data.data.progress;
      
      // 发送处理进度指标
      sendCustomMetric('ProcessingProgress', progress, 'Percent', [
        { Name: 'Stage', Value: stage }
      ]);
      
      // 如果处理完成，记录总时间
      if (stage === 'complete' && data.data.result) {
        const processingTime = data.data.result.processingTime || 0;
        sendCustomMetric('VoiceProcessingDuration', processingTime, 'Milliseconds', [
          { Name: 'ProcessingStage', Value: 'total' }
        ]);
      }
    }
  } catch (error) {
    console.error('处理WebSocket消息失败:', error);
  }
  
  return next();
}

// 错误处理
function onError(error, context, ee, next) {
  // 发送错误指标
  sendCustomMetric('ErrorCount', 1, 'Count', [
    { Name: 'ErrorType', Value: error.code || 'Unknown' }
  ]);
  
  console.error('请求错误:', error);
  return next();
}

module.exports = {
  beforeRequest,
  afterResponse,
  onWebSocketMessage,
  onError
};
`;

// 测试数据生成器
class TestDataGenerator {
  static generateTestAudio() {
    // 生成测试音频文件
    const audioSamples = [
      '今天天气真好，心情很愉快',
      '工作压力很大，需要放松一下',
      '和朋友聚餐，非常开心',
      '看了一部很棒的电影',
      '在公园里散步，很舒服'
    ];
    
    return audioSamples[Math.floor(Math.random() * audioSamples.length)];
  }
  
  static generateUserData() {
    return {
      username: `test-user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}@test.com`,
      password: 'testpassword123',
      profile: {
        nickname: `测试用户${Math.floor(Math.random() * 1000)}`,
        avatar: 'https://example.com/avatar.jpg'
      }
    };
  }
  
  static generateLocationData() {
    const locations = [
      { lat: 39.9042, lng: 116.4074, name: '北京' },
      { lat: 31.2304, lng: 121.4737, name: '上海' },
      { lat: 22.3193, lng: 114.1694, name: '香港' },
      { lat: 25.0330, lng: 121.5654, name: '台北' }
    ];
    
    return locations[Math.floor(Math.random() * locations.length)];
  }
}

// 性能测试执行器
class PerformanceTestRunner {
  constructor() {
    this.testResults = {
      startTime: new Date(),
      endTime: null,
      summary: {},
      errors: [],
      metrics: {}
    };
  }
  
  async runTests() {
    console.log('🚀 开始Vomage性能测试...');
    
    try {
      // 准备测试环境
      await this.prepareTestEnvironment();
      
      // 运行负载测试
      await this.runLoadTest();
      
      // 运行压力测试
      await this.runStressTest();
      
      // 运行峰值测试
      await this.runSpikeTest();
      
      // 生成测试报告
      await this.generateReport();
      
      console.log('✅ 性能测试完成');
      
    } catch (error) {
      console.error('❌ 性能测试失败:', error);
      this.testResults.errors.push(error);
    } finally {
      this.testResults.endTime = new Date();
      await this.cleanup();
    }
  }
  
  async prepareTestEnvironment() {
    console.log('准备测试环境...');
    
    // 创建测试配置文件
    fs.writeFileSync('./artillery-config.yml', JSON.stringify(ARTILLERY_CONFIG, null, 2));
    
    // 创建性能处理器文件
    fs.writeFileSync('./performance-processor.js', PERFORMANCE_PROCESSOR);
    
    // 创建测试音频目录
    if (!fs.existsSync('./test-audio')) {
      fs.mkdirSync('./test-audio');
    }
    
    // 生成测试音频文件（模拟）
    const testAudioContent = Buffer.from('fake-audio-content-for-testing');
    fs.writeFileSync('./test-audio/sample-voice.mp3', testAudioContent);
    
    console.log('✅ 测试环境准备完成');
  }
  
  async runLoadTest() {
    console.log('运行负载测试...');
    
    try {
      const result = execSync('artillery run artillery-config.yml --output load-test-report.json', {
        encoding: 'utf8',
        timeout: 600000 // 10分钟超时
      });
      
      console.log('负载测试结果:', result);
      this.testResults.loadTest = JSON.parse(fs.readFileSync('./load-test-report.json', 'utf8'));
      
    } catch (error) {
      console.error('负载测试失败:', error);
      this.testResults.errors.push({ type: 'load-test', error: error.message });
    }
  }
  
  async runStressTest() {
    console.log('运行压力测试...');
    
    // 修改配置为压力测试
    const stressConfig = { ...ARTILLERY_CONFIG };
    stressConfig.config.phases = [
      { duration: 300, arrivalRate: 100, name: 'stress-test' }
    ];
    
    fs.writeFileSync('./stress-config.yml', JSON.stringify(stressConfig, null, 2));
    
    try {
      const result = execSync('artillery run stress-config.yml --output stress-test-report.json', {
        encoding: 'utf8',
        timeout: 600000
      });
      
      console.log('压力测试结果:', result);
      this.testResults.stressTest = JSON.parse(fs.readFileSync('./stress-test-report.json', 'utf8'));
      
    } catch (error) {
      console.error('压力测试失败:', error);
      this.testResults.errors.push({ type: 'stress-test', error: error.message });
    }
  }
  
  async runSpikeTest() {
    console.log('运行峰值测试...');
    
    // 修改配置为峰值测试
    const spikeConfig = { ...ARTILLERY_CONFIG };
    spikeConfig.config.phases = [
      { duration: 60, arrivalRate: 10, name: 'baseline' },
      { duration: 60, arrivalRate: 200, name: 'spike' },
      { duration: 60, arrivalRate: 10, name: 'recovery' }
    ];
    
    fs.writeFileSync('./spike-config.yml', JSON.stringify(spikeConfig, null, 2));
    
    try {
      const result = execSync('artillery run spike-config.yml --output spike-test-report.json', {
        encoding: 'utf8',
        timeout: 600000
      });
      
      console.log('峰值测试结果:', result);
      this.testResults.spikeTest = JSON.parse(fs.readFileSync('./spike-test-report.json', 'utf8'));
      
    } catch (error) {
      console.error('峰值测试失败:', error);
      this.testResults.errors.push({ type: 'spike-test', error: error.message });
    }
  }
  
  async generateReport() {
    console.log('生成性能测试报告...');
    
    const report = {
      testInfo: {
        startTime: this.testResults.startTime,
        endTime: this.testResults.endTime,
        duration: this.testResults.endTime - this.testResults.startTime,
        target: TEST_CONFIG.target,
        environment: process.env.ENVIRONMENT || 'production'
      },
      summary: this.calculateSummary(),
      recommendations: this.generateRecommendations(),
      errors: this.testResults.errors
    };
    
    // 生成HTML报告
    const htmlReport = this.generateHTMLReport(report);
    fs.writeFileSync('./performance-test-report.html', htmlReport);
    
    // 生成JSON报告
    fs.writeFileSync('./performance-test-report.json', JSON.stringify(report, null, 2));
    
    console.log('✅ 性能测试报告已生成');
    console.log('📊 HTML报告: ./performance-test-report.html');
    console.log('📄 JSON报告: ./performance-test-report.json');
  }
  
  calculateSummary() {
    const summary = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      p95ResponseTime: 0,
      p99ResponseTime: 0,
      throughput: 0,
      errorRate: 0
    };
    
    // 合并所有测试结果
    const allTests = [
      this.testResults.loadTest,
      this.testResults.stressTest,
      this.testResults.spikeTest
    ].filter(test => test);
    
    allTests.forEach(test => {
      if (test.aggregate) {
        summary.totalRequests += test.aggregate.counters['http.requests'] || 0;
        summary.successfulRequests += test.aggregate.counters['http.responses'] || 0;
        summary.failedRequests += test.aggregate.counters['http.request_rate'] || 0;
        
        if (test.aggregate.histograms && test.aggregate.histograms['http.response_time']) {
          const responseTime = test.aggregate.histograms['http.response_time'];
          summary.averageResponseTime = Math.max(summary.averageResponseTime, responseTime.mean || 0);
          summary.p95ResponseTime = Math.max(summary.p95ResponseTime, responseTime.p95 || 0);
          summary.p99ResponseTime = Math.max(summary.p99ResponseTime, responseTime.p99 || 0);
        }
      }
    });
    
    summary.errorRate = summary.totalRequests > 0 ? 
      (summary.failedRequests / summary.totalRequests) * 100 : 0;
    
    return summary;
  }
  
  generateRecommendations() {
    const recommendations = [];
    const summary = this.calculateSummary();
    
    // 响应时间建议
    if (summary.averageResponseTime > 200) {
      recommendations.push({
        type: 'performance',
        priority: 'high',
        message: \`平均响应时间(\${summary.averageResponseTime}ms)超过目标值(200ms)，建议优化API性能\`
      });
    }
    
    // 错误率建议
    if (summary.errorRate > 1) {
      recommendations.push({
        type: 'reliability',
        priority: 'high',
        message: \`错误率(\${summary.errorRate.toFixed(2)}%)过高，需要检查系统稳定性\`
      });
    }
    
    // P95响应时间建议
    if (summary.p95ResponseTime > 1000) {
      recommendations.push({
        type: 'performance',
        priority: 'medium',
        message: \`P95响应时间(\${summary.p95ResponseTime}ms)较高，建议优化慢查询\`
      });
    }
    
    return recommendations;
  }
  
  generateHTMLReport(report) {
    return \`
<!DOCTYPE html>
<html>
<head>
    <title>Vomage性能测试报告</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f0f0f0; padding: 20px; border-radius: 5px; }
        .summary { display: flex; justify-content: space-around; margin: 20px 0; }
        .metric { text-align: center; padding: 10px; border: 1px solid #ddd; border-radius: 5px; }
        .metric-value { font-size: 24px; font-weight: bold; color: #007cba; }
        .recommendations { margin: 20px 0; }
        .recommendation { padding: 10px; margin: 5px 0; border-left: 4px solid #007cba; background: #f9f9f9; }
        .high-priority { border-left-color: #d32f2f; }
        .medium-priority { border-left-color: #f57c00; }
        .low-priority { border-left-color: #388e3c; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🚀 Vomage性能测试报告</h1>
        <p><strong>测试时间:</strong> \${report.testInfo.startTime} - \${report.testInfo.endTime}</p>
        <p><strong>测试环境:</strong> \${report.testInfo.environment}</p>
        <p><strong>测试目标:</strong> \${report.testInfo.target}</p>
    </div>
    
    <h2>📊 性能指标摘要</h2>
    <div class="summary">
        <div class="metric">
            <div class="metric-value">\${report.summary.totalRequests}</div>
            <div>总请求数</div>
        </div>
        <div class="metric">
            <div class="metric-value">\${report.summary.averageResponseTime}ms</div>
            <div>平均响应时间</div>
        </div>
        <div class="metric">
            <div class="metric-value">\${report.summary.p95ResponseTime}ms</div>
            <div>P95响应时间</div>
        </div>
        <div class="metric">
            <div class="metric-value">\${report.summary.errorRate.toFixed(2)}%</div>
            <div>错误率</div>
        </div>
    </div>
    
    <h2>💡 优化建议</h2>
    <div class="recommendations">
        \${report.recommendations.map(rec => \`
            <div class="recommendation \${rec.priority}-priority">
                <strong>[\${rec.type.toUpperCase()}]</strong> \${rec.message}
            </div>
        \`).join('')}
    </div>
    
    <h2>🔍 详细结果</h2>
    <pre>\${JSON.stringify(report, null, 2)}</pre>
</body>
</html>
    \`;
  }
  
  async cleanup() {
    console.log('清理测试文件...');
    
    const filesToClean = [
      './artillery-config.yml',
      './stress-config.yml',
      './spike-config.yml',
      './performance-processor.js',
      './load-test-report.json',
      './stress-test-report.json',
      './spike-test-report.json',
      './test-audio'
    ];
    
    filesToClean.forEach(file => {
      try {
        if (fs.existsSync(file)) {
          if (fs.lstatSync(file).isDirectory()) {
            fs.rmSync(file, { recursive: true });
          } else {
            fs.unlinkSync(file);
          }
        }
      } catch (error) {
        console.warn(\`清理文件失败: \${file}\`, error);
      }
    });
    
    console.log('✅ 清理完成');
  }
}

// 主执行函数
async function main() {
  const runner = new PerformanceTestRunner();
  await runner.runTests();
}

// 如果直接运行此脚本
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  PerformanceTestRunner,
  TestDataGenerator,
  TEST_CONFIG
};
