"use client";

import { useEffect, useState, useMemo } from "react";
import { nanoid } from "nanoid";
import {
    Dialog,
    DialogContent,
    DialogDescription,
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
    Search,
    MoreHorizontal,
    Settings2,
    Copy,
    Cpu,
} from "lucide-react";
import type {
    ModelEndpointConfig,
    ModelEndpointDraft,
    EndpointModelDraft,
    ModelValidationResult,
} from "@/types/model-config";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// iOS-style Switch
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
                "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/20",
                checked ? "bg-blue-600" : "bg-slate-200",
                disabled && "opacity-50 cursor-not-allowed"
            )}
        >
            <span
                className={cn(
                    "inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform duration-200",
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
    maxDuration: 300,
});

const createEmptyEndpoint = (): ModelEndpointDraft => {
    const timestamp = Date.now();
    return {
        id: `endpoint-${nanoid(6)}`,
        name: "新接口",
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
        isStreaming: model.isStreaming,
        maxDuration: model.maxDuration,
        isValidated: model.isValidated,
        validationTime: model.validationTime,
        createdAt: model.createdAt,
        updatedAt: model.updatedAt,
    })),
});

const validateEndpoint = (endpoint: ModelEndpointDraft): string[] => {
    const errors: string[] = [];
    if (!endpoint.baseUrl?.trim()) {
        errors.push("Base URL 不能为空");
    }
    if (!endpoint.apiKey?.trim()) {
        errors.push("API Key 不能为空");
    }
    const validModels = endpoint.models.filter((model) =>
        Boolean(model.modelId?.trim())
    );
    if (validModels.length === 0) {
        errors.push("至少需要配置一个模型 ID");
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
    const [selectedEndpointId, setSelectedEndpointId] = useState<string | null>(null);
    const [revealedKeys, setRevealedKeys] = useState<Record<string, boolean>>({});
    const [validationStates, setValidationStates] = useState<Record<string, 'idle' | 'validating' | 'success' | 'error'>>({});
    const [validationResults, setValidationResults] = useState<Record<string, ModelValidationResult>>({});
    const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
    const [globalError, setGlobalError] = useState<string | null>(null);

    useEffect(() => {
        if (open) {
            if (endpoints.length === 0) {
                const newEndpoint = createEmptyEndpoint();
                setDrafts([newEndpoint]);
                setSelectedEndpointId(newEndpoint.id);
            } else {
                setDrafts(endpoints.map((endpoint) => cloneEndpoint(endpoint)));
                setSelectedEndpointId(endpoints[0].id);
            }
            setRevealedKeys({});
            setValidationStates({});
            setValidationResults({});
            setValidationErrors({});
            setGlobalError(null);
        }
    }, [open, endpoints]);

    const selectedEndpoint = useMemo(
        () => drafts.find((e) => e.id === selectedEndpointId),
        [drafts, selectedEndpointId]
    );

    const validateModel = async (endpointId: string, modelId: string) => {
        const endpoint = drafts.find(d => d.id === endpointId);
        const model = endpoint?.models.find(m => m.id === modelId);

        if (!endpoint || !model) return;

        const validationKey = `${endpointId}:${modelId}`;

        if (!endpoint.baseUrl?.trim() || !endpoint.apiKey?.trim() || !model.modelId?.trim()) {
            setValidationStates(prev => ({ ...prev, [validationKey]: 'error' }));
            setValidationErrors(prev => ({ ...prev, [validationKey]: '配置不完整' }));
            return;
        }

        setValidationStates(prev => ({ ...prev, [validationKey]: 'validating' }));
        setValidationErrors(prev => ({ ...prev, [validationKey]: '' }));

        try {
            const response = await fetch('/api/model-validation', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
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
                [validationKey]: error.message || '网络错误'
            }));
        }
    };

    const validateAllModels = async (endpointId: string) => {
        const endpoint = drafts.find(d => d.id === endpointId);
        if (!endpoint) return;
        for (const model of endpoint.models) {
            await validateModel(endpointId, model.id);
        }
    };

    const handleEndpointChange = (endpointId: string, patch: Partial<ModelEndpointDraft>) => {
        setDrafts(prev => prev.map(e => e.id === endpointId ? { ...e, ...patch } : e));
    };

    const handleModelChange = (endpointId: string, modelId: string, patch: Partial<EndpointModelDraft>) => {
        setDrafts(prev => prev.map(e =>
            e.id === endpointId
                ? { ...e, models: e.models.map(m => m.id === modelId ? { ...m, ...patch } : m) }
                : e
        ));
    };

    const handleAddEndpoint = () => {
        const newEndpoint = createEmptyEndpoint();
        setDrafts(prev => [...prev, newEndpoint]);
        setSelectedEndpointId(newEndpoint.id);
    };

    const handleRemoveEndpoint = (endpointId: string) => {
        const newDrafts = drafts.filter(e => e.id !== endpointId);
        setDrafts(newDrafts);
        if (selectedEndpointId === endpointId) {
            setSelectedEndpointId(newDrafts[0]?.id || null);
        }
    };

    const handleAddModel = (endpointId: string) => {
        setDrafts(prev => prev.map(e =>
            e.id === endpointId
                ? { ...e, models: [...e.models, createEmptyModel()] }
                : e
        ));
    };

    const handleRemoveModel = (endpointId: string, modelId: string) => {
        setDrafts(prev => prev.map(e =>
            e.id === endpointId
                ? { ...e, models: e.models.length > 1 ? e.models.filter(m => m.id !== modelId) : e.models }
                : e
        ));
    };

    const handleSave = () => {
        setGlobalError(null);
        const validDrafts = drafts.filter(endpoint => {
            const issues = validateEndpoint(endpoint);
            const validatedModels = endpoint.models.filter(model => {
                const validationKey = `${endpoint.id}:${model.id}`;
                return validationStates[validationKey] === 'success';
            });

            // 如果有验证通过的模型，或者配置完整但未验证（允许保存但提示警告，这里简化为只保存验证通过的）
            // 用户逻辑：只保存验证通过的模型
            return validatedModels.length > 0;
        });

        if (validDrafts.length === 0 && drafts.length > 0) {
            setGlobalError("请至少配置并验证通过一个模型");
            return;
        }

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

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="flex h-[85vh] w-[95vw] max-w-[95vw] sm:max-w-4xl lg:max-w-6xl xl:max-w-7xl flex-col overflow-hidden rounded-2xl bg-slate-50 p-0 shadow-2xl md:flex-row">
                <DialogTitle className="sr-only">模型配置</DialogTitle>
                <DialogDescription className="sr-only">
                    配置您的模型接口和参数
                </DialogDescription>
                {/* Sidebar */}
                <div className="flex w-full flex-col border-r border-slate-200 bg-white md:w-64 lg:w-72">
                    <div className="flex items-center gap-2 border-b border-slate-100 p-4">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm">
                            <ServerCog className="h-5 w-5" />
                        </div>
                        <span className="font-semibold text-slate-900">模型管理</span>
                    </div>

                    <div className="flex-1 overflow-y-auto p-3 space-y-1">
                        {drafts.map((endpoint) => (
                            <button
                                key={endpoint.id}
                                onClick={() => setSelectedEndpointId(endpoint.id)}
                                className={cn(
                                    "flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm transition-all",
                                    selectedEndpointId === endpoint.id
                                        ? "bg-blue-50 text-blue-700 font-medium shadow-sm ring-1 ring-blue-100"
                                        : "text-slate-600 hover:bg-slate-50"
                                )}
                            >
                                <div className="flex items-center gap-2.5 overflow-hidden">
                                    <div className={cn(
                                        "h-2 w-2 rounded-full flex-shrink-0",
                                        endpoint.models.some(m => validationStates[`${endpoint.id}:${m.id}`] === 'success')
                                            ? "bg-green-500"
                                            : "bg-slate-300"
                                    )} />
                                    <span className="truncate">{endpoint.name || "未命名接口"}</span>
                                </div>
                                <span className="text-xs text-slate-400 tabular-nums">
                                    {endpoint.models.length}
                                </span>
                            </button>
                        ))}
                    </div>

                    <div className="border-t border-slate-100 p-3">
                        <Button
                            variant="outline"
                            className="w-full justify-start gap-2 border-dashed text-slate-600 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600"
                            onClick={handleAddEndpoint}
                        >
                            <Plus className="h-4 w-4" />
                            添加接口
                        </Button>
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex flex-1 flex-col overflow-hidden bg-slate-50/50">
                    {selectedEndpoint ? (
                        <>
                            {/* Header / Config */}
                            <div className="border-b border-slate-200 bg-white px-6 py-5">
                                <div className="mb-6 flex items-center justify-between">
                                    <input
                                        type="text"
                                        value={selectedEndpoint.name}
                                        onChange={(e) => handleEndpointChange(selectedEndpoint.id, { name: e.target.value })}
                                        className="bg-transparent text-xl font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none"
                                        placeholder="接口名称"
                                    />
                                    <div className="flex items-center gap-2">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => validateAllModels(selectedEndpoint.id)}
                                            className="h-8 gap-1.5 rounded-full text-xs font-medium"
                                        >
                                            <ShieldCheck className="h-3.5 w-3.5" />
                                            验证全部
                                        </Button>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full">
                                                    <MoreHorizontal className="h-4 w-4 text-slate-500" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-40">
                                                <DropdownMenuItem onClick={() => {
                                                    const newEndpoint = cloneEndpoint(selectedEndpoint);
                                                    newEndpoint.id = `endpoint-${nanoid(6)}`;
                                                    newEndpoint.name = `${selectedEndpoint.name} 副本`;
                                                    setDrafts(prev => [...prev, newEndpoint]);
                                                }}>
                                                    <Copy className="mr-2 h-4 w-4" />
                                                    复制接口
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    className="text-red-600 focus:text-red-600"
                                                    onClick={() => handleRemoveEndpoint(selectedEndpoint.id)}
                                                    disabled={drafts.length <= 1}
                                                >
                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                    删除接口
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </div>

                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="group relative rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 transition-all focus-within:border-blue-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-500/20">
                                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Base URL</label>
                                        <div className="flex items-center gap-2">
                                            <Link2 className="h-4 w-4 text-slate-400" />
                                            <input
                                                type="text"
                                                value={selectedEndpoint.baseUrl}
                                                onChange={(e) => handleEndpointChange(selectedEndpoint.id, { baseUrl: e.target.value })}
                                                className="flex-1 bg-transparent text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none"
                                                placeholder="https://api.example.com/v1"
                                            />
                                        </div>
                                    </div>
                                    <div className="group relative rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 transition-all focus-within:border-blue-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-500/20">
                                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">API Key</label>
                                        <div className="flex items-center gap-2">
                                            <KeyRound className="h-4 w-4 text-slate-400" />
                                            <input
                                                type={revealedKeys[selectedEndpoint.id] ? "text" : "password"}
                                                value={selectedEndpoint.apiKey}
                                                onChange={(e) => handleEndpointChange(selectedEndpoint.id, { apiKey: e.target.value })}
                                                className="flex-1 bg-transparent text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none"
                                                placeholder="sk-..."
                                            />
                                            <button
                                                onClick={() => setRevealedKeys(prev => ({ ...prev, [selectedEndpoint.id]: !prev[selectedEndpoint.id] }))}
                                                className="text-slate-400 hover:text-slate-600"
                                            >
                                                {revealedKeys[selectedEndpoint.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Models Table */}
                            <div className="flex-1 overflow-hidden p-6">
                                <div className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white shadow-sm">
                                    <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 bg-slate-50/50 rounded-t-2xl">
                                        <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                                            <Cpu className="h-4 w-4 text-slate-500" />
                                            模型列表
                                            <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs text-slate-600">
                                                {selectedEndpoint.models.length}
                                            </span>
                                        </div>
                                        <Button size="sm" variant="ghost" className="h-7 text-blue-600 hover:bg-blue-50 hover:text-blue-700" onClick={() => handleAddModel(selectedEndpoint.id)}>
                                            <Plus className="mr-1 h-3.5 w-3.5" />
                                            添加模型
                                        </Button>
                                    </div>

                                    <div className="flex-1 overflow-y-auto overflow-x-auto">
                                        <table className="w-full min-w-[800px] text-left text-sm">
                                            <thead className="sticky top-0 bg-white text-xs font-medium text-slate-500">
                                                <tr className="border-b border-slate-100">
                                                    <th className="px-4 py-3 font-medium min-w-[140px]">模型 ID</th>
                                                    <th className="px-4 py-3 font-medium min-w-[120px]">显示名称</th>
                                                    <th className="px-4 py-3 font-medium w-24 text-center">流式</th>
                                                    <th className="px-4 py-3 font-medium w-24 text-center">超时(s)</th>
                                                    <th className="px-4 py-3 font-medium w-32">状态</th>
                                                    <th className="px-4 py-3 font-medium w-16"></th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50">
                                                {selectedEndpoint.models.map((model) => {
                                                    const validationKey = `${selectedEndpoint.id}:${model.id}`;
                                                    const status = validationStates[validationKey] || 'idle';
                                                    const result = validationResults[validationKey];

                                                    return (
                                                        <tr key={model.id} className="group hover:bg-slate-50/80 transition-colors">
                                                            <td className="px-4 py-2">
                                                                <div className="flex items-center gap-2 rounded-lg border border-transparent bg-slate-50 px-2 py-1.5 focus-within:border-blue-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-500/20 group-hover:bg-white group-hover:border-slate-200">
                                                                    <Hash className="h-3.5 w-3.5 text-slate-400" />
                                                                    <input
                                                                        type="text"
                                                                        value={model.modelId}
                                                                        onChange={(e) => handleModelChange(selectedEndpoint.id, model.id, { modelId: e.target.value })}
                                                                        className="w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
                                                                        placeholder="gpt-4"
                                                                    />
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-2">
                                                                <input
                                                                    type="text"
                                                                    value={model.label || ""}
                                                                    onChange={(e) => handleModelChange(selectedEndpoint.id, model.id, { label: e.target.value })}
                                                                    className="w-full rounded-lg border border-transparent bg-transparent px-2 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 hover:bg-slate-50"
                                                                    placeholder="显示名称"
                                                                />
                                                            </td>
                                                            <td className="px-4 py-2 text-center">
                                                                <div className="flex justify-center">
                                                                    <Switch
                                                                        checked={model.isStreaming ?? false}
                                                                        onCheckedChange={(c) => handleModelChange(selectedEndpoint.id, model.id, { isStreaming: c })}
                                                                    />
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-2 text-center">
                                                                <input
                                                                    type="number"
                                                                    value={model.maxDuration ?? 300}
                                                                    onChange={(e) => handleModelChange(selectedEndpoint.id, model.id, { maxDuration: parseInt(e.target.value) || 300 })}
                                                                    className="w-16 rounded-md border border-slate-200 bg-white px-1 py-1 text-center text-xs focus:border-blue-500 focus:outline-none"
                                                                />
                                                            </td>
                                                            <td className="px-4 py-2">
                                                                <div className="flex items-center gap-2">
                                                                    <button
                                                                        onClick={() => validateModel(selectedEndpoint.id, model.id)}
                                                                        className={cn(
                                                                            "flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-medium transition-colors",
                                                                            status === 'success' ? "bg-green-100 text-green-700" :
                                                                                status === 'error' ? "bg-red-100 text-red-700" :
                                                                                    status === 'validating' ? "bg-blue-100 text-blue-700" :
                                                                                        "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                                                        )}
                                                                    >
                                                                        {status === 'validating' && <Loader2 className="h-3 w-3 animate-spin" />}
                                                                        {status === 'success' && <CheckCircle2 className="h-3 w-3" />}
                                                                        {status === 'error' && <XCircle className="h-3 w-3" />}
                                                                        {status === 'idle' && <ShieldCheck className="h-3 w-3" />}
                                                                        {status === 'idle' ? '验证' :
                                                                            status === 'validating' ? '验证中' :
                                                                                status === 'success' ? '通过' : '失败'}
                                                                    </button>
                                                                    {status === 'success' && result?.details && typeof result.details === 'object' && (
                                                                        <span className="text-[10px] text-slate-400">{result.details.responseTime}</span>
                                                                    )}
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-2 text-right">
                                                                <Button
                                                                    size="icon"
                                                                    variant="ghost"
                                                                    className="h-8 w-8 text-slate-400 hover:text-red-600"
                                                                    onClick={() => handleRemoveModel(selectedEndpoint.id, model.id)}
                                                                    disabled={selectedEndpoint.models.length <= 1}
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex h-full flex-col items-center justify-center text-slate-400">
                            <ServerCog className="mb-4 h-12 w-12 opacity-20" />
                            <p>选择或创建一个接口以开始配置</p>
                        </div>
                    )}

                    {/* Footer */}
                    <div className="border-t border-slate-200 bg-white px-6 py-4 flex items-center justify-between">
                        <div className="text-xs text-slate-500">
                            {globalError && <span className="text-red-600 font-medium">{globalError}</span>}
                            {!globalError && "所有配置仅存储在本地浏览器"}
                        </div>
                        <div className="flex gap-3">
                            <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
                            <Button onClick={handleSave} className="bg-slate-900 hover:bg-slate-800">保存配置</Button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
