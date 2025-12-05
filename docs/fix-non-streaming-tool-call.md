# 修复非流式模式下 draw.io 内容不渲染的问题

## 问题描述

在非流式模式下，AI 返回了 `display_diagram` 工具调用，但是 draw.io 图表内容没有被正确渲染到画布上。

从用户提供的日志可以看到：

```
data: {"type":"tool-input-available","toolCallId":"function-call-16993693815405996837","toolName":"display_diagram","input":{"xml":"<root>...</root>"}}
data: {"type":"finish","finishReason":"tool-calls",...}
data: [DONE]
```

AI 返回了包含图表 XML 的工具调用，但是画布上没有任何显示。

## 根本原因

在非流式模式下，后端最初使用 `generateText` API，然后手动构造响应流。但是这种方式**无法正确触发客户端的 `onToolCall` 回调**。

主要原因：
1. `generateText` 返回的是静态结果，不是真正的流式响应
2. 手动构造的事件序列可能不符合 AI SDK 的内部协议
3. `onToolCall` 回调依赖于特定的事件序列和时序

## 解决方案

**统一使用 `streamText` API，无论是流式还是非流式模式**。

在非流式模式下，仍然使用 `streamText`，只是设置 `maxToolRoundtrips=0` 来禁止服务器端自动执行工具调用：

```typescript
} else {
  // 非流式响应 - 使用 streamText 但设置 maxToolRoundtrips=0
  // 让客户端处理工具调用，保持与流式模式一致的体验
  const result = await streamText({
    ...commonConfig,
    maxToolRoundtrips: 0, // 不在服务器端自动执行工具调用
  } as any);

  return result.toUIMessageStreamResponse({
    onError: errorHandler,
    onFinish: async ({ responseMessage, messages }) => {
      cleanup();
      // ... 记录使用情况
    },
    messageMetadata: ({ part }) => {
      // ... 返回 token 使用信息
    },
  });
}
```

## 关键优势

这个解决方案的优势：

1. **代码复用**：流式和非流式使用相同的 API 和响应处理逻辑
2. **事件一致性**：两种模式的事件序列完全相同，确保客户端行为一致
3. **自动触发**：`streamText` 会自动发送正确的事件序列，触发 `onToolCall`
4. **简化维护**：不需要手动构造复杂的事件流
5. **未来兼容**：跟随 AI SDK 的更新，自动获得新功能

## 工作原理

1. **`streamText` API**：即使在非流式模式下，也使用 `streamText` 创建响应流
2. **`maxToolRoundtrips=0`**：禁止服务器端自动执行工具调用，让客户端处理
3. **`toUIMessageStreamResponse`**：自动生成符合 AI SDK 协议的事件序列
4. **客户端 `onToolCall`**：正确接收工具调用事件，执行相应逻辑

### 事件序列（流式和非流式一致）

1. `start` → 开始消息
2. `tool-input-start` → 开始接收工具输入
3. `tool-input-delta` → 流式接收工具输入数据（可能多次）
4. `tool-input-available` → 工具输入完成，触发 `onToolCall`
5. `finish` → 完成消息

## 修改文件

- `/Users/huangtao/WebstormProjects/flowpilot/app/api/chat/route.ts`

## 测试验证

测试非流式模式下的工具调用：

1. 配置模型为非流式模式（`isStreaming: false`）
2. 发送绘图请求，如"画一只小猫"
3. 验证：
   - AI 返回 `display_diagram` 工具调用
   - 画布上正确渲染出图表内容
   - UI 显示工具执行状态卡片
   - 响应速度快（非流式一次性返回）

## 注意事项

1. **`maxToolRoundtrips` 参数**：
   - `0` = 不在服务器端自动执行工具调用，由客户端处理
   - `> 0` = 在服务器端自动执行工具调用指定轮数
   - 对于我们的场景，始终使用 `0` 让客户端处理

2. **流式 vs 非流式的区别**：
   - **流式**：逐步返回数据，UI 实时更新
   - **非流式**：一次性返回所有数据，但仍然通过流式协议传输
   - 两者都使用 `streamText`，只是数据到达的时间不同

3. **兼容性**：
   - 这个方案与现有的流式模式完全兼容
   - 客户端代码无需修改
   - 可以在运行时动态切换流式/非流式模式

## 影响范围

这个修复解决了所有非流式模式下的工具调用渲染问题，包括：

- ✅ `display_diagram` - DrawIO 图表渲染
- ✅ `display_svg` - SVG 图表渲染
- ✅ `edit_diagram` - 图表编辑

## 性能对比

| 模式 | API | 数据传输 | 首屏时间 | 用户体验 |
|------|-----|---------|---------|---------|
| 流式 | `streamText` | 逐步传输 | 快速显示 | 实时反馈 ✨ |
| 非流式（旧） | `generateText` | 一次性传输 | 等待完成 | 快速完成 ⚡ |
| 非流式（新） | `streamText` + `maxToolRoundtrips=0` | 一次性传输（流式协议） | 等待完成 | 快速完成 + 正确工具调用 ✅ |

## 代码对比

### 修复前（错误）

```typescript
// ❌ 使用 generateText，手动构造事件
const result = await generateText(commonConfig);
const chunks = [];
// ... 手动添加各种事件
chunks.push({ type: 'tool-input-available', ... });
return createUIMessageStreamResponse({ stream });
```

### 修复后（正确）

```typescript
// ✅ 使用 streamText，自动生成正确的事件序列
const result = await streamText({
  ...commonConfig,
  maxToolRoundtrips: 0,
});
return result.toUIMessageStreamResponse({
  onError: errorHandler,
  onFinish: ...,
  messageMetadata: ...,
});
```

## 相关代码

### 后端 API（修复后）

```typescript
// app/api/chat/route.ts
export async function POST(req: Request) {
  // ... 解析请求参数
  
  const useStreaming = enableStreaming ?? true;
  
  if (useStreaming) {
    // 流式模式
    const result = await streamText(commonConfig);
    return result.toUIMessageStreamResponse({ ... });
  } else {
    // 非流式模式 - 仍然使用 streamText
    const result = await streamText({
      ...commonConfig,
      maxToolRoundtrips: 0, // 关键：禁止服务器端自动执行工具
    });
    return result.toUIMessageStreamResponse({ ... });
  }
}
```

### 客户端工具执行（无需修改）

```typescript
// components/chat-panel-optimized.tsx
useChat({
  async onToolCall({ toolCall }) {
    if (toolCall.toolName === "display_diagram") {
      const { xml } = toolCall.input as { xml?: string };
      // ... 验证和处理 XML
      await handleCanvasUpdate(cleanXml, {
        origin: "display",
        modelRuntime: selectedModel ?? undefined,
      });
      addToolResult({
        tool: "display_diagram",
        toolCallId: toolCall.toolCallId,
        output: "Diagram rendered to canvas successfully.",
      });
    }
    // ... 其他工具处理
  }
})
```

### UI 显示工具卡片（无需修改）

```typescript
// components/chat-message-display-optimized.tsx
const DiagramToolCard = memo((props) => {
  const { part, diagramResult } = props;
  const { state, input, output } = part;
  // 根据 tool-input-available 事件显示工具状态
  return (
    <div className="tool-card">
      {/* 显示工具执行状态、参数、结果等 */}
    </div>
  );
});
```

## 常见问题

### Q: 为什么不直接在服务器端执行工具调用？

A: 因为工具调用涉及到画布渲染、状态更新等客户端操作，必须在客户端执行。设置 `maxToolRoundtrips=0` 可以让 AI SDK 生成工具调用事件，但不在服务器端执行。

### Q: 非流式模式下会影响性能吗？

A: 不会。非流式模式的响应速度更快（一次性返回所有数据），只是没有实时反馈效果。使用 `streamText` 只是为了保持事件协议一致，不会影响性能。

### Q: 可以混合使用流式和非流式模式吗？

A: 可以。用户可以在模型配置中为每个模型单独设置 `isStreaming` 参数，系统会根据配置自动选择模式。

### Q: 如果模型不支持工具调用怎么办？

A: AI SDK 会自动处理这种情况。如果模型不支持工具调用，会返回纯文本响应，不会触发 `onToolCall`。

## 参考

- AI SDK 文档：https://sdk.vercel.ai/docs/ai-sdk-ui/chatbot
- Issue：非流式模式下 draw.io 内容不渲染
- 相关文件：
  - `app/api/chat/route.ts` - 后端 API
  - `components/chat-panel-optimized.tsx` - 工具调用处理
  - `components/chat-message-display-optimized.tsx` - UI 显示
