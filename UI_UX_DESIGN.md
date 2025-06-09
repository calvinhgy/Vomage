# Vomage UI/UX 设计文档

## 1. 设计理念

### 1.1 核心设计原则
- **简洁直观**: 界面简洁，操作直观，降低学习成本
- **情感表达**: 通过视觉设计传达情感，增强用户共鸣
- **移动优先**: 专为移动设备优化的响应式设计
- **无障碍访问**: 遵循WCAG 2.1 AA标准，确保可访问性

### 1.2 设计目标
- 创造沉浸式的语音分享体验
- 通过视觉设计增强情感连接
- 提供流畅的社交互动体验
- 建立独特的品牌视觉识别

## 2. 视觉设计系统

### 2.1 品牌色彩
```css
/* 主色调 - 温暖渐变 */
--primary-gradient: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
--primary-500: #6366f1; /* 主品牌色 */
--primary-400: #818cf8;
--primary-600: #4f46e5;

/* 情感色彩系统 */
--emotion-joy: #fbbf24;      /* 快乐 - 金黄色 */
--emotion-sadness: #3b82f6;  /* 悲伤 - 蓝色 */
--emotion-anger: #ef4444;    /* 愤怒 - 红色 */
--emotion-fear: #8b5cf6;     /* 恐惧 - 紫色 */
--emotion-surprise: #f59e0b; /* 惊讶 - 橙色 */
--emotion-disgust: #10b981;  /* 厌恶 - 绿色 */
--emotion-neutral: #6b7280;  /* 中性 - 灰色 */

/* 功能色彩 */
--success: #10b981;
--warning: #f59e0b;
--error: #ef4444;
--info: #3b82f6;

/* 中性色彩 */
--gray-50: #f9fafb;
--gray-100: #f3f4f6;
--gray-200: #e5e7eb;
--gray-300: #d1d5db;
--gray-400: #9ca3af;
--gray-500: #6b7280;
--gray-600: #4b5563;
--gray-700: #374151;
--gray-800: #1f2937;
--gray-900: #111827;
```

### 2.2 字体系统
```css
/* 字体族 */
--font-primary: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
--font-mono: 'JetBrains Mono', 'Fira Code', monospace;

/* 字体大小 */
--text-xs: 0.75rem;    /* 12px */
--text-sm: 0.875rem;   /* 14px */
--text-base: 1rem;     /* 16px */
--text-lg: 1.125rem;   /* 18px */
--text-xl: 1.25rem;    /* 20px */
--text-2xl: 1.5rem;    /* 24px */
--text-3xl: 1.875rem;  /* 30px */
--text-4xl: 2.25rem;   /* 36px */

/* 字体权重 */
--font-light: 300;
--font-normal: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;

/* 行高 */
--leading-tight: 1.25;
--leading-normal: 1.5;
--leading-relaxed: 1.625;
```

### 2.3 间距系统
```css
/* 间距单位 (基于8px网格) */
--space-1: 0.25rem;  /* 4px */
--space-2: 0.5rem;   /* 8px */
--space-3: 0.75rem;  /* 12px */
--space-4: 1rem;     /* 16px */
--space-5: 1.25rem;  /* 20px */
--space-6: 1.5rem;   /* 24px */
--space-8: 2rem;     /* 32px */
--space-10: 2.5rem;  /* 40px */
--space-12: 3rem;    /* 48px */
--space-16: 4rem;    /* 64px */
--space-20: 5rem;    /* 80px */
```

### 2.4 圆角系统
```css
--radius-sm: 0.125rem;  /* 2px */
--radius-md: 0.375rem;  /* 6px */
--radius-lg: 0.5rem;    /* 8px */
--radius-xl: 0.75rem;   /* 12px */
--radius-2xl: 1rem;     /* 16px */
--radius-full: 9999px;  /* 完全圆角 */
```

### 2.5 阴影系统
```css
--shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
--shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
--shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
--shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
--shadow-2xl: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
```

## 3. 组件设计规范

### 3.1 按钮组件
```css
/* 主要按钮 */
.btn-primary {
  background: var(--primary-gradient);
  color: white;
  padding: var(--space-3) var(--space-6);
  border-radius: var(--radius-lg);
  font-weight: var(--font-medium);
  box-shadow: var(--shadow-md);
  transition: all 0.2s ease;
}

.btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-lg);
}

.btn-primary:active {
  transform: translateY(0);
  box-shadow: var(--shadow-sm);
}

/* 录音按钮 */
.btn-record {
  width: 80px;
  height: 80px;
  border-radius: var(--radius-full);
  background: var(--primary-gradient);
  border: 4px solid white;
  box-shadow: var(--shadow-xl);
  position: relative;
  overflow: hidden;
}

.btn-record::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(circle, rgba(255,255,255,0.3) 0%, transparent 70%);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.btn-record:active::before {
  opacity: 1;
}

/* 录音中状态 */
.btn-record.recording {
  animation: pulse 1.5s infinite;
  background: var(--error);
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}
```

### 3.2 卡片组件
```css
.card {
  background: white;
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-md);
  overflow: hidden;
  transition: all 0.3s ease;
}

.card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}

/* 帖子卡片 */
.post-card {
  margin-bottom: var(--space-6);
}

.post-card-header {
  padding: var(--space-4);
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.post-card-content {
  padding: 0 var(--space-4) var(--space-4);
}

.post-card-image {
  width: 100%;
  aspect-ratio: 1;
  object-fit: cover;
  border-radius: var(--radius-lg);
  margin-bottom: var(--space-3);
}

.post-card-actions {
  padding: var(--space-4);
  border-top: 1px solid var(--gray-100);
  display: flex;
  justify-content: space-between;
  align-items: center;
}
```

### 3.3 音频波形组件
```css
.waveform-container {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2px;
  height: 40px;
  padding: var(--space-4);
}

.waveform-bar {
  width: 3px;
  background: var(--primary-400);
  border-radius: var(--radius-full);
  transition: height 0.1s ease;
  opacity: 0.6;
}

.waveform-bar.active {
  background: var(--primary-500);
  opacity: 1;
}

/* 录音时的动画效果 */
.waveform-recording .waveform-bar {
  animation: waveform 0.5s ease-in-out infinite alternate;
}

@keyframes waveform {
  from { height: 4px; }
  to { height: 32px; }
}
```

### 3.4 情感标签组件
```css
.emotion-tag {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-full);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  text-transform: capitalize;
}

.emotion-tag.joy {
  background: rgba(251, 191, 36, 0.1);
  color: var(--emotion-joy);
  border: 1px solid rgba(251, 191, 36, 0.2);
}

.emotion-tag.sadness {
  background: rgba(59, 130, 246, 0.1);
  color: var(--emotion-sadness);
  border: 1px solid rgba(59, 130, 246, 0.2);
}

/* 其他情感标签样式... */

.emotion-icon {
  width: 16px;
  height: 16px;
}
```

## 4. 页面布局设计

### 4.1 主页布局
```
┌─────────────────────────────────┐
│           Header                │
│  [Logo]    [Search]   [Profile] │
├─────────────────────────────────┤
│                                 │
│         Record Button           │
│      ┌─────────────────┐       │
│      │                 │       │
│      │    [Record]     │       │
│      │                 │       │
│      └─────────────────┘       │
│                                 │
│         Quick Actions           │
│   [Mood] [Weather] [Location]   │
│                                 │
├─────────────────────────────────┤
│           Timeline              │
│  ┌─────────────────────────┐   │
│  │      Post Card 1        │   │
│  └─────────────────────────┘   │
│  ┌─────────────────────────┐   │
│  │      Post Card 2        │   │
│  └─────────────────────────┘   │
│                                 │
└─────────────────────────────────┘
```

### 4.2 录音页面布局
```
┌─────────────────────────────────┐
│           Header                │
│    [Back]              [Done]   │
├─────────────────────────────────┤
│                                 │
│        Context Info             │
│   📍 San Francisco, CA          │
│   🌤️ 22°C Sunny                │
│   🕐 2:30 PM                    │
│                                 │
│        Waveform Display         │
│   ▁▃▅▇▅▃▁ ▁▃▅▇▅▃▁ ▁▃▅         │
│                                 │
│        Record Button            │
│      ┌─────────────────┐       │
│      │                 │       │
│      │    [●] REC      │       │
│      │    00:45        │       │
│      └─────────────────┘       │
│                                 │
│        Control Buttons          │
│   [Pause] [Stop] [Play]         │
│                                 │
└─────────────────────────────────┘
```

### 4.3 个人资料页面布局
```
┌─────────────────────────────────┐
│           Header                │
│  [Back]              [Settings] │
├─────────────────────────────────┤
│        Profile Header           │
│      ┌─────────────┐            │
│      │   Avatar    │            │
│      └─────────────┘            │
│         @username               │
│      "User bio here..."         │
│                                 │
│        Stats Row                │
│   42 Posts  128 Followers       │
│             95 Following        │
│                                 │
│      [Follow] [Message]         │
│                                 │
├─────────────────────────────────┤
│         Posts Grid              │
│  ┌─────┐ ┌─────┐ ┌─────┐       │
│  │ 🎵  │ │ 🎵  │ │ 🎵  │       │
│  └─────┘ └─────┘ └─────┘       │
│  ┌─────┐ ┌─────┐ ┌─────┐       │
│  │ 🎵  │ │ 🎵  │ │ 🎵  │       │
│  └─────┘ └─────┘ └─────┘       │
│                                 │
└─────────────────────────────────┘
```

## 5. 交互设计规范

### 5.1 手势交互
```javascript
// Push-to-Talk 交互
const recordButton = {
  onTouchStart: () => {
    // 开始录音
    startRecording();
    // 视觉反馈
    button.classList.add('recording');
    // 触觉反馈
    navigator.vibrate(50);
  },
  
  onTouchEnd: () => {
    // 停止录音
    stopRecording();
    // 移除视觉反馈
    button.classList.remove('recording');
    // 触觉反馈
    navigator.vibrate([50, 50, 50]);
  }
};

// 滑动手势
const swipeGestures = {
  // 左滑删除
  swipeLeft: (element) => {
    element.style.transform = 'translateX(-100%)';
    element.style.opacity = '0';
  },
  
  // 右滑点赞
  swipeRight: (element) => {
    element.classList.add('liked');
    showHeartAnimation();
  },
  
  // 上滑分享
  swipeUp: (element) => {
    showShareModal();
  }
};
```

### 5.2 动画效果
```css
/* 页面转场动画 */
.page-enter {
  opacity: 0;
  transform: translateX(100%);
}

.page-enter-active {
  opacity: 1;
  transform: translateX(0);
  transition: all 0.3s ease-out;
}

.page-exit {
  opacity: 1;
  transform: translateX(0);
}

.page-exit-active {
  opacity: 0;
  transform: translateX(-100%);
  transition: all 0.3s ease-in;
}

/* 点赞动画 */
@keyframes heartBeat {
  0% { transform: scale(1); }
  25% { transform: scale(1.2); }
  50% { transform: scale(1); }
  75% { transform: scale(1.1); }
  100% { transform: scale(1); }
}

.heart-animation {
  animation: heartBeat 0.6s ease-in-out;
}

/* 加载动画 */
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.loading-spinner {
  animation: spin 1s linear infinite;
}

/* 音频播放动画 */
@keyframes audioPlaying {
  0%, 100% { height: 4px; }
  50% { height: 20px; }
}

.audio-bar.playing {
  animation: audioPlaying 0.5s ease-in-out infinite;
}
```

### 5.3 反馈机制
```javascript
// 触觉反馈
const hapticFeedback = {
  light: () => navigator.vibrate(10),
  medium: () => navigator.vibrate(50),
  heavy: () => navigator.vibrate(100),
  success: () => navigator.vibrate([50, 50, 50]),
  error: () => navigator.vibrate([100, 50, 100, 50, 100])
};

// 视觉反馈
const visualFeedback = {
  success: (message) => {
    showToast(message, 'success');
  },
  error: (message) => {
    showToast(message, 'error');
  },
  loading: (message) => {
    showLoadingOverlay(message);
  }
};

// 音频反馈
const audioFeedback = {
  recordStart: () => playSound('record-start.mp3'),
  recordStop: () => playSound('record-stop.mp3'),
  like: () => playSound('like.mp3'),
  notification: () => playSound('notification.mp3')
};
```

## 6. 响应式设计

### 6.1 断点系统
```css
/* 移动设备优先 */
/* 默认样式适用于 < 640px */

/* 小型平板 */
@media (min-width: 640px) {
  .container {
    max-width: 640px;
  }
}

/* 平板 */
@media (min-width: 768px) {
  .container {
    max-width: 768px;
  }
  
  .grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

/* 桌面 */
@media (min-width: 1024px) {
  .container {
    max-width: 1024px;
  }
  
  .grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

/* 大屏桌面 */
@media (min-width: 1280px) {
  .container {
    max-width: 1280px;
  }
}
```

### 6.2 iPhone适配
```css
/* iPhone SE */
@media (max-width: 375px) {
  .btn-record {
    width: 70px;
    height: 70px;
  }
  
  .post-card {
    margin: var(--space-3);
  }
}

/* iPhone 12/13/14 */
@media (min-width: 390px) and (max-width: 428px) {
  .container {
    padding: 0 var(--space-4);
  }
}

/* iPhone 14 Plus/Pro Max */
@media (min-width: 428px) {
  .grid {
    grid-template-columns: repeat(2, 1fr);
    gap: var(--space-4);
  }
}

/* 安全区域适配 */
.safe-area-top {
  padding-top: env(safe-area-inset-top);
}

.safe-area-bottom {
  padding-bottom: env(safe-area-inset-bottom);
}
```

## 7. 无障碍设计

### 7.1 语义化HTML
```html
<!-- 主要内容区域 -->
<main role="main" aria-label="主要内容">
  <!-- 录音区域 -->
  <section aria-label="录音控制">
    <button 
      aria-label="按住录音，松开停止"
      aria-describedby="record-instructions"
      class="btn-record"
    >
      <span class="sr-only">录音按钮</span>
    </button>
    <p id="record-instructions" class="sr-only">
      长按此按钮开始录音，松开停止录音
    </p>
  </section>

  <!-- 时间线 -->
  <section aria-label="帖子时间线">
    <h2 class="sr-only">最新帖子</h2>
    <article class="post-card" aria-label="用户帖子">
      <header class="post-header">
        <img src="avatar.jpg" alt="用户头像" />
        <h3>用户名</h3>
        <time datetime="2024-01-15T14:30:00Z">2小时前</time>
      </header>
      
      <div class="post-content">
        <audio controls aria-label="用户语音内容">
          <source src="audio.webm" type="audio/webm">
          您的浏览器不支持音频播放
        </audio>
        
        <img src="mood.jpg" alt="心情图片：阳光明媚的早晨" />
        
        <p class="transcript">今天心情很好，天气很棒！</p>
        
        <div class="emotion-tags" aria-label="情感标签">
          <span class="emotion-tag joy" aria-label="快乐情感">😊 快乐</span>
        </div>
      </div>
      
      <footer class="post-actions">
        <button aria-label="点赞此帖子" aria-pressed="false">
          ❤️ <span class="like-count">15</span>
        </button>
        <button aria-label="评论此帖子">
          💬 <span class="comment-count">3</span>
        </button>
        <button aria-label="分享此帖子">
          📤 分享
        </button>
      </footer>
    </article>
  </section>
</main>
```

### 7.2 键盘导航
```css
/* 焦点样式 */
:focus {
  outline: 2px solid var(--primary-500);
  outline-offset: 2px;
}

/* 跳过链接 */
.skip-link {
  position: absolute;
  top: -40px;
  left: 6px;
  background: var(--primary-500);
  color: white;
  padding: 8px;
  text-decoration: none;
  border-radius: 4px;
  z-index: 1000;
}

.skip-link:focus {
  top: 6px;
}

/* 键盘导航指示器 */
.keyboard-navigation .btn:focus {
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.3);
}
```

### 7.3 屏幕阅读器支持
```javascript
// 动态内容更新通知
const announceToScreenReader = (message) => {
  const announcement = document.createElement('div');
  announcement.setAttribute('aria-live', 'polite');
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only';
  announcement.textContent = message;
  
  document.body.appendChild(announcement);
  
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
};

// 使用示例
const handleLike = () => {
  // 执行点赞逻辑
  likePost();
  
  // 通知屏幕阅读器
  announceToScreenReader('帖子已点赞');
};

const handleRecordingStart = () => {
  startRecording();
  announceToScreenReader('开始录音');
};

const handleRecordingStop = () => {
  stopRecording();
  announceToScreenReader('录音已停止');
};
```

## 8. 性能优化

### 8.1 图片优化
```css
/* 响应式图片 */
.responsive-image {
  width: 100%;
  height: auto;
  object-fit: cover;
}

/* 懒加载占位符 */
.image-placeholder {
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: loading 1.5s infinite;
}

@keyframes loading {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* WebP支持检测 */
.webp .image {
  background-image: url('image.webp');
}

.no-webp .image {
  background-image: url('image.jpg');
}
```

### 8.2 CSS优化
```css
/* 关键CSS内联 */
/* 首屏关键样式 */
.critical-css {
  /* 布局样式 */
  /* 字体样式 */
  /* 主要颜色 */
}

/* 非关键CSS异步加载 */
/* 动画样式 */
/* 装饰性样式 */

/* GPU加速 */
.gpu-accelerated {
  transform: translateZ(0);
  will-change: transform;
}

/* 减少重绘重排 */
.optimized-animation {
  transform: translateX(0);
  opacity: 1;
  transition: transform 0.3s ease, opacity 0.3s ease;
}
```

这个UI/UX设计文档为Vomage应用提供了完整的视觉设计和用户体验规范，包括设计系统、组件规范、交互设计、响应式布局和无障碍访问等方面的详细指导。
