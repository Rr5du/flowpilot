"use client";

import { cn } from "@/lib/utils";
import { Sparkles, Settings2 } from "lucide-react";
import type { BriefModeId } from "@/components/flowpilot-brief";

interface BriefQuickControlProps {
    mode: BriefModeId;
    onModeChange: (mode: BriefModeId) => void;
    onOpenSettings?: () => void;
    disabled?: boolean;
}

export function BriefQuickControl({
    mode,
    onModeChange,
    onOpenSettings,
    disabled = false,
}: BriefQuickControlProps) {
    const modes: { id: BriefModeId; title: string }[] = [
        { id: "guided", title: "专业" },
        { id: "free", title: "自由" },
    ];

    return (
        <div className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/60 px-3 py-1.5 shadow-lg shadow-slate-900/5 backdrop-blur-xl">
            {/* BRIEF 标识 */}
            <div className="flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                <span className="text-[11px] font-semibold tracking-wider text-slate-500">
                    BRIEF
                </span>
            </div>

            {/* 分隔线 */}
            <div className="h-4 w-px bg-gradient-to-b from-transparent via-slate-300/50 to-transparent" />

            {/* 模式切换 */}
            <div className="flex items-center gap-1 rounded-xl bg-slate-900/5 p-0.5 backdrop-blur-sm">
                {modes.map((item) => {
                    const isActive = mode === item.id;
                    return (
                        <button
                            key={item.id}
                            type="button"
                            disabled={disabled}
                            onClick={() => onModeChange(item.id)}
                            className={cn(
                                "relative rounded-lg px-3 py-1 text-[11px] font-medium transition-all duration-200",
                                isActive
                                    ? "bg-white text-slate-900 shadow-md shadow-slate-900/10"
                                    : "text-slate-600 hover:text-slate-900 disabled:opacity-50"
                            )}
                        >
                            {isActive && (
                                <div className="absolute inset-0 rounded-lg bg-gradient-to-b from-white/80 to-white/40" />
                            )}
                            <span className="relative z-10">{item.title}</span>
                        </button>
                    );
                })}
            </div>

            {/* 调整按钮 */}
            {onOpenSettings && (
                <>
                    <div className="h-4 w-px bg-gradient-to-b from-transparent via-slate-300/50 to-transparent" />
                    
                    <button
                        type="button"
                        disabled={disabled}
                        onClick={onOpenSettings}
                        className="group relative rounded-lg p-1.5 transition-all duration-200 hover:bg-slate-900/5 disabled:opacity-50"
                        title="详细配置"
                    >
                        <Settings2 className="h-3.5 w-3.5 text-slate-500 transition-transform duration-200 group-hover:rotate-90 group-hover:text-slate-700" />
                    </button>
                </>
            )}
        </div>
    );
}
