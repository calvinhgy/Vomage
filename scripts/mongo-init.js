// MongoDB 初始化脚本
db = db.getSiblingDB('vomage');

// 创建应用用户
db.createUser({
  user: 'vomage_user',
  pwd: 'vomage_app_password',
  roles: [
    {
      role: 'readWrite',
      db: 'vomage'
    }
  ]
});

// 创建集合和索引
db.createCollection('users');
db.createCollection('voiceRecords');
db.createCollection('generatedImages');

// 用户集合索引
db.users.createIndex({ username: 1 }, { unique: true });
db.users.createIndex({ email: 1 }, { unique: true, sparse: true });
db.users.createIndex({ 'stats.lastActive': -1 });

// 语音记录集合索引
db.voiceRecords.createIndex({ userId: 1 });
db.voiceRecords.createIndex({ createdAt: -1 });
db.voiceRecords.createIndex({ processingStatus: 1 });
db.voiceRecords.createIndex({ privacy: 1 });
db.voiceRecords.createIndex({ 'sentiment.mood': 1 });
db.voiceRecords.createIndex({ tags: 1 });
db.voiceRecords.createIndex({ userId: 1, createdAt: -1 });
db.voiceRecords.createIndex({ privacy: 1, createdAt: -1 });

// 生成图片集合索引
db.generatedImages.createIndex({ userId: 1 });
db.generatedImages.createIndex({ voiceRecordId: 1 });
db.generatedImages.createIndex({ createdAt: -1 });
db.generatedImages.createIndex({ style: 1 });
db.generatedImages.createIndex({ privacy: 1 });
db.generatedImages.createIndex({ tags: 1 });
db.generatedImages.createIndex({ userId: 1, createdAt: -1 });
db.generatedImages.createIndex({ privacy: 1, createdAt: -1 });

print('MongoDB 初始化完成');
