# Vomage 技术架构设计文档

## 1. 系统架构概览

### 1.1 整体架构
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Mobile Web    │    │   API Gateway   │    │   Microservices │
│   (React PWA)   │◄──►│   (Express.js)  │◄──►│   Architecture  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Service       │    │   Load Balancer │    │   Database      │
│   Worker        │    │   (AWS ALB)     │    │   (MongoDB)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### 1.2 技术栈选择

#### 前端技术栈
- **React 18**: 现代化UI框架，支持并发特性
- **TypeScript**: 类型安全，提高代码质量
- **Vite**: 快速构建工具
- **Tailwind CSS**: 实用优先的CSS框架
- **Zustand**: 轻量级状态管理
- **React Query**: 服务端状态管理

#### 后端技术栈
- **Node.js**: JavaScript运行时
- **Express.js**: Web应用框架
- **TypeScript**: 后端类型安全
- **MongoDB**: NoSQL数据库
- **Redis**: 缓存和会话存储
- **Socket.io**: 实时通信

## 2. 前端架构设计

### 2.1 组件架构
```
src/
├── components/           # 可复用组件
│   ├── ui/              # 基础UI组件
│   ├── forms/           # 表单组件
│   └── layout/          # 布局组件
├── pages/               # 页面组件
│   ├── Home/
│   ├── Record/
│   ├── Profile/
│   └── Timeline/
├── hooks/               # 自定义Hooks
├── services/            # API服务
├── stores/              # 状态管理
├── utils/               # 工具函数
└── types/               # TypeScript类型定义
```

### 2.2 状态管理架构
```typescript
// 全局状态结构
interface AppState {
  user: UserState;
  audio: AudioState;
  posts: PostsState;
  ui: UIState;
}

interface UserState {
  profile: UserProfile | null;
  isAuthenticated: boolean;
  location: GeolocationData | null;
}

interface AudioState {
  isRecording: boolean;
  audioBlob: Blob | null;
  duration: number;
  waveformData: number[];
}
```

### 2.3 PWA配置
```json
{
  "name": "Vomage",
  "short_name": "Vomage",
  "description": "Voice-driven social mood sharing",
  "start_url": "/",
  "display": "standalone",
  "theme_color": "#6366f1",
  "background_color": "#ffffff",
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    }
  ]
}
```

## 3. 后端架构设计

### 3.1 微服务架构
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Auth Service  │    │  Audio Service  │    │  Image Service  │
│   (JWT/OAuth)   │    │  (Processing)   │    │  (Generation)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Social Service │    │   API Gateway   │    │  Weather Service│
│  (Posts/Likes)  │    │   (Routing)     │    │  (External API) │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### 3.2 数据库设计
```javascript
// MongoDB Collections

// Users Collection
{
  _id: ObjectId,
  username: String,
  email: String,
  passwordHash: String,
  profile: {
    avatar: String,
    bio: String,
    location: String
  },
  preferences: {
    privacy: String, // 'public' | 'friends' | 'private'
    notifications: Boolean
  },
  createdAt: Date,
  updatedAt: Date
}

// Posts Collection
{
  _id: ObjectId,
  userId: ObjectId,
  audioUrl: String,
  imageUrl: String,
  transcript: String,
  emotion: String,
  metadata: {
    location: {
      latitude: Number,
      longitude: Number,
      address: String
    },
    weather: {
      temperature: Number,
      condition: String,
      humidity: Number
    },
    timestamp: Date
  },
  likes: [ObjectId],
  comments: [{
    userId: ObjectId,
    content: String,
    createdAt: Date
  }],
  privacy: String,
  createdAt: Date
}
```

### 3.3 API设计
```typescript
// RESTful API 端点设计

// 认证相关
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/me

// 用户相关
GET    /api/users/:id
PUT    /api/users/:id
DELETE /api/users/:id

// 帖子相关
GET    /api/posts              // 获取时间线
POST   /api/posts              // 创建新帖子
GET    /api/posts/:id          // 获取单个帖子
PUT    /api/posts/:id          // 更新帖子
DELETE /api/posts/:id          // 删除帖子
POST   /api/posts/:id/like     // 点赞
POST   /api/posts/:id/comment  // 评论

// 音频处理
POST /api/audio/upload         // 上传音频
POST /api/audio/transcribe     // 语音转文字

// 图片生成
POST /api/images/generate      // 生成心情图片

// 外部数据
GET /api/weather/:lat/:lng     // 获取天气信息
```

## 4. 核心功能实现架构

### 4.1 语音录制架构
```typescript
class AudioRecorder {
  private mediaRecorder: MediaRecorder;
  private audioChunks: Blob[];
  private stream: MediaStream;

  async startRecording(): Promise<void> {
    // 获取麦克风权限
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        sampleRate: 44100
      }
    });

    // 创建MediaRecorder实例
    this.mediaRecorder = new MediaRecorder(this.stream, {
      mimeType: 'audio/webm;codecs=opus'
    });

    // 设置事件监听
    this.setupEventListeners();
    this.mediaRecorder.start();
  }

  private setupEventListeners(): void {
    this.mediaRecorder.ondataavailable = (event) => {
      this.audioChunks.push(event.data);
    };

    this.mediaRecorder.onstop = () => {
      const audioBlob = new Blob(this.audioChunks, {
        type: 'audio/webm'
      });
      this.onRecordingComplete(audioBlob);
    };
  }
}
```

### 4.2 图片生成流程架构
```typescript
interface ImageGenerationPipeline {
  // 1. 语音转文字
  transcribeAudio(audioBlob: Blob): Promise<string>;
  
  // 2. 情感分析
  analyzeEmotion(transcript: string): Promise<EmotionData>;
  
  // 3. 上下文数据收集
  gatherContextData(location: Location): Promise<ContextData>;
  
  // 4. 生成提示词
  generatePrompt(
    emotion: EmotionData,
    context: ContextData
  ): Promise<string>;
  
  // 5. 调用图片生成API
  generateImage(prompt: string): Promise<string>;
}

interface ContextData {
  weather: WeatherData;
  timeOfDay: string;
  season: string;
  location: LocationData;
}
```

### 4.3 实时通信架构
```typescript
// Socket.io 事件定义
interface SocketEvents {
  // 客户端到服务端
  'join-room': (roomId: string) => void;
  'new-post': (postData: PostData) => void;
  'like-post': (postId: string) => void;
  
  // 服务端到客户端
  'post-created': (post: Post) => void;
  'post-liked': (postId: string, likesCount: number) => void;
  'user-online': (userId: string) => void;
}
```

## 5. 安全架构

### 5.1 认证授权
```typescript
// JWT Token 结构
interface JWTPayload {
  userId: string;
  email: string;
  role: 'user' | 'admin';
  iat: number;
  exp: number;
}

// 权限中间件
const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};
```

### 5.2 数据安全
```typescript
// 数据加密配置
const encryptionConfig = {
  algorithm: 'aes-256-gcm',
  keyLength: 32,
  ivLength: 16,
  tagLength: 16
};

// 敏感数据加密
class DataEncryption {
  static encrypt(data: string, key: string): EncryptedData {
    const iv = crypto.randomBytes(encryptionConfig.ivLength);
    const cipher = crypto.createCipher(encryptionConfig.algorithm, key);
    cipher.setAAD(Buffer.from('vomage-app'));
    
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return {
      encrypted,
      iv: iv.toString('hex'),
      tag: cipher.getAuthTag().toString('hex')
    };
  }
}
```

## 6. 性能优化架构

### 6.1 缓存策略
```typescript
// Redis 缓存配置
const cacheConfig = {
  // 用户会话缓存
  session: {
    ttl: 24 * 60 * 60, // 24小时
    prefix: 'session:'
  },
  
  // API响应缓存
  api: {
    ttl: 5 * 60, // 5分钟
    prefix: 'api:'
  },
  
  // 图片生成缓存
  images: {
    ttl: 7 * 24 * 60 * 60, // 7天
    prefix: 'img:'
  }
};
```

### 6.2 CDN配置
```typescript
// AWS CloudFront 配置
const cdnConfig = {
  origins: [
    {
      domainName: 'api.vomage.com',
      pathPattern: '/api/images/*',
      cacheBehavior: {
        ttl: 86400, // 24小时
        compress: true
      }
    }
  ],
  
  customErrorPages: [
    {
      errorCode: 404,
      responsePagePath: '/404.html'
    }
  ]
};
```

## 7. 监控和日志架构

### 7.1 应用监控
```typescript
// 性能监控指标
interface PerformanceMetrics {
  responseTime: number;
  throughput: number;
  errorRate: number;
  cpuUsage: number;
  memoryUsage: number;
}

// 业务监控指标
interface BusinessMetrics {
  dailyActiveUsers: number;
  postsCreated: number;
  imageGenerationSuccess: number;
  userRetention: number;
}
```

### 7.2 错误处理
```typescript
// 全局错误处理器
class ErrorHandler {
  static handle(error: Error, req: Request, res: Response) {
    // 记录错误日志
    logger.error({
      message: error.message,
      stack: error.stack,
      url: req.url,
      method: req.method,
      userId: req.user?.userId
    });

    // 返回用户友好的错误信息
    const statusCode = error instanceof ValidationError ? 400 : 500;
    res.status(statusCode).json({
      error: 'Something went wrong',
      requestId: req.id
    });
  }
}
```

## 8. 部署架构

### 8.1 AWS部署架构
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   CloudFront    │    │   Route 53      │    │   Certificate   │
│   (CDN)         │    │   (DNS)         │    │   Manager       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Application   │    │   Load Balancer │    │   Auto Scaling  │
│   Load Balancer │    │   (ALB)         │    │   Group         │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   ECS Fargate   │    │   RDS/MongoDB   │    │   ElastiCache   │
│   (Containers)  │    │   (Database)    │    │   (Redis)       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### 8.2 CI/CD流水线
```yaml
# GitHub Actions 配置
name: Deploy Vomage
on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run tests
        run: npm test

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - name: Build Docker image
        run: docker build -t vomage:latest .
      
      - name: Push to ECR
        run: |
          aws ecr get-login-password | docker login --username AWS --password-stdin
          docker push vomage:latest

  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to ECS
        run: aws ecs update-service --cluster vomage --service vomage-service
```

这个技术架构设计为Vomage应用提供了完整的技术实现方案，涵盖了前端、后端、数据库、安全、性能优化和部署等各个方面。
