# SVG渲染问题分析和修复

## 问题描述

原始SVG有两个带transform的组：
- Cat组：`transform="translate(-80, 0)"`  
- Dog组：`transform="translate(180, 0)"`

但渲染后发现：
1. 小狗的部分被重复渲染
2. 每个子元素都被错误地应用了组的transform
3. 组的层次结构没有被正确保持

## 根本原因

在`contexts/svg-editor-context.tsx`的`parseElement`函数中，组（`<g>`）元素的解析逻辑有问题：

1. **组transform传递错误**：将组的transform作为inheritedTransform传递给子元素
2. **递归解析问题**：在解析组时，子元素被错误地继承了父组的transform
3. **flatten结构**：应该保持组的层次结构，而不是将所有子元素扁平化到顶级

## 修复方案

### 1. 修正组元素解析逻辑
```tsx
case "g": {
    const children: SvgElement[] = [];
    
    // 递归解析子元素，但不传递组的transform
    Array.from(node.children).forEach(child => {
        if (!(child instanceof Element)) return;
        const tagName = child.tagName.toLowerCase();
        // 跳过定义元素
        if ([...].includes(tagName)) return;
        
        // 子元素不应该继承组的transform
        const parsed = parseElement(child, inheritedTransform);
        if (parsed) children.push(parsed);
    });
    
    return {
        id: node.getAttribute("id") || nanoid(),
        type: "g",
        children,
        // 组自己的transform，不传递给子元素
        transform: parseTransform(node.getAttribute("transform")),
        // ... 其他属性
    } as GroupElement;
}
```

### 2. 修正walker函数逻辑
```tsx
const walker = (nodeList: Iterable<Node>, inheritedTransform?: string) => {
    for (const node of nodeList) {
        if (!(node instanceof Element)) continue;
        
        const tagName = node.tagName.toLowerCase();
        if ([...].includes(tagName)) continue;
        
        const parsedElement = parseElement(node, inheritedTransform);
        
        if (parsedElement) {
            elements.push(parsedElement);
            // 如果是组元素，不要递归子元素，因为已经在parseElement中处理了
            if (parsedElement.type !== "g") {
                // 只有非组元素才递归子元素
                const nextTransform = [inheritedTransform, node.getAttribute("transform")]
                    .filter(Boolean)
                    .join(" ")
                    .trim();
                if (node.children && node.children.length > 0) {
                    walker(Array.from(node.children), nextTransform || undefined);
                }
            }
        }
    }
};
```

### 3. 修正渲染逻辑
在svg-studio.tsx中，需要正确渲染组元素：

```tsx
case "g": {
    const childrenMarkup = element.children
        .filter((child) => child.visible !== false)
        .map(child => {
            同的渲染逻辑
            const childCommonProps = {
                // ... 子元素的通用属性
            };
            // 根据子元素类型渲染
        });
    
    return (
        <g key={element.id} {...commonProps}>
            {childrenMarkup}
        </g>
    );
}
```

## 具体修复
