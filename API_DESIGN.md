# Vomage API 设计文档

## 1. API 概览

### 1.1 基础信息
- **Base URL**: `https://api.vomage.com/v1`
- **协议**: HTTPS
- **认证方式**: JWT Bearer Token
- **数据格式**: JSON
- **字符编码**: UTF-8

### 1.2 通用响应格式
```typescript
// 成功响应
interface SuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
  timestamp: string;
  requestId: string;
}

// 错误响应
interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: string;
  requestId: string;
}
```

### 1.3 HTTP状态码规范
- `200` - 请求成功
- `201` - 资源创建成功
- `400` - 请求参数错误
- `401` - 未授权访问
- `403` - 权限不足
- `404` - 资源不存在
- `429` - 请求频率限制
- `500` - 服务器内部错误

## 2. 认证相关 API

### 2.1 用户注册
```http
POST /auth/register
Content-Type: application/json

{
  "username": "string",
  "email": "string",
  "password": "string",
  "confirmPassword": "string"
}
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "64f1a2b3c4d5e6f7g8h9i0j1",
      "username": "johndoe",
      "email": "john@example.com",
      "profile": {
        "avatar": null,
        "bio": null
      },
      "createdAt": "2024-01-15T10:30:00Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "message": "Registration successful",
  "timestamp": "2024-01-15T10:30:00Z",
  "requestId": "req_123456789"
}
```

### 2.2 用户登录
```http
POST /auth/login
Content-Type: application/json

{
  "email": "string",
  "password": "string"
}
```

### 2.3 刷新Token
```http
POST /auth/refresh
Authorization: Bearer <refresh_token>
```

### 2.4 用户登出
```http
POST /auth/logout
Authorization: Bearer <access_token>
```

### 2.5 获取当前用户信息
```http
GET /auth/me
Authorization: Bearer <access_token>
```

## 3. 用户管理 API

### 3.1 获取用户信息
```http
GET /users/{userId}
Authorization: Bearer <access_token>
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "id": "64f1a2b3c4d5e6f7g8h9i0j1",
    "username": "johndoe",
    "profile": {
      "avatar": "https://cdn.vomage.com/avatars/johndoe.jpg",
      "bio": "Love sharing my daily moods!",
      "location": "San Francisco, CA",
      "joinedAt": "2024-01-15T10:30:00Z"
    },
    "stats": {
      "postsCount": 42,
      "followersCount": 128,
      "followingCount": 95
    },
    "isFollowing": false
  }
}
```

### 3.2 更新用户信息
```http
PUT /users/{userId}
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "profile": {
    "bio": "string",
    "location": "string"
  },
  "preferences": {
    "privacy": "public" | "friends" | "private",
    "notifications": boolean
  }
}
```

### 3.3 上传头像
```http
POST /users/{userId}/avatar
Authorization: Bearer <access_token>
Content-Type: multipart/form-data

avatar: <file>
```

## 4. 帖子管理 API

### 4.1 获取时间线
```http
GET /posts?page=1&limit=20&sort=latest
Authorization: Bearer <access_token>
```

**查询参数**:
- `page`: 页码 (默认: 1)
- `limit`: 每页数量 (默认: 20, 最大: 50)
- `sort`: 排序方式 (`latest`, `popular`, `trending`)
- `userId`: 特定用户的帖子
- `emotion`: 按情感筛选

**响应示例**:
```json
{
  "success": true,
  "data": {
    "posts": [
      {
        "id": "64f1a2b3c4d5e6f7g8h9i0j2",
        "user": {
          "id": "64f1a2b3c4d5e6f7g8h9i0j1",
          "username": "johndoe",
          "avatar": "https://cdn.vomage.com/avatars/johndoe.jpg"
        },
        "audioUrl": "https://cdn.vomage.com/audio/post_123.webm",
        "imageUrl": "https://cdn.vomage.com/images/mood_123.jpg",
        "transcript": "Feeling great today! The weather is perfect.",
        "emotion": {
          "primary": "joy",
          "confidence": 0.89,
          "secondary": ["excitement", "contentment"]
        },
        "metadata": {
          "location": {
            "latitude": 37.7749,
            "longitude": -122.4194,
            "address": "San Francisco, CA"
          },
          "weather": {
            "temperature": 22,
            "condition": "sunny",
            "humidity": 65,
            "description": "Clear sky"
          },
          "timestamp": "2024-01-15T14:30:00Z"
        },
        "stats": {
          "likesCount": 15,
          "commentsCount": 3,
          "sharesCount": 2
        },
        "isLiked": false,
        "privacy": "public",
        "createdAt": "2024-01-15T14:30:00Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalItems": 100,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

### 4.2 创建新帖子
```http
POST /posts
Authorization: Bearer <access_token>
Content-Type: multipart/form-data

audio: <file>
privacy: "public" | "friends" | "private"
location: {
  "latitude": number,
  "longitude": number
}
```

**处理流程**:
1. 上传音频文件到S3
2. 调用语音转文字服务
3. 进行情感分析
4. 获取天气和位置信息
5. 生成心情图片
6. 保存帖子数据

**响应示例**:
```json
{
  "success": true,
  "data": {
    "postId": "64f1a2b3c4d5e6f7g8h9i0j2",
    "status": "processing",
    "estimatedTime": 30
  },
  "message": "Post is being processed"
}
```

### 4.3 获取单个帖子
```http
GET /posts/{postId}
Authorization: Bearer <access_token>
```

### 4.4 删除帖子
```http
DELETE /posts/{postId}
Authorization: Bearer <access_token>
```

### 4.5 点赞帖子
```http
POST /posts/{postId}/like
Authorization: Bearer <access_token>
```

### 4.6 取消点赞
```http
DELETE /posts/{postId}/like
Authorization: Bearer <access_token>
```

### 4.7 添加评论
```http
POST /posts/{postId}/comments
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "content": "string",
  "parentId": "string" // 可选，用于回复评论
}
```

### 4.8 获取评论列表
```http
GET /posts/{postId}/comments?page=1&limit=20
Authorization: Bearer <access_token>
```

## 5. 音频处理 API

### 5.1 上传音频文件
```http
POST /audio/upload
Authorization: Bearer <access_token>
Content-Type: multipart/form-data

audio: <file>
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "audioId": "audio_64f1a2b3c4d5e6f7g8h9i0j3",
    "url": "https://cdn.vomage.com/audio/temp_123.webm",
    "duration": 45.2,
    "size": 1024000,
    "format": "webm"
  }
}
```

### 5.2 语音转文字
```http
POST /audio/transcribe
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "audioId": "string",
  "language": "en-US" // 可选
}
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "transcript": "Hello, I'm feeling really happy today because the weather is so nice!",
    "confidence": 0.95,
    "language": "en-US",
    "segments": [
      {
        "text": "Hello, I'm feeling really happy today",
        "start": 0.0,
        "end": 2.5,
        "confidence": 0.98
      },
      {
        "text": "because the weather is so nice!",
        "start": 2.5,
        "end": 4.8,
        "confidence": 0.92
      }
    ]
  }
}
```

### 5.3 情感分析
```http
POST /audio/analyze-emotion
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "transcript": "string",
  "audioId": "string" // 可选，用于音频情感分析
}
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "primary": "joy",
    "confidence": 0.89,
    "secondary": ["excitement", "contentment"],
    "intensity": 0.75,
    "valence": 0.82, // 正负情感倾向 (-1 到 1)
    "arousal": 0.68, // 激活程度 (0 到 1)
    "details": {
      "joy": 0.89,
      "excitement": 0.45,
      "contentment": 0.32,
      "neutral": 0.11
    }
  }
}
```

## 6. 图片生成 API

### 6.1 生成心情图片
```http
POST /images/generate
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "transcript": "string",
  "emotion": {
    "primary": "string",
    "confidence": number,
    "secondary": ["string"]
  },
  "context": {
    "weather": {
      "temperature": number,
      "condition": "string",
      "description": "string"
    },
    "location": {
      "latitude": number,
      "longitude": number,
      "address": "string"
    },
    "timeOfDay": "morning" | "afternoon" | "evening" | "night",
    "season": "spring" | "summer" | "autumn" | "winter"
  },
  "style": "realistic" | "artistic" | "abstract" | "minimalist"
}
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "imageId": "img_64f1a2b3c4d5e6f7g8h9i0j4",
    "url": "https://cdn.vomage.com/images/mood_123.jpg",
    "thumbnailUrl": "https://cdn.vomage.com/images/thumb_mood_123.jpg",
    "prompt": "A joyful sunny day scene with warm golden light, representing happiness and contentment, artistic style with vibrant colors",
    "style": "artistic",
    "dimensions": {
      "width": 1024,
      "height": 1024
    },
    "generatedAt": "2024-01-15T14:35:00Z"
  }
}
```

### 6.2 获取图片生成状态
```http
GET /images/generate/{taskId}/status
Authorization: Bearer <access_token>
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "taskId": "task_64f1a2b3c4d5e6f7g8h9i0j5",
    "status": "completed", // "pending" | "processing" | "completed" | "failed"
    "progress": 100,
    "result": {
      "imageUrl": "https://cdn.vomage.com/images/mood_123.jpg",
      "thumbnailUrl": "https://cdn.vomage.com/images/thumb_mood_123.jpg"
    },
    "estimatedTime": 0,
    "createdAt": "2024-01-15T14:30:00Z",
    "completedAt": "2024-01-15T14:35:00Z"
  }
}
```

## 7. 外部数据 API

### 7.1 获取天气信息
```http
GET /weather?lat={latitude}&lng={longitude}
Authorization: Bearer <access_token>
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "current": {
      "temperature": 22,
      "feelsLike": 24,
      "humidity": 65,
      "pressure": 1013,
      "visibility": 10,
      "uvIndex": 5,
      "condition": "sunny",
      "description": "Clear sky",
      "icon": "01d"
    },
    "forecast": [
      {
        "date": "2024-01-15",
        "high": 25,
        "low": 18,
        "condition": "sunny",
        "description": "Sunny day",
        "precipitation": 0
      }
    ],
    "location": {
      "name": "San Francisco",
      "country": "US",
      "timezone": "America/Los_Angeles"
    },
    "updatedAt": "2024-01-15T14:30:00Z"
  }
}
```

### 7.2 地理编码
```http
GET /geocoding/reverse?lat={latitude}&lng={longitude}
Authorization: Bearer <access_token>
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "address": {
      "formatted": "1600 Amphitheatre Parkway, Mountain View, CA 94043, USA",
      "street": "1600 Amphitheatre Parkway",
      "city": "Mountain View",
      "state": "California",
      "country": "United States",
      "postalCode": "94043",
      "countryCode": "US"
    },
    "coordinates": {
      "latitude": 37.4224764,
      "longitude": -122.0842499
    }
  }
}
```

## 8. 社交功能 API

### 8.1 关注用户
```http
POST /users/{userId}/follow
Authorization: Bearer <access_token>
```

### 8.2 取消关注
```http
DELETE /users/{userId}/follow
Authorization: Bearer <access_token>
```

### 8.3 获取关注列表
```http
GET /users/{userId}/following?page=1&limit=20
Authorization: Bearer <access_token>
```

### 8.4 获取粉丝列表
```http
GET /users/{userId}/followers?page=1&limit=20
Authorization: Bearer <access_token>
```

### 8.5 搜索用户
```http
GET /users/search?q={query}&page=1&limit=20
Authorization: Bearer <access_token>
```

## 9. 通知 API

### 9.1 获取通知列表
```http
GET /notifications?page=1&limit=20&type=all
Authorization: Bearer <access_token>
```

**查询参数**:
- `type`: 通知类型 (`all`, `like`, `comment`, `follow`, `mention`)
- `unread`: 是否只显示未读 (`true`, `false`)

### 9.2 标记通知为已读
```http
PUT /notifications/{notificationId}/read
Authorization: Bearer <access_token>
```

### 9.3 标记所有通知为已读
```http
PUT /notifications/read-all
Authorization: Bearer <access_token>
```

## 10. 错误代码定义

### 10.1 认证错误 (AUTH_*)
- `AUTH_001`: 无效的认证令牌
- `AUTH_002`: 令牌已过期
- `AUTH_003`: 权限不足
- `AUTH_004`: 用户不存在
- `AUTH_005`: 密码错误

### 10.2 验证错误 (VALIDATION_*)
- `VALIDATION_001`: 请求参数缺失
- `VALIDATION_002`: 参数格式错误
- `VALIDATION_003`: 参数值超出范围
- `VALIDATION_004`: 文件格式不支持
- `VALIDATION_005`: 文件大小超限

### 10.3 业务错误 (BUSINESS_*)
- `BUSINESS_001`: 用户名已存在
- `BUSINESS_002`: 邮箱已注册
- `BUSINESS_003`: 帖子不存在
- `BUSINESS_004`: 无法删除他人帖子
- `BUSINESS_005`: 音频处理失败

### 10.4 系统错误 (SYSTEM_*)
- `SYSTEM_001`: 数据库连接失败
- `SYSTEM_002`: 外部服务不可用
- `SYSTEM_003`: 文件上传失败
- `SYSTEM_004`: 图片生成失败
- `SYSTEM_005`: 服务器内部错误

## 11. 限流规则

### 11.1 API限流
- **认证API**: 5次/分钟/IP
- **帖子创建**: 10次/小时/用户
- **图片生成**: 20次/小时/用户
- **其他API**: 100次/分钟/用户

### 11.2 文件上传限制
- **音频文件**: 最大10MB，支持webm/mp3/wav格式
- **图片文件**: 最大5MB，支持jpg/png/webp格式
- **音频时长**: 最长5分钟

这个API设计文档为Vomage应用提供了完整的后端接口规范，涵盖了所有核心功能的API设计，包括详细的请求/响应格式、错误处理和限流规则。
