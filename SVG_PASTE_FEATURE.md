# SVG 粘贴功能

## 🎉 新增功能

在 SVG 编辑器中添加了**粘贴 SVG 代码**的功能，让导入 SVG 更加便捷！

---

## ✨ 功能特性

### 1. **导入方式增强**

现在有**两种方式**导入 SVG：

| 方式 | 按钮 | 适用场景 |
|------|------|----------|
| **文件上传** | 📤 导入 SVG | 从本地文件导入 `.svg` 文件 |
| **粘贴代码** | 📋 粘贴 SVG | 直接粘贴 SVG 代码（从网页、AI 生成等） |

---

### 2. **粘贴 SVG 对话框**

点击 **"粘贴 SVG"** 按钮后，会弹出一个对话框：

```
┌─────────────────────────────────────┐
│  粘贴 SVG 代码                      │
├─────────────────────────────────────┤
│  将你的 SVG 代码粘贴到下方文本框中   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ <svg xmlns="...">           │   │
│  │   <rect .../>               │   │
│  │   <circle .../>             │   │
│  │ </svg>                      │   │
│  └─────────────────────────────┘   │
│                                     │
│         [取消]        [导入]        │
└─────────────────────────────────────┘
```

---

## 📖 使用方法

### 方法 1：从 AI 生成的 SVG 导入

1. 让 AI 生成 SVG 代码
2. 复制 SVG 代码（包括 `<svg>` 标签）
3. 点击 **"粘贴 SVG"** 按钮
4. 将代码粘贴到文本框
5. 点击 **"导入"**

### 方法 2：从网页复制 SVG

1. 在网页上找到 SVG 图形
2. 右键 → 检查元素 → 复制 SVG 代码
3. 点击 **"粘贴 SVG"** 按钮
4. 粘贴代码
5. 点击 **"导入"**

### 方法 3：测试你提供的 SVG

你可以直接粘贴你之前提供的 "风险闭环管理" SVG：

```xml
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600" style="background-color: #f8fafc;">
  <defs>
    <linearGradient id="accentGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#3b82f6;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#1d4ed8;stop-opacity:1" />
    </linearGradient>
    ...
  </defs>
  ...
</svg>
```

现在应该可以正确渲染了！🎉

---

## 🛠️ 技术实现

### 新增的组件和状态

```typescript
// 状态
const [isPasteDialogOpen, setIsPasteDialogOpen] = useState(false);
const [pastedSvgCode, setPastedSvgCode] = useState("");

// 处理函数
const handlePasteSvg = () => {
    const trimmed = pastedSvgCode.trim();
    if (!trimmed) return;
    
    try {
        loadSvgMarkup(trimmed);
        setPastedSvgCode("");
        setIsPasteDialogOpen(false);
    } catch (error) {
        console.error("粘贴 SVG 失败", error);
        alert("无效的 SVG 代码，请检查后重试");
    }
};
```

### 使用的 UI 组件

- `Dialog` - 对话框容器
- `DialogTrigger` - 触发按钮
- `DialogContent` - 对话框内容
- `DialogHeader` - 对话框标题区域
- `Textarea` - 多行文本输入框

---

## 🎨 界面位置

粘贴 SVG 按钮位于顶部工具栏右侧：

```
┌────────────────────────────────────────────┐
│  [选择] [矩形] [圆] [线] [文本]            │
│            [撤销] [重做] [吸附] [对齐...]  │
│            [导入SVG] [📋粘贴SVG] [复制] [清空]  │ ← 这里！
└────────────────────────────────────────────┘
```

---

## ✅ 功能验证

粘贴 SVG 后会：
1. ✅ 解析 SVG 代码
2. ✅ 加载所有元素（rect、circle、path、text、g 等）
3. ✅ 保留所有样式（fill、stroke、opacity 等）
4. ✅ 保留 `<defs>` 定义（gradient、marker、filter 等）
5. ✅ **正确处理 transform**（修复了之前的重复变换问题）
6. ✅ **避免元素重复渲染**
7. ✅ 支持编辑和导出

---

## 🐛 错误处理

- 如果粘贴的不是有效的 SVG 代码，会显示错误提示
- 导入失败时，控制台会输出详细错误信息
- 对话框支持 ESC 键关闭

---

## 🚀 下一步增强建议

可以考虑添加：
- [ ] 快捷键支持（Ctrl/Cmd + V 直接粘贴）
- [ ] 从剪贴板自动检测 SVG
- [ ] SVG 代码语法高亮
- [ ] 预览功能（导入前预览）
- [ ] 历史记录（保存最近粘贴的 SVG）

---

## 📝 修改的文件

- `/components/svg-studio.tsx`
  - 新增 `ClipboardPaste` 图标导入
  - 新增 `Dialog` 组件导入
  - 新增 `Textarea` 组件导入
  - 新增状态：`isPasteDialogOpen`, `pastedSvgCode`
  - 新增函数：`handlePasteSvg`
  - 新增 UI：粘贴 SVG 对话框

---

## 🎯 使用场景

1. **AI 生成的 SVG**：直接复制 AI 生成的代码导入
2. **在线 SVG 编辑器**：从其他编辑器导出 SVG
3. **网页 SVG**：从网页复制 SVG 元素
4. **调试测试**：快速测试不同的 SVG 代码
5. **代码分享**：接收他人分享的 SVG 代码

---

祝使用愉快！🎨✨
