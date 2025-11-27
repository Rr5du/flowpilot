# SVG 属性渲染问题修复说明

## 问题描述

在对比大模型生成的 SVG 和渲染到画板的 SVG 时，发现以下属性丢失：

### 丢失的属性

1. **stroke-linecap** - 线条端点样式（round/square/butt）
2. **stroke-linejoin** - 线条连接点样式（round/bevel/miter）
3. **stroke-miterlimit** - 斜接限制
4. **fill-rule** - 填充规则（nonzero/evenodd）
5. **font-family** - 文本字体

## 修复内容

### 1. 类型定义更新 (`svg-editor-context.tsx`)

**SvgElementBase 类型扩展**:
```typescript
export type SvgElementBase = {
    id: string;
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
    strokeDasharray?: string;
    strokeLinecap?: "butt" | "round" | "square";      // ✅ 新增
    strokeLinejoin?: "miter" | "round" | "bevel";     // ✅ 新增
    strokeMiterlimit?: number;                         // ✅ 新增
    fillRule?: "nonzero" | "evenodd";                  // ✅ 新增
    markerEnd?: string;
    markerStart?: string;
    opacity?: number;
    transform?: Transform;
    visible?: boolean;
    locked?: boolean;
};
```

**TextElement 类型扩展**:
```typescript
export type TextElement = SvgElementBase & {
    type: "text";
    x: number;
    y: number;
    text: string;
    fontSize?: number;
    fontWeight?: string;
    fontFamily?: string;  // ✅ 新增
    textAnchor?: "start" | "middle" | "end";
    dominantBaseline?: ...;
};
```

### 2. 导出函数更新 (`elementToMarkup`)

在 `elementToMarkup` 函数中添加对新属性的序列化支持：

```typescript
const common = [
    element.fill !== undefined ? `fill="${element.fill}"` : 'fill="none"',
    element.stroke !== undefined ? `stroke="${element.stroke}"` : "",
    element.strokeWidth !== undefined ? `stroke-width="${element.strokeWidth}"` : "",
    element.strokeDasharray ? `stroke-dasharray="${element.strokeDasharray}"` : "",
    element.strokeLinecap ? `stroke-linecap="${element.strokeLinecap}"` : "",        // ✅ 新增
    element.strokeLinejoin ? `stroke-linejoin="${element.strokeLinejoin}"` : "",      // ✅ 新增
    element.strokeMiterlimit !== undefined ? `stroke-miterlimit="${element.strokeMiterlimit}"` : "", // ✅ 新增
    element.fillRule ? `fill-rule="${element.fillRule}"` : "",                        // ✅ 新增
    element.markerEnd ? `marker-end="${element.markerEnd}"` : "",
    element.markerStart ? `marker-start="${element.markerStart}"` : "",
    element.opacity != null ? `opacity="${element.opacity}"` : "",
]
```

**text 元素特殊处理**:
```typescript
case "text":
    return `<text id="${element.id}" x="${element.x}" y="${element.y}" 
        ${element.fontSize ? `font-size="${element.fontSize}"` : ""} 
        ${element.fontWeight ? `font-weight="${element.fontWeight}"` : ""} 
        ${element.fontFamily ? `font-family="${element.fontFamily}"` : ""}  // ✅ 新增
        ${element.textAnchor ? `text-anchor="${element.textAnchor}"` : ""} 
        ${common}${transformAttr}>${element.text}</text>`;
```

### 3. 解析函数更新 (`parseElement`)

为所有元素类型（rect, circle, ellipse, line, path, polygon/polyline, text, g）添加新属性的解析：

```typescript
case "rect":
    return {
        // ...existing fields
        strokeLinecap: (node.getAttribute("stroke-linecap") as any) || undefined,
        strokeLinejoin: (node.getAttribute("stroke-linejoin") as any) || undefined,
        strokeMiterlimit: parseOptionalNumber(node.getAttribute("stroke-miterlimit")),
        fillRule: (node.getAttribute("fill-rule") as any) || undefined,
        // ...
    } as RectElement;
```

对 text 元素：
```typescript
case "text":
    return {
        // ...existing fields
        fontFamily: node.getAttribute("font-family") || undefined,  // ✅ 新增
        strokeLinecap: (node.getAttribute("stroke-linecap") as any) || undefined,
        strokeLinejoin: (node.getAttribute("stroke-linejoin") as any) || undefined,
        // ...
    } as TextElement;
```

### 4. 渲染组件更新 (`svg-studio.tsx`)

在 SVG 渲染时添加新属性的支持：

**rect 元素**:
```tsx
<rect
    key={element.id}
    {...commonProps}
    x={element.x}
    y={element.y}
    width={element.width}
    height={element.height}
    rx={element.rx}
    ry={element.ry}
    fill={element.fill || "none"}
    stroke={element.stroke}
    strokeWidth={element.strokeWidth || 1.4}
    strokeDasharray={element.strokeDasharray}
    strokeLinecap={element.strokeLinecap}          // ✅ 新增
    strokeLinejoin={element.strokeLinejoin}        // ✅ 新增
    strokeMiterlimit={element.strokeMiterlimit}    // ✅ 新增
    fillRule={element.fillRule}                    // ✅ 新增
    markerEnd={element.markerEnd}
    markerStart={element.markerStart}
    opacity={element.opacity}
/>
```

**text 元素**:
```tsx
<text
    key={element.id}
    {...commonProps}
    x={element.x}
    y={element.y}
    fill={element.fill || "#0f172a"}
    fontSize={element.fontSize || 16}
    fontWeight={element.fontWeight}
    fontFamily={element.fontFamily}  // ✅ 新增
    textAnchor={element.textAnchor}
    dominantBaseline={element.dominantBaseline}
    className={cn(
        "select-none",
        element.visible === (false as any) && "opacity-30"
    )}
>
    {element.text}
</text>
```

## 修复效果

### 修复前
```xml
<!-- 缺少 stroke-linecap, stroke-linejoin 等属性 -->
<path d="M 340 200 L 320 140 L 360 180 Z" fill="#e9ecef" stroke="#495057" stroke-width="1.6" />
<line x1="340" y1="245" x2="280" y2="240" fill="none" stroke="#495057" stroke-width="1.6" />
<text x="400" y="540" font-size="24" font-weight="500" text-anchor="middle" fill="#495057">Cute Cat</text>
```

### 修复后
```xml
<!-- 完整保留所有渲染属性 -->
<path d="M 340 200 L 320 140 L 360 180 Z" fill="#e9ecef" stroke="#495057" stroke-width="1.6" stroke-linejoin="round" />
<line x1="340" y1="245" x2="280" y2="240" fill="none" stroke="#495057" stroke-width="1.6" stroke-linecap="round" />
<text x="400" y="540" font-size="24" font-weight="500" font-family="system-ui, -apple-system, sans-serif" text-anchor="middle" fill="#495057">Cute Cat</text>
```

## 影响范围

✅ **所有支持的元素类型**:
- rect
- circle
- ellipse
- line
- path
- polygon/polyline (转换为 path)
- text
- g (group)

✅ **完整的属性链路**:
1. 类型定义 ✓
2. 解析（导入 SVG）✓
3. 存储（内存数据结构）✓
4. 渲染（画布显示）✓
5. 导出（SVG 字符串）✓

## 测试建议

1. 导入你提供的猫咪 SVG
2. 检查属性面板是否正确显示所有属性
3. 导出 SVG 并对比是否完整保留所有属性
4. 验证渲染效果是否与原始 SVG 一致

## 其他可能的改进

如果后续还需要支持更多 SVG 属性，可以参考同样的模式添加：
- `stroke-opacity`
- `fill-opacity`
- `clip-path`
- `mask`
- `filter`
- 等等...
