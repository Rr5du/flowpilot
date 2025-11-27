# Brief 快速控制 - Apple Liquid Glass 风格

## ✨ 设计特点

基于 Apple 最新的 liquid glass 设计语言，打造紧凑、优雅的 Brief 控制栏。

## 🎨 视觉效果

```
                    ┌──────────────────────────────────┐
                    │ ⭐ BRIEF │ [专业●] [自由] │ 🔧 │
                    └──────────────────────────────────┘
```

### Liquid Glass 设计元素

1. **毛玻璃背景**
   - `bg-white/60` - 60% 不透明度的白色
   - `backdrop-blur-xl` - 超强背景模糊
   - 轻盈、通透的质感

2. **柔和边框**
   - `border-white/20` - 20% 不透明度的白色边框
   - 微妙的分隔感

3. **深度阴影**
   - `shadow-lg shadow-slate-900/5` - 大阴影 + 5% 黑色
   - 漂浮感

4. **渐变分隔线**
   - `from-transparent via-slate-300/50 to-transparent`
   - 从透明 → 半透明灰 → 透明
   - 柔和的视觉分隔

5. **按钮状态**
   - **选中**: 白色背景 + 阴影 + 渐变叠加
   - **未选中**: 透明背景 + 悬停变色
   - **禁用**: 50% 不透明度

6. **动画效果**
   - `transition-all duration-200` - 200ms 平滑过渡
   - 设置按钮悬停时旋转 90°（`group-hover:rotate-90`）

## 📏 尺寸规格

### 紧凑设计
- **整体**: `px-3 py-1.5` (左右 12px，上下 6px)
- **文字**: `text-[11px]` (11px 小字)
- **图标**: `h-3.5 w-3.5` (14px × 14px)
- **按钮**: `px-3 py-1` (左右 12px，上下 4px)
- **圆角**: `rounded-2xl` (外层) / `rounded-xl` (内层) / `rounded-lg` (按钮)

### 不占满宽度
- `inline-flex` - 内联弹性布局（自适应内容宽度）
- 父容器使用 `items-center` 居中对齐

## 🎯 组件结构

```tsx
<div className="inline-flex items-center gap-2 ...">
  {/* 1. BRIEF 标识 */}
  <div>
    <Sparkles /> BRIEF
  </div>

  {/* 2. 分隔线 */}
  <div className="h-4 w-px bg-gradient-to-b ..." />

  {/* 3. 模式切换 */}
  <div className="flex items-center gap-1 bg-slate-900/5 ...">
    <button>专业</button>
    <button>自由</button>
  </div>

  {/* 4. 分隔线 */}
  <div className="h-4 w-px bg-gradient-to-b ..." />

  {/* 5. 调整按钮 */}
  <button>
    <Settings2 />
  </button>
</div>
```

## 🔧 技术细节

### 选中状态的实现

使用**双层渐变**实现 Apple 风格的选中效果：

```tsx
<button className={cn(
  "relative ...",
  isActive && "bg-white shadow-md"
)}>
  {/* 底层：纯白背景 + 阴影 */}
  {isActive && (
    <div className="absolute inset-0 bg-gradient-to-b from-white/80 to-white/40" />
  )}
  
  {/* 顶层：文字内容 */}
  <span className="relative z-10">{item.title}</span>
</button>
```

效果：
- 底层：`bg-white` + `shadow-md`（白色 + 中阴影）
- 中层：`from-white/80 to-white/40`（顶部80%白 → 底部40%白）
- 顶层：文字（`z-10` 保证在最上层）

### 设置按钮的旋转动画

```tsx
<button className="group ...">
  <Settings2 className="... group-hover:rotate-90" />
</button>
```

- `group` - 标记父容器
- `group-hover:rotate-90` - 悬停时旋转 90°
- `transition-transform duration-200` - 200ms 过渡

## 📱 响应式布局

### 居中对齐

```tsx
<div className="flex w-full flex-col items-center gap-1.5">
  <BriefQuickControl ... />  {/* 居中 */}
  <div className="w-full">   {/* 输入框占满 */}
    <ChatInputOptimized />
  </div>
</div>
```

- 父容器 `items-center` - 子元素水平居中
- Brief 控制栏 `inline-flex` - 自适应宽度
- 输入框 `w-full` - 占满宽度

### 自适应宽度

Brief 控制栏会根据内容自动调整宽度：
- 最小：约 200px（BRIEF + 专业/自由 + 调整）
- 最大：根据内容扩展

## 🎬 动画效果总结

| 元素 | 动画 | 时长 |
|------|------|------|
| 模式按钮 | 背景、文字颜色、阴影 | 200ms |
| 设置按钮 | 背景颜色 | 200ms |
| 设置图标 | 旋转 90°、颜色 | 200ms |

## 🌈 颜色方案

### 背景
- 整体背景：`bg-white/60` (60% 白色)
- 模式切换区：`bg-slate-900/5` (5% 黑色)
- 选中按钮：`bg-white` (纯白)

### 文字
- BRIEF 标签：`text-slate-500` (灰色 500)
- 选中按钮：`text-slate-900` (灰色 900)
- 未选中按钮：`text-slate-600` → `hover:text-slate-900`
- 设置图标：`text-slate-500` → `hover:text-slate-700`

### 特殊元素
- Sparkles 图标：`text-amber-500` (琥珀色 500)
- 分隔线：`via-slate-300/50` (50% 灰色 300)

## 🎯 交互逻辑

### 模式切换
1. 点击"专业" → 立即切换到专业模式
2. 点击"自由" → 立即切换到自由模式
3. 当前模式高亮显示（白色背景 + 阴影）

### 详细配置
1. 点击右侧的设置图标
2. 图标旋转 90°（视觉反馈）
3. 打开 Brief 配置弹窗

### 禁用状态
- AI 生成时：所有按钮 50% 不透明度
- 无法点击

## 📂 文件清单

### 新创建
- ✅ `components/brief-quick-control.tsx` - Brief 快速控制组件

### 修改
- ✅ `components/chat-panel-optimized.tsx`
  - 导入 `BriefQuickControl`
  - 添加到输入框上方并居中
  - 修改外层容器为 `items-center`

### 可删除
- ❌ `components/brief-mode-quick-switch.tsx` - 旧版本
- ❌ `components/brief-summary-bar.tsx` - 旧版本

## 💡 设计灵感

### Apple Liquid Glass
参考 iOS 17+ 和 macOS Sonoma+ 的设计语言：
- **材质**: 毛玻璃（Frosted Glass）
- **深度**: 多层阴影
- **动画**: 流畅的过渡
- **色彩**: 柔和、通透

### 关键特征
1. ✅ **高模糊度背景** - `backdrop-blur-xl`
2. ✅ **半透明白色** - `bg-white/60`
3. ✅ **柔和边框** - `border-white/20`
4. ✅ **深度阴影** - `shadow-lg shadow-slate-900/5`
5. ✅ **渐变细节** - 分隔线、选中状态
6. ✅ **流畅动画** - 200ms 过渡

## 🎊 完成效果

刷新页面后，你会看到：

```
                    聊天消息区域
                         ↓
        ┌────────────────────────────────┐
        │ ⭐ BRIEF │ [专业●] [自由] │ 🔧 │  ← 紧凑、居中、液态玻璃风格
        └────────────────────────────────┘
┌──────────────────────────────────────────────┐
│  描述你想让流程图如何调整...                  │
│  [⟳] [🎨]  [draw.io] [Claude 4.5] [→]      │
└──────────────────────────────────────────────┘
```

特点：
- ✅ 紧凑、小巧
- ✅ 居中显示（不占满宽度）
- ✅ 专业/自由 快速切换
- ✅ 调整按钮（打开详细配置）
- ✅ Apple liquid glass 风格
- ✅ 流畅的动画效果

Enjoy! ✨
