"use client";

import { cn } from "@/lib/utils";
import { Sparkles, Settings2 } from "lucide-react";
import type { FlowPilotBriefState } from "@/components/flowpilot-brief";
import {
    INTENT_OPTIONS,
    TONE_OPTIONS,
    FOCUS_OPTIONS,
    DIAGRAM_TYPE_OPTIONS,
} from "@/components/flowpilot-brief";

interface BriefSummaryBarProps {
    state: FlowPilotBriefState;
    onOpenSettings?: () => void;
    disabled?: boolean;
}

export function BriefSummaryBar({
    state,
    onOpenSettings,
    disabled = false,
}: BriefSummaryBarProps) {
    const isFreeMode = state.mode === "free";

    // 生成摘要标签
    const badges: string[] = [];

    if (!isFreeMode) {
        // 模式
        const modeLabel = state.mode === "guided" ? "模式·空白起稿" : "模式·自由";
        badges.push(modeLabel);

        // 任务模式
        const intent = INTENT_OPTIONS.find(opt => opt.id === state.intent);
        if (intent && state.intent !== "draft") {
            badges.push(`模式·${intent.title}`);
        }

        // 视觉风格
        const tone = TONE_OPTIONS.find(opt => opt.id === state.tone);
        if (tone) {
            badges.push(`视觉·${tone.title}`);
        }

        // 设计重点
        if (state.focus.length > 0) {
            const focusLabels = state.focus
                .map(id => FOCUS_OPTIONS.find(opt => opt.id === id)?.title)
                .filter(Boolean);
            if (focusLabels.length > 0) {
                badges.push(`重点·${focusLabels.join("·")}`);
            }
        }

        // 图表类型
        if (state.diagramTypes.length > 0 && !state.diagramTypes.includes("auto")) {
            const typeLabels = state.diagramTypes
                .map(id => DIAGRAM_TYPE_OPTIONS.find(opt => opt.id === id)?.title)
                .filter(Boolean)
                .slice(0, 2); // 最多显示2个
            if (typeLabels.length > 0) {
                const suffix = state.diagramTypes.length > 2 ? `等${state.diagramTypes.length}个` : "";
                badges.push(`图型·${typeLabels.join("·")}${suffix}`);
            }
        }
    }

    return (
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white/95 px-3 py-2 shadow-sm backdrop-blur-sm">
            <div className="flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                    BRIEF
                </span>
            </div>

            <div className="flex flex-1 flex-wrap items-center gap-1.5 overflow-hidden">
                {isFreeMode ? (
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                        自由模式
                    </span>
                ) : badges.length > 0 ? (
                    badges.slice(0, 5).map((badge, index) => (
                        <span
                            key={`${badge}-${index}`}
                            className={cn(
                                "whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium",
                                index === 0
                                    ? "bg-indigo-100 text-indigo-700"
                                    : index === 1
                                    ? "bg-rose-100 text-rose-700"
                                    : index === 2
                                    ? "bg-amber-100 text-amber-700"
                                    : "bg-slate-100 text-slate-700"
                            )}
                        >
                            {badge}
                        </span>
                    ))
                ) : (
                    <span className="text-xs text-slate-400">
                        点击「调整」配置 Brief
                    </span>
                )}
            </div>

            {onOpenSettings && (
                <button
                    type="button"
                    disabled={disabled}
                    onClick={onOpenSettings}
                    className="ml-auto shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50"
                >
                    调整
                </button>
            )}
        </div>
    );
}
