# Vomage - Voice-driven Social Mood Sharing App

## 项目概述

Vomage是一款创新的移动端社交应用，通过Push-to-Talk方式记录用户语音，结合AI技术分析情感，并根据用户所在地理位置、天气和时间信息，自动生成个性化的心情图片。应用专为iPhone用户设计，通过移动浏览器访问使用。

### 核心特性
- 🎤 **Push-to-Talk语音录制** - 长按录制，松开停止的直观交互
- 🧠 **AI情感分析** - 使用Claude进行深度语音内容理解和情感分析
- 🎨 **智能图片生成** - 基于Amazon Nova生成符合心情的个性化图片
- 🌍 **上下文感知** - 融合地理位置、天气、时间等环境信息
- 📱 **移动优先设计** - 专为iPhone优化的PWA应用
- 👥 **社交互动** - 分享、点赞、评论等完整社交功能

## 技术架构

### 前端技术栈
- **React 18** + **TypeScript** - 现代化前端框架
- **Tailwind CSS** - 实用优先的CSS框架
- **PWA** - 渐进式Web应用，支持离线使用
- **Web Audio API** - 高质量音频录制和处理
- **Zustand** - 轻量级状态管理

### 后端技术栈
- **Node.js** + **Express.js** - 服务端运行环境
- **MongoDB** - 文档型数据库
- **Redis** - 缓存和会话存储
- **AWS S3** - 文件存储服务
- **Socket.io** - 实时通信

### AI服务集成
- **Claude API** - 语音转文字、情感分析、内容理解
- **Amazon Nova** - 心情图片生成
- **OpenWeatherMap API** - 天气数据服务
- **Google Maps API** - 地理位置服务

## 项目文档结构

```
Vomage/
├── README.md                    # 项目总览文档
├── PRD.md                      # 产品需求文档
├── ARCHITECTURE.md             # 技术架构设计文档
├── API_DESIGN.md              # API设计文档
├── DATABASE_DESIGN.md         # 数据库设计文档
├── UI_UX_DESIGN.md           # UI/UX设计文档
├── PROMPT_ENGINEERING.md     # Prompt工程文档
└── PROJECT_MANAGEMENT.md     # 项目管理文档
```

## 开发规范

### Prompt Driven Development (PDD)
本项目采用Prompt Driven Development规范，确保：
- **需求驱动**: 所有功能开发基于明确的用户需求
- **AI优先**: 充分利用AI能力提升用户体验
- **迭代优化**: 基于用户反馈持续优化AI模型和Prompt
- **文档完整**: 完整的设计文档和技术规范

### 代码规范
- **TypeScript优先**: 所有代码使用TypeScript编写
- **ESLint + Prettier**: 统一代码格式和质量标准
- **Git Flow**: 标准化的Git工作流程
- **测试驱动**: 单元测试覆盖率 > 80%

## 快速开始

### 环境要求
- Node.js >= 18.0.0
- MongoDB >= 5.0
- Redis >= 6.0
- AWS账户 (S3, CloudFront)
- Claude API密钥
- Amazon Nova API密钥

### 安装和运行
```bash
# 克隆项目
git clone https://github.com/your-org/vomage.git
cd vomage

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件，填入必要的API密钥和配置

# 启动开发服务器
npm run dev

# 启动后端服务
npm run server

# 运行测试
npm test
```

### 部署
```bash
# 构建生产版本
npm run build

# 部署到AWS
npm run deploy
```

## 项目里程碑

### Phase 1: MVP开发 (4周)
- [x] 项目架构搭建
- [x] 基础UI组件开发
- [ ] 语音录制功能
- [ ] AI模型集成
- [ ] 基础图片生成

### Phase 2: 功能完善 (4周)
- [ ] 社交功能开发
- [ ] 用户系统完善
- [ ] 性能优化
- [ ] 移动端适配

### Phase 3: 测试上线 (4周)
- [ ] 全面测试
- [ ] 用户体验优化
- [ ] 生产环境部署
- [ ] 监控系统搭建

## 团队成员

| 角色 | 姓名 | 职责 |
|------|------|------|
| 项目经理 | - | 项目整体管理和协调 |
| 技术负责人 | - | 技术架构和团队指导 |
| 前端工程师 | - | React PWA开发 |
| 后端工程师 | - | Node.js API开发 |
| AI工程师 | - | AI模型集成和优化 |
| UI/UX设计师 | - | 用户体验和界面设计 |
| DevOps工程师 | - | 基础设施和部署 |
| QA工程师 | - | 质量保证和测试 |

## 贡献指南

### 开发流程
1. 从`develop`分支创建功能分支
2. 完成功能开发和测试
3. 提交Pull Request
4. 代码评审通过后合并

### 提交规范
```
feat: 新功能
fix: 修复bug
docs: 文档更新
style: 代码格式调整
refactor: 代码重构
test: 测试相关
chore: 构建工具或辅助工具的变动
```

### 代码评审标准
- 功能完整性和正确性
- 代码质量和可维护性
- 测试覆盖率
- 文档完整性
- 性能和安全性

## 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 联系方式

- 项目主页: https://github.com/your-org/vomage
- 问题反馈: https://github.com/your-org/vomage/issues
- 邮箱: team@vomage.com
- 官网: https://vomage.com

## 致谢

感谢以下技术和服务提供商：
- [Anthropic Claude](https://www.anthropic.com/) - AI语言模型
- [Amazon Nova](https://aws.amazon.com/bedrock/nova/) - AI图像生成
- [OpenWeatherMap](https://openweathermap.org/) - 天气数据服务
- [MongoDB](https://www.mongodb.com/) - 数据库服务
- [AWS](https://aws.amazon.com/) - 云服务平台

---

**Vomage** - 让每一个声音都有独特的色彩 🎨🎤
