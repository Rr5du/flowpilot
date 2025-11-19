# FlowPilot 流式与非流式响应使用指南

## 📖 概述

FlowPilot 支持两种 AI 响应模式：
- **流式（Streaming）**：实时逐字输出，用户体验更流畅
- **非流式（Non-Streaming）**：等待完整响应后一次性显示

## 🔧 配置方式

### 在模型配置中启用/禁用流式

1. 打开"模型配置"对话框
2. 在每个模型配置中，有一个"启用流式输出"开关
3. 切换开关即可为该模型启用或禁用流式模式

### 配置数据存储位置

模型配置存储在浏览器的 `localStorage` 中：
```typescript
// 配置结构示例
{
  "id": "endpoint-1",
  "label": "OpenAI",
  "baseUrl": "https://api.openai.com/v1",
  "apiKey": "sk-...",
  "models": [
    {
      "id": "gpt-4",
      "label": "GPT-4",
      "modelId": "gpt-4",
      "isStreaming": true,  // 👈 流式开关
      "enabled": true
    }
  ]
}
```

## 🎯 使用场景对比

### 流式模式适用场景
✅ **实时对话** - 聊天、问答等交互式场景  
✅ **长文本生成** - 文章、报告等，让用户看到实时进展  
✅ **图表生成** - 流式输出 XML，用户可以看到图表逐步构建  
✅ **用户体验优先** - 减少等待感，提供即时反馈  

### 非流式模式适用场景
✅ **批量处理** - 后台任务，不需要实时反馈  
✅ **稳定性要求高** - 某些场景需要完整响应才能处理  
✅ **工具调用场景** - 复杂的多步骤工具调用，需要等待完整结果  
✅ **API 兼容性** - 某些 LLM 提供商可能不支持流式  

## 🔍 技术实现

### 后端实现（/app/api/chat/route.ts）

```typescript
// 根据模型配置决定使用流式或非流式
const enableStreaming = selectedModel?.isStreaming ?? true;

if (enableStreaming) {
  // 流式响应
  const result = await streamText(commonConfig);
  return result.toUIMessageStreamResponse({
    onError: errorHandler,
    messageMetadata: ({ part }) => {
      // 返回 token 使用统计等 metadata
    },
  });
} else {
  // 非流式响应
  const result = await generateText(commonConfig);
  return result.toUIMessageResponse({
    onError: errorHandler,
    messageMetadata: () => ({
      usage: result.usage,
      finishReason: result.finishReason,
    }),
  });
}
```

### 前端处理（/components/chat-panel-optimized.tsx）

```typescript
// 使用 AI SDK 的 useChat hook
const { messages, sendMessage, status } = useChat({
  transport: new DefaultChatTransport({
    api: "/api/chat",
  }),
  async onToolCall({ toolCall }) {
    // 处理工具调用
  },
});

// 发送消息时传递模型配置
sendMessage(
  { parts },
  {
    body: {
      xml: chartXml,
      modelRuntime: selectedModel,
      enableStreaming: selectedModel?.isStreaming ?? false, // 👈 传递流式配置
    },
  }
);
```

### 客户端自动适配

`useChat` hook 会自动处理流式和非流式响应：
- **流式**：逐步更新 `messages` 状态
- **非流式**：等待完整响应后更新 `messages` 状态
- **状态管理**：两种模式下 `status` 都会正确反映当前状态（`streaming`, `submitted`, `idle`）

## 🛠️ AI SDK 核心 API

### streamText（流式）
```typescript
import { streamText } from 'ai';

const result = await streamText({
  model: resolvedModel,
  system: systemMessage,
  messages: enhancedMessages,
  tools: { ... },
  temperature: 0,
});

// 返回流式
return result.toUIMessageStreamResponse({
  onError: (error) => 'Error message',
  onFinish: async ({ usage }) => {
    console.log('Token usage:', usage);
  },
  messageMetadata: ({ part }) => ({
    // 自定义 metadata
  }),
});
```

### generateText（非流式）
```typescript
import { generateText } from 'ai';

const result = await generateText({
  model: resolvedModel,
  system: systemMessage,
  messages: enhancedMessages,
  tools: { ... },
  temperature: 0,
});

// 返回非流式响应
return result.toUIMessageResponse({
  onError: (error) => 'Error message',
  messageMetadata: () => ({
    usage: result.usage,
    finishReason: result.finishReason,
  }),
});
```

## 📊 关键差异

| 特性 | streamText | generateText |
|------|-----------|--------------|
| 响应方式 | 流式，逐步返回 | 非流式，一次返回 |
| 用户体验 | 实时反馈，减少等待感 | 等待完整结果 |
| 返回方法 | `toUIMessageStreamResponse()` | `toUIMessageResponse()` |
| Token 统计 | 需要 await `result.usage` | 直接访问 `result.usage` |
| 工具调用 | 实时显示工具调用过程 | 完成后显示 |
| 适用场景 | 交互式对话 | 批量处理、后台任务 |

## ⚠️ 注意事项

### 1. 不要手动编码流式数据格式
❌ **错误做法**：
```typescript
const encoder = new TextEncoder();
const stream = new ReadableStream({
  start(controller) {
    controller.enqueue(encoder.encode(`0:"${text}"\n`));
    // ...手动编码各种数据
  },
});
return new Response(stream, { ... });
```

✅ **正确做法**：
```typescript
// 使用 AI SDK 提供的标准方法
return result.toUIMessageResponse({
  onError: errorHandler,
  messageMetadata: () => ({ ... }),
});
`## 2. 工具调用处理
无论流式还是非流式，工具调用都在客户端的 `onToolCall` 回调中处理：
```typescript
useChat({
  async onToolCall({ toolCall }) {
    if (toolCall.toolName === "display_diagram") {
      const { xml } = toolCall.input;
      // 处理图表显示
      onDisplayChart(xml);
      
      addToolResult({
        tool: "display_diagram",
        toolCallId: toolCall.toolCallId,
        output: "Diagram displayed successfully",
      });
    }
  },
});
```

### 3. 状态管理
`useChat` 的 `status` 状态在两种模式下都正确工作：
- `idle` - 空闲
- `submitted` - 已提交请求
- `streaming` - 正在接收响应（流式时会显示逐步更新）
- `error` - 发生错误

## 🔄 迁移说明

如果你之前使用了自定义的流式编码实现，应该迁移到标准 API：

**迁移前**：
```typescript
const encoder = new TextEncoder();
const stream = new ReadableStream({ ... });
return new Response(stream, { headers: { ... } });
```

**迁移后**：
```typescript
const result = await generateText(commonConfig);
return result.toUIMessageResponse({
  onError: errorHandler,
  messageMetadata: () => ({ ... }),
});
```

**优势**：
- ✅ 自动处理消息格式
- ✅ 正确处理工具调用
- ✅ 统一错误处理
- ✅ Metadata 支持
- ✅ 与 `useChat` hook 完美集成

## 🎓 最佳实践

1. **默认使用流式** - 提供更好的用户体验
2. **让用户选择** - 在模型配置中提供开关
3. **使用标准 API** - 不要手动实现数据编码
4. **处理错误** - 使用 `onError` 回调提供友好的错误信息
5. **监控性能** - 使用 `messageMetadata` 收集 token 使用和响应时间

## 📚 参考资源

- [AI SDK - Generating Text](https://ai-sdk.dev/docs/ai-sdk-core/generating-text)
- [AI SDK - generateText API](https://ai-sdk.dev/docs/reference/ai-sdk-core/generate-text)
- [AI SDK - streamText API](https://ai-sdk.dev/docs/reference/ai-sdk-core/stream-text)
- [AI SDK UI - useChat Hook](https://sdk.vercel.ai/docs/ai-sdk-ui/chatbot)

---

**最后更新**: 2025-11-19  
**版本**: 1.0.0
