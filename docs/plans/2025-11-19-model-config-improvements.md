# 模型配置改进实施计划

**目标:** 移除假模型配置，添加环境变量支持模型配置，实现流式/非流式输出模式可配置

**架构:** 
1. 移除所有伪装的假模型显示逻辑，直接显示真实配置
2. 新增 `.env` 环境变量支持默认模型配置（支持多个模型，每个模型可配置是否流式）
3. 为每个模型添加流式输出配置字段，在对话时自动读取
4. 在 UI 中添加流式/非流式切换选项

**技术栈:** TypeScript, React, Next.js, localStorage

---

## Task 1: 移除假模型展示逻辑

**目标:** 去掉所有用于伪装的假模型配置，直接展示真实配置

**文件:**
- Modify: `hooks/use-model-registry.ts`
- Modify: `components/model-config-dialog.tsx`

**Step 1: 备份当前文件**

```bash
cp hooks/use-model-registry.ts hooks/use-model-registry.ts.backup
cp components/model-config-dialog.tsx components/model-config-dialog.tsx.backup
```

Run: `cd /Users/huangtao/WebstormProjects/flowpilot && cp hooks/use-model-registry.ts hooks/use-model-registry.ts.backup && cp components/model-config-dialog.tsx components/model-config-dialog.tsx.backup`
Expected: 文件备份成功

**Step 2: 移除 use-model-registry.ts 中的假模型逻辑**

在 `hooks/use-model-registry.ts` 中：
- 删除 `getFakeDisplayEndpoint` 函数（第79-91行）
- 删除 `flattenModelsForDisplay` 函数（第128-146行）
- 删除 `displayEndpoints` 和 `displayModels` 的返回（第366-368行和372行）
- 更新 `createDefaultConfig` 函数，移除假配置相关注释

```typescript
// 删除这些函数和变量：
// - getFakeDisplayEndpoint
// - flattenModelsForDisplay
// - displayEndpoints (返回值)
// - displayModels (返回值)
```

**Step 3: 测试移除假模型后的功能**

Run: `cd /Users/huangtao/WebstormProjects/flowpilot && npm run dev`
Expected: 应用正常启动，模型配置界面显示真实配置

**Step 4: 提交更改**

Run: `git add hooks/use-model-registry.ts && git commit -m "refactor: remove fake model display logic"`
Expected: 提交成功

---

## Task 2: 为模型配置添加流式输出字段

**目标:** 在模型配置数据结构中添加 `isStreaming` 字段，支持单独为每个模型配置流式/非流式

**文件:**
- Modify: `types/model-config.ts`
- Modify: `hooks/use-model-registry.ts`

**Step 1: 更新类型定义**

在 `types/model-config.ts` 中添加 `isStreaming` 字段：

```typescript
export interface EndpointModelConfig {
    id: string;
    modelId: string;
    label: string;
    description?: string;
    isStreaming?: boolean; // 该模型是否使用流式输出，默认 false
    createdAt: number;
    updatedAt: number;
}

// 移除全局的 enableStreaming，改为每个模型独立配置
export interface ModelRegistryState {
    endpoints: ModelEndpointConfig[];
    selectedModelKey?: string;
    // 移除: enableStreaming?: boolean;
}

export interface RuntimeModelOption extends RuntimeModelConfig {
    key: string;
    endpointId: string;
    endpointName: string;
    providerHint: string;
    isStreaming?: boolean; // 继承模型的流式配置
}
```

**Step 2: 更新 use-model-registry.ts 中的 normalizeModel**

修改 `normalizeModel` 函数以支持 `isStreaming` 字段：

```typescript
const normalizeModel = (
    model: EndpointModelDraft,
    timestamp: number
): EndpointModelConfig | null => {
    const modelId = (model.modelId ?? "").trim();
    if (!modelId) {
        return null;
    }
    const label = (model.label ?? "").trim() || modelId;
    return {
        id: model.id && model.id.trim().length > 0 ? model.id : nanoid(8),
        modelId,
        label,
        description: model.description?.trim() || undefined,
        isStreaming: model.isStreaming ?? false, // 默认非流式
        createdAt: model.createdAt ?? timestamp,
        updatedAt: timestamp,
    };
};
```

**Step 3: 更新 createDefaultConfig 函数**

```typescript
const createDefaultConfig = (): ModelRegistryState => {
    const defaultEndpointId = nanoid(12);
    const defaultModelId = nanoid(8);
    const timestamp = Date.now();
    
    const realConfig = {
        name: "claude默认",
        baseUrl: "https://www.linkflow.run/v1",
        apiKey: "sk-32Pf7Im0oAkzVM5bCBDz9wtrS0OAP9tUD5gucO4U7SlEsOGG",
        modelId: "claude-sonnet-4-5-20250929",
        label: "claude默认",
        isStreaming: false, // 默认非流式
    };
    
    return {
        endpoints: [
            {
                id: defaultEndpointId,
                name: realConfig.name,
                baseUrl: realConfig.baseUrl,
                apiKey: realConfig.apiKey,
                models: [
                    {
                        id: defaultModelId,
                        modelId: realConfig.modelId,
                        label: realConfig.label,
                        description: undefined,
                        isStreaming: realConfig.isStreaming,
                        createdAt: timestamp,
                        updatedAt: timestamp,
                    }
                ],
                createdAt: timestamp,
                updatedAt: timestamp,
            }
        ],
        selectedModelKey: buildModelKey(defaultEndpointId, defaultModelId),
    };
};
```

**Step 4: 更新 flattenModels 函数**

```typescript
const flattenModels = (
    endpoints: ModelEndpointConfig[]
): RuntimeModelOption[] => {
    return endpoints.flatMap((endpoint) =>
        endpoint.models.map((model) => ({
            key: buildModelKey(endpoint.id, model.id),
            modelId: model.modelId,
            label: model.label,
            baseUrl: endpoint.baseUrl,
            apiKey: endpoint.apiKey,
            endpointId: endpoint.id,
            endpointName: endpoint.name,
            providerHint: deriveProviderHint(endpoint.baseUrl),
            isStreaming: model.isStreaming ?? false, // 添加流式配置
        }))
    );
};
```

**Step 5: 移除全局 toggleStreaming 和 enableStreaming**

在 `useModelRegistry` 返回值中：
- 移除 `toggleStreaming` 函数
- 移除 `enableStreaming` 字段

```typescript
return {
    isReady,
    hasConfiguredModels: models.length > 0,
    endpoints: state.endpoints,
    models,
    selectedModelKey: state.selectedModelKey,
    selectedModel,
    selectModel,
    saveEndpoints,
    clearRegistry,
    // 移除: toggleStreaming,
    // 移除: enableStreaming: state.enableStreaming ?? false,
};
```

**Step 6: 测试类型更新**

Run: `cd /Users/huangtao/WebstormProjects/flowpilot && npm run build`
Expected: 编译成功，无类型错误

**Step 7: 提交更改**

Run: `git add types/model-config.ts hooks/use-model-registry.ts && git commit -m "feat: add isStreaming field to model config"`
Expected: 提交成功

---

## Task 3: 在 UI 中添加流式输出配置选项

**目标:** 在模型配置对话框中为每个模型添加流式/非流式切换开关

**文件:**
- Modify: `components/model-config-dialog.tsx`

**Step 1: 导入 Switch 组件**

如果项目中没有 Switch 组件，先创建一个简单的开关组件：

```typescript
// 在 model-config-dialog.tsx 顶部添加
import { useState } from "react";

// 简单的 Switch 组件 (如果没有现成的)
function Switch({ checked, onCheckedChange, disabled }: { 
    checked: boolean; 
    onCheckedChange: (checked: boolean) => void;
    disabled?: boolean;
}) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            disabled={disabled}
            onClick={() => onCheckedChange(!checked)}
            className={cn(
                "relative inline-flex h-5 w-9 items-center rounded-full transition-colors",
                checked ? "bg-blue-600" : "bg-gray-300",
                disabled && "opacity-50 cursor-not-allowed"
            )}
        >
            <span
                className={cn(
                    "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                    checked ? "translate-x-5" : "translate-x-0.5"
                )}
            />
        </button>
    );
}
```

**Step 2: 在 renderModelRow 中添加流式开关**

在 `renderModelRow` 函数的返回 JSX 中添加流式配置选项：

```typescript
const renderModelRow = (endpointId: string, model: EndpointModelDraft) => {
    return (
        <div
            key={model.id}
            className="flex flex-col gap-2 rounded-xl border border-slate-200/70 bg-white/80 p-3"
        >
            {/* 现有的模型ID和标签输入框 */}
            <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1">
                    <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                        模型 ID
                    </label>
                    <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2">
                        <Hash className="h-4 w-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="app-xxxx 或 gpt-4o 等"
                            value={model.modelId}
                            onChange={(event) =>
                                handleModelChange(endpointId, model.id, {
                                    modelId: event.target.value,
                                })
                            }
                            className="h-9 w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
                        />
                    </div>
                </div>
                <div className="space-y-1">
                    <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                        显示名称（可选）
                    </label>
                    <input
                        type="text"
                        placeholder="FlowPilot · 报表模型"
                        value={model.label}
                        onChange={(event) =>
                            handleModelChange(endpointId, model.id, {
                                label: event.target.value,
                            })
                        }
                        className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
                    />
                </div>
            </div>

            {/* 新增：流式输出配置 */}
            <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-slate-600">
                        流式输出
                    </span>
                    <span className="text-[10px] text-slate-400">
                        (启用后对话逐字显示)
                    </span>
                </div>
                <Switch
                    checked={model.isStreaming ?? false}
                    onCheckedChange={(checked) =>
                        handleModelChange(endpointId, model.id, {
                            isStreaming: checked,
                        })
                    }
                />
            </div>

            {/* 删除按钮 */}
            <div className="flex justify-end">
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full text-slate-400 hover:text-red-600"
                    onClick={() => handleRemoveModel(endpointId, model.id)}
                    disabled={
                        (drafts.find((item) => item.id === endpointId)?.models.length ?? 1) <= 1
                    }
                    title="删除模型"
                >
                    <Trash2 className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
};
```

**Step 3: 测试 UI 显示**

Run: `cd /Users/huangtao/WebstormProjects/flowpilot && npm run dev`
Expected: 打开模型配置对话框，每个模型应显示流式输出开关

**Step 4: 测试配置保存**

1. 打开模型配置对话框
2. 切换某个模型的流式输出开关
3. 保存配置
4. 重新打开对话框，检查开关状态是否保持

Expected: 开关状态正确保存和恢复

**Step 5: 提交更改**

Run: `git add components/model-config-dialog.tsx && git commit -m "feat: add streaming toggle in model config UI"`
Expected: 提交成功

---

## Task 4: 新增环境变量支持默认模型配置

**目标:** 支持通过 `.env` 文件配置默认模型（包括流式设置）

**文件:**
- Modify: `env.example`
- Create: `lib/env-models.ts`
- Modify: `hooks/use-model-registry.ts`

**Step 1: 更新 env.example**

在 `env.example` 文件末尾添加模型配置示例：

```bash
# ===== Default Model Configuration =====
# Configure default models that will be available on first load
# Format: JSON array of model configurations
# Each model can specify: name, baseUrl, apiKey, models (with modelId, label, isStreaming)
#
# Example:
# DEFAULT_MODELS='[{"name":"Claude","baseUrl":"https://api.anthropic.com/v1","apiKey":"sk-ant-xxx","models":[{"modelId":"claude-3-sonnet","label":"Claude 3 Sonnet","isStreaming":false},{"modelId":"claude-3-opus","label":"Claude 3 Opus","isStreaming":true}]},{"name":"OpenAI","baseUrl":"https://api.openai.com/v1","apiKey":"sk-xxx","models":[{"modelId":"gpt-4","label":"GPT-4","isStreaming":true}]}]'
#
# If not set, the hardcoded default in the code will be used
DEFAULT_MODELS=
```

**Step 2: 创建环境变量解析模块**

创建 `lib/env-models.ts` 文件：

```typescript
import { nanoid } from "nanoid";
import type { ModelEndpointConfig } from "@/types/model-config";

interface EnvModelConfig {
    modelId: string;
    label?: string;
    description?: string;
    isStreaming?: boolean;
}

interface EnvEndpointConfig {
    name: string;
    baseUrl: string;
    apiKey: string;
    models: EnvModelConfig[];
}

/**
 * 从环境变量解析默认模型配置
 * @returns 解析后的模型端点配置数组，如果解析失败返回 null
 */
export function parseDefaultModelsFromEnv(): ModelEndpointConfig[] | null {
    const envValue = process.env.DEFAULT_MODELS;
    
    if (!envValue || envValue.trim() === "") {
        return null;
    }

    try {
        const parsed = JSON.parse(envValue) as EnvEndpointConfig[];
        
        if (!Array.isArray(parsed) || parsed.length === 0) {
            console.warn("DEFAULT_MODELS is not a valid array");
            return null;
        }

        const timestamp = Date.now();
        const endpoints: ModelEndpointConfig[] = [];

        for (const endpoint of parsed) {
            // 验证必填字段
            if (!endpoint.baseUrl?.trim() || !endpoint.apiKey?.trim()) {
                console.warn("Skipping endpoint with missing baseUrl or apiKey:", endpoint);
                continue;
            }

            if (!Array.isArray(endpoint.models) || endpoint.models.length === 0) {
                console.warn("Skipping endpoint with no models:", endpoint);
                continue;
            }

            const validModels = endpoint.models
                .filter((model) => model.modelId?.trim())
                .map((model) => ({
                    id: nanoid(8),
                    modelId: model.modelId.trim(),
                    label: model.label?.trim() || model.modelId.trim(),
                    description: model.description?.trim(),
                    isStreaming: model.isStreaming ?? false,
                    createdAt: timestamp,
                    updatedAt: timestamp,
                }));

            if (validModels.length === 0) {
                console.warn("No valid models found for endpoint:", endpoint);
                continue;
            }

            endpoints.push({
                id: nanoid(12),
                name: endpoint.name?.trim() || "未命名",
                baseUrl: endpoint.baseUrl.trim(),
                apiKey: endpoint.apiKey.trim(),
                models: validModels,
                createdAt: timestamp,
                updatedAt: timestamp,
            });
        }

        return endpoints.length > 0 ? endpoints : null;
    } catch (error) {
        console.error("Failed to parse DEFAULT_MODELS from env:", error);
        return null;
    }
}

/**
 * 获取默认模型配置（环境变量优先，否则使用硬编码默认值）
 */
export function getDefaultEndpoints(): ModelEndpointConfig[] {
    // 优先使用环境变量配置
    const envEndpoints = parseDefaultModelsFromEnv();
    if (envEndpoints) {
        console.log("Using DEFAULT_MODELS from environment variables");
        return envEndpoints;
    }

    // 回退到硬编码默认配置
    console.log("Using hardcoded default model configuration");
    const timestamp = Date.now();
    const defaultEndpointId = nanoid(12);
    const defaultModelId = nanoid(8);

    return [
        {
            id: defaultEndpointId,
            name: "claude默认",
            baseUrl: "https://www.linkflow.run/v1",
            apiKey: "sk-32Pf7Im0oAkzVM5bCBDz9wtrS0OAP9tUD5gucO4U7SlEsOGG",
            models: [
                {
                    id: defaultModelId,
                    modelId: "claude-sonnet-4-5-20250929",
                    label: "claude默认",
                    description: undefined,
                    isStreaming: false,
                    createdAt: timestamp,
                    updatedAt: timestamp,
                }
            ],
            createdAt: timestamp,
            updatedAt: timestamp,
        }
    ];
}
```

**Step 3: 更新 use-model-registry.ts 使用环境变量配置**

修改 `createDefaultConfig` 函数：

```typescript
import { getDefaultEndpoints } from "@/lib/env-models";

const createDefaultConfig = (): ModelRegistryState => {
    const endpoints = getDefaultEndpoints();
    const firstEndpoint = endpoints[0];
    const firstModel = firstEndpoint?.models[0];
    
    return {
        endpoints,
        selectedModelKey: firstEndpoint && firstModel 
            ? buildModelKey(firstEndpoint.id, firstModel.id)
            : undefined,
    };
};
```

**Step 4: 创建测试环境变量文件**

创建 `.env.local` 用于测试（不提交到 git）：

```bash
# 测试默认模型配置
DEFAULT_MODELS='[{"name":"Test Endpoint","baseUrl":"https://api.test.com/v1","apiKey":"sk-test-key","models":[{"modelId":"test-model-1","label":"Test Model 1","isStreaming":false},{"modelId":"test-model-2","label":"Test Model 2","isStreaming":true}]}]'
```

**Step 5: 测试环境变量加载**

Run: `cd /Users/huangtao/WebstormProjects/flowpilot && npm run dev`
Expected: 
1. 应用启动后，清除 localStorage
2. 刷新页面，检查是否加载了环境变量中配置的模型
3. 打开模型配置对话框，验证配置正确

**Step 6: 测试无环境变量时的回退**

1. 删除或注释 `.env.local` 中的 `DEFAULT_MODELS`
2. 清除 localStorage
3. 刷新页面

Expected: 应加载硬编码的默认配置

**Step 7: 提交更改**

Run: `git add env.example lib/env-models.ts hooks/use-model-registry.ts && git commit -m "feat: support default models from environment variables"`
Expected: 提交成功

---

## Task 5: 更新聊天 API 读取模型流式配置

**目标:** 对话时自动读取选中模型的 `isStreaming` 配置，决定使用流式或非流式响应

**文件:**
- Modify: `app/api/chat/route.ts`
- Modify: `components/chat-panel-optimized.tsx` (或其他调用聊天 API 的组件)

**Step 1: 更新聊天 API 路由接收 isStreaming 参数**

在 `app/api/chat/route.ts` 中，当前已经有 `enableStreaming` 参数，只需确保正确使用：

```typescript
export async function POST(req: Request) {
  try {
    const { messages, xml, modelRuntime, enableStreaming } = await req.json();

    if (!modelRuntime) {
      return Response.json(
        { error: "Missing model runtime configuration." },
        { status: 400 }
      );
    }
    
    const abortSignal = req.signal;
    const systemMessage = `...`; // 系统提示词保持不变

    const resolvedModel = resolveChatModel(modelRuntime);
    console.log("Model config:", {
        baseUrl: modelRuntime.baseUrl,
        modelId: modelRuntime.modelId,
        hasApiKey: !!modelRuntime.apiKey,
        enableStreaming: enableStreaming ?? false, // 默认非流式
    });

    // 根据 enableStreaming 决定使用流式或非流式
    const useStreaming = enableStreaming ?? false; // 改为默认非流式

    const commonConfig = {
      system: systemMessage,
      model: resolvedModel.model,
      messages: enhancedMessages,
      abortSignal,
      tools: { /* ... 工具定义 ... */ },
      temperature: 0,
    };

    if (useStreaming) {
      // 使用流式响应
      const result = await streamText(commonConfig);
      
      return result.toUIMessageStreamResponse({
        onError: errorHandler,
        onFinish: async ({ responseMessage, messages }) => {
          const endTime = Date.now();
          const durationMs = endTime - startTime;
          
          const usage = await result.usage;
          console.log('Stream finished:', { usage, durationMs });
        },
        messageMetadata: ({ part }) => {
          if (part.type === 'finish') {
            return {
              usage: {
                inputTokens: part.totalUsage?.inputTokens || 0,
                outputTokens: part.totalUsage?.outputTokens || 0,
                totalTokens: (part.totalUsage?.inputTokens || 0) + (part.totalUsage?.outputTokens || 0),
              },
              durationMs: Date.now() - startTime,
            } as any;
          }
          return undefined;
        },
      });
    } else {
      // 使用非流式响应
      const result = await generateText(commonConfig);
      
      const endTime = Date.now();
      const durationMs = endTime - startTime;
      
      console.log('Generation finished:', {
        usage: result.usage,
        durationMs,
      });

      // 返回标准的非流式 JSON 响应
      return Response.json({
        text: result.text,
        toolCalls: result.toolCalls,
        usage: {
          inputTokens: result.usage.inputTokens,
          outputTokens: result.usage.outputTokens,
          totalTokens: result.usage.inputTokens + result.usage.outputTokens,
        },
        durationMs,
      });
    }
  } catch (error) {
    console.error('Error in chat route:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    return Response.json(
      { 
        error: 'Internal server error',
        message: errorMessage,
      },
      { status: 500 }
    );
  }
}
```

**Step 2: 找到调用聊天 API 的前端代码**

Run: `grep -r "api/chat" /Users/huangtao/WebstormProjects/flowpilot/components --include="*.tsx" --include="*.ts" | head -20`
Expected: 找到调用聊天 API 的组件

**Step 3: 更新前端传递 enableStreaming 参数**

在 `components/chat-panel-optimized.tsx` 或相关组件中，确保传递 `enableStreaming`:

```typescript
// 在 useChat hook 调用处
const { messages, input, handleInputChange, handleSubmit, isLoading, stop } = useChat({
    api: '/api/chat',
    body: {
        xml: chartXML,
        modelRuntime: selectedModel ? {
            modelId: selectedModel.modelId,
            baseUrl: selectedModel.baseUrl,
            apiKey: selectedModel.apiKey,
        } : undefined,
        enableStreaming: selectedModel?.isStreaming ?? false, // 使用模型的流式配置
    },
    // ... 其他配置
});
```

**Step 4: 测试流式和非流式模式**

1. 配置一个流式模型 (isStreaming: true)
2. 配置一个非流式模型 (isStreaming: false)
3. 分别选择两个模型进行对话

Expected:
- 流式模型：逐字显示响应
- 非流式模型：整体显示响应

**Step 5: 验证控制台日志**

在对话过程中检查浏览器控制台和服务器日志：

Expected: 
- 流式模式显示 "Stream finished" 日志
- 非流式模式显示 "Generation finished" 日志

**Step 6: 提交更改**

Run: `git add app/api/chat/route.ts components/chat-panel-optimized.tsx && git commit -m "feat: support per-model streaming configuration"`
Expected: 提交成功

---

## Task 6: 添加全局流式切换快捷选项（可选）

**目标:** 在 UI 某处添加快速切换流式/非流式的选项，临时覆盖模型默认设置

**文件:**
- Modify: `components/chat-panel-optimized.tsx`
- Modify: `components/model-selector.tsx` (如果需要在选择器中显示)

**Step 1: 添加流式模式状态**

在聊天面板组件中添加状态：

```typescript
// 在 ChatPanelOptimized 组件中
const [streamingOverride, setStreamingOverride] = useState<boolean | null>(null);

// 计算实际使用的流式设置
const effectiveStreaming = streamingOverride !== null 
    ? streamingOverride 
    : (selectedModel?.isStreaming ?? false);
```

**Step 2: 在工具栏添加切换按钮**

在聊天界面的工具栏或设置区域添加切换按钮：

```typescript
<div className="flex items-center gap-2">
    <span className="text-xs text-slate-600">输出模式:</span>
    <div className="flex gap-1 rounded-lg border border-slate-200 p-0.5">
        <Button
            size="sm"
            variant={effectiveStreaming ? "default" : "ghost"}
            className="h-7 rounded-md px-2 text-xs"
            onClick={() => setStreamingOverride(true)}
        >
            流式
        </Button>
        <Button
            size="sm"
            variant={!effectiveStreaming ? "default" : "ghost"}
            className="h-7 rounded-md px-2 text-xs"
            onClick={() => setStreamingOverride(false)}
        >
            普通
        </Button>
        {streamingOverride !== null && (
            <Button
                size="sm"
                variant="ghost"
                className="h-7 rounded-md px-2 text-xs text-slate-400"
                onClick={() => setStreamingOverride(null)}
                title="恢复模型默认设置"
            >
                ✕
            </Button>
        )}
    </div>
</div>
```

**Step 3: 更新 API 调用使用 effectiveStreaming**

```typescript
const { messages, input, handleInputChange, handleSubmit, isLoading, stop } = useChat({
    api: '/api/chat',
    body: {
        xml: chartXML,
        modelRuntime: selectedModel ? {
            modelId: selectedModel.modelId,
            baseUrl: selectedModel.baseUrl,
            apiKey: selectedModel.apiKey,
        } : undefined,
        enableStreaming: effectiveStreaming, // 使用计算后的流式设置
    },
    // ... 其他配置
});
```

**Step 4: 测试快捷切换**

1. 选择一个非流式模型
2. 使用工具栏切换到流式模式
3. 发送消息，验证是否使用流式输出
4. 点击 "✕" 恢复默认
5. 再次发送消息，验证是否恢复非流式

Expected: 切换功能正常工作

**Step 5: 添加提示信息**

在切换按钮附近添加提示：

```typescript
{streamingOverride !== null && (
    <span className="text-[10px] text-orange-500">
        (临时覆盖模型默认设置)
    </span>
)}
```

**Step 6: 提交更改**

Run: `git add components/chat-panel-optimized.tsx && git commit -m "feat: add streaming mode quick toggle"`
Expected: 提交成功

---

## Task 7: 更新文档和示例

**目标:** 更新项目文档，说明新的模型配置方式

**文件:**
- Create: `docs/model-configuration.md`
- Modify: `README.md` 或 `README_CN.md`

**Step 1: 创建模型配置文档**

创建 `docs/model-configuration.md`:

```markdown
# 模型配置指南

## 概述

FlowPilot 支持通过两种方式配置 AI 模型：
1. **环境变量配置**: 在 `.env.local` 中配置默认模型
2. **UI 界面配置**: 在应用中通过"模型配置"对话框添加和管理模型

## 环境变量配置

### 配置格式

在 `.env.local` 文件中添加 `DEFAULT_MODELS` 变量：

\`\`\`bash
DEFAULT_MODELS='[{"name":"Endpoint Name","baseUrl":"https://api.example.com/v1","apiKey":"your-api-key","models":[{"modelId":"model-id","label":"Display Name","isStreaming":false}]}]'
\`\`\`

### 字段说明

- `name`: 端点名称（如 "OpenAI", "Claude"）
- `baseUrl`: API 基础 URL
- `apiKey`: API 密钥
- `models`: 模型数组，每个模型包含：
  - `modelId`: 模型 ID（必填）
  - `label`: 显示名称（可选，默认使用 modelId）
  - `description`: 描述信息（可选）
  - `isStreaming`: 是否启用流式输出（可选，默认 `false`）

### 配置示例

#### 单个端点，多个模型

\`\`\`bash
DEFAULT_MODELS='[{
  "name": "OpenAI",
  "baseUrl": "https://api.openai.com/v1",
  "apiKey": "sk-your-openai-key",
  "models": [
    {
      "modelId": "gpt-4",
      "label": "GPT-4",
      "isStreaming": true
    },
    {
      "modelId": "gpt-3.5-turbo",
      "label": "GPT-3.5 Turbo",
      "isStreaming": false
    }
  ]
}]'
\`\`\`

#### 多个端点

\`\`\`bash
DEFAULT_MODELS='[
  {
    "name": "OpenAI",
    "baseUrl": "https://api.openai.com/v1",
    "apiKey": "sk-xxx",
    "models": [
      {"modelId": "gpt-4", "label": "GPT-4", "isStreaming": true}
    ]
  },
  {
    "name": "Claude",
    "baseUrl": "https://api.anthropic.com/v1",
    "apiKey": "sk-ant-xxx",
    "models": [
      {"modelId": "claude-3-opus", "label": "Claude 3 Opus", "isStreaming": false}
    ]
  }
]'
\`\`\`

## UI 界面配置

### 打开配置对话框

1. 点击应用中的"模型配置"按钮
2. 在对话框中添加或编辑端点和模型

### 配置项说明

- **接口名称**: 给端点起一个易识别的名字
- **Base URL**: API 基础 URL（支持 OpenAI 兼容接口）
- **API Key**: 接口密钥
- **模型列表**: 
  - **模型 ID**: 实际调用的模型标识符
  - **显示名称**: UI 中显示的名称
  - **流式输出**: 开关，控制该模型是否使用流式响应

### 流式 vs 非流式

- **流式输出** (`isStreaming: true`): 
  - 响应内容逐字显示
  - 适合长文本生成
  - 用户体验更好
  
- **非流式输出** (`isStreaming: false`):
  - 等待完整响应后一次性显示
  - 适合短响应或需要完整结果后再处理的场景
  - 响应更稳定

## 数据存储

- **环境变量配置**: 仅在首次加载时使用，作为默认配置
- **UI 配置**: 存储在浏览器 localStorage 中
- **优先级**: UI 配置会覆盖环境变量配置

⚠️ **注意**: 清除浏览器缓存或更换设备会丢失 UI 配置，建议重要配置保存在环境变量中。

## 快捷切换流式模式

在聊天界面中，可以临时切换流式/非流式模式，覆盖模型默认设置：

1. 找到"输出模式"切换按钮
2. 选择"流式"或"普通"
3. 点击 ✕ 恢复模型默认设置

## 故障排除

### 环境变量未生效

1. 确认 `.env.local` 文件在项目根目录
2. 重启开发服务器 (`npm run dev`)
3. 清除浏览器 localStorage 和缓存
4. 刷新页面

### JSON 格式错误

使用 JSON 验证工具检查 `DEFAULT_MODELS` 的格式：
- 确保所有引号使用双引号 `"`
- 确保没有多余的逗号
- 确保所有括号正确闭合

### 模型调用失败

1. 检查 Base URL 和 API Key 是否正确
2. 确认模型 ID 拼写无误
3. 查看浏览器控制台和服务器日志获取详细错误信息
\`\`\`

**Step 2: 更新 README**

在 `README_CN.md` 中添加模型配置章节链接：

```markdown
## 📖 文档

- [模型配置指南](docs/model-configuration.md) - 如何配置 AI 模型（环境变量和 UI）
- [架构文档](docs/architecture.md)
- [国际化指南](docs/i18n-guide.md)
```

**Step 3: 验证文档**

1. 阅读创建的文档，确保清晰易懂
2. 按照文档步骤测试配置流程

Expected: 文档准确描述配置步骤

**Step 4: 提交更改**

Run: `git add docs/model-configuration.md README_CN.md && git commit -m "docs: add model configuration guide"`
Expected: 提交成功

---

## Task 8: 端到端测试

**目标:** 全面测试所有新功能

**Step 1: 测试环境变量配置**

测试用例：
1. 创建包含 2 个端点、共 3 个模型的配置
2. 其中 1 个模型设置为流式，2 个为非流式
3. 启动应用，验证配置加载

Expected: 所有模型正确加载，流式设置正确

**Step 2: 测试 UI 配置**

测试用例：
1. 打开模型配置对话框
2. 添加新端点和模型
3. 修改现有模型的流式设置
4. 保存并重新打开对话框

Expected: 配置正确保存和恢复

**Step 3: 测试对话功能**

测试用例：
1. 选择流式模型，发起对话
   - Expected: 响应逐字显示
2. 选择非流式模型，发起对话
   - Expected: 响应一次性显示
3. 使用快捷切换覆盖模型默认设置
   - Expected: 临时设置生效

**Step 4: 测试错误处理**

测试用例：
1. 输入无效的环境变量配置
   - Expected: 回退到默认配置，控制台显示警告
2. 在 UI 中保存空的 Base URL
   - Expected: 显示验证错误
3. 切换到无效的模型
   - Expected: 显示错误提示

**Step 5: 测试数据持久化**

测试用例：
1. 配置模型后刷新页面
   - Expected: 配置保持
2. 清除 localStorage 后刷新
   - Expected: 加载环境变量配置或默认配置

**Step 6: 性能测试**

测试用例：
1. 配置 10+ 个模型
2. 快速切换模型
3. 多次打开/关闭配置对话框

Expected: 界面流畅，无明显卡顿

**Step 7: 记录测试结果**

创建测试报告文档：

```markdown
# 模型配置功能测试报告

测试日期: [日期]
测试人员: [姓名]

## 测试环境
- Node.js 版本:
- 浏览器: 
- 操作系统:

## 测试结果

| 测试用例 | 状态 | 备注 |
|---------|------|------|
| 环境变量配置加载 | ✅ Pass | - |
| UI 配置保存/恢复 | ✅ Pass | - |
| 流式模式对话 | ✅ Pass | - |
| 非流式模式对话 | ✅ Pass | - |
| 快捷切换功能 | ✅ Pass | - |
| 错误处理 | ✅ Pass | - |
| 数据持久化 | ✅ Pass | - |
| 性能测试 | ✅ Pass | - |

## 发现的问题

[列出测试中发现的问题]

## 改进建议

[列出改进建议]
```

**Step 8: 最终代码审查**

检查清单：
- [ ] 代码符合项目风格规范
- [ ] 没有遗留的 console.log 调试代码
- [ ] 类型定义完整准确
- [ ] 错误处理覆盖所有边界情况
- [ ] 用户界面直观易用
- [ ] 文档完整清晰

**Step 9: 最终提交**

Run: `git add . && git commit -m "feat: complete model configuration improvements" && git push`
Expected: 所有更改推送到远程仓库

---

## 验收标准

✅ **功能完整性**
- [ ] 移除了所有假模型展示逻辑
- [ ] 支持通过环境变量配置默认模型
- [ ] 每个模型可单独配置流式/非流式
- [ ] UI 中可配置模型的流式设置
- [ ] 对话时自动读取模型的流式配置
- [ ] 提供快捷切换流式模式的选项

✅ **代码质量**
- [ ] 无 TypeScript 类型错误
- [ ] 无 ESLint 警告
- [ ] 代码遵循 DRY 原则
- [ ] 错误处理完善

✅ **用户体验**
- [ ] UI 直观易用
- [ ] 配置保存可靠
- [ ] 流式/非流式切换平滑
- [ ] 错误提示清晰

✅ **文档完整性**
- [ ] 环境变量配置有详细说明
- [ ] UI 配置有使用指南
- [ ] 示例代码清晰准确

✅ **测试覆盖**
- [ ] 所有核心功能已测试
- [ ] 边界情况已验证
- [ ] 错误处理已测试

## 预计工时

- Task 1: 30 分钟
- Task 2: 45 分钟
- Task 3: 1 小时
- Task 4: 1.5 小时
- Task 5: 1 小时
- Task 6: 45 分钟
- Task 7: 30 分钟
- Task 8: 1 小时

**总计**: 约 7 小时

## 注意事项

1. **数据迁移**: 现有用户的 localStorage 数据可能没有 `isStreaming` 字段，需要在 `normalizeModel` 中提供默认值
2. **向后兼容**: 确保现有配置在更新后仍能正常工作
3. **安全性**: API Key 在前端存储时要注意安全提示
4. **性能**: 大量模型配置时要确保界面流畅
5. **错误处理**: 环境变量解析失败时要优雅降级

## 后续优化建议

1. 添加模型配置导入/导出功能
2. 支持模型配置云端同步
3. 添加模型性能指标显示
4. 支持更细粒度的流式配置（如 token 数量阈值）
