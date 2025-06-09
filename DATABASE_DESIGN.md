# Vomage 数据库设计文档

## 1. 数据库概览

### 1.1 数据库选择
- **主数据库**: MongoDB (文档型数据库)
- **缓存数据库**: Redis
- **搜索引擎**: Elasticsearch (可选)

### 1.2 设计原则
- **数据一致性**: 最终一致性模型
- **可扩展性**: 支持水平扩展
- **性能优化**: 合理的索引设计
- **数据安全**: 敏感数据加密存储

## 2. 核心集合设计

### 2.1 用户集合 (users)
```javascript
{
  _id: ObjectId("64f1a2b3c4d5e6f7g8h9i0j1"),
  username: "johndoe",
  email: "john@example.com",
  passwordHash: "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.PJ/...",
  
  // 用户资料
  profile: {
    avatar: "https://cdn.vomage.com/avatars/johndoe.jpg",
    bio: "Love sharing my daily moods!",
    location: "San Francisco, CA",
    website: "https://johndoe.com",
    birthDate: ISODate("1990-05-15"),
    gender: "male" // "male" | "female" | "other" | "prefer_not_to_say"
  },
  
  // 用户偏好设置
  preferences: {
    privacy: "public", // "public" | "friends" | "private"
    notifications: {
      email: true,
      push: true,
      likes: true,
      comments: true,
      follows: true,
      mentions: true
    },
    language: "en-US",
    timezone: "America/Los_Angeles",
    theme: "auto" // "light" | "dark" | "auto"
  },
  
  // 统计信息
  stats: {
    postsCount: 42,
    followersCount: 128,
    followingCount: 95,
    likesReceived: 1250,
    totalListens: 5680
  },
  
  // 账户状态
  status: "active", // "active" | "suspended" | "deleted"
  emailVerified: true,
  phoneVerified: false,
  
  // 时间戳
  createdAt: ISODate("2024-01-15T10:30:00Z"),
  updatedAt: ISODate("2024-01-15T10:30:00Z"),
  lastLoginAt: ISODate("2024-01-15T14:30:00Z")
}
```

### 2.2 帖子集合 (posts)
```javascript
{
  _id: ObjectId("64f1a2b3c4d5e6f7g8h9i0j2"),
  userId: ObjectId("64f1a2b3c4d5e6f7g8h9i0j1"),
  
  // 媒体文件
  media: {
    audio: {
      url: "https://cdn.vomage.com/audio/post_123.webm",
      duration: 45.2,
      size: 1024000,
      format: "webm",
      waveform: [0.1, 0.3, 0.8, 0.5, ...] // 音频波形数据
    },
    image: {
      url: "https://cdn.vomage.com/images/mood_123.jpg",
      thumbnailUrl: "https://cdn.vomage.com/images/thumb_mood_123.jpg",
      width: 1024,
      height: 1024,
      size: 512000,
      format: "jpg",
      generatedPrompt: "A joyful sunny day scene..."
    }
  },
  
  // 内容分析
  content: {
    transcript: "Feeling great today! The weather is perfect.",
    language: "en-US",
    confidence: 0.95,
    
    // 情感分析结果
    emotion: {
      primary: "joy",
      confidence: 0.89,
      secondary: ["excitement", "contentment"],
      intensity: 0.75,
      valence: 0.82, // 正负情感倾向
      arousal: 0.68,  // 激活程度
      details: {
        joy: 0.89,
        excitement: 0.45,
        contentment: 0.32,
        sadness: 0.05,
        anger: 0.02,
        fear: 0.01,
        surprise: 0.08,
        disgust: 0.01,
        neutral: 0.11
      }
    }
  },
  
  // 上下文信息
  context: {
    location: {
      coordinates: {
        type: "Point",
        coordinates: [-122.4194, 37.7749] // [longitude, latitude]
      },
      address: {
        formatted: "San Francisco, CA, USA",
        city: "San Francisco",
        state: "California",
        country: "United States",
        countryCode: "US"
      },
      accuracy: 10 // 精度（米）
    },
    
    weather: {
      temperature: 22,
      feelsLike: 24,
      humidity: 65,
      pressure: 1013,
      condition: "sunny",
      description: "Clear sky",
      icon: "01d",
      windSpeed: 5.2,
      windDirection: 180,
      uvIndex: 5,
      visibility: 10
    },
    
    temporal: {
      timestamp: ISODate("2024-01-15T14:30:00Z"),
      timezone: "America/Los_Angeles",
      localTime: "2024-01-15T06:30:00-08:00",
      timeOfDay: "morning", // "morning" | "afternoon" | "evening" | "night"
      season: "winter",     // "spring" | "summer" | "autumn" | "winter"
      dayOfWeek: "Monday",
      isWeekend: false,
      isHoliday: false
    }
  },
  
  // 社交统计
  stats: {
    likesCount: 15,
    commentsCount: 3,
    sharesCount: 2,
    playsCount: 127,
    reachCount: 89 // 触达人数
  },
  
  // 隐私设置
  privacy: "public", // "public" | "friends" | "private"
  
  // 标签和分类
  tags: ["happy", "weather", "morning"],
  categories: ["mood", "daily"],
  
  // 状态
  status: "published", // "draft" | "processing" | "published" | "archived" | "deleted"
  
  // 时间戳
  createdAt: ISODate("2024-01-15T14:30:00Z"),
  updatedAt: ISODate("2024-01-15T14:30:00Z"),
  publishedAt: ISODate("2024-01-15T14:35:00Z")
}
```

### 2.3 评论集合 (comments)
```javascript
{
  _id: ObjectId("64f1a2b3c4d5e6f7g8h9i0j3"),
  postId: ObjectId("64f1a2b3c4d5e6f7g8h9i0j2"),
  userId: ObjectId("64f1a2b3c4d5e6f7g8h9i0j1"),
  
  content: "Great mood! Love the energy!",
  
  // 回复关系
  parentId: null, // 如果是回复评论，则指向父评论ID
  replyToUserId: null, // 回复的用户ID
  
  // 统计信息
  stats: {
    likesCount: 5,
    repliesCount: 2
  },
  
  // 状态
  status: "published", // "published" | "hidden" | "deleted"
  
  // 时间戳
  createdAt: ISODate("2024-01-15T15:00:00Z"),
  updatedAt: ISODate("2024-01-15T15:00:00Z")
}
```

### 2.4 点赞集合 (likes)
```javascript
{
  _id: ObjectId("64f1a2b3c4d5e6f7g8h9i0j4"),
  userId: ObjectId("64f1a2b3c4d5e6f7g8h9i0j1"),
  targetType: "post", // "post" | "comment"
  targetId: ObjectId("64f1a2b3c4d5e6f7g8h9i0j2"),
  
  createdAt: ISODate("2024-01-15T15:30:00Z")
}
```

### 2.5 关注关系集合 (follows)
```javascript
{
  _id: ObjectId("64f1a2b3c4d5e6f7g8h9i0j5"),
  followerId: ObjectId("64f1a2b3c4d5e6f7g8h9i0j1"), // 关注者
  followingId: ObjectId("64f1a2b3c4d5e6f7g8h9i0j6"), // 被关注者
  
  status: "active", // "active" | "blocked"
  
  createdAt: ISODate("2024-01-15T16:00:00Z")
}
```

## 3. 索引设计

### 3.1 用户集合索引
```javascript
// 唯一索引
db.users.createIndex({ "email": 1 }, { unique: true })
db.users.createIndex({ "username": 1 }, { unique: true })

// 查询索引
db.users.createIndex({ "status": 1 })
db.users.createIndex({ "createdAt": -1 })
db.users.createIndex({ "lastLoginAt": -1 })

// 搜索索引
db.users.createIndex({ 
  "username": "text", 
  "profile.bio": "text" 
}, {
  weights: {
    "username": 10,
    "profile.bio": 5
  }
})
```

### 3.2 帖子集合索引
```javascript
// 基础查询索引
db.posts.createIndex({ "userId": 1, "createdAt": -1 })
db.posts.createIndex({ "status": 1, "createdAt": -1 })
db.posts.createIndex({ "privacy": 1, "createdAt": -1 })

// 地理位置索引
db.posts.createIndex({ "context.location.coordinates": "2dsphere" })

// 情感分析索引
db.posts.createIndex({ "content.emotion.primary": 1 })
db.posts.createIndex({ "content.emotion.valence": 1 })

// 统计索引
db.posts.createIndex({ "stats.likesCount": -1 })
db.posts.createIndex({ "stats.playsCount": -1 })

// 时间相关索引
db.posts.createIndex({ "context.temporal.timeOfDay": 1 })
db.posts.createIndex({ "context.temporal.season": 1 })

// 复合索引
db.posts.createIndex({ 
  "status": 1, 
  "privacy": 1, 
  "createdAt": -1 
})

// 全文搜索索引
db.posts.createIndex({ 
  "content.transcript": "text",
  "tags": "text"
}, {
  weights: {
    "content.transcript": 10,
    "tags": 5
  }
})
```

### 3.3 其他集合索引
```javascript
// 评论索引
db.comments.createIndex({ "postId": 1, "createdAt": -1 })
db.comments.createIndex({ "userId": 1, "createdAt": -1 })
db.comments.createIndex({ "parentId": 1 })

// 点赞索引
db.likes.createIndex({ "userId": 1, "targetType": 1, "targetId": 1 }, { unique: true })
db.likes.createIndex({ "targetType": 1, "targetId": 1, "createdAt": -1 })

// 关注关系索引
db.follows.createIndex({ "followerId": 1, "followingId": 1 }, { unique: true })
db.follows.createIndex({ "followingId": 1, "status": 1 })
db.follows.createIndex({ "followerId": 1, "status": 1 })
```

## 4. 数据分片策略

### 4.1 分片键选择
```javascript
// 用户集合 - 按用户ID分片
sh.shardCollection("vomage.users", { "_id": "hashed" })

// 帖子集合 - 按用户ID分片（保证用户数据在同一分片）
sh.shardCollection("vomage.posts", { "userId": 1, "_id": 1 })

// 评论集合 - 按帖子ID分片
sh.shardCollection("vomage.comments", { "postId": 1, "_id": 1 })

// 点赞集合 - 按目标ID分片
sh.shardCollection("vomage.likes", { "targetId": 1, "targetType": 1 })

// 关注关系 - 按关注者ID分片
sh.shardCollection("vomage.follows", { "followerId": 1 })
```

### 4.2 分片标签配置
```javascript
// 地理位置分片标签
sh.addShardTag("shard0000", "US-West")
sh.addShardTag("shard0001", "US-East")
sh.addShardTag("shard0002", "Europe")
sh.addShardTag("shard0003", "Asia")

// 按地理位置路由
sh.addTagRange(
  "vomage.posts",
  { "context.location.coordinates": [-180, -90] },
  { "context.location.coordinates": [-60, 90] },
  "US-West"
)
```
## 5. Redis缓存设计

### 5.1 缓存键命名规范
```
user:{userId}                    # 用户基本信息
user:{userId}:profile           # 用户详细资料
user:{userId}:stats             # 用户统计信息
user:{userId}:preferences       # 用户偏好设置

post:{postId}                   # 帖子详细信息
post:{postId}:stats             # 帖子统计信息
posts:timeline:{userId}         # 用户时间线
posts:trending                  # 热门帖子列表
posts:latest                    # 最新帖子列表

session:{sessionId}             # 用户会话信息
auth:{userId}:tokens            # 用户认证令牌

weather:{lat}:{lng}             # 天气信息缓存
location:{lat}:{lng}            # 地理位置信息

rate_limit:{userId}:{endpoint}  # API限流计数
```

### 5.2 缓存策略
```javascript
// 用户信息缓存 (TTL: 1小时)
const userCacheConfig = {
  key: `user:${userId}`,
  ttl: 3600,
  data: {
    id: userId,
    username: "johndoe",
    avatar: "https://cdn.vomage.com/avatars/johndoe.jpg",
    stats: {
      postsCount: 42,
      followersCount: 128,
      followingCount: 95
    }
  }
};

// 帖子统计缓存 (TTL: 5分钟)
const postStatsCacheConfig = {
  key: `post:${postId}:stats`,
  ttl: 300,
  data: {
    likesCount: 15,
    commentsCount: 3,
    sharesCount: 2,
    playsCount: 127
  }
};

// 时间线缓存 (TTL: 10分钟)
const timelineCacheConfig = {
  key: `posts:timeline:${userId}`,
  ttl: 600,
  data: [postId1, postId2, postId3, ...] // 帖子ID列表
};
```

## 6. 数据备份策略

### 6.1 MongoDB备份
```javascript
// 每日全量备份
const dailyBackup = {
  schedule: "0 2 * * *", // 每天凌晨2点
  type: "full",
  retention: "30 days",
  destination: "s3://vomage-backups/daily/"
};

// 每小时增量备份
const hourlyBackup = {
  schedule: "0 * * * *", // 每小时
  type: "incremental",
  retention: "7 days",
  destination: "s3://vomage-backups/hourly/"
};

// 实时oplog备份
const oplogBackup = {
  type: "continuous",
  destination: "s3://vomage-backups/oplog/"
};
```

### 6.2 Redis备份
```javascript
// Redis RDB快照
const rdbBackup = {
  schedule: "0 */6 * * *", // 每6小时
  type: "rdb",
  retention: "7 days",
  destination: "s3://vomage-backups/redis/"
};

// Redis AOF备份
const aofBackup = {
  type: "continuous",
  destination: "s3://vomage-backups/redis-aof/"
};
```

## 7. 数据迁移脚本

### 7.1 用户数据迁移
```javascript
// 用户数据结构升级脚本
db.users.find({}).forEach(function(user) {
  if (!user.preferences) {
    db.users.updateOne(
      { _id: user._id },
      {
        $set: {
          preferences: {
            privacy: "public",
            notifications: {
              email: true,
              push: true,
              likes: true,
              comments: true,
              follows: true,
              mentions: true
            },
            language: "en-US",
            timezone: "UTC",
            theme: "auto"
          }
        }
      }
    );
  }
});
```

### 7.2 帖子数据迁移
```javascript
// 添加新的情感分析字段
db.posts.find({ "content.emotion.details": { $exists: false } }).forEach(function(post) {
  const emotionDetails = {};
  const emotions = ["joy", "sadness", "anger", "fear", "surprise", "disgust", "neutral"];
  
  emotions.forEach(emotion => {
    if (emotion === post.content.emotion.primary) {
      emotionDetails[emotion] = post.content.emotion.confidence;
    } else {
      emotionDetails[emotion] = Math.random() * 0.1; // 模拟其他情感的低分值
    }
  });
  
  db.posts.updateOne(
    { _id: post._id },
    {
      $set: {
        "content.emotion.details": emotionDetails,
        "content.emotion.valence": Math.random() * 2 - 1, // -1 到 1
        "content.emotion.arousal": Math.random() // 0 到 1
      }
    }
  );
});
```

## 8. 数据验证规则

### 8.1 MongoDB Schema验证
```javascript
// 用户集合验证规则
db.createCollection("users", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["username", "email", "passwordHash", "createdAt"],
      properties: {
        username: {
          bsonType: "string",
          pattern: "^[a-zA-Z0-9_]{3,20}$",
          description: "用户名必须是3-20位字母数字下划线"
        },
        email: {
          bsonType: "string",
          pattern: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$",
          description: "必须是有效的邮箱地址"
        },
        "profile.bio": {
          bsonType: "string",
          maxLength: 500,
          description: "个人简介不能超过500字符"
        },
        "preferences.privacy": {
          enum: ["public", "friends", "private"],
          description: "隐私设置必须是指定值之一"
        }
      }
    }
  }
});

// 帖子集合验证规则
db.createCollection("posts", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["userId", "media", "content", "context", "createdAt"],
      properties: {
        "media.audio.duration": {
          bsonType: "number",
          minimum: 1,
          maximum: 300,
          description: "音频时长必须在1-300秒之间"
        },
        "content.emotion.primary": {
          enum: ["joy", "sadness", "anger", "fear", "surprise", "disgust", "neutral"],
          description: "主要情感必须是预定义值之一"
        },
        "privacy": {
          enum: ["public", "friends", "private"],
          description: "隐私设置必须是指定值之一"
        }
      }
    }
  }
});
```

## 9. 性能监控

### 9.1 慢查询监控
```javascript
// 启用慢查询日志
db.setProfilingLevel(1, { slowms: 100 });

// 查看慢查询
db.system.profile.find().limit(5).sort({ ts: -1 }).pretty();

// 分析查询性能
db.posts.find({ userId: ObjectId("...") }).explain("executionStats");
```

### 9.2 索引使用监控
```javascript
// 查看索引使用统计
db.posts.aggregate([
  { $indexStats: {} }
]);

// 查找未使用的索引
db.runCommand({ "collStats": "posts", "indexDetails": true });
```

## 10. 数据清理策略

### 10.1 定期清理任务
```javascript
// 清理已删除用户的相关数据
const cleanupDeletedUsers = async () => {
  const deletedUsers = await db.users.find({ status: "deleted" }).toArray();
  
  for (const user of deletedUsers) {
    // 删除用户的帖子
    await db.posts.deleteMany({ userId: user._id });
    
    // 删除用户的评论
    await db.comments.deleteMany({ userId: user._id });
    
    // 删除用户的点赞记录
    await db.likes.deleteMany({ userId: user._id });
    
    // 删除关注关系
    await db.follows.deleteMany({
      $or: [
        { followerId: user._id },
        { followingId: user._id }
      ]
    });
    
    // 最后删除用户记录
    await db.users.deleteOne({ _id: user._id });
  }
};

// 清理过期的临时数据
const cleanupExpiredData = async () => {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  
  // 清理过期的会话数据
  await db.sessions.deleteMany({ 
    createdAt: { $lt: thirtyDaysAgo },
    status: "expired"
  });
  
  // 清理过期的验证码
  await db.verificationCodes.deleteMany({
    createdAt: { $lt: new Date(Date.now() - 24 * 60 * 60 * 1000) }
  });
};
```

这个数据库设计文档为Vomage应用提供了完整的数据存储方案，包括详细的集合结构、索引设计、分片策略、缓存方案和数据管理策略。
