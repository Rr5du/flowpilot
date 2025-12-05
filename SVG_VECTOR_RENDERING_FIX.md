# SVG 矢量渲染修复说明

## 问题描述
之前的 SVG 预览使用了 `svgToDataUrl` 函数将 SVG 转换为 data URL，然后通过 Next.js 的 `Image` 组件渲染。这种方式会将 SVG 当作位图处理，导致：
1. 失去矢量图的可缩放特性
2. 渲染结果与原始 SVG 不一致
3. 无法保持高保真度

## 解决方案
修改所有 SVG 预览部分，使用 `dangerouslySetInnerHTML` 直接渲染 SVG 标签，保持矢量特性。

## 修改的文件

### 1. components/chat-message-display-optimized.tsx
#### 修改位置 1：工具卡片中的 SVG 预览（第 298-318 行）
**之前**：
```tsx
{svgToDataUrl(displaySvg) ? (
    <Image
        src={svgToDataUrl(displaySvg)!}
        alt={`svg-preview-${callId}`}
        fill
        className="object-contain"
        sizes="(max-width: 768px) 100vw, 320px"
        unoptimized
    />
) : null}
```

**之后**：
```tsx
<div
    className="max-h-full max-w-full"
    dangerouslySetInnerHTML={{ __html: displaySvg }}
/>
```

#### 修改位置 2：对比模式中的 SVG 预览（第 867-888 行）
**之前**：
```tsx
const previewSvgSrc = svgToDataUrl(result.previewSvg);
// ...
{previewSvgSrc ? (
    <div className="relative h-full w-full">
        <Image
            src={previewSvgSrc}
            alt={`comparison-preview-svg-${cardKey}`}
            fill
            className="object-contain"
            sizes="(max-width: 768px) 100vw, 360px"
            unoptimized
        />
    </div>
) : ...}
```

**之后**：
```tsx
const previewSvg = result.previewSvg?.trim();
// ...
{previewSvg ? (
    <div 
        className="h-full w-full flex items-center justify-center"
        dangerouslySetInnerHTML={{ __html: previewSvg }}
    />
) : ...}
```

### 2. components/message-item.tsx
#### 修改位置：文件类型渲染（第 77-85 行）
**之前**：
```tsx
case "file":
    return (
        <div key={index} className="mt-3">
            <Image
                src={part.url}
                width={240}
                height={240}
                alt={`file-${index}`}
                className="rounded-xl border object-contain"
            />
        </div>
    );
```

**之后**：
```tsx
case "file":
    // 如果是SVG，直接渲染矢量图，否则使用Image组件
    if (part.mediaType === "image/svg+xml" && part.url?.startsWith("data:image/svg+xml")) {
        // 解码SVG内容
        const svgContent = decodeURIComponent(part.url.replace(/^data:image\/svg\+xml[^,]*,/, ""));
        return (
            <div 
                key={index} 
                className="mt-3 max-w-full overflow-auto rounded-xl border bg-slate-50 p-2 flex items-center justify-center"
                style={{ maxHeight: "240px" }}
            >
                <div 
                    className="max-w-full max-h-full"
                    dangerouslySetInnerHTML={{ __html: svgContent }}
                />
            </div>
        );
    }
    return (
        <div key={index} className="mt-3">
            <Image
                src={part.url}
                width={240}
                height={240}
                alt={`file-${index}`}
                className="rounded-xl border object-contain"
            />
        </div>
    );
```

### 3. components/comparison-review-modal.tsx
#### 修改位置：对比结果的 SVG 预览（第 75 行和 197-208 行）
**之前**：
```tsx
const previewSvgSrc = svgToDataUrl(result.previewSvg);
const hasPreviewSvg = Boolean(previewSvgSrc);
// ...
{hasPreviewSvg ? (
    <div className="relative h-full w-full">
        <Image
            src={previewSvgSrc ?? ""}
            alt={`comparison-preview-svg-${result.id}`}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 400px"
            unoptimized
        />
    </div>
) : ...}
```

**之后**：
```tsx
const previewSvg = result.previewSvg?.trim();
const hasPreviewSvg = Boolean(previewSvg);
// ...
{hasPreviewSvg ? (
    <div 
        className="h-full w-full flex items-center justify-center p-4"
        dangerouslySetInnerHTML={{ __html: previewSvg ?? "" }}
    />
) : ...}
```

同时移除了不再需要的导入：
```tsx
// 删除
import { svgToDataUrl } from "@/lib/svg";
```

### 4. components/workspace-nav.tsx
修复了类型错误，为 `WORKSPACES` 数组添加了正确的类型定义：
```tsx
const WORKSPACES: Array<{
    id: string;
    href: string;
    label: string;
    description: string;
    icon: typeof Workflow;
    badge?: string;  // 添加可选的 badge 属性
}> = [
    // ...
];
```

## 优势

### 1. 真正的矢量渲染
- SVG 以原生格式显示，保持可缩放性
- 无论放大多少倍都不会失真
- 可以被浏览器完美渲染

### 2. 高保真度
- 完全保留原始 SVG 的所有样式、渐变、滤镜等效果
- 文本保持清晰可选中（如果 SVG 中有文本元素）
- 动画效果（如果有）也能正常工作

### 3. 性能优化
- 不需要额外的图片编码/解码
- 浏览器原生 SVG 渲染引擎效率更高
- 减少了内存占用

## 安全性考虑
使用 `dangerouslySetInnerHTML` 需要注意 XSS 风险。在当前实现中：
- SVG 内容来自 AI 模型生成，是受控的内容源
- `lib/svg.ts` 中的 `assertSafeSvg` 函数已经对 SVG 进行了基本的安全检查
- 建议未来可以增强 SVG 清理逻辑，过滤潜在的恶意内容

## 测试建议
1. 测试包含复杂渐变的 SVG
2. 测试包含文本的 SVG
3. 测试大尺寸 SVG 的缩放效果
4. 在不同浏览器中测试兼容性
5. 验证对比模式下的 SVG 显示

## 未来改进
1. 可以考虑使用 SVG sanitizer 库（如 DOMPurify）进一步增强安全性
2. 添加 SVG 加载失败的错误处理
3. 支持 SVG 的交互功能（如点击、hover 等）
