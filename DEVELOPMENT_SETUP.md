# Vomage 开发环境配置指南

## 系统要求

### 必需软件
- **Node.js**: >= 18.0.0 (推荐使用 LTS 版本)
- **npm**: >= 8.0.0 或 **yarn**: >= 1.22.0
- **Git**: >= 2.30.0
- **MongoDB**: >= 5.0
- **Redis**: >= 6.0

### 推荐软件
- **Docker**: >= 20.10.0 (用于容器化开发)
- **Docker Compose**: >= 2.0.0
- **VS Code**: 最新版本 (推荐的IDE)

## 快速开始

### 1. 克隆项目
```bash
git clone https://github.com/your-org/vomage.git
cd vomage
```

### 2. 安装依赖
```bash
# 使用 npm
npm install

# 或使用 yarn
yarn install
```

### 3. 环境配置
```bash
# 复制环境变量模板
cp .env.example .env

# 编辑 .env 文件，填入必要的配置
nano .env  # 或使用你喜欢的编辑器
```

### 4. 启动服务

#### 方式一：本地服务
```bash
# 启动 MongoDB (如果未使用 Docker)
mongod --dbpath /path/to/your/db

# 启动 Redis (如果未使用 Docker)
redis-server

# 启动开发服务器
npm run dev
```

#### 方式二：Docker 容器
```bash
# 启动所有服务
docker-compose up -d

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f
```

## 详细配置

### Node.js 版本管理

推荐使用 nvm 管理 Node.js 版本：

```bash
# 安装 nvm (如果未安装)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# 重启终端或执行
source ~/.bashrc

# 安装并使用项目推荐的 Node.js 版本
nvm install 18
nvm use 18

# 设置默认版本
nvm alias default 18
```

### MongoDB 配置

#### 本地安装
```bash
# Ubuntu/Debian
sudo apt-get install -y mongodb

# macOS (使用 Homebrew)
brew tap mongodb/brew
brew install mongodb-community

# 启动 MongoDB
sudo systemctl start mongod  # Linux
brew services start mongodb-community  # macOS
```

#### Docker 方式
```bash
# 拉取 MongoDB 镜像
docker pull mongo:5.0

# 运行 MongoDB 容器
docker run -d \
  --name vomage-mongo \
  -p 27017:27017 \
  -v vomage-mongo-data:/data/db \
  mongo:5.0
```

### Redis 配置

#### 本地安装
```bash
# Ubuntu/Debian
sudo apt-get install redis-server

# macOS (使用 Homebrew)
brew install redis

# 启动 Redis
sudo systemctl start redis-server  # Linux
brew services start redis  # macOS
```

#### Docker 方式
```bash
# 拉取 Redis 镜像
docker pull redis:6-alpine

# 运行 Redis 容器
docker run -d \
  --name vomage-redis \
  -p 6379:6379 \
  redis:6-alpine
```

## 开发工具配置

### VS Code 推荐扩展

创建 `.vscode/extensions.json`：
```json
{
  "recommendations": [
    "ms-vscode.vscode-typescript-next",
    "bradlc.vscode-tailwindcss",
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint",
    "ms-vscode.vscode-json",
    "redhat.vscode-yaml",
    "ms-vscode.vscode-jest",
    "formulahendry.auto-rename-tag",
    "christian-kohler.path-intellisense",
    "ms-vscode.vscode-thunder-client"
  ]
}
```

### VS Code 工作区设置

创建 `.vscode/settings.json`：
```json
{
  "typescript.preferences.importModuleSpecifier": "relative",
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true,
    "source.organizeImports": true
  },
  "files.exclude": {
    "**/node_modules": true,
    "**/dist": true,
    "**/.next": true
  },
  "search.exclude": {
    "**/node_modules": true,
    "**/dist": true,
    "**/.next": true
  },
  "emmet.includeLanguages": {
    "typescript": "html",
    "typescriptreact": "html"
  }
}
```

## 环境变量配置

### 必需配置项

在开始开发前，必须配置以下环境变量：

```bash
# 数据库连接
MONGODB_URI=mongodb://localhost:27017/vomage
REDIS_URL=redis://localhost:6379

# JWT 密钥 (生成强密钥)
JWT_SECRET=$(openssl rand -base64 32)
SESSION_SECRET=$(openssl rand -base64 32)
```

### API 密钥获取

1. **Claude API**
   - 访问 https://console.anthropic.com/
   - 创建账户并获取 API 密钥
   - 设置 `CLAUDE_API_KEY`

2. **AWS (Amazon Nova)**
   - 访问 AWS Console
   - 创建 IAM 用户并获取访问密钥
   - 启用 Bedrock 服务
   - 设置 `AWS_ACCESS_KEY_ID` 和 `AWS_SECRET_ACCESS_KEY`

3. **OpenWeatherMap**
   - 访问 https://openweathermap.org/api
   - 注册并获取免费 API 密钥
   - 设置 `OPENWEATHER_API_KEY`

4. **Google Maps**
   - 访问 Google Cloud Console
   - 启用 Maps JavaScript API 和 Geocoding API
   - 创建 API 密钥
   - 设置 `GOOGLE_MAPS_API_KEY`

## 开发脚本

### package.json 脚本说明

```json
{
  "scripts": {
    "dev": "concurrently \"npm run dev:server\" \"npm run dev:client\"",
    "dev:server": "nodemon server/index.ts",
    "dev:client": "next dev",
    "build": "npm run build:client && npm run build:server",
    "build:client": "next build",
    "build:server": "tsc --project server/tsconfig.json",
    "start": "node dist/server/index.js",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "lint": "eslint . --ext .ts,.tsx,.js,.jsx",
    "lint:fix": "eslint . --ext .ts,.tsx,.js,.jsx --fix",
    "format": "prettier --write .",
    "type-check": "tsc --noEmit",
    "db:seed": "node scripts/seed-database.js",
    "db:reset": "node scripts/reset-database.js"
  }
}
```

### 常用开发命令

```bash
# 启动开发服务器
npm run dev

# 运行测试
npm test

# 运行测试并监听文件变化
npm run test:watch

# 代码格式化
npm run format

# 代码检查
npm run lint

# 修复代码问题
npm run lint:fix

# 类型检查
npm run type-check

# 数据库种子数据
npm run db:seed
```

## Docker 开发环境

### docker-compose.yml

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
    volumes:
      - .:/app
      - /app/node_modules
    depends_on:
      - mongodb
      - redis
    command: npm run dev

  mongodb:
    image: mongo:5.0
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db
    environment:
      - MONGO_INITDB_DATABASE=vomage

  redis:
    image: redis:6-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  mongodb_data:
  redis_data:
```

### Dockerfile

```dockerfile
FROM node:18-alpine

WORKDIR /app

# 复制 package 文件
COPY package*.json ./

# 安装依赖
RUN npm ci --only=production

# 复制源代码
COPY . .

# 构建应用
RUN npm run build

# 暴露端口
EXPOSE 3000

# 启动应用
CMD ["npm", "start"]
```

## 故障排除

### 常见问题

1. **端口被占用**
   ```bash
   # 查找占用端口的进程
   lsof -i :3000
   
   # 杀死进程
   kill -9 <PID>
   ```

2. **MongoDB 连接失败**
   ```bash
   # 检查 MongoDB 状态
   sudo systemctl status mongod
   
   # 重启 MongoDB
   sudo systemctl restart mongod
   ```

3. **Redis 连接失败**
   ```bash
   # 检查 Redis 状态
   redis-cli ping
   
   # 重启 Redis
   sudo systemctl restart redis-server
   ```

4. **依赖安装失败**
   ```bash
   # 清除缓存
   npm cache clean --force
   
   # 删除 node_modules 重新安装
   rm -rf node_modules package-lock.json
   npm install
   ```

### 性能优化

1. **启用 TypeScript 增量编译**
   ```json
   // tsconfig.json
   {
     "compilerOptions": {
       "incremental": true,
       "tsBuildInfoFile": ".tsbuildinfo"
     }
   }
   ```

2. **使用 SWC 替代 Babel (Next.js)**
   ```json
   // next.config.js
   module.exports = {
     swcMinify: true,
     experimental: {
       swcTraceProfiling: true
     }
   }
   ```

## 团队协作

### Git Hooks

安装 husky 和 lint-staged：
```bash
npm install --save-dev husky lint-staged

# 初始化 husky
npx husky install

# 添加 pre-commit hook
npx husky add .husky/pre-commit "npx lint-staged"
```

### 代码提交规范

使用 Conventional Commits：
```bash
# 功能
git commit -m "feat: add voice recording functionality"

# 修复
git commit -m "fix: resolve audio playback issue"

# 文档
git commit -m "docs: update development setup guide"
```

## 下一步

完成环境配置后，请参考：
- [API设计文档](./API_DESIGN.md)
- [数据库设计文档](./DATABASE_DESIGN.md)
- [UI/UX设计文档](./UI_UX_DESIGN.md)

开始开发前，确保所有测试都能通过：
```bash
npm test
```

如有问题，请查看项目的 [故障排除指南](./TROUBLESHOOTING.md) 或联系团队。
