"use client";

import { useEffect, useState } from "react";
import { nanoid } from "nanoid";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
    KeyRound,
    Link2,
    Plus,
    Trash2,
    Eye,
    EyeOff,
    Hash,
    ServerCog,
    ShieldCheck,
    CheckCircle2,
    XCircle,
    Loader2,
    AlertTriangle,
} from "lucide-react";
import type {
    ModelEndpointConfig,
    ModelEndpointDraft,
    EndpointModelDraft,
    ModelValidationResult,
} from "@/types/model-config";

// Simple Switch component
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

interface ModelConfigDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    endpoints: ModelEndpointConfig[];
    onSave: (drafts: ModelEndpointDraft[]) => void;
}

const createEmptyModel = (): EndpointModelDraft => ({
    id: `model-${nanoid(6)}`,
    modelId: "",
    label: "",
});

const createEmptyEndpoint = (): ModelEndpointDraft => {
    const timestamp = Date.now();
    return {
        id: `endpoint-${nanoid(6)}`,
        name: "",
        baseUrl: "",
        apiKey: "",
        createdAt: timestamp,
        updatedAt: timestamp,
        models: [createEmptyModel()],
    };
};

const cloneEndpoint = (endpoint: ModelEndpointDraft): ModelEndpointDraft => ({
    id: endpoint.id,
    name: endpoint.name,
    baseUrl: endpoint.baseUrl,
    apiKey: endpoint.apiKey,
    createdAt: endpoint.createdAt,
    updatedAt: endpoint.updatedAt,
    models: endpoint.models.map((model) => ({
        id: model.id,
        modelId: model.modelId,
        label: model.label,
        description: model.description,
        createdAt: model.createdAt,
        updatedAt: model.updatedAt,
    })),
});

const validateEndpoint = (endpoint: ModelEndpointDraft): string[] => {
    const errors: string[] = [];
    if (!endpoint.baseUrl?.trim()) {
        errors.push("Base URL 不能为空。");
    }
    // 检查 API Key 是否有效
    const hasValidApiKey = endpoint.apiKey?.trim();
    if (!hasValidApiKey) {
        errors.push("API Key 不能为空。");
    }
    const validModels = endpoint.models.filter((model) =>
        Boolean(model.modelId?.trim())
    );
    if (validModels.length === 0) {
        errors.push("至少需要配置一个模型 ID。");
    }
    return errors;
};

export function ModelConfigDialog({
    open,
    onOpenChange,
    endpoints,
    onSave,
}: ModelConfigDialogProps) {
    const [drafts, setDrafts] = useState<ModelEndpointDraft[]>([]);
    const [revealedKeys, setRevealedKeys] = useState<Record<string, boolean>>({});
    const [errors, setErrors] = useState<Record<string, string[]>>({});
    const [validationStates, setValidationStates] = useState<Record<string, 'idle' | 'validating' | 'success' | 'error'>>({});
    const [validationResults, setValidationResults] = useState<Record<string, ModelValidationResult>>({});
    const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        if (open) {
            if (endpoints.length === 0) {
                setDrafts([createEmptyEndpoint()]);
            } else {
                setDrafts(endpoints.map((endpoint) => cloneEndpoint(endpoint)));
            }
            setRevealedKeys({});
            setErrors({});
            setValidationStates({});
            setValidationResults({});
            setValidationErrors({});
        }
    }, [open, endpoints]);

    // 验证单个模型
    const validateModel = async (endpointId: string, modelId: string) => {
        const endpoint = drafts.find(d => d.id === endpointId);
        const model = endpoint?.models.find(m => m.id === modelId);
        
        if (!endpoint || !model) return;

        const validationKey = `${endpointId}:${modelId}`;
        
        // 检查必要字段
        if (!endpoint.baseUrl?.trim() || !endpoint.apiKey?.trim() || !model.modelId?.trim()) {
            setValidationStates(prev => ({ ...prev, [validationKey]: 'error' }));
            setValidationErrors(prev => ({ ...prev, [validationKey]: '请先填写完整的接口配置和模型 ID' }));
            return;
        }

        setValidationStates(prev => ({ ...prev, [validationKey]: 'validating' }));
        setValidationErrors(prev => ({ ...prev, [validationKey]: '' }));

        try {
            const response = await fetch('/api/model-validation', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    baseUrl: endpoint.baseUrl,
                    apiKey: endpoint.apiKey,
                    modelId: model.modelId,
                }),
            });

            const result: ModelValidationResult = await response.json();

            if (result.success) {
                setValidationStates(prev => ({ ...prev, [validationKey]: 'success' }));
                setValidationResults(prev => ({ ...prev, [validationKey]: result }));
                
                // 更新模型验证状态
                handleModelChange(endpointId, modelId, {
                    isValidated: true,
                    validationTime: Date.now(),
                });
            } else {
                setValidationStates(prev => ({ ...prev, [validationKey]: 'error' }));
                setValidationErrors(prev => ({ ...prev, [validationKey]: result.error || '验证失败' }));
            }
        } catch (error: any) {
            setValidationStates(prev => ({ ...prev, [validationKey]: 'error' }));
            setValidationErrors(prev => ({ 
                ...prev, 
                [validationKey]: error.message || '验证请求失败，请检查网络连接' 
            }));
        }
    };

    // 批量验证接口下的所有模型
    const validateAllModels = async (endpointId: string) => {
        const endpoint = drafts.find(d => d.id === endpointId);
        if (!endpoint) return;

        for (const model of endpoint.models) {
            await validateModel(endpointId, model.id);
            // 添加小延迟避免并发过多
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    };

    const toggleReveal = (endpointId: string) => {
        setRevealedKeys((prev) => ({
            ...prev,
            [endpointId]: !prev[endpointId],
        }));
    };

    const handleEndpointChange = (
        endpointId: string,
        patch: Partial<ModelEndpointDraft>
    ) => {
        setDrafts((prev) =>
            prev.map((endpoint) =>
                endpoint.id === endpointId ? { ...endpoint, ...patch } : endpoint
            )
        );
    };

    const handleModelChange = (
        endpointId: string,
        modelId: string,
        patch: Partial<EndpointModelDraft>
    ) => {
        setDrafts((prev) =>
            prev.map((endpoint) =>
                endpoint.id === endpointId
                    ? {
                          ...endpoint,
                          models: endpoint.models.map((model) =>
                              model.id === modelId ? { ...model, ...patch } : model
                          ),
                      }
                    : endpoint
            )
        );
    };

    const handleAddEndpoint = () => {
        setDrafts((prev) => [...prev, createEmptyEndpoint()]);
    };

    const handleRemoveEndpoint = (endpointId: string) => {
        setDrafts((prev) => prev.filter((endpoint) => endpoint.id !== endpointId));
    };

    const handleAddModel = (endpointId: string) => {
        setDrafts((prev) =>
            prev.map((endpoint) =>
                endpoint.id === endpointId
                    ? {
                          ...endpoint,
                          models: [...endpoint.models, createEmptyModel()],
                      }
                    : endpoint
            )
        );
    };

    const handleRemoveModel = (endpointId: string, modelId: string) => {
        setDrafts((prev) =>
            prev.map((endpoint) => {
                if (endpoint.id !== endpointId) return endpoint;
                
                return {
                    ...endpoint,
                    models:
                        endpoint.models.length > 1
                            ? endpoint.models.filter((model) => model.id !== modelId)
                            : endpoint.models,
                };
            })
        );
    };

    const handleSave = () => {
        const nextErrors: Record<string, string[]> = {};
        const validDrafts = drafts.filter((endpoint) => {
            const issues = validateEndpoint(endpoint);
            
            // 检查是否有验证通过的模型
            const validatedModels = endpoint.models.filter(model => {
                const validationKey = `${endpoint.id}:${model.id}`;
                return validationStates[validationKey] === 'success';
            });
            
            if (validatedModels.length === 0) {
                issues.push("至少需要有一个验证通过的模型才能保存。");
            }
            
            if (issues.length > 0) {
                nextErrors[endpoint.id] = issues;
                return false;
            }
            
            return true;
        });

        if (Object.keys(nextErrors).length > 0) {
            setErrors(nextErrors);
            return;
        }

        // 只保存验证通过的模型
        const cleanedDrafts = validDrafts.map(endpoint => ({
            ...endpoint,
            models: endpoint.models.filter(model => {
                const validationKey = `${endpoint.id}:${model.id}`;
                return validationStates[validationKey] === 'success';
            }),
        }));

        onSave(cleanedDrafts);
        onOpenChange(false);
    };

    const renderModelRow = (endpointId: string, model: EndpointModelDraft) => {
        const validationKey = `${endpointId}:${model.id}`;
        const validationState = validationStates[validationKey] || 'idle';
        const validationError = validationErrors[validationKey];
        const validationResult = validationResults[validationKey];

        const getValidationIcon = () => {
            switch (validationState) {
                case 'validating':
                    return <Loader2 className="h-4 w-4 animate-spin text-blue-600" />;
                case 'success':
                    return <CheckCircle2 className="h-4 w-4 text-green-600" />;
                case 'error':
                    return <XCircle className="h-4 w-4 text-red-600" />;
                default:
                    return <AlertTriangle className="h-4 w-4 text-amber-500" />;
            }
        };

        const getValidationText = () => {
            switch (validationState) {
                case 'validating':
                    return '验证中...';
                case 'success':
                    const details = validationResult?.details;
                    const responseTime = details && typeof details === 'object' ? details.responseTime : '';
                    return `验证通过 ${responseTime}`;
                case 'error':
                    return validationError || '验证失败';
                default:
                    return '未验证';
            }
        };

        const canValidate = () => {
            const endpoint = drafts.find(d => d.id === endpointId);
            return endpoint?.baseUrl?.trim() && 
                   endpoint?.apiKey?.trim() && 
                   model.modelId?.trim() && 
                   validationState !== 'validating';
        };

        return (
            <div
                key={model.id}
                className={cn(
                    "flex flex-col gap-3 rounded-xl border p-3",
                    validationState === 'success' 
                        ? "border-green-200/70 bg-green-50/50" 
                        : validationState === 'error'
                        ? "border-red-200/70 bg-red-50/50"
                        : "border-slate-200/70 bg-white/80"
                )}
            >
                {/* 模型ID和标签输入框 */}
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

                {/* 验证状态和按钮 */}
                <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2">
                    <div className="flex items-center gap-2 flex-1">
                        {getValidationIcon()}
                        <span className={cn(
                            "text-xs font-medium",
                            validationState === 'success' ? "text-green-700" :
                            validationState === 'error' ? "text-red-700" :
                            validationState === 'validating' ? "text-blue-700" :
                            "text-amber-700"
                        )}>
                            {getValidationText()}
                        </span>
                    </div>
                    <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-7 rounded-full text-xs"
                        onClick={() => validateModel(endpointId, model.id)}
                        disabled={!canValidate()}
                    >
                        <ShieldCheck className="h-3 w-3 mr-1" />
                        验证
                    </Button>
                </div>

                {/* 验证详情 */}
                {validationState === 'success' && validationResult?.details && typeof validationResult.details === 'object' && (
                    <div className="rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-xs text-green-800">
                        <div className="font-medium">验证成功</div>
                        <div className="mt-1 space-y-1">
                            <div>响应时间: {validationResult.details.responseTime}</div>
                            <div>消耗 Token: {validationResult.details.tokensUsed.total}</div>
                            <div>测试响应: {validationResult.details.testResponse}</div>
                        </div>
                    </div>
                )}

                {/* 验证错误 */}
                {validationState === 'error' && validationError && (
                    <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-800">
                        <div className="font-medium">验证失败</div>
                        <div className="mt-1">{validationError}</div>
                    </div>
                )}

                {/* 流式输出配置 */}
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

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] overflow-hidden rounded-3xl bg-white/95 p-0 sm:max-w-3xl">
                <DialogHeader className="border-b border-slate-100 px-6 py-4">
                    <DialogTitle className="flex items-center gap-2 text-base font-semibold text-slate-900">
                        <ServerCog className="h-5 w-5 text-slate-500" />
                        模型与 API 管理
                    </DialogTitle>
                    <DialogDescription className="text-sm text-slate-500">
                        一个 Base URL 绑定一个 API Key，可挂载多个模型 ID。所有配置仅存储在本地浏览器，不会上传到服务器。
                    </DialogDescription>
                </DialogHeader>

                <div className="flex max-h-[calc(90vh-180px)] flex-col gap-4 overflow-y-auto px-6 py-5">
                    <div className="rounded-2xl border border-dashed border-slate-200/70 bg-slate-50/60 px-4 py-3 text-xs text-slate-500">
                        提示：OpenRouter、OpenAI 自建代理都可以通过自定义 Base URL 接入；确保该接口支持 OpenAI 兼容协议。
                    </div>

                    {drafts.map((endpoint, index) => {
                        const endpointErrors = errors[endpoint.id] ?? [];
                        return (
                            <div
                                key={endpoint.id}
                                className={cn(
                                    "space-y-4 rounded-3xl border px-4 py-4 shadow-sm",
                                    endpointErrors.length > 0
                                        ? "border-red-200/80 bg-red-50/50"
                                        : "border-slate-100 bg-white/80"
                                )}
                            >
                                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <div className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400">
                                                接口 {index + 1}
                                            </div>
                                        </div>
                                        <input
                                            type="text"
                                            placeholder="给这个接口起个名字（如：OpenAI）"
                                            value={endpoint.name}
                                            onChange={(event) =>
                                                handleEndpointChange(endpoint.id, {
                                                    name: event.target.value,
                                                })
                                            }
                                            className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none md:w-80"
                                        />
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className="rounded-full text-xs"
                                            onClick={() => validateAllModels(endpoint.id)}
                                            disabled={
                                                !endpoint.baseUrl?.trim() ||
                                                !endpoint.apiKey?.trim() ||
                                                endpoint.models.some(m => 
                                                    validationStates[`${endpoint.id}:${m.id}`] === 'validating'
                                                )
                                            }
                                        >
                                            <ShieldCheck className="h-3 w-3 mr-1" />
                                            验证所有模型
                                        </Button>
                                        <Button
                                 type="button"
                                            variant="outline"
                                            size="sm"
                                            className="rounded-full"
                                            onClick={() =>
                                                setDrafts((prev) => [
                                                    ...prev,
                                                    cloneEndpoint({
                                                        ...endpoint,
                                                        id: `endpoint-${nanoid(6)}`,
                                                        name: `${endpoint.name || "未命名"} · 副本`,
                                                    }),
                                                ])
                                            }
                                        >
                                            复制接口
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="h-9 w-9 rounded-full text-slate-400 hover:text-red-600"
                                            onClick={() => handleRemoveEndpoint(endpoint.id)}
                                            disabled={drafts.length <= 1}
                                            title="删除接口"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>

                                <div className="grid gap-3 md:grid-cols-2">
                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                                            Base URL
                                        </label>
                                        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3">
                                            <Link2 className="h-4 w-4 text-slate-400" />
                                            <input
                                                type="text"
                                                placeholder="https://api.example.com/v1"
                                                value={endpoint.baseUrl}
                                                onChange={(event) =>
                                                    handleEndpointChange(endpoint.id, {
                                                        baseUrl: event.target.value,
                                                    })
                                                }
                                                className="h-10 w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                                            API Key
                                        </label>
                                        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3">
                                            <KeyRound className="h-4 w-4 text-slate-400" />
                                            <input
                                                type={revealedKeys[endpoint.id] ? "text" : "password"}
                                                placeholder="sk-xxxx or your-api-key"
                                                value={endpoint.apiKey}
                                                onChange={(event) =>
                                                    handleEndpointChange(endpoint.id, {
                                                        apiKey: event.target.value,
                                                    })
                                                }
                                                className="h-10 w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
                                            />
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 rounded-full text-slate-400 hover:text-slate-700"
                                                onClick={() => toggleReveal(endpoint.id)}
                                            >
                                                {revealedKeys[endpoint.id] ? (
                                                    <EyeOff className="h-4 w-4" />
                                                ) : (
                                                    <Eye className="h-4 w-4" />
                                             )}
                                            </Button>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <div className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                                            模型列表
                                        </div>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 rounded-full text-slate-500 hover:text-slate-800"
                                            onClick={() => handleAddModel(endpoint.id)}
                                            title="添加模型"
                                        >
                                            <Plus className="mr-1.5 h-4 w-4" />
                                            添加模型
                                        </Button>
                                    </div>
                                    <div className="space-y-2">
                                        {endpoint.models.map((model) =>
                                            renderModelRow(endpoint.id, model)
                                        )}
                                    </div>
                                </div>

                                {endpointErrors.length > 0 && (
                                    <div className="rounded-2xl border border-red-200 bg-white/80 px-3 py-2 text-sm text-red-600">
                                        {endpointErrors.map((error, idx) => (
                                            <div key={`${endpoint.id}-error-${idx}`}>{error}</div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="inline-flex items-center gap-2 self-start rounded-full border-dashed border-slate-300 text-slate-600"
                        onClick={handleAddEndpoint}
                    >
                        <Plus className="h-4 w-4" />
                        新增接口
                    </Button>
                </div>

                <DialogFooter className="flex flex-col gap-2 border-t border-slate-100 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-[11px] text-slate-500">
                        数据仅保存在浏览器 localStorage，清理缓存或更换设备会丢失配置。<br />
                        <span className="text-amber-600 font-medium">
                            ⚠️ 只有验证通过的模型才能保存和使用。
                        </span>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            type="button"
                            variant="ghost"
                            className="rounded-full"
                            onClick={() => onOpenChange(false)}
                        >
                            取消
                        </Button>
                        <Button
                            type="button"
                            className="rounded-full bg-slate-900 px-4 text-white hover:bg-slate-900/90"
                            onClick={handleSave}
                            disabled={
                                drafts.length === 0 ||
                                !drafts.some(endpoint => 
                                    endpoint.models.some(model => {
                                        const validationKey = `${endpoint.id}:${model.id}`;
                                        return validationStates[validationKey] === 'success';
                                    })
                                )
                            }
                        >
                            保存配置
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
