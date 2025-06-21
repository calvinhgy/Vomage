# 🧪 Vomage自动化测试计划

**版本**: v1.0  
**制定日期**: 2025-06-21  
**适用范围**: Vomage Voice-driven Social Mood Sharing App

---

## 📋 **测试计划概述**

### 🎯 **测试目标**
- 确保核心功能的稳定性和可靠性
- 验证AI服务集成的正确性
- 保证移动端用户体验的一致性
- 建立持续集成/持续部署的质量保障

### 📊 **测试覆盖率目标**
```
测试类型           | 覆盖率目标 | 当前状态
------------------|-----------|----------
单元测试           | > 85%     | 待建立
集成测试           | > 70%     | 待建立
端到端测试         | > 60%     | 待建立
API测试           | > 90%     | 待建立
性能测试           | 100%      | 待建立
安全测试           | 100%      | 待建立
```

---

## 🏗️ **测试架构设计**

### 🔧 **测试技术栈**
```typescript
// 测试框架配置
interface TestingStack {
  unitTesting: {
    framework: 'Jest';
    coverage: 'Istanbul';
    mocking: 'Jest Mock';
    assertions: 'Jest Matchers';
  };
  
  integrationTesting: {
    framework: 'Jest + Supertest';
    database: 'MongoDB Memory Server';
    mocking: 'MSW (Mock Service Worker)';
  };
  
  e2eTesting: {
    framework: 'Playwright';
    browsers: ['Chrome', 'Safari', 'Firefox'];
    mobile: 'Device Emulation';
  };
  
  apiTesting: {
    framework: 'Jest + Supertest';
    documentation: 'OpenAPI/Swagger';
    mocking: 'Nock';
  };
  
  performanceTesting: {
    framework: 'Artillery.js';
    monitoring: 'Grafana + Prometheus';
    reporting: 'HTML Reports';
  };
}
```

### 📁 **测试目录结构**
```
tests/
├── unit/                    # 单元测试
│   ├── components/         # React组件测试
│   ├── services/          # 服务层测试
│   ├── utils/             # 工具函数测试
│   └── hooks/             # 自定义Hook测试
├── integration/            # 集成测试
│   ├── api/               # API集成测试
│   ├── database/          # 数据库集成测试
│   └── services/          # 服务集成测试
├── e2e/                   # 端到端测试
│   ├── user-flows/        # 用户流程测试
│   ├── mobile/            # 移动端测试
│   └── pwa/               # PWA功能测试
├── performance/           # 性能测试
│   ├── load/              # 负载测试
│   ├── stress/            # 压力测试
│   └── spike/             # 峰值测试
├── security/              # 安全测试
│   ├── auth/              # 认证测试
│   ├── api/               # API安全测试
│   └── data/              # 数据安全测试
├── fixtures/              # 测试数据
├── mocks/                 # Mock数据和服务
└── utils/                 # 测试工具函数
```

---

## 🧪 **单元测试计划**

### 🎯 **测试范围**
- React组件逻辑测试
- 业务逻辑函数测试
- 工具函数测试
- 自定义Hook测试

### 📝 **测试用例示例**
```typescript
// 语音录制组件测试
describe('RecordButton Component', () => {
  test('应该在长按时开始录音', async () => {
    const mockStartRecording = jest.fn();
    render(<RecordButton onStartRecording={mockStartRecording} />);
    
    const button = screen.getByRole('button');
    fireEvent.mouseDown(button);
    
    expect(mockStartRecording).toHaveBeenCalled();
  });

  test('应该在松开时停止录音', async () => {
    const mockStopRecording = jest.fn();
    render(<RecordButton onStopRecording={mockStopRecording} />);
    
    const button = screen.getByRole('button');
    fireEvent.mouseDown(button);
    fireEvent.mouseUp(button);
    
    expect(mockStopRecording).toHaveBeenCalled();
  });
});

// AI服务测试
describe('Claude Service', () => {
  test('应该正确分析语音情感', async () => {
    const mockText = "今天天气真好，心情很愉快";
    const result = await ClaudeService.analyzeSentiment(mockText);
    
    expect(result.mood).toBe('happy');
    expect(result.confidence).toBeGreaterThan(0.8);
  });

  test('应该生成相关的图片提示词', async () => {
    const mockText = "小木屋";
    const result = await ClaudeService.generateImagePrompt(mockText);
    
    expect(result).toContain('wooden cabin');
    expect(result).toContain('cozy');
  });
});
```

### 🎯 **覆盖率要求**
```
组件类型           | 覆盖率目标 | 重点测试内容
------------------|-----------|-------------
UI组件            | > 80%     | 渲染、交互、状态变化
业务逻辑组件       | > 90%     | 数据处理、状态管理
工具函数          | > 95%     | 边界条件、异常处理
API服务          | > 85%     | 请求响应、错误处理
```

---

## 🔗 **集成测试计划**

### 🎯 **测试范围**
- API端点集成测试
- 数据库操作测试
- 第三方服务集成测试
- 微服务间通信测试

### 📝 **测试用例示例**
```typescript
// API集成测试
describe('Voice Processing API', () => {
  test('POST /api/voice/process - 应该成功处理语音文件', async () => {
    const audioFile = fs.readFileSync('./fixtures/test-audio.webm');
    
    const response = await request(app)
      .post('/api/voice/process')
      .attach('audio', audioFile, 'test.webm')
      .expect(200);
    
    expect(response.body).toHaveProperty('transcription');
    expect(response.body).toHaveProperty('sentiment');
    expect(response.body).toHaveProperty('imageUrl');
  });

  test('应该正确处理无效音频文件', async () => {
    const response = await request(app)
      .post('/api/voice/process')
      .attach('audio', Buffer.from('invalid'), 'invalid.txt')
      .expect(400);
    
    expect(response.body.error).toContain('Invalid audio format');
  });
});

// 数据库集成测试
describe('User Database Operations', () => {
  beforeEach(async () => {
    await setupTestDatabase();
  });

  test('应该成功创建用户', async () => {
    const userData = {
      username: 'testuser',
      email: 'test@example.com'
    };
    
    const user = await UserService.createUser(userData);
    
    expect(user.id).toBeDefined();
    expect(user.username).toBe('testuser');
  });
});
```

---

## 🌐 **端到端测试计划**

### 🎯 **测试范围**
- 完整用户流程测试
- 移动端体验测试
- PWA功能测试
- 跨浏览器兼容性测试

### 📝 **测试用例示例**
```typescript
// 用户完整流程测试
describe('Complete User Journey', () => {
  test('用户应该能够完成完整的语音分享流程', async ({ page }) => {
    // 1. 访问应用
    await page.goto('https://18.204.35.132:8443');
    
    // 2. 允许麦克风权限
    await page.context().grantPermissions(['microphone']);
    
    // 3. 开始录音
    const recordButton = page.locator('[data-testid="record-button"]');
    await recordButton.press();
    
    // 4. 模拟录音时间
    await page.waitForTimeout(3000);
    
    // 5. 停止录音
    await recordButton.release();
    
    // 6. 等待处理完成
    await page.waitForSelector('[data-testid="result-container"]', {
      timeout: 60000
    });
    
    // 7. 验证结果
    const transcription = await page.locator('[data-testid="transcription"]').textContent();
    const image = await page.locator('[data-testid="generated-image"]');
    
    expect(transcription).toBeTruthy();
    expect(await image.isVisible()).toBe(true);
  });
});

// 移动端测试
describe('Mobile Experience', () => {
  test('iPhone Safari上的录音功能', async ({ page }) => {
    // 模拟iPhone设备
    await page.setViewportSize({ width: 375, height: 812 });
    await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)');
    
    await page.goto('https://18.204.35.132:8443');
    
    // 测试触摸交互
    const recordButton = page.locator('[data-testid="record-button"]');
    await recordButton.tap();
    
    // 验证录音状态
    await expect(recordButton).toHaveClass(/recording/);
  });
});
```

---

## ⚡ **性能测试计划**

### 🎯 **测试类型**
- 负载测试 (Load Testing)
- 压力测试 (Stress Testing)
- 峰值测试 (Spike Testing)
- 容量测试 (Volume Testing)

### 📊 **性能指标**
```yaml
# 性能测试配置
config:
  target: 'https://18.204.35.132:8443'
  phases:
    - duration: 300  # 5分钟
      arrivalRate: 10  # 每秒10个用户
    - duration: 600  # 10分钟
      arrivalRate: 50  # 每秒50个用户
    - duration: 300  # 5分钟
      arrivalRate: 100 # 每秒100个用户

scenarios:
  - name: "语音处理流程"
    weight: 70
    flow:
      - post:
          url: "/api/voice/process"
          formData:
            audio: "@./fixtures/test-audio.webm"
      - think: 30  # 等待30秒处理时间

  - name: "页面浏览"
    weight: 30
    flow:
      - get:
          url: "/"
      - think: 5
```

### 🎯 **性能目标**
```
指标类型           | 目标值        | 测试方法
------------------|---------------|----------
响应时间           | < 2秒         | 负载测试
API响应           | < 500ms       | 压力测试
并发用户          | > 1000        | 容量测试
错误率            | < 1%          | 稳定性测试
CPU使用率         | < 80%         | 资源监控
内存使用率        | < 85%         | 资源监控
```

---

## 🔒 **安全测试计划**

### 🎯 **测试范围**
- 认证和授权测试
- 输入验证测试
- API安全测试
- 数据保护测试

### 📝 **测试用例示例**
```typescript
// 安全测试用例
describe('Security Tests', () => {
  test('应该防止SQL注入攻击', async () => {
    const maliciousInput = "'; DROP TABLE users; --";
    
    const response = await request(app)
      .post('/api/users/search')
      .send({ query: maliciousInput })
      .expect(400);
    
    expect(response.body.error).toContain('Invalid input');
  });

  test('应该验证JWT令牌', async () => {
    const invalidToken = 'invalid.jwt.token';
    
    const response = await request(app)
      .get('/api/user/profile')
      .set('Authorization', `Bearer ${invalidToken}`)
      .expect(401);
    
    expect(response.body.error).toContain('Invalid token');
  });

  test('应该限制文件上传大小', async () => {
    const largeFile = Buffer.alloc(50 * 1024 * 1024); // 50MB
    
    const response = await request(app)
      .post('/api/voice/process')
      .attach('audio', largeFile, 'large.webm')
      .expect(413);
    
    expect(response.body.error).toContain('File too large');
  });
});
```

---

## 🤖 **AI服务测试计划**

### 🎯 **测试范围**
- Amazon Transcribe集成测试
- Claude API集成测试
- Bedrock Nova Canvas测试
- AI服务降级测试

### 📝 **测试用例示例**
```typescript
// AI服务测试
describe('AI Services Integration', () => {
  test('Amazon Transcribe应该正确转录中文语音', async () => {
    const audioFile = './fixtures/chinese-speech.webm';
    
    const result = await TranscribeService.transcribeAudio(audioFile);
    
    expect(result.text).toContain('预期的中文文本');
    expect(result.confidence).toBeGreaterThan(0.8);
  });

  test('Claude应该生成相关的图片提示词', async () => {
    const text = "小木屋在森林里";
    
    const prompt = await ClaudeService.generateImagePrompt(text);
    
    expect(prompt).toContain('wooden cabin');
    expect(prompt).toContain('forest');
  });

  test('Bedrock Nova应该生成图片', async () => {
    const prompt = "small wooden cabin in forest";
    
    const result = await NovaService.generateImage({ prompt });
    
    expect(result.imageUrl).toMatch(/^data:image\/(png|jpeg);base64,/);
    expect(result.imageData).toBeTruthy();
  });

  test('AI服务失败时应该使用降级方案', async () => {
    // 模拟服务失败
    jest.spyOn(NovaService, 'generateImage').mockRejectedValue(new Error('Service unavailable'));
    
    const result = await AIService.processVoice(mockAudioFile);
    
    expect(result.imageUrl).toMatch(/^data:image\/svg\+xml/); // 降级到SVG
    expect(result.transcription).toBeTruthy(); // 转录仍然工作
  });
});
```

---

## 📱 **移动端测试计划**

### 🎯 **测试设备**
```
设备类型          | 测试设备           | 浏览器
------------------|-------------------|--------
iPhone           | iPhone 12/13/14   | Safari
iPhone           | iPhone SE         | Safari  
Android          | Pixel 6           | Chrome
Android          | Samsung Galaxy    | Chrome
iPad             | iPad Pro          | Safari
```

### 📝 **测试用例**
```typescript
// 移动端特定测试
describe('Mobile Specific Tests', () => {
  test('触摸录音功能在iPhone上正常工作', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('https://18.204.35.132:8443');
    
    const recordButton = page.locator('[data-testid="record-button"]');
    
    // 测试触摸开始
    await recordButton.dispatchEvent('touchstart');
    await expect(page.locator('.recording-indicator')).toBeVisible();
    
    // 测试触摸结束
    await recordButton.dispatchEvent('touchend');
    await expect(page.locator('.processing-indicator')).toBeVisible();
  });

  test('PWA安装提示应该在支持的浏览器中显示', async ({ page }) => {
    await page.goto('https://18.204.35.132:8443');
    
    // 等待PWA安装提示
    const installPrompt = page.locator('[data-testid="pwa-install-prompt"]');
    await expect(installPrompt).toBeVisible({ timeout: 10000 });
  });
});
```

---

## 🔄 **CI/CD集成**

### 🎯 **自动化流程**
```yaml
# .github/workflows/test.yml
name: Automated Testing

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:unit
      - run: npm run test:coverage

  integration-tests:
    runs-on: ubuntu-latest
    services:
      mongodb:
        image: mongo:5.0
        ports:
          - 27017:27017
      redis:
        image: redis:6.2
        ports:
          - 6379:6379
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run test:integration

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npx playwright install
      - run: npm run test:e2e

  performance-tests:
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v3
      - run: npm ci
      - run: npm run test:performance
```

---

## 📊 **测试报告和监控**

### 📈 **测试指标仪表板**
```typescript
// 测试指标收集
interface TestMetrics {
  unitTests: {
    totalTests: number;
    passedTests: number;
    failedTests: number;
    coverage: number;
    duration: number;
  };
  
  integrationTests: {
    totalEndpoints: number;
    passedEndpoints: number;
    averageResponseTime: number;
    errorRate: number;
  };
  
  e2eTests: {
    totalScenarios: number;
    passedScenarios: number;
    averageExecutionTime: number;
    browserCompatibility: BrowserTestResult[];
  };
  
  performanceTests: {
    averageResponseTime: number;
    maxConcurrentUsers: number;
    errorRate: number;
    resourceUtilization: ResourceMetrics;
  };
}
```

### 📋 **测试报告模板**
```markdown
# 测试执行报告

## 执行概要
- 执行时间: ${executionTime}
- 总测试数: ${totalTests}
- 通过率: ${passRate}%
- 覆盖率: ${coverage}%

## 详细结果
### 单元测试
- 通过: ${unitTests.passed}/${unitTests.total}
- 覆盖率: ${unitTests.coverage}%

### 集成测试  
- 通过: ${integrationTests.passed}/${integrationTests.total}
- 平均响应时间: ${integrationTests.avgResponseTime}ms

### 端到端测试
- 通过: ${e2eTests.passed}/${e2eTests.total}
- 浏览器兼容性: ${browserCompatibility}

## 问题和建议
${issues}
```

---

## 🎯 **实施计划**

### **第1周: 基础设施搭建**
- [ ] 配置Jest单元测试环境
- [ ] 设置Playwright端到端测试
- [ ] 建立测试数据和Mock服务
- [ ] 配置CI/CD测试流水线

### **第2周: 核心功能测试**
- [ ] 语音录制组件测试
- [ ] AI服务集成测试
- [ ] API端点测试
- [ ] 数据库操作测试

### **第3周: 用户流程测试**
- [ ] 完整用户旅程测试
- [ ] 移动端兼容性测试
- [ ] PWA功能测试
- [ ] 错误处理测试

### **第4周: 性能和安全测试**
- [ ] 负载和压力测试
- [ ] 安全漏洞测试
- [ ] 性能基准测试
- [ ] 监控和报告系统

---

## 📋 **总结**

这个自动化测试计划为Vomage项目提供了全面的质量保障框架，涵盖了从单元测试到端到端测试的各个层面。通过实施这个计划，我们可以：

- **确保代码质量**: 通过高覆盖率的单元测试
- **验证功能完整性**: 通过集成测试和端到端测试
- **保证用户体验**: 通过移动端和PWA测试
- **确保系统稳定性**: 通过性能和安全测试
- **支持持续交付**: 通过CI/CD集成

**下一步**: 立即开始实施第1周的基础设施搭建任务，为项目建立坚实的质量保障基础。
