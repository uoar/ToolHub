# 🔍 导航栏全链路检查清单

## ✅ 已修复的问题

### 1. **字体继承问题** ✅ 已修复
**问题**: 导航栏继承了 `body` 的 `font-family` 和 `line-height`
- picker-wheel: `line-height: 1.6`
- json-parser: `line-height: 1.47059`
- typography.css: `line-height: var(--line-height-relaxed)` (1.6)

**解决方案**:
```css
.global-nav {
    font-family: -apple-system, BlinkMacSystemFont, ... !important;
    font-size: 12px !important;
    font-weight: 400 !important;
    line-height: normal !important;
    letter-spacing: normal !important;
}

.global-nav__link {
    font-family: -apple-system, BlinkMacSystemFont, ... !important;
    line-height: var(--nav-height) !important; /* 44px */
}
```

### 2. **CSS 加载顺序问题** ✅ 已修复
**问题**: `navigation.css` 在页面样式 `style.css` 之前加载，导致被覆盖

**修复前**:
```html
<link rel="stylesheet" href="../shared/styles/main.css">
<link rel="stylesheet" href="../shared/styles/components/navigation.css">
<link rel="stylesheet" href="style.css">  <!-- 覆盖了导航栏样式 -->
```

**修复后**:
```html
<link rel="stylesheet" href="../shared/styles/main.css">
<link rel="stylesheet" href="style.css">
<!-- 导航栏样式必须最后加载，确保优先级最高 -->
<link rel="stylesheet" href="../shared/styles/components/navigation.css">
```

### 3. **全局选择器污染** ✅ 已修复
**问题**: `* { }`, `body { }`, `a { }` 选择器影响导航栏

**防护措施**:
- 所有关键属性添加 `!important`
- 显式重置继承属性
- 防御性 CSS：`margin: 0 !important;`, `padding: 0 !important;`

### 4. **间距跳动问题** ✅ 已修复
**问题**: 导航栏 `padding` 被 `*` 选择器重置

**解决方案**:
```css
.global-nav__link {
    padding: 0 12px !important;
    margin: 0 !important;
}

.global-nav__list li {
    margin: 0 !important;
    padding: 0 !important;
    line-height: normal !important;
}
```

## 📊 对比分析

### 修复前后对比

| 属性 | 首页 | Picker Wheel | JSON Parser | Settings |
|------|------|--------------|-------------|----------|
| **修复前 font-family** | 继承 body | 继承 body | 继承 body | 继承 body |
| **修复后 font-family** | -apple-system | -apple-system | -apple-system | -apple-system |
| **修复前 line-height** | 1.6 | 1.6 | 1.47059 | 1.5 |
| **修复后 line-height** | 44px | 44px | 44px | 44px |
| **修复前 letter-spacing** | 继承 | 继承 | 继承 | 继承 |
| **修复后 letter-spacing** | -0.01em | -0.01em | -0.01em | -0.01em |
| **修复前 padding** | 被重置 | 被重置 | 被重置 | 正常 |
| **修复后 padding** | 0 12px | 0 12px | 0 12px | 0 12px |

## 🛡️ 防护策略总结

### 1. 命名空间隔离
```css
.global-nav          /* 容器 */
.global-nav__content /* 内容区 */
.global-nav__list    /* 列表 */
.global-nav__link    /* 链接 */
```

### 2. 优先级保护
- ✅ 所有关键属性使用 `!important`
- ✅ CSS 文件最后加载
- ✅ 选择器特异性足够高

### 3. 完全重置继承
```css
.global-nav {
    /* 重置所有可能的继承 */
    margin: 0 !important;
    padding: 0 !important;
    box-sizing: border-box !important;
    font-family: ... !important;
    font-size: 12px !important;
    font-weight: 400 !important;
    line-height: normal !important;
    letter-spacing: normal !important;
    color: #1d1d1f !important;
}
```

### 4. JavaScript 作用域隔离
```javascript
(function() {
    // IIFE - 无全局变量泄露
})();
```

## 🧪 测试验证

### 手动测试步骤

1. **访问首页** → 检查导航栏
   - [ ] 字体大小 12px
   - [ ] 字重 400
   - [ ] 链接间距 12px padding
   - [ ] 高度 44px

2. **点击 Picker Wheel** → 观察变化
   - [ ] 字体无跳动
   - [ ] 间距无变化
   - [ ] 高度保持 44px

3. **点击 JSON Parser** → 观察变化
   - [ ] 字体无跳动
   - [ ] 间距无变化
   - [ ] Active 状态正确

4. **点击 Settings** → 观察变化
   - [ ] 样式完全一致
   - [ ] 无任何视觉跳动

### 浏览器开发工具验证

```javascript
// F12 Console 检查
const nav = document.querySelector('.global-nav__link');
const styles = window.getComputedStyle(nav);

console.log('Font Family:', styles.fontFamily);
// 应该是: -apple-system, BlinkMacSystemFont, ...

console.log('Font Size:', styles.fontSize);
// 应该是: 12px

console.log('Line Height:', styles.lineHeight);
// 应该是: 44px (或 var(--nav-height) 的值)

console.log('Padding:', styles.padding);
// 应该是: 0px 12px

console.log('Font Weight:', styles.fontWeight);
// 应该是: 400
```

### CSS 优先级验证

在开发者工具的 Elements 面板：
1. 选中导航链接
2. 查看 Computed 样式
3. 确认所有样式来自 `navigation.css`
4. 确认没有被其他文件覆盖的属性

## 📝 维护规范

### 新增页面时必须遵守

1. **CSS 加载顺序**
   ```html
   <link rel="stylesheet" href="../shared/styles/main.css">
   <link rel="stylesheet" href="your-page-style.css">
   <!-- navigation.css 必须最后 -->
   <link rel="stylesheet" href="../shared/styles/components/navigation.css">
   ```

2. **避免的类名**
   - ❌ 不要使用 `.nav` 作为页面元素
   - ❌ 不要定义 `.global-nav-*` 相关类名
   - ✅ 使用其他前缀如 `.page-nav`, `.content-nav`

3. **全局样式约束**
   - ⚠️ 修改 `*`, `body`, `a` 选择器时要测试导航栏
   - ⚠️ 修改 `font-family`, `line-height`, `letter-spacing` 要验证
   - ✅ 优先使用类选择器，避免标签选择器

## 🚨 紧急回滚方案

如果导航栏出现异常，按以下步骤回滚：

1. **检查 CSS 加载顺序**
   - 确认 `navigation.css` 在最后

2. **检查是否有冲突类名**
   - 搜索 `.global-nav` 是否被重复定义

3. **验证 navigation.css 完整性**
   - 确认所有属性都有 `!important`

4. **清除浏览器缓存**
   - Ctrl + Shift + R 强制刷新

## 📅 更新日志

| 日期 | 问题 | 解决方案 | 状态 |
|------|------|----------|------|
| 2025-12-14 | 字体跳动 | 添加 font-family !important | ✅ |
| 2025-12-14 | 间距跳动 | 添加 padding/margin !important | ✅ |
| 2025-12-14 | line-height 不一致 | 重置为 var(--nav-height) | ✅ |
| 2025-12-14 | CSS 加载顺序错误 | 调整为最后加载 | ✅ |
| 2025-12-14 | 全局样式污染 | 完全重置继承 | ✅ |

---

**状态**: ✅ 已完成全链路修复  
**验证**: 需要用户手动测试确认  
**维护者**: GitHub Copilot  
**最后更新**: 2025-12-14 23:00
