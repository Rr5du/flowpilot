import React from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ModelSelector } from "@/components/model-selector";
import { cn } from "@/lib/utils";
import { Plus, Trash2, RefreshCcw, Sparkles } from "lucide-react";
import type { RuntimeModelOption } from "@/types/model-config";

export interface ComparisonModelConfig {
    models: string[]; // 存储模型 key 的数组，最多 5 个
}

interface ModelComparisonConfigDialogProps {
    open: boolean;
    onOpenChange: (next: boolean) => void;
    config: ComparisonModelConfig;
    onConfigChange: (next: ComparisonModelConfig) => void;
    defaultPrimaryKey?: string;
    models: RuntimeModelOption[];
    onManageModels?: () => void;
}

const SLOT_LABELS = ["A", "B", "C", "D", "E"];
const MAX_MODELS = 5;
const MIN_MODELS = 2;

export function ModelComparisonConfigDialog({
    open,
    onOpenChange,
    config,
    onConfigChange,
    defaultPrimaryKey,
    models,
    onManageModels,
}: ModelComparisonConfigDialogProps) {
    const lookupModel = (key?: string) =>
        models.find((model) => model.key === key);

    const handleAddModel = () => {
        if (config.models.length >= MAX_MODELS) return;
        const newModel = defaultPrimaryKey || models[0]?.key || "";
        onConfigChange({
            models: [...config.models, newModel],
        });
    };

    const handleRemoveModel = (index: number) => {
        if (config.models.length <= MIN_MODELS) return;
        const newModels = config.models.filter((_, i) => i !== index);
        onConfigChange({
            models: newModels,
        });
    };

    const handleUpdateModel = (index: number, modelKey: string) => {
        const newModels = [...config.models];
        newModels[index] = modelKey;
        onConfigChange({
            models: newModels,
        });
    };

    const handleSyncFirst = () => {
        if (!defaultPrimaryKey) return;
        const newModels = [...config.models];
        newModels[0] = defaultPrimaryKey;
        onConfigChange({
            models: newModels,
        });
    };

    const handleSyncAll = () => {
        if (!defaultPrimaryKey) return;
        onConfigChange({
            models: config.models.map(() => defaultPrimaryKey),
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-lg font-semibold text-slate-900">
                        <Sparkles className="h-5 w-5 text-amber-500" />
                        配置对比模型
                    </DialogTitle>
                    <DialogDescription className="text-sm text-slate-500">
                        选择 2-5 个已配置的模型。FlowPilot 会将同一条提示词同步发送给所有模型，用于对比风格和布局差异。
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto px-1">
                    <div className="space-y-4">
                        <div className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-slate-50/70 px-3 py-2">
                            <div className="text-xs text-slate-500">
                                当前对话模型：
                                <span className="ml-1 font-mono text-slate-700">
                                    {lookupModel(defaultPrimaryKey)?.label ??
                                        "未选择"}
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 rounded-full px-3 text-xs font-semibold text-slate-500 hover:text-slate-800"
                                    onClick={handleSyncFirst}
                                    disabled={!defaultPrimaryKey}
                                >
                                    <RefreshCcw className="mr-1.5 h-3.5 w-3.5" />
                                    同步模型 A
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 rounded-full px-3 text-xs font-semibold text-slate-500 hover:text-slate-800"
                                    onClick={handleSyncAll}
                                    disabled={!defaultPrimaryKey}
                                >
                                    <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                                    全部同步
                                </Button>
                            </div>
                        </div>

                        {config.models.map((modelKey, index) => (
                            <div
                                key={`${modelKey}-${index}`}
                                className={cn(
                                    "rounded-2xl border p-4 shadow-sm transition-colors",
                                    index === 0
                                        ? "border-slate-200 bg-white/80"
                                        : "border-blue-200 bg-blue-50/80"
                                )}
                            >
                                <div className="flex items-center justify-between gap-2">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <div className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                                                模型 {SLOT_LABELS[index]}
                                            </div>
                                            {config.models.length > MIN_MODELS && (
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6 rounded-full text-slate-400 hover:text-red-600"
                                                    onClick={() => handleRemoveModel(index)}
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            )}
                                        </div>
                                        <p className="mt-1 text-sm text-slate-500">
                                            {index === 0
                                                ? "推荐设为当前聊天所使用的模型"
                                                : `对比模型 ${index + 1}`}
                                        </p>
                                    </div>
                                </div>
                                <div className="mt-3">
                                    <ModelSelector
                                        key={`model-selector-${index}-${modelKey}`}
                                        selectedModelKey={modelKey}
                                        onModelChange={(id) =>
                                            handleUpdateModel(index, id)
                                        }
                                        models={models}
                                        onManage={onManageModels}
                                    />
                                </div>
                            </div>
                        ))}

                        {config.models.length < MAX_MODELS && (
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="w-full rounded-xl border-dashed border-slate-300 text-slate-600 hover:border-slate-400 hover:bg-slate-50"
                                onClick={handleAddModel}
                            >
                                <Plus className="mr-2 h-4 w-4" />
                                添加对比模型（{config.models.length}/{MAX_MODELS}）
                            </Button>
                        )}

                        <div className="rounded-lg border border-amber-200 bg-amber-50/80 px-3 py-2 text-xs text-amber-800">
                            <div className="font-semibold">提示</div>
                            <ul className="mt-1 space-y-0.5 list-disc list-inside">
                                <li>最少 2 个模型，最多 5 个模型</li>
                                <li>可以选择相同模型测试稳定性</li>
                                <li>超过 2 个结果时会以横向滑动方式展示</li>
                            </ul>
                        </div>
                    </div>
                </div>

                <DialogFooter className="mt-6">
                    <Button
                        type="button"
                        variant="default"
                        className="ml-auto h-9 rounded-full bg-slate-900 px-6 text-xs font-semibold text-white hover:bg-slate-900/90"
                        onClick={() => onOpenChange(false)}
                    >
                        完成
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
