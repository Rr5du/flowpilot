"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Loader2,
    Settings,
    Sparkles,
    ChevronDown,
    GitCompare,
} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface ComparisonQuickAccessProps {
    disabled?: boolean;
    isCompareLoading?: boolean;
    onCompareRequest?: () => void;
    onOpenComparisonConfig?: () => void;
    compact?: boolean;
}

export function ComparisonQuickAccess({
    disabled = false,
    isCompareLoading = false,
    onCompareRequest = () => {},
    onOpenComparisonConfig = () => {},
    compact = false,
}: ComparisonQuickAccessProps) {
    const [open, setOpen] = useState(false);

    if (compact) {
        // 紧凑模式：单个按钮带下拉菜单
        return (
            <DropdownMenu open={open} onOpenChange={setOpen}>
                <DropdownMenuTrigger asChild>
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={disabled}
                        className={cn(
                            "h-[28px] gap-1.5 rounded-full px-3 text-[11px] font-medium",
                            "backdrop-blur-xl bg-gradient-to-r from-violet-500/10 to-purple-500/10",
                            "border border-violet-200/40 text-violet-700",
                            "hover:from-violet-500/20 hover:to-purple-500/20",
                            "hover:border-violet-300/60 hover:shadow-sm",
                            "transition-all active:scale-95",
                            "disabled:opacity-50"
                        )}
                    >
                        {isCompareLoading ? (
                            <>
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                <span>生成中</span>
                            </>
                        ) : (
                            <>
                                <Sparkles className="h-3.5 w-3.5" />
                                <span>对比</span>
                                <ChevronDown className="h-3 w-3 opacity-60" />
                            </>
                        )}
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                    className="w-52 rounded-xl border border-slate-200/80 shadow-xl"
                    align="start"
                    side="top"
                    sideOffset={8}
                >
                    <DropdownMenuItem
                        className="gap-2 text-xs font-medium cursor-pointer"
                        onClick={() => {
                            onCompareRequest();
                            setOpen(false);
                        }}
                        disabled={disabled || isCompareLoading}
                    >
                        <GitCompare className="h-3.5 w-3.5" />
                        快速对比生成
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        className="gap-2 text-xs cursor-pointer"
                        onClick={() => {
                            onOpenComparisonConfig();
                            setOpen(false);
                        }}
                        disabled={disabled}
                    >
                        <Settings className="h-3.5 w-3.5" />
                        对比配置
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <div className="px-2 py-1.5">
                        <p className="text-[10px] text-slate-500 leading-tight">
                            使用多个AI模型同时生成，帮助你快速找到最佳方案
                        </p>
                    </div>
                </DropdownMenuContent>
            </DropdownMenu>
        );
    }

    // 完整模式：组合按钮 - 更简洁的样式
    return (
        <div className="flex items-center gap-1 overflow-hidden rounded-full backdrop-blur-xl bg-white/60 border border-white/40 p-1 shadow-[0_4px_16px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.8)]">
            <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-[24px] gap-1.5 rounded-full px-3 text-[11px] font-semibold text-slate-700 hover:bg-white/50 disabled:opacity-60 transition-all active:scale-95"
                disabled={disabled || isCompareLoading}
                onClick={onCompareRequest}
                aria-label="使用当前提示词进行多模型对比"
            >
                {isCompareLoading ? (
                    <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        生成中…
                    </>
                ) : (
                    <>
                        <Sparkles className="h-3.5 w-3.5" />
                        对比
                    </>
                )}
            </Button>
            <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-[24px] w-[24px] rounded-full text-slate-600 hover:bg-white/50 hover:text-slate-900 transition-all active:scale-95"
                onClick={onOpenComparisonConfig}
                disabled={disabled}
                aria-label="对比设置"
            >
                <Settings className="h-3.5 w-3.5" />
            </Button>
        </div>
    );
}
