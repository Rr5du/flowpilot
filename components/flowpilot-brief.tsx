"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
    ChevronDown,
    ChevronUp,
    Figma,
    LayoutDashboard,
    Settings2,
    Sparkles,
    Workflow,
    Bot,
    CheckCircle2,
    XCircle,
    Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import type { ModelEndpointConfig, RuntimeModelOption } from "@/types/model-config";

export type BriefModeId = "guided" | "free";
export type BriefIntentId = "draft" | "polish" | "explain";
export type BriefToneId = "balanced" | "playful" | "enterprise" | "sketch" | "blueprint";
export type BriefFocusId = "clarity" | "flow" | "hierarchy";
export type BriefDiagramTypeId =
    | "auto"
    | "sequence"
    | "activity"
    | "component"
    | "state"
    | "deployment"
    | "mindmap"
    | "journey"
    | "gantt";

export type FlowPilotBriefState = {
    mode?: BriefModeId;
    intent: BriefIntentId;
    tone: BriefToneId;
    focus: BriefFocusId[];
    diagramTypes: BriefDiagramTypeId[];
};

export const DEFAULT_BRIEF_STATE: FlowPilotBriefState = {
    mode: "guided",
    intent: "draft",
    tone: "balanced",
    focus: ["clarity"],
    diagramTypes: ["auto"],
};

type Option<T extends string> = {
    id: T;
    title: string;
    description: string;
    prompt: string;
};

const BRIEF_MODE_OPTIONS: {
    id: BriefModeId;
    title: string;
    description: string;
    helper: string;
}[] = [
    {
        id: "guided",
        title: "专业模式",
        description: "",
        helper: "",
    },
    {
        id: "free",
        title: "自由模式",
        description: "",
        helper: "",
    },
];

export const FLOWPILOT_FREEFORM_GUARDRAILS = [
    "保持画面干净美观，优先单屏阅读，不要堆叠或线路缠绕。",
    "输出语法必须正确，连线完整、标签清晰，避免损坏的 XML/SVG。",
    "完全依据用户输入自由选择图型与布局，不擅自添加业务假设。",
];

export const FLOWPILOT_FREEFORM_PROMPT = `默认出图守则（不附加 FlowBrief 偏好）：
- Keep the canvas clean, readable, and balanced; avoid cluttered crossings.
- Ensure syntax validity and connected arrows/labels; no broken XML/SVG/mermaid.
- Choose whichever diagram type/layout best fits the user's text without adding extra assumptions.`;

// INTENT 保持不变 - 这是核心功能
export const INTENT_OPTIONS: Option<BriefIntentId>[] = [
    {
        id: "draft",
        title: "空白起稿",
        description: "从描述构建全新画布",
        prompt: "Create a complete diagram from scratch with clear structure, meaningful labels, and logical organization.",
    },
    {
        id: "polish",
        title: "结构整理",
        description: "保持内容，优化布局",
        prompt: "Preserve all existing information while improving alignment, grouping, spacing, and visual flow.",
    },
    {
        id: "explain",
        title: "讲解拆解",
        description: "分析逻辑并建议",
        prompt: "Analyze the current diagram logic, provide insights, and suggest improvements.",
    },
];

// TONE 保持精简 - 5个经典风格足够
export const TONE_OPTIONS: Option<BriefToneId>[] = [
    {
        id: "balanced",
        title: "中性简约",
        description: "清晰、专业、通用",
        prompt:
            "Modern neutral design: Clean white/light gray background with systematic neutral palette (gray-50 to gray-900). Single primary accent (blue/indigo). 8px border-radius, 1-2px strokes, subtle shadows. 4.5:1 contrast minimum. 8px grid alignment. Clear visual hierarchy.",
    },
    {
        id: "playful",
        title: "活力多彩",
        description: "友好、轻松、有趣",
        prompt:
            "Vibrant friendly design: 2-3 complementary colors with soft gradients (10-20%). Rounded corners (12-16px), generous spacing (16-24px). Warm approachable tone with readable text. Friendly sans-serif, line-height 1.5-1.6.",
    },
    {
        id: "enterprise",
        title: "企业专业",
        description: "权威、严谨、可信",
        prompt:
            "Professional enterprise: Conservative navy/slate colors, minimal accents. Generous white space (≥40px margins), strong grid alignment. Bold typography hierarchy. ≤10 key elements per view. Orthogonal layouts, clean arrows. 7:1 contrast for critical info.",
    },
    {
        id: "sketch",
        title: "手绘草图",
        description: "创意、灵活、非正式",
        prompt:
            "Hand-drawn sketch: Rough organic strokes (2-3px varied), sketch-like shapes. Casual fonts, subtle texture, imperfect alignment. Muted pastels, pencil-like outlines. Playful annotations and arrows. Creative brainstorming feel over precision.",
    },
    {
        id: "blueprint",
        title: "技术蓝图",
        description: "精确、技术、极简",
        prompt:
            "Technical blueprint: Off-white/light blue background, precise charcoal/dark blue lines (1px). Monospace or technical fonts. Tight grid (4px precision), minimal decoration. Single cyan/electric blue accent. No gradients/shadows. Emphasize technical accuracy and structure.",
    },
];

// FOCUS 精简并通用化 - 从3个具体场景 → 3个通用原则
export const FOCUS_OPTIONS: Option<BriefFocusId>[] = [
    {
        id: "clarity",
        title: "简洁清晰",
        description: "最小化复杂度",
        prompt: "Prioritize simplicity and clarity. Limit to 15-20 key elements. Use concise labels (2-5 words). Remove unnecessary decorations. Apply generous white space. Focus on essential information only.",
    },
    {
        id: "flow",
        title: "流向顺畅",
        description: "统一方向，易追踪",
        prompt: "Ensure consistent flow direction (left-to-right or top-to-bottom primary). Clear directional arrows. Return lines run underneath main flow. Logical progression easy to follow.",
    },
    {
        id: "hierarchy",
        title: "层次分明",
        description: "结构化分组",
        prompt: "Group related elements using visual clusters, containers, or swimlanes. Clear visual hierarchy with size, color, position. Consistent spacing between groups. Label each major section.",
    },
];

// DIAGRAM_TYPE - 添加"自动识别"作为推荐选项
export const DIAGRAM_TYPE_OPTIONS: Option<BriefDiagramTypeId>[] = [
    {
        id: "auto",
        title: "智能识别",
        description: "AI自动选择最合适的图表类型",
        prompt: "Automatically select the most appropriate diagram type based on user requirements and content. Consider: workflow needs → activity diagram, system interactions → sequence diagram, architecture → component/deployment diagram, concepts → mind map, user experience → journey map, timeline → Gantt chart.",
    },
    {
        id: "activity",
        title: "活动流程",
        description: "业务流程、分支逻辑",
        prompt: "Activity/process flowchart with decision points, parallel flows, and clear start/end. Annotate conditions and branches.",
    },
    {
        id: "sequence",
        title: "时序交互",
        description: "系统调用、消息传递",
        prompt: "Sequence diagram showing actors/services as lifelines. Emphasize request-response patterns and async callbacks.",
    },
    {
        id: "component",
        title: "组件依赖",
        description: "模块结构、接口关系",
        prompt: "Component diagram showing subsystems, interfaces, and deployment boundaries. Indicate dependency directions.",
    },
    {
        id: "state",
        title: "状态机",
        description: "状态转换、生命周期",
        prompt: "State machine showing object lifecycle, state transitions, guard conditions, and terminal states.",
    },
    {
        id: "deployment",
        title: "部署架构",
        description: "服务器、网络拓扑",
        prompt: "Deployment diagram with environment nodes, containers/services, network relationships. Mark security zones and ports.",
    },
    {
        id: "mindmap",
        title: "思维导图",
        description: "概念发散、头脑风暴",
        prompt: "Mind map with central topic branching into subtopics. Organic tree structure, hand-drawn feel optional.",
    },
    {
        id: "journey",
        title: "用户旅程",
        description: "体验阶段、触点分析",
        prompt: "Customer journey showing stages, touchpoints, emotions, and responsible teams. Timeline-based flow.",
    },
    {
        id: "gantt",
        title: "甘特排期",
        description: "项目计划、时间依赖",
        prompt: "Simplified Gantt chart with milestones, durations, and dependencies. Timeline visualization.",
    },
];

// 移除 GUARDRAIL - 这些应该是默认的最佳实践，无需用户选择
// 美观、对齐、单屏、标注清晰等都是内置规则

interface FlowPilotBriefProps {
    state: FlowPilotBriefState;
    onChange: (state: Partial<FlowPilotBriefState>) => void;
    disabled?: boolean;
}

export function FlowPilotBrief({
    state,
    onChange,
    disabled = false,
}: FlowPilotBriefProps) {
    const [showAllDiagramTypes, setShowAllDiagramTypes] = useState(false);
    const mode = state.mode ?? "guided";
    const isFreeMode = mode === "free";
    // 确保有默认的“智能识别”
    useEffect(() => {
        const autoOption = DIAGRAM_TYPE_OPTIONS.find((opt) => opt.id === "auto");
        if (!isFreeMode && autoOption && state.diagramTypes.length === 0) {
            onChange({ diagramTypes: [autoOption.id] });
        }
    }, [isFreeMode, onChange, state.diagramTypes]);

    const handleFocusToggle = (focusId: BriefFocusId) => {
        const exists = state.focus.includes(focusId);
        const next = exists
            ? state.focus.filter((id) => id !== focusId)
            : [...state.focus, focusId];
        onChange({ focus: next });
    };

    const handleDiagramTypeToggle = (diagramTypeId: BriefDiagramTypeId) => {
        const exists = state.diagramTypes.includes(diagramTypeId);
        const next = exists
            ? state.diagramTypes.filter((id) => id !== diagramTypeId)
            : [...state.diagramTypes, diagramTypeId];
        onChange({ diagramTypes: next });
    };

    // 分离"智能识别"和其他具体类型
    const autoOption = DIAGRAM_TYPE_OPTIONS.find(opt => opt.id === "auto");
    const specificOptions = DIAGRAM_TYPE_OPTIONS.filter(opt => opt.id !== "auto");
    const displayedOptions = showAllDiagramTypes ? specificOptions : [];

    return (
        <div className="rounded-2xl border bg-gradient-to-br from-white via-slate-50 to-slate-100 p-4 shadow-sm">
            <div className="mb-3 flex flex-col gap-1">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <Sparkles className="h-4 w-4 text-amber-500" />
                    FlowPilot Brief
                </div>
            </div>

            <section className="mb-4">
                <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <LayoutDashboard className="h-4 w-4" />
                    出图模式
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                    {BRIEF_MODE_OPTIONS.map((option) => {
                        const isActive = mode === option.id;
                        return (
                            <button
                                key={option.id}
                                type="button"
                                disabled={disabled}
                                className={cn(
                                    "rounded-xl border px-3 py-2 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:opacity-60",
                                    isActive
                                        ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                                        : "border-slate-200 bg-white text-slate-800 hover:border-slate-400"
                                )}
                                onClick={() => onChange({ mode: option.id })}
                            >
                                <p className="text-sm font-semibold">
                                    {option.title}
                                </p>
                                <p
                                    className={cn(
                                        "text-xs mt-0.5",
                                        isActive ? "text-slate-200" : "text-slate-500"
                                    )}
                                >
                                    {option.description}
                                </p>
                                <p
                                    className={cn(
                                        "mt-1 text-[11px]",
                                        isActive ? "text-slate-200/80" : "text-slate-400"
                                    )}
                                >
                                    {option.helper}
                                </p>
                            </button>
                        );
                    })}
                </div>
            </section>

            {isFreeMode ? (
                <div className="space-y-3 rounded-xl border border-dashed border-slate-200 bg-white p-4">
                    <p className="text-sm font-semibold text-slate-800">
                        自由模式：AI 直接按输入作图，不附加 FlowBrief。
                    </p>
                    <p className="text-xs text-slate-500">
                        仅保留基础规范，确保结果清晰、整洁、语法正确。
                    </p>
                    <div className="flex flex-col gap-2">
                        {FLOWPILOT_FREEFORM_GUARDRAILS.map((item, index) => (
                            <div
                                key={item}
                                className="flex items-start gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-700"
                            >
                                <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-[11px] font-semibold text-white">
                                    {index + 1}
                                </span>
                                <span className="leading-relaxed">{item}</span>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <>
                    <section className="mb-4">
                        <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                            <LayoutDashboard className="h-4 w-4" />
                            任务模式
                        </div>
                        <div className="grid gap-2 sm:grid-cols-3">
                            {INTENT_OPTIONS.map((option) => {
                                const isActive = state.intent === option.id;
                                return (
                                    <button
                                        key={option.id}
                                        type="button"
                                        disabled={disabled}
                                        className={cn(
                                            "rounded-xl border px-3 py-2 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:opacity-60",
                                            isActive
                                                ? "border-slate-900 bg-slate-900 text-white"
                                                : "border-slate-200 bg-white text-slate-800 hover:border-slate-400"
                                        )}
                                        onClick={() => onChange({ intent: option.id })}
                                    >
                                        <p className="text-sm font-semibold">
                                            {option.title}
                                        </p>
                                        <p
                                            className={cn(
                                                "text-xs mt-0.5",
                                                isActive ? "text-slate-200" : "text-slate-500"
                                            )}
                                        >
                                            {option.description}
                                        </p>
                                    </button>
                                );
                            })}
                        </div>
                    </section>

                    <section className="mb-4">
                        <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                            <Figma className="h-4 w-4" />
                            视觉风格
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {TONE_OPTIONS.map((option) => {
                                const isActive = state.tone === option.id;
                                return (
                                    <button
                                        key={option.id}
                                        type="button"
                                        disabled={disabled}
                                        className={cn(
                                            "rounded-full border px-4 py-1 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:opacity-60",
                                            isActive
                                                ? "border-slate-900 bg-slate-900 text-white shadow"
                                                : "border-slate-200 bg-white text-slate-700 hover:border-slate-400"
                                        )}
                                        onClick={() => onChange({ tone: option.id })}
                                    >
                                        {option.title}
                                    </button>
                                );
                            })}
                        </div>
                    </section>

                    <section className="mb-4">
                        <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                            <Sparkles className="h-4 w-4" />
                            设计重点
                        </div>
                        <div className="grid gap-2 sm:grid-cols-3">
                            {FOCUS_OPTIONS.map((option) => {
                                const isActive = state.focus.includes(option.id);
                                return (
                                    <button
                                        key={option.id}
                                        type="button"
                                        disabled={disabled}
                                        className={cn(
                                            "rounded-xl border px-3 py-2 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:opacity-60",
                                            isActive
                                                ? "border-emerald-500 bg-emerald-50"
                                                : "border-slate-200 bg-white hover:border-slate-400"
                                        )}
                                        onClick={() => handleFocusToggle(option.id)}
                                    >
                                        <p className="text-sm font-semibold text-slate-900">
                                            {option.title}
                                        </p>
                                        <p className="text-xs text-slate-500 mt-0.5">
                                            {option.description}
                                        </p>
                                    </button>
                                );
                            })}
                        </div>
                    </section>

                    <section>
                        <div
                            className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                            <Workflow className="h-4 w-4"/>
                            图表类型
                        </div>

                        {/* 智能识别选项 - 推荐 */}
                        {autoOption && (
                            <div className="mb-2">
                                <button
                                    type="button"
                                    disabled={disabled}
                                    className={cn(
                                        "w-full rounded-xl border px-4 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:opacity-60",
                                        state.diagramTypes.includes(autoOption.id)
                                            ? "border-indigo-500 bg-indigo-50 shadow-sm"
                                            : "border-slate-200 bg-white hover:border-slate-400"
                                    )}
                                    onClick={() => handleDiagramTypeToggle(autoOption.id)}
                                >
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <p className="text-sm font-semibold text-slate-900">
                                                    {autoOption.title}
                                                </p>
                                                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                                                    推荐
                                                </span>
                                            </div>
                                            <p className="text-xs text-slate-500 mt-0.5">
                                                {autoOption.description}
                                            </p>
                                        </div>
                                        <Sparkles className="h-4 w-4 text-indigo-500" />
                                    </div>
                                </button>
                            </div>
                        )}

                        {/* 展开/收起按钮 */}
                        <button
                            type="button"
                            onClick={() => setShowAllDiagramTypes(!showAllDiagramTypes)}
                            className="mb-2 flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600 transition hover:border-slate-400 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                        >
                            {showAllDiagramTypes ? (
                                <>
                                    <ChevronUp className="h-3.5 w-3.5" />
                                    收起具体类型
                                </>
                            ) : (
                                <>
                                    <ChevronDown className="h-3.5 w-3.5" />
                                    显示具体类型 ({specificOptions.length}个)
                                </>
                            )}
                        </button>

                        {/* 具体图表类型 - 可折叠 */}
                        {showAllDiagramTypes && (
                            <div className="grid gap-2 sm:grid-cols-2">
                                {displayedOptions.map((option) => {
                                    const isActive = state.diagramTypes.includes(option.id);
                                    return (
                                        <button
                                            key={option.id}
                                            type="button"
                                            disabled={disabled}
                                            className={cn(
                                                "rounded-xl border px-3 py-2 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:opacity-60",
                                                isActive
                                                    ? "border-indigo-500 bg-indigo-50"
                                                    : "border-slate-200 bg-white hover:border-slate-400"
                                            )}
                                            onClick={() => handleDiagramTypeToggle(option.id)}
                                        >
                                            <p className="text-sm font-semibold text-slate-900">
                                                {option.title}
                                            </p>
                                            <p className="text-xs text-slate-500 mt-0.5">
                                                {option.description}
                                            </p>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </section>
                </>
            )}
        </div>
    );
}

interface FlowPilotBriefDialogProps extends FlowPilotBriefProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function FlowPilotBriefDialog({
    state,
    onChange,
    disabled = false,
    open,
    onOpenChange,
}: FlowPilotBriefDialogProps) {
    const handleOpenChange = (nextOpen: boolean) => {
        if (disabled && nextOpen) {
            return;
        }
        onOpenChange(nextOpen);
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>FlowPilot Brief 偏好配置</DialogTitle>
                    <DialogDescription>
                        设定任务目标、视觉风格与设计重点，或切换到自由模式仅保留少量默认守则。
                    </DialogDescription>
                </DialogHeader>
                <FlowPilotBrief state={state} onChange={onChange} disabled={disabled} />
                <DialogFooter>
                    <Button
                        type="button"
                        onClick={() => handleOpenChange(false)}
                        disabled={disabled}
                    >
                        完成
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

interface FlowPilotBriefLauncherProps extends FlowPilotBriefProps {
    badges: string[];
    // 模型配置相关
    modelEndpoints?: ModelEndpointConfig[];
    modelOptions?: RuntimeModelOption[];
    selectedModelKey?: string;
    onSelectModel?: (modelKey: string) => void;
    onManageModels?: () => void;
}

export function FlowPilotBriefLauncher({
    state,
    onChange,
    disabled,
    badges,
    modelEndpoints = [],
    modelOptions = [],
    selectedModelKey,
    onSelectModel,
    onManageModels,
}: FlowPilotBriefLauncherProps) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isCompact, setIsCompact] = useState(false);

    useEffect(() => {
        const container = containerRef.current;
        if (!container || typeof ResizeObserver === "undefined") return;

        const observer = new ResizeObserver((entries) => {
            const entry = entries[0];
            if (!entry) return;
            setIsCompact(entry.contentRect.width < 560);
        });

        observer.observe(container);
        return () => observer.disconnect();
    }, []);

    const selectedModel = selectedModelKey ? modelOptions.find(m => m.key === selectedModelKey) : null;
    const hasModels = modelOptions.length > 0;

    const getModelStatusIcon = (model: RuntimeModelOption) => {
        const endpoint = modelEndpoints.find(ep => ep.id === model.endpointId);
        if (endpoint?.baseUrl && endpoint?.apiKey) {
            return <CheckCircle2 className="h-3 w-3 text-emerald-500" />;
        }
        return <XCircle className="h-3 w-3 text-red-500" />;
    };

    const renderSummaryBadges = () => {
        if (badges.length === 0) return null;
        const clipped = badges.slice(0, 5);
        const remaining = Math.max(0, badges.length - 5);
        return (
            <div
                className={cn(
                    "mt-1 flex gap-1",
                    isCompact
                        ? "flex-nowrap overflow-x-auto pr-1 scrollbar-hide"
                        : "flex-wrap"
                )}
            >
                {clipped.map((badge, index) => (
                    <span
                        key={`${badge}-${index}`}
                        className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 whitespace-nowrap"
                    >
                        {badge}
                    </span>
                ))}
                {remaining > 0 && (
                    <span className="rounded-full border border-dashed border-slate-300 px-2 py-0.5 text-xs text-slate-500">
                        +{remaining} 更多
                    </span>
                )}
            </div>
        );
    };

    return (
        <>
            <div
                ref={containerRef}
                className="space-y-3"
            >
                {/* AI 模型配置 */}
                <div className="rounded-2xl border bg-white/90 p-3 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                        <Bot className="h-4 w-4 text-blue-500" />
                        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            AI 模型
                        </span>
                    </div>
                    
                    {!hasModels ? (
                        <div className="rounded-lg border border-dashed border-amber-200 bg-amber-50 p-3 text-center">
                            <p className="text-xs font-medium text-amber-900 mb-2">
                                尚未配置模型接口
                            </p>
                            <Button
                                type="button"
                                size="sm"
                                onClick={onManageModels}
                                disabled={disabled}
                                className="gap-1 text-xs h-7 bg-amber-600 hover:bg-amber-700"
                            >
                                <Plus className="h-3 w-3" />
                                立即配置
                            </Button>
                        </div>
                    ) : selectedModel ? (
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 p-2 rounded-lg bg-blue-50 border border-blue-200">
                                {getModelStatusIcon(selectedModel)}
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium text-slate-900 truncate">
                                        {selectedModel.label || selectedModel.modelId}
                                    </div>
                                    <div className="text-xs text-slate-500 truncate">
                                        {selectedModel.endpointName}
                                    </div>
                                </div>
                            </div>
                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={onManageModels}
                                disabled={disabled}
                                className="w-full text-xs h-7"
                            >
                                管理模型
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <p className="text-xs text-slate-600">请选择一个模型开始对话</p>
                            <Button
                                type="button"
                                size="sm"
                                onClick={onManageModels}
                                disabled={disabled}
                                className="w-full gap-1 text-xs h-7"
                            >
                                选择模型
                            </Button>
                        </div>
                    )}
                </div>

                {/* Brief 偏好配置 */}
                <div className="rounded-2xl border bg-white/90 p-3 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-amber-500" />
                            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                Brief
                            </span>
                        </div>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={disabled}
                            onClick={() => setIsOpen(true)}
                            className="gap-1 text-xs h-7"
                        >
                            <Settings2 className="h-3 w-3" />
                            调整
                        </Button>
                    </div>
                    
                    {/* 快速模式切换 */}
                    <div className="grid grid-cols-2 gap-2 mb-2">
                        {BRIEF_MODE_OPTIONS.map((option) => {
                            const isActive = state.mode === option.id;
                            return (
                                <button
                                    key={option.id}
                                    type="button"
                                    disabled={disabled}
                                    className={cn(
                                        "rounded-lg border px-3 py-1.5 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:opacity-60",
                                        isActive
                                            ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                                            : "border-slate-200 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50"
                                    )}
                                    onClick={() => onChange({ mode: option.id })}
                                >
                                    {option.title}
                                </button>
                            );
                        })}
                    </div>
                    
                    {renderSummaryBadges()}
                </div>
            </div>
            <FlowPilotBriefDialog
                state={state}
                onChange={onChange}
                disabled={disabled}
                open={isOpen}
                onOpenChange={setIsOpen}
            />
        </>
    );
}
