"use client";

import { cn } from "@/lib/utils";
import { Sparkles, Settings2 } from "lucide-react";
import type { BriefModeId } from "@/components/flowpilot-brief";

interface BriefModeQuickSwitchProps {
    mode: BriefModeId;
    onModeChange: (mode: BriefModeId) => void;
    onOpenSettings?: () => void;
    disabled?: boolean;
}

export function BriefModeQuickSwitch({
    mode,
    onModeChange,
    onOpenSettings,
    disabled = false,
}: BriefModeQuickSwitchProps) {
    const modes: { id: BriefModeId; title: string }[] = [
        { id: "guided", title: "专业" },
        { id: "free", title: "自由" },
    ];

    return (
        <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white/95 px-3 py-2 shadow-sm backdrop-blur-sm">
            <div className="flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                <span className="text-xs font-medium text-slate-600">Brief</span>
            </div>

            <div className="flex items-center gap-1.5">
                {/* 模式切换按钮 */}
                <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-0.5">
                    {modes.map((item) => {
                        const isActive = mode === item.id;
                        return (
                            <button
                                key={item.id}
                                type="button"
                                disabled={disabled}
                                onClick={() => onModeChange(item.id)}
                                className={cn(
                                    "rounded-md px-3 py-1 text-xs font-medium transition-all",
                                    isActive
                                        ? "bg-slate-900 text-white shadow-sm"
                                        : "text-slate-600 hover:text-slate-900 disabled:opacity-50"
                                )}
                            >
                                {item.title}
                            </button>
                        );
                    })}
                </div>

                {/* 调整按钮 */}
                {onOpenSettings && (
                    <button
                        type="button"
                        disabled={disabled}
                        onClick={onOpenSettings}
                        className="rounded-md p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
                        title="详细配置"
                    >
                        <Settings2 className="h-3.5 w-3.5" />
                    </button>
                )}
            </div>
        </div>
    );
}
