"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Sparkles,
    Settings,
    GitCompare,
    Loader2,
    CheckCircle2,
    XCircle,
    Clock,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ComparisonPanelProps {
    prompt?: string;
    onCompareRequest?: () => void;
    onOpenConfig?: () => void;
    isLoading?: boolean;
    disabled?: boolean;
    comparisonResults?: Array<{
        modelName: string;
        status: "pending" | "generating" | "success" | "error";
        preview?: string;
        generatedAt?: Date;
    }>;
}

export function ComparisonPanel({
    prompt = "",
    onCompareRequest = () => {},
    onOpenConfig = () => {},
    isLoading = false,
    disabled = false,
    comparisonResults = [],
}: ComparisonPanelProps) {
    const [selectedModel, setSelectedModel] = useState<string | null>(null);

    const hasResults = comparisonResults.length > 0;

    return (
        <div className="flex h-full flex-col gap-4 p-6">
            {/* 头部区域 */}
            <div className="flex items-start justify-between">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg">
                            <GitCompare className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-900">
                                多模型对比生成
                            </h2>
                            <p className="text-sm text-slate-500">
                                使用多个AI模型同时生成，找到最佳方案
                            </p>
                        </div>
                    </div>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={onOpenConfig}
                    disabled={disabled || isLoading}
                    className="gap-2"
                >
                    <Settings className="h-4 w-4" />
                    配置
                </Button>
            </div>

            {/* 提示词输入区 */}
            {!hasResults && (
                <Card className="border-2 border-dashed border-slate-200 bg-slate-50/50">
                    <CardHeader>
                        <CardTitle className="text-base">当前提示词</CardTitle>
                        <CardDescription>
                            {prompt || "暂无提示词，请先在输入框中输入内容"}
                        </CardDescription>
                    </CardHeader>
                    {prompt && (
                        <CardContent>
                            <Button
                                onClick={onCompareRequest}
                                disabled={disabled || isLoading}
                                className="w-full gap-2 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        生成中...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="h-4 w-4" />
                                        开始对比生成
                                    </>
                                )}
                            </Button>
                        </CardContent>
                    )}
                </Card>
            )}

            {/* 对比结果展示区 */}
            {hasResults && (
                <div className="flex-1 space-y-4 overflow-y-auto">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-slate-700">
                            生成结果 ({comparisonResults.length})
                        </h3>
                        <Button
                            onClick={onCompareRequest}
                            disabled={disabled || isLoading}
                            size="sm"
                            variant="outline"
                            className="gap-2"
                        >
                            <Sparkles className="h-3.5 w-3.5" />
                            重新生成
                        </Button>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {comparisonResults.map((result, index) => (
                            <Card
                                key={index}
                                className={cn(
                                    "cursor-pointer transition-all hover:shadow-lg",
                                    selectedModel === result.modelName &&
                                        "ring-2 ring-violet-500"
                                )}
                                onClick={() => setSelectedModel(result.modelName)}
                            >
                                <CardHeader className="space-y-2 pb-3">
                                    <div className="flex items-start justify-between">
                                        <CardTitle className="text-sm font-medium">
                                            {result.modelName}
                                        </CardTitle>
                                        {result.status === "success" && (
                                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                                        )}
                                        {result.status === "error" && (
                                            <XCircle className="h-4 w-4 text-red-500" />
                                        )}
                                        {result.status === "generating" && (
                                            <Loader2 className="h-4 w-4 animate-spin text-violet-500" />
                                        )}
                                        {result.status === "pending" && (
                                            <Clock className="h-4 w-4 text-slate-400" />
                                        )}
                                    </div>
                                    <Badge
                                        variant={
                                            result.status === "success"
                                                ? "default"
                                                : result.status === "error"
                                                ? "destructive"
                                                : "secondary"
                                        }
                                        className="w-fit text-xs"
                                    >
                                        {result.status === "success" && "生成成功"}
                                        {result.status === "error" && "生成失败"}
                                        {result.status === "generating" && "生成中"}
                                        {result.status === "pending" && "等待中"}
                                    </Badge>
                                </CardHeader>
                                <CardContent className="pb-4">
                                    {result.preview && (
                                        <div className="aspect-video rounded-lg bg-slate-100">
                                            {/* 这里可以放缩略图预览 */}
                                            <div className="flex h-full items-center justify-center text-xs text-slate-400">
                                                预览图
                                            </div>
                                        </div>
                                    )}
                                    {result.generatedAt && (
                                        <p className="mt-2 text-xs text-slate-500">
                                            {result.generatedAt.toLocaleTimeString()}
                                        </p>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            )}

            {/* 空状态引导 */}
            {!hasResults && !prompt && (
                <div className="flex flex-1 flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/30 p-8 text-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-violet-100 to-purple-100">
                        <GitCompare className="h-8 w-8 text-violet-600" />
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-lg font-semibold text-slate-900">
                            开始对比生成
                        </h3>
                        <p className="max-w-sm text-sm text-slate-500">
                            在聊天输入框中输入你的需求，然后使用对比功能同时调用多个AI模型生成流程图，快速找到最佳方案
                        </p>
                    </div>
                    <div className="mt-4 flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={onOpenConfig}
                            className="gap-2"
                        >
                            <Settings className="h-4 w-4" />
                            配置模型
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
