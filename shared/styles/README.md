# 🏗️ CSS 架构文档

## 📂 文件结构

```
shared/styles/
├── main.css                    # 主入口文件（引用所有其他文件）
│
├── base/                       # 基础层
│   ├── variables.css          # 设计令牌（颜色、间距、字体等）
│   ├── reset.css              # CSS 重置和规范化
│   └── typography.css         # 字体系统和排版
│
├── components/                 # 组件层
│   ├── navigation.css         # 导航栏组件
│   ├── buttons.css            # 按钮组件
│   ├── forms.css              # 表单组件
│   ├── modals.css             # 模态框组件
│   └── cards.css              # 卡片组件
│
├── layouts/                    # 布局层（预留）
│   └── (未来扩展)
│
└── utilities/                  # 工具层
    └── utilities.css          # 原子工具类
```

## 🎯 架构原则 - ITCSS

采用 **Inverted Triangle CSS** 架构，按照优先级从低到高排列：

```
        ┌─────────────────┐
        │   Variables     │  最通用、最低优先级
        ├─────────────────┤
        │     Reset       │
        ├─────────────────┤
        │   Typography    │
        ├─────────────────┤
        │    Layouts      │
        ├─────────────────┤
        │   Components    │
        ├─────────────────┤
        │   Utilities     │  最具体、最高优先级
        └─────────────────┘
```

## 🎨 使用方法

### 1. 引入主样式文件

```html
<!-- 所有页面只需引入一个文件 -->
<link rel="stylesheet" href="/shared/styles/main.css">

<!-- 页面特定样式（可选） -->
<link rel="stylesheet" href="./page-specific.css">
```

### 2. 修改全局主题

只需修改 `base/variables.css`:

```css
:root {
    /* 修改主色调 - 从蓝色改为绿色 */
    --color-btn-primary-bg: #30D158;     /* 改这里 */
    --color-btn-primary-hover: #28B848;  /* 改这里 */
    --color-info: #30D158;               /* 改这里 */
    
    /* 整个网站所有按钮、链接、高亮自动变绿色！ */
}
```

### 3. 使用组件类

```html
<!-- 按钮 -->
<button class="btn btn--primary">主按钮</button>
<button class="btn btn--secondary">次按钮</button>
<button class="btn btn--outline">描边按钮</button>

<!-- 表单 -->
<input type="text" class="form-input" placeholder="输入框">
<textarea class="form-textarea"></textarea>

<!-- 卡片 -->
<div class="card">
    <div class="card-header">
        <h3 class="card-title">标题</h3>
    </div>
    <div class="card-body">
        <p>内容...</p>
    </div>
</div>

<!-- 工具类组合 -->
<div class="flex items-center gap-4 p-5 rounded-lg shadow-md">
    快速布局
</div>
```

## 📝 命名规范

### BEM 命名（组件）
```css
.card                  /* Block 块 */
.card--elevated        /* Modifier 修饰符 */
.card__header          /* Element 元素 */
```

### 语义化命名（变量）
```css
--theme-btn-primary-bg        /* 主按钮背景 */
--theme-text-secondary        /* 次要文本 */
--spacing-4                   /* 间距 16px */
```

### Utility 命名（工具类）
```css
.flex                  /* 功能描述 */
.items-center         /* 带连字符 */
.gap-4                /* 带数字尺寸 */
```

## 🔧 扩展指南

### 添加新组件

1. 在 `components/` 创建新文件：
```css
/* components/tooltips.css */
.tooltip {
    /* 样式 */
}
```

2. 在 `main.css` 中导入：
```css
@import url('components/tooltips.css');
```

### 添加新颜色主题

1. 在 `variables.css` 添加颜色定义：
```css
:root {
    --color-purple: #AF52DE;
}
```

2. 创建语义化映射：
```css
--theme-highlight: var(--color-purple);
```

3. 使用：
```css
.highlight-box {
    background: var(--theme-highlight);
}
```

## 🎯 最佳实践

### ✅ 推荐做法

```css
/* ✅ 使用变量 */
.button {
    background: var(--theme-btn-primary-bg);
    padding: var(--spacing-3);
    border-radius: var(--radius-lg);
}

/* ✅ 使用工具类组合 */
<div class="flex items-center gap-4 p-5">

/* ✅ 使用语义化类名 */
<button class="btn btn--primary">
```

### ❌ 避免做法

```css
/* ❌ 硬编码颜色 */
.button {
    background: #007AFF;  /* 不要这样！ */
}

/* ❌ 硬编码尺寸 */
.box {
    padding: 16px;  /* 用 var(--spacing-4) 代替 */
}

/* ❌ 在组件中用 !important */
.button {
    color: red !important;  /* 避免 */
}
```

## 📊 文件大小对比

### 拆分前
- `common.css`: 801 行，19KB

### 拆分后
- `variables.css`: 306 行，10KB
- `reset.css`: 280 行，7KB
- `typography.css`: 340 行，8KB
- `navigation.css`: 220 行，5KB
- `buttons.css`: 280 行，6KB
- `forms.css`: 300 行，7KB
- `modals.css`: 240 行，6KB
- `cards.css`: 100 行，2KB
- `utilities.css`: 260 行，5KB
- **总计**: 2,326 行，56KB

### 优势
✅ 每个文件 < 350 行，易于维护  
✅ 职责清晰，修改按钮只看 buttons.css  
✅ 可以按需加载（未来优化）  
✅ 团队协作无冲突  

## 🚀 性能优化（未来）

当项目变大后可考虑：

1. **CSS 打包压缩**
```bash
# 使用工具合并压缩
cssnano main.css -o dist/styles.min.css
```

2. **按需加载**
```html
<!-- 首页只加载必需组件 -->
<link rel="stylesheet" href="base.css">
<link rel="stylesheet" href="home.css">
```

3. **Critical CSS**
```html
<!-- 首屏关键样式内联 -->
<style>
    /* critical styles */
</style>
<link rel="preload" href="main.css" as="style">
```

## 📚 参考资源

- [ITCSS 架构](https://www.xfive.co/blog/itcss-scalable-maintainable-css-architecture/)
- [BEM 命名](http://getbem.com/)
- [Apple HIG](https://developer.apple.com/design/human-interface-guidelines/)
- [iOS Design Guidelines](https://developer.apple.com/design/resources/)

## 💡 快速参考

### 常用变量

```css
/* 颜色 */
--theme-btn-primary-bg         /* 蓝色按钮 #007AFF */
--theme-info                   /* 蓝色高亮 #007AFF */
--theme-success                /* 绿色 #30D158 */
--theme-danger                 /* 红色 #FF3B30 */

/* 间距 (8px 网格) */
--spacing-1: 4px
--spacing-2: 8px
--spacing-3: 12px
--spacing-4: 16px
--spacing-5: 20px
--spacing-6: 24px

/* 圆角 */
--radius-sm: 6px
--radius-md: 8px
--radius-lg: 12px
--radius-xl: 16px
--radius-2xl: 20px

/* 字体大小 */
--font-sm: 12px
--font-base: 14px
--font-lg: 17px (iOS 默认)
--font-xl: 20px
--font-2xl: 24px
```

### 常用工具类

```html
<!-- 布局 -->
<div class="flex items-center justify-between gap-4">

<!-- 间距 -->
<div class="p-4 m-2 mt-5 mb-3">

<!-- 圆角阴影 -->
<div class="rounded-lg shadow-md">

<!-- 文本 -->
<p class="text-lg font-semibold text-primary">

<!-- 背景 -->
<div class="frosted-glass">
```

---

**维护者**: Frontend Team  
**最后更新**: 2025-12-14  
**版本**: 2.0.0
