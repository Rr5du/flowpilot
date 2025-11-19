"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FaGithub } from "react-icons/fa";
import {
    AlertCircle,
    CheckCircle2,
    Copy,
    Handshake,
    ListMinus,
    ListPlus,
    PanelRightClose,
    PauseCircle,
    Sparkles,
} from "lucide-react";

import {
    Card,
    CardContent,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { ChatInputOptimized } from "@/components/chat-input-optimized";
import { ChatMessageDisplay } from "./chat-message-display-optimized";
import { useDiagram } from "@/contexts/diagram-context";
import { useConversationManager } from "@/contexts/conversation-context";
import { cn, formatXML, replaceXMLParts } from "@/lib/utils";
import { SessionStatus } from "@/components/session-status";
import { QuickActionBar } from "@/components/quick-action-bar";
import type { QuickActionDefinition } from "@/components/quick-action-bar";
import { FlowShowcaseGallery } from "./flow-showcase-gallery";
import {
    FlowPilotBriefLauncher,
    FlowPilotBriefDialog,
    FlowPilotBriefState,
    FOCUS_OPTIONS,
    GUARDRAIL_OPTIONS,
    INTENT_OPTIONS,
    TONE_OPTIONS,
    DIAGRAM_TYPE_OPTIONS,
} from "./flowpilot-brief";
import { ReportBlueprintTray } from "./report-blueprint-tray";
import { CalibrationConsole } from "./calibration-console";
import { useChatState } from "@/hooks/use-chat-state";
import { EMPTY_MXFILE } from "@/lib/diagram-templates";
import { ModelComparisonConfigDialog } from "@/components/model-comparison-config-dialog";
import { IntelligenceToolbar } from "@/features/chat-panel/components/intelligence-toolbar";
import { ToolPanelSidebar } from "@/features/chat-panel/components/tool-panel-sidebar";
import {
    FLOWPILOT_AI_CALIBRATION_PROMPT,
    FLOW_SHOWCASE_PRESETS,
    QUICK_ACTIONS,
    type FlowShowcasePreset,
} from "@/features/chat-panel/constants";
import { useComparisonWorkbench } from "@/features/chat-panel/hooks/use-comparison-workbench";
import { useDiagramOrchestrator } from "@/features/chat-panel/hooks/use-diagram-orchestrator";
import type { ToolPanel } from "@/features/chat-panel/types";
import { serializeAttachments } from "@/features/chat-panel/utils/attachments";
import { useModelRegistry } from "@/hooks/use-model-registry";
import { ModelConfigDialog } from "@/components/model-config-dialog";
import type { RuntimeModelConfig } from "@/types/model-config";

interface ChatPanelProps {
    onCollapse?: () => void;
    isCollapsible?: boolean;
}

export default function ChatPanelOptimized({
    onCollapse,
    isCollapsible = false,
}: ChatPanelProps) {
    const {
        loadDiagram: onDisplayChart,
        chartXML,
        clearDiagram,
        diagramHistory,
        restoreDiagramAt,
        activeVersionIndex,
        fetchDiagramXml,
        runtimeError,
        setRuntimeError,
    } = useDiagram();

    const {
        isConversationStarted,
        messageCount,
        isCompactMode,
        startConversation,
        incrementMessageCount,
        clearConversation,
        toggleCompactMode,
    } = useChatState();
    const {
        activeBranch,
        activeBranchId,
        branchTrail,
        branchList,
        createBranch,
        switchBranch,
        updateActiveBranchMessages,
        updateActiveBranchDiagram,
        resetActiveBranch,
    } = useConversationManager();
    const { handleDiagramXml, tryApplyRoot, updateLatestDiagramXml, getLatestDiagramXml } =
        useDiagramOrchestrator({
            chartXML,
            onDisplayChart,
            updateActiveBranchDiagram,
        });

    const lastBranchIdRef = useRef(activeBranchId);

    const onFetchChart = useCallback(async () => {
        const rawXml = await fetchDiagramXml();
        const formatted = formatXML(rawXml);
        updateLatestDiagramXml(formatted);
        return formatted;
    }, [fetchDiagramXml, updateLatestDiagramXml]);

    const {
        isReady: isModelRegistryReady,
        hasConfiguredModels,
        endpoints: modelEndpoints,
        models: modelOptions,
        selectedModelKey,
        selectedModel,
        selectModel,
        saveEndpoints,
    } = useModelRegistry();

    const [isModelConfigOpen, setIsModelConfigOpen] = useState(false);
    const hasPromptedModelSetup = useRef(false);

    // 更新模型的流式设置
    const handleModelStreamingChange = useCallback((modelKey: string, isStreaming: boolean) => {
        const [endpointId, modelId] = modelKey.split(':');
        const updatedEndpoints = modelEndpoints.map(endpoint => {
            if (endpoint.id === endpointId) {
                return {
                    ...endpoint,
                    models: endpoint.models.map(model => {
                        if (model.id === modelId) {
                            return { ...model, isStreaming, updatedAt: Date.now() };
                        }
                        return model;
                    }),
                    updatedAt: Date.now(),
                };
            }
            return endpoint;
        });
        saveEndpoints(updatedEndpoints);
    }, [modelEndpoints, saveEndpoints]);

    // State management
    const [files, setFiles] = useState<File[]>([]);
    const [showHistory, setShowHistory] = useState(false);
    const [input, setInput] = useState("");
    const [briefState, setBriefState] = useState<FlowPilotBriefState>({
        intent: "draft",
        tone: "balanced",
        focus: ["swimlane"],
        diagramTypes: ["sequence", "activity"],
        guardrails: ["singleViewport", "respectLabels"],
    });
    const [commandTab, setCommandTab] = useState<"starter" | "report" | "showcase">(
        "starter"
    );
    const [activeToolPanel, setActiveToolPanel] = useState<ToolPanel | null>(null);
    const [isToolSidebarOpen, setIsToolSidebarOpen] = useState(false);
    const [isContactDialogOpen, setIsContactDialogOpen] = useState(false);
    const [isBriefDialogOpen, setIsBriefDialogOpen] = useState(false);
    const [contactCopyState, setContactCopyState] = useState<"idle" | "copied">(
        "idle"
    );
    const diagramResultsRef = useRef<
        Map<string, { xml: string; runtime?: RuntimeModelConfig }>
    >(new Map());
    const [diagramResultVersion, setDiagramResultVersion] = useState(0);
    const getDiagramResult = useCallback(
        (toolCallId: string) => diagramResultsRef.current.get(toolCallId),
        []
    );

    useEffect(() => {
        if (
            isModelRegistryReady &&
            !hasConfiguredModels &&
            !hasPromptedModelSetup.current
        ) {
            setIsModelConfigOpen(true);
            hasPromptedModelSetup.current = true;
        }
    }, [hasConfiguredModels, isModelRegistryReady]);

    useEffect(() => {
        if (hasConfiguredModels) {
            hasPromptedModelSetup.current = false;
        }
    }, [hasConfiguredModels]);

    const briefContext = useMemo(() => {
        const intentMeta = INTENT_OPTIONS.find(
            (option) => option.id === briefState.intent
        );
        const toneMeta = TONE_OPTIONS.find(
            (option) => option.id === briefState.tone
        );
        const focusMeta = FOCUS_OPTIONS.filter((option) =>
            briefState.focus.includes(option.id)
        );
        const diagramTypeMeta = DIAGRAM_TYPE_OPTIONS.filter((option) =>
            briefState.diagramTypes.includes(option.id)
        );
        const guardrailMeta = GUARDRAIL_OPTIONS.filter((option) =>
            briefState.guardrails.includes(option.id)
        );

        const segments: string[] = [];
        const badges: string[] = [];

        if (intentMeta) {
            segments.push(`模式：「${intentMeta.title}」— ${intentMeta.prompt}`);
            badges.push(`模式·${intentMeta.title}`);
        }
        if (toneMeta) {
            segments.push(`视觉：${toneMeta.prompt}`);
            badges.push(`视觉·${toneMeta.title}`);
        }
        if (focusMeta.length > 0) {
            segments.push(
                `重点：${focusMeta.map((item) => item.prompt).join("；")}`
            );
            focusMeta.forEach((item) => badges.push(`重点·${item.title}`));
        }
        if (diagramTypeMeta.length > 0) {
            segments.push(
                `图型：${diagramTypeMeta
                    .map((item) => item.prompt)
                    .join("；")}`
            );
            diagramTypeMeta.forEach((item) =>
                badges.push(`图型·${item.title}`)
            );
        }
        if (guardrailMeta.length > 0) {
            segments.push(
                `护栏：${guardrailMeta.map((item) => item.prompt).join("；")}`
            );
            guardrailMeta.forEach((item) => badges.push(`护栏·${item.title}`));
        }

        const prompt =
            segments.length > 0
                ? `### FlowPilot Brief\\n${segments
                      .map((segment) => `- ${segment}`)
                      .join("\\n")}`
                : "";

        return { prompt, badges };
    }, [briefState]);
    const briefDisplayBadges =
        briefContext.badges.length > 0
            ? briefContext.badges
            : [
                  "模式·空白起稿",
                  "视觉·产品规范",
                  "护栏·单屏锁定",
              ];
    const briefSummary = briefDisplayBadges.slice(0, 3).join(" · ");


    const {
        messages,
        sendMessage,
        addToolResult,
        status,
        error,
        setMessages,
        stop,
    } =
        useChat({
            transport: new DefaultChatTransport({
                api: "/api/chat",
            }),
            async onToolCall({ toolCall }) {
                if (toolCall.toolName === "display_diagram") {
                    const { xml } = toolCall.input as { xml?: string };
                    try {
                        if (!xml || typeof xml !== "string" || !xml.trim()) {
                            throw new Error("大模型返回的 XML 为空，无法渲染。");
                        }
                        
                        // 立即渲染到画布
                        await handleDiagramXml(xml, {
                            origin: "display",
                            modelRuntime: selectedModel ?? undefined,
                        });
                        
                        // 同时保存到 diagramResultsRef 供后续使用
                        diagramResultsRef.current.set(toolCall.toolCallId, {
                            xml,
                            runtime: selectedModel ?? undefined,
                        });
                        setDiagramResultVersion((prev) => prev + 1);
                        
                        // 立即清除 input 中的 XML，避免在 DOM 中显示大量内容
                        if (toolCall.input && typeof toolCall.input === "object") {
                            (toolCall.input as Record<string, unknown>).xmlRef =
                                toolCall.toolCallId;
                            (toolCall.input as Record<string, unknown>).xmlLength =
                                xml.length;
                            (toolCall.input as Record<string, unknown>).xml = undefined;
                        }
                        
                        addToolResult({
                            tool: "display_diagram",
                            toolCallId: toolCall.toolCallId,
                            output:
                                "Diagram rendered to canvas successfully.",
                        });
                    } catch (error) {
                        const message =
                            error instanceof Error
                                ? error.message
                                : "Failed to display diagram.";
                        addToolResult({
                            tool: "display_diagram",
                            toolCallId: toolCall.toolCallId,
                            output: `Failed to display diagram: ${message}`,
                        });
                    }
                } else if (toolCall.toolName === "edit_diagram") {
                    const { edits } = toolCall.input as {
                        edits: Array<{ search: string; replace: string }>;
                    };

                    let currentXml = "";
                    try {
                        currentXml = await onFetchChart();
                        const editedXml = replaceXMLParts(currentXml, edits);
                        
                        // replaceXMLParts 返回完整的 XML，直接应用到画布
                        // 不应使用 handleDiagramXml，因为它期望接收 <root> 片段
                        onDisplayChart(editedXml);
                        updateActiveBranchDiagram(editedXml);
                        updateLatestDiagramXml(editedXml);

                        addToolResult({
                            tool: "edit_diagram",
                            toolCallId: toolCall.toolCallId,
                            output: `Successfully applied ${edits.length} edit(s) to the diagram.`,
                        });
                    } catch (error) {
                        console.error("Edit diagram failed:", error);
                        const errorMessage = error instanceof Error ? error.message : String(error);
                        addToolResult({
                            tool: "edit_diagram",
                            toolCallId: toolCall.toolCallId,
                            output: `Failed to edit diagram: ${errorMessage}`,
                        });
                    }
                }
            },
            onError: (error) => {
                console.error("Chat error:", error);
            },
        });

    const {
        comparisonConfig,
        setComparisonConfig,
        isComparisonConfigOpen,
        setIsComparisonConfigOpen,
        comparisonHistory,
        comparisonNotice,
        isComparisonRunning,
        activeComparisonPreview,
        requiresBranchDecision,
        handleCompareRequest,
        handleRetryComparisonResult,
        handleApplyComparisonResult,
        handlePreviewComparisonResult,
        handleDownloadXml,
        buildComparisonPreviewUrl,
        ensureBranchSelectionSettled,
        resetWorkbench,
        releaseBranchRequirement,
        notifyComparison,
        cancelComparisonJobs,
        pruneHistoryByMessageIds,
    } = useComparisonWorkbench({
        activeBranch,
        activeBranchId,
        createBranch,
        switchBranch,
        onFetchChart,
        files,
        briefContext,
        input,
        status,
        tryApplyRoot,
        handleDiagramXml,
        getLatestDiagramXml,
        messages,
        modelOptions: modelOptions,
        selectedModelKey,
    });

    const handleCopyXml = useCallback(
        async (xml: string) => {
            if (!xml || xml.trim().length === 0) {
                notifyComparison("error", "当前结果缺少 XML 内容，无法复制。");
                return;
            }
            try {
                await navigator.clipboard.writeText(xml);
                notifyComparison("success", "XML 已复制到剪贴板。");
            } catch (copyError) {
                console.error("Copy XML failed:", copyError);
                notifyComparison("error", "复制 XML 失败，请检查浏览器权限。");
            }
        },
        [notifyComparison]
    );

    const handleStopAll = useCallback(
        async (
            notice?: { type: "success" | "error"; message: string } | null
        ) => {
            try {
                if (status === "streaming" || status === "submitted") {
                    await stop();
                }
            } catch (stopError) {
                console.error("停止生成失败：", stopError);
            }
            cancelComparisonJobs();
            if (notice) {
                notifyComparison(notice.type, notice.message);
            }
        },
        [status, stop, cancelComparisonJobs, notifyComparison]
    );

    const handleRetryGeneration = useCallback(async () => {
        try {
            if (status === "streaming") {
                await stop();
            }
            
            // 找到最后一条用户消息
            const lastUserMessage = messages
                .slice()
                .reverse()
                .find(msg => msg.role === "user");
            
            if (!lastUserMessage) {
                console.error("没有找到用户消息可以重试");
                return;
            }
            
            // 删除最后一条AI回复（如果有的话）
            const lastMessageIndex = messages.length - 1;
            if (lastMessageIndex >= 0 && messages[lastMessageIndex].role === "assistant") {
                setMessages(messages.slice(0, lastMessageIndex));
            }
            
            // 重新发送最后一条用户消息
            const chartXml = await onFetchChart();
            
            sendMessage(
                { parts: lastUserMessage.parts || [] },
                {
                    body: {
                        xml: chartXml,
                        modelRuntime: selectedModel,
                        enableStreaming: selectedModel?.isStreaming ?? false,
                    },
                }
            );
        } catch (error) {
            console.error("重试生成失败：", error);
        }
    }, [status, stop, messages, setMessages, sendMessage, onFetchChart, selectedModel]);

    const handleCopyWechat = useCallback(async () => {
        try {
            if (typeof navigator !== "undefined" && navigator.clipboard) {
                await navigator.clipboard.writeText("leland1999");
            } else if (typeof window !== "undefined") {
                const fallback = window.prompt("复制微信号", "leland1999");
                if (fallback === null) {
                    throw new Error("用户取消复制。");
                }
            }
            setContactCopyState("copied");
            setTimeout(() => setContactCopyState("idle"), 1800);
        } catch (error) {
            console.error("复制微信号失败：", error);
            setContactCopyState("idle");
        }
    }, []);

    const briefTagTone = useCallback((badge: string) => {
        const prefix = badge.split("·")[0];
        switch (prefix) {
            case "模式":
                return "border-indigo-200 bg-indigo-50 text-indigo-700";
            case "视觉":
                return "border-rose-200 bg-rose-50 text-rose-700";
            case "重点":
                return "border-amber-200 bg-amber-50 text-amber-700";
            case "护栏":
                return "border-emerald-200 bg-emerald-50 text-emerald-700";
            default:
                return "border-slate-200 bg-slate-50 text-slate-700";
        }
    }, []);

    // 监听消息变化，自动启动对话状态
    useEffect(() => {
        const userMessages = messages.filter((message) => message.role === "user");
        if (userMessages.length > 0 && !isConversationStarted) {
            startConversation();
        }
        if (userMessages.length > messageCount) {
            incrementMessageCount();
        }
    }, [messages, isConversationStarted, messageCount, startConversation, incrementMessageCount]);

    useEffect(() => {
        if (isConversationStarted) {
            setActiveToolPanel(null);
            setIsToolSidebarOpen(false);
        }
    }, [isConversationStarted]);

    useEffect(() => {
        if (!activeBranch) {
            return;
        }
        if (activeBranch.messages === messages) {
            return;
        }
        updateActiveBranchMessages(messages);
    }, [messages, activeBranch, updateActiveBranchMessages]);

    useEffect(() => {
        if (
            showHistory &&
            (status === "streaming" || status === "submitted" || isComparisonRunning)
        ) {
            void handleStopAll({
                type: "error",
                message: "查看历史时已暂停当前生成。",
            });
        }
    }, [showHistory, status, isComparisonRunning, handleStopAll]);

    const onFormSubmit = useCallback(
        async (event: React.FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            if (status === "streaming") {
                return;
            }
            if (!input.trim()) {
                return;
            }
            if (!ensureBranchSelectionSettled()) {
                return;
            }
            if (!selectedModel) {
                setIsModelConfigOpen(true);
                return;
            }
            try {
                let chartXml = await onFetchChart();

                const enrichedInput =
                    briefContext.prompt.length > 0
                        ? `${briefContext.prompt}\n\n${input}`
                        : input;

                const parts: Array<
                    | { type: "text"; text: string; displayText?: string }
                    | { type: "file"; url: string; mediaType: string }
                > = [{ type: "text", text: enrichedInput, displayText: input }];

                if (files.length > 0) {
                    const attachments = await serializeAttachments(files);
                    attachments.forEach(({ url, mediaType }) => {
                        parts.push({
                            type: "file",
                            url,
                            mediaType,
                        });
                    });
                }

                sendMessage(
                    { parts },
                    {
                        body: {
                            xml: chartXml,
                            modelRuntime: selectedModel,
                            enableStreaming: selectedModel?.isStreaming ?? false,
                        },
                    }
                );

                setInput("");
                setFiles([]);
            } catch (submissionError) {
                console.error("Error fetching chart data:", submissionError);
            }
        },
        [
            status,
            input,
            ensureBranchSelectionSettled,
            onFetchChart,
            briefContext.prompt,
            files,
            sendMessage,
            selectedModel,
            setIsModelConfigOpen,
        ]
    );

    const handleInputChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
        setInput(e.target.value);
    };

    const handleFileChange = (newFiles: File[]) => {
        setFiles(newFiles);
    };

    const handleAICalibrationRequest = async () => {
        if (!ensureBranchSelectionSettled()) {
            throw new Error("请先处理对比结果，再执行校准。");
        }
        if (status === "streaming") {
            throw new Error("AI 正在回答其他请求，请稍后再试。");
        }
        if (!selectedModel) {
            setIsModelConfigOpen(true);
            throw new Error("请先配置可用模型后再执行校准。");
        }

        let chartXml = await onFetchChart();

        if (!chartXml.trim()) {
            throw new Error("当前画布为空，无法执行校准。");
        }

        // 用户可见的校准请求消息
        const userVisibleMessage = 
            "🎯 启动 AI 校准\n\n" +
            "请优化当前流程图的布局：\n" +
            "• 保持所有节点和内容不变\n" +
            "• 优化节点位置和间距\n" +
            "• 整理连接线路径\n" +
            "• 使用 edit_diagram 工具进行批量调整";

        await sendMessage(
            {
                parts: [
                    {
                        type: "text",
                        // 用户看到的是简化版本
                        text: userVisibleMessage + "\n\n---\n\n" + FLOWPILOT_AI_CALIBRATION_PROMPT,
                    },
                ],
            },
            {
                body: {
                    xml: chartXml,
                    modelRuntime: selectedModel,
                    enableStreaming: selectedModel?.isStreaming ?? false,
                },
            }
        );
    };

    const handleQuickAction = async (action: QuickActionDefinition) => {
        if (status === "streaming") return;
        if (!ensureBranchSelectionSettled()) return;
        setInput(action.prompt);

        if (action.attachment) {
            try {
                const response = await fetch(action.attachment.path);
                const blob = await response.blob();
                const file = new File([blob], action.attachment.fileName, {
                    type: action.attachment.mime,
                });
                handleFileChange([file]);
            } catch (err) {
                console.error("Failed to attach reference asset:", err);
            }
        } else if (files.length > 0) {
            handleFileChange([]);
        }
    };

    const handleShowcasePreset = (preset: FlowShowcasePreset) => {
        if (status === "streaming") return;
        if (!ensureBranchSelectionSettled()) return;
        setBriefState(preset.brief);
        setInput(preset.prompt);
        if (files.length > 0) {
            handleFileChange([]);
        }
    };

    const handleBranchSwitch = useCallback(
        async (branchId: string) => {
            if (branchId === activeBranchId) {
                return;
            }
            await handleStopAll({
                type: "error",
                message: "已暂停当前生成，准备切换分支。",
            });
            switchBranch(branchId);
        },
        [activeBranchId, handleStopAll, switchBranch]
    );

    const handleBlueprintTemplate = (prompt: string) => {
        if (status === "streaming") return;
        if (!ensureBranchSelectionSettled()) return;
        setInput(prompt);
        if (files.length > 0) {
            handleFileChange([]);
        }
    };

    const handleClearChat = () => {
        void handleStopAll({
            type: "success",
            message: "已清空当前对话并停止生成。",
        });
        setMessages([]);
        resetActiveBranch();
        updateActiveBranchDiagram(EMPTY_MXFILE);
        clearDiagram();
        clearConversation();
        resetWorkbench();
    };

    const exchanges = messages.filter(
        (message) => message.role === "user" || message.role === "assistant"
    ).length;

    const handleOpenBriefPanel = useCallback(() => {
        if (status === "streaming") {
            return;
        }
        setIsBriefDialogOpen(true);
    }, [status]);

    const toggleToolPanel = (panel: ToolPanel) => {
        setActiveToolPanel((current) => {
            const next = current === panel ? null : panel;
            setIsToolSidebarOpen(next !== null);
            return next;
        });
    };

    const closeToolSidebar = () => {
        setActiveToolPanel(null);
        setIsToolSidebarOpen(false);
    };

    useEffect(() => {
        if (!activeBranch) {
            return;
        }
        const branchChanged = lastBranchIdRef.current !== activeBranchId;
        const messagesMismatch = activeBranch.messages !== messages;

        if (branchChanged && activeBranch.diagramXml) {
            (async () => {
                try {
                    await handleDiagramXml(activeBranch.diagramXml!, {
                        origin: "display",
                        modelRuntime: undefined,
                    });
                } catch (error) {
                    console.error("切换分支应用画布失败：", error);
                }
            })();
        }

        if (branchChanged && messagesMismatch) {
            setMessages(activeBranch.messages);
        }

        if (branchChanged) {
            if (
                status === "streaming" ||
                status === "submitted" ||
                isComparisonRunning
            ) {
                void handleStopAll({
                    type: "error",
                    message: "已切换分支，自动暂停生成。",
                });
            }
            lastBranchIdRef.current = activeBranchId;
        }
    }, [
        activeBranch,
        activeBranchId,
        handleStopAll,
        handleDiagramXml,
        isComparisonRunning,
        messages,
        setMessages,
        status,
    ]);

    const handleMessageRevert = useCallback(
        ({ messageId, text }: { messageId: string; text: string }) => {
            const targetIndex = messages.findIndex(
                (message) => message.id === messageId
            );
            if (targetIndex < 0) {
                return;
            }
            const truncated = messages.slice(0, targetIndex);
            const labelSuffix =
                targetIndex + 1 <= 9
                    ? `0${targetIndex + 1}`
                    : `${targetIndex + 1}`;
            const revertBranch = createBranch({
                parentId: activeBranchId,
                label: `回滚 · 消息 ${labelSuffix}`,
                meta: {
                    type: "history",
                    label: `消息 ${labelSuffix}`,
                },
                diagramXml: activeBranch?.diagramXml ?? null,
                seedMessages: truncated,
                inheritMessages: false,
            });
            setMessages(truncated);
            setInput(text ?? "");
            if (!revertBranch) {
                updateActiveBranchMessages(truncated);
            }
            pruneHistoryByMessageIds(new Set(truncated.map((msg) => msg.id)));
            releaseBranchRequirement();
        },
        [
            activeBranch,
            activeBranchId,
            createBranch,
            messages,
            setMessages,
            setInput,
            updateActiveBranchMessages,
            releaseBranchRequirement,
            pruneHistoryByMessageIds,
        ]
    );

    const renderToolPanel = () => {
        if (!activeToolPanel) return null;

        if (activeToolPanel === "brief") {
            return (
                <FlowPilotBriefLauncher
                    state={briefState}
                    onChange={(next) =>
                        setBriefState((prev) => ({ ...prev, ...next }))
                    }
                    disabled={status === "streaming"}
                    badges={briefContext.badges}
                />
            );
        }

        if (activeToolPanel === "calibration") {
            return (
                <CalibrationConsole
                    disabled={status === "streaming" || requiresBranchDecision}
                    onAiCalibrate={handleAICalibrationRequest}
                />
            );
        }

        return (
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        快速复用灵感 / 述职 / 样板间
                    </div>
                    <div className="inline-flex min-w-[220px] items-center rounded-full bg-slate-100 p-1">
                        <button
                            type="button"
                            onClick={() => setCommandTab("starter")}
                            className={cn(
                                "rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap transition",
                                commandTab === "starter"
                                    ? "bg-white text-slate-900 shadow"
                                    : "text-slate-500"
                            )}
                        >
                            灵感起稿
                        </button>
                        <button
                            type="button"
                            onClick={() => setCommandTab("report")}
                            className={cn(
                                "rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap transition",
                                commandTab === "report"
                                    ? "bg-white text-slate-900 shadow"
                                    : "text-slate-500"
                            )}
                        >
                            述职模板
                        </button>
                        <button
                            type="button"
                            onClick={() => setCommandTab("showcase")}
                            className={cn(
                                "rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap transition",
                                commandTab === "showcase"
                                    ? "bg-white text-slate-900 shadow"
                                    : "text-slate-500"
                            )}
                        >
                            样板间
                        </button>
                    </div>
                </div>
                {commandTab === "starter" ? (
                    <QuickActionBar
                        actions={QUICK_ACTIONS}
                        disabled={status === "streaming" || requiresBranchDecision}
                        onSelect={handleQuickAction}
                        variant="plain"
                        title=""
                        subtitle=""
                    />
                ) : commandTab === "report" ? (
                    <ReportBlueprintTray
                        disabled={status === "streaming" || requiresBranchDecision}
                        onUseTemplate={(template) =>
                            handleBlueprintTemplate(template.prompt)
                        }
                    />
                ) : (
                    <FlowShowcaseGallery
                        presets={FLOW_SHOWCASE_PRESETS}
                        disabled={status === "streaming" || requiresBranchDecision}
                        onSelect={handleShowcasePreset}
                    />
                )}
            </div>
        );
    };

    const showSessionStatus = !isCompactMode || !isConversationStarted;
    const isGenerationBusy =
        status === "streaming" || status === "submitted" || isComparisonRunning;
    const shouldShowSidebar = Boolean(activeToolPanel && isToolSidebarOpen);

    return (
        <>
        <Card className="relative flex h-full max-h-full min-h-0 flex-col gap-0 rounded-none py-0 overflow-hidden">
            <CardHeader className="flex shrink-0 flex-col gap-2 border-b border-slate-100 px-3 py-2">
                <div className="flex w-full items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <CardTitle className="text-base font-semibold tracking-tight text-slate-900">
                            FlowPilot 智能流程图
                        </CardTitle>
                        <span className="text-[11px] uppercase tracking-wide text-slate-400">
                            studio
                        </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        {isConversationStarted && (
                            <button
                                type="button"
                                onClick={toggleCompactMode}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white/80 text-gray-600 shadow-sm transition hover:border-gray-300 hover:bg-white"
                                aria-label={isCompactMode ? "展开输入工具" : "精简输入工具"}
                            >
                                {isCompactMode ? (
                                    <ListPlus className="h-4 w-4" />
                                ) : (
                                    <ListMinus className="h-4 w-4" />
                                )}
                            </button>
                        )}
                        <a
                            href="https://github.com/cos43/flowpilot"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white/80 text-gray-600 shadow-sm transition hover:border-gray-300 hover:bg-white"
                            aria-label="在 GitHub 查看源码"
                        >
                            <FaGithub className="h-4 w-4" />
                        </a>
                        <button
                            type="button"
                            onClick={() => {
                                setContactCopyState("idle");
                                setIsContactDialogOpen(true);
                            }}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-violet-200 bg-white/80 text-violet-600 shadow-sm transition hover:border-violet-300 hover:bg-white"
                            aria-label="交流联系"
                            title="交流联系"
                        >
                            <Handshake className="h-4 w-4" />
                        </button>
                        {isCollapsible && (
                            <button
                                type="button"
                                onClick={onCollapse}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white/80 text-gray-600 shadow-sm transition hover:border-gray-300 hover:bg-white"
                                aria-label="收起聊天"
                            >
                                <PanelRightClose className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                </div>
                {showSessionStatus && (
                    <div className="flex flex-col gap-2">
                        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                            <SessionStatus
                                className="flex-1"
                                variant="inline"
                                status={status}
                                providerLabel={
                                    selectedModel?.label ||
                                    selectedModel?.modelId ||
                                    "未配置模型"
                                }
                                diagramVersions={
                                    diagramHistory.length > 0
                                        ? diagramHistory.length
                                        : chartXML
                                        ? 1
                                        : 0
                                }
                                attachmentCount={files.length}
                                exchanges={exchanges}
                            />
                            <button
                                type="button"
                                onClick={() =>
                                    handleStopAll({
                                        type: "success",
                                        message: "已手动暂停当前生成任务。",
                                    })
                                }
                                disabled={!isGenerationBusy}
                                className={cn(
                                    "inline-flex items-center justify-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold transition",
                                    isGenerationBusy
                                        ? "border-slate-900 text-slate-900 hover:bg-slate-900 hover:text-white"
                                        : "cursor-not-allowed border-slate-200 text-slate-300"
                                )}
                            >
                                <PauseCircle className="h-3.5 w-3.5" />
                                {isGenerationBusy ? "暂停生成" : "已暂停"}
                            </button>
                        </div>
                    </div>
                )}
            </CardHeader>
            <CardContent className="flex flex-1 min-h-0 flex-col px-3 pb-3 pt-2 overflow-hidden">
                <div className="flex flex-1 min-h-0 flex-col gap-3 overflow-hidden">
                    {!selectedModel && (
                        <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-2 text-sm text-amber-900">
                            <div>
                                FlowPilot 需要至少配置一个模型接口才能开始生成，请先填写 Base URL、API Key 与模型 ID。
                            </div>
                            <Button
                                type="button"
                                size="sm"
                                className="rounded-full bg-amber-900 text-white hover:bg-amber-900/90"
                                onClick={() => setIsModelConfigOpen(true)}
                            >
                                立即配置
                            </Button>
                        </div>
                    )}
                    <IntelligenceToolbar
                        activePanel={activeToolPanel}
                        isSidebarOpen={isToolSidebarOpen}
                        onToggle={toggleToolPanel}
                    />
                    <div className="relative flex flex-1 min-h-0 flex-col overflow-hidden">
                        {comparisonNotice && (
                            <div
                                className={cn(
                                    "mb-3 flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-xs",
                                    comparisonNotice.type === "success"
                                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                        : "border-red-200 bg-red-50 text-red-600"
                                )}
                            >
                                {comparisonNotice.type === "success" ? (
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                ) : (
                                    <AlertCircle className="h-3.5 w-3.5" />
                                )}
                                <span className="leading-snug">
                                    {comparisonNotice.message}
                                </span>
                            </div>
                        )}
                        <div 
                            className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden rounded-xl bg-white/90 px-2 py-2"
                            style={{ maxHeight: '100%' }}
                        >
                            <ChatMessageDisplay
                                messages={messages}
                                error={error}
                                setInput={setInput}
                                setFiles={handleFileChange}
                                activeBranchId={activeBranchId}
                                onDisplayDiagram={(xml) =>
                                    handleDiagramXml(xml, {
                                        origin: "display",
                                        modelRuntime: selectedModel ?? undefined,
                                    })
                                }
                                onComparisonApply={(result) => {
                                    void handleApplyComparisonResult(result);
                                }}
                                onComparisonCopyXml={handleCopyXml}
                                onComparisonDownload={handleDownloadXml}
                                onComparisonPreview={(requestId, result) => {
                                    void handlePreviewComparisonResult(requestId, result);
                                }}
                                onComparisonRetry={handleRetryComparisonResult}
                                buildComparisonPreviewUrl={buildComparisonPreviewUrl}
                                comparisonHistory={comparisonHistory}
                                activePreview={activeComparisonPreview}
                                onMessageRevert={handleMessageRevert}
                                onOpenBriefPanel={
                                    status === "streaming" ? undefined : handleOpenBriefPanel
                                }
                                briefBadges={briefDisplayBadges}
                                briefSummary={briefSummary}
                                runtimeDiagramError={runtimeError?.message ?? null}
                                onConsumeRuntimeError={() => setRuntimeError(null)}
                                onStopAll={() =>
                                    void handleStopAll({
                                        type: "error",
                                        message: "已手动暂停当前生成任务。",
                                    })
                                }
                                onRetryGeneration={handleRetryGeneration}
                                isGenerationBusy={isGenerationBusy}
                                isComparisonRunning={isComparisonRunning}
                            diagramResultVersion={diagramResultVersion}
                            getDiagramResult={getDiagramResult}
                            />
                        </div>
                        <ToolPanelSidebar
                            activePanel={activeToolPanel}
                            isOpen={shouldShowSidebar}
                            onClose={closeToolSidebar}
                        >
                            {renderToolPanel()}
                        </ToolPanelSidebar>
                    </div>
                </div>
            </CardContent>

            <CardFooter className="shrink-0 border-t border-slate-100 bg-background p-3">
                <div className="flex w-full flex-col gap-2">
                    {briefDisplayBadges.length > 0 && (
                        <div className="flex items-center gap-2 rounded-2xl border border-slate-100 bg-white/90 px-3 py-2 text-[11px] text-slate-500 shadow-sm">
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-900/5 px-2 py-0.5 font-semibold uppercase tracking-[0.25em] text-slate-600">
                                <Sparkles className="h-3 w-3 text-amber-500" />
                                Brief
                            </span>
                            <div
                                className="flex min-w-0 flex-1 items-center gap-1 overflow-hidden whitespace-nowrap pr-1"
                                title={briefDisplayBadges.join(" · ")}
                            >
                                {briefDisplayBadges.map((badge, index) => (
                                    <span
                                        key={`${badge}-${index}`}
                                        className={cn(
                                            "shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium",
                                            briefTagTone(badge)
                                        )}
                                    >
                                        {badge}
                                    </span>
                                ))}
                            </div>
                            <button
                                type="button"
                                onClick={handleOpenBriefPanel}
                                disabled={status === "streaming"}
                                className={cn(
                                    "shrink-0 rounded-full border border-slate-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500 transition hover:border-slate-400",
                                    status === "streaming" &&
                                        "cursor-not-allowed opacity-50 hover:border-slate-200"
                                )}
                            >
                                调整
                            </button>
                        </div>
                    )}
                <ChatInputOptimized
                    input={input}
                    status={status}
                    onSubmit={onFormSubmit}
                    onChange={handleInputChange}
                    onClearChat={handleClearChat}
                    files={files}
                    onFileChange={handleFileChange}
                    showHistory={showHistory}
                    onToggleHistory={setShowHistory}
                    isCompactMode={isCompactMode && isConversationStarted}
                    selectedModelKey={selectedModelKey}
                    modelOptions={modelOptions}
                    onModelChange={selectModel}
                    onManageModels={() => setIsModelConfigOpen(true)}
                    onModelStreamingChange={handleModelStreamingChange}
                    onCompareRequest={async () => {
                        if (!input.trim()) {
                            return;
                        }
                        
                        // 先添加用户消息
                        const enrichedInput =
                            briefContext.prompt.length > 0
                                ? `${briefContext.prompt}\n\n${input}`
                                : input;

                        const parts: Array<
                            | { type: "text"; text: string; displayText?: string }
                            | { type: "file"; url: string; mediaType: string }
                        > = [{ type: "text", text: enrichedInput, displayText: input }];

                        if (files.length > 0) {
                            const attachments = await serializeAttachments(files);
                            attachments.forEach(({ url, mediaType }) => {
                                parts.push({
                                    type: "file",
                                    url,
                                    mediaType,
                                });
                            });
                        }

                        // 生成用户消息 ID
                        const userMessageId = `user-compare-${Date.now()}`;
                        
                        // 手动添加用户消息到 messages（这样消息会显示在对话中）
                        setMessages((prev) => [
                            ...prev,
                            {
                                id: userMessageId,
                                role: "user",
                                parts,
                            } as any,
                        ]);
                        
                        // 然后发起对比请求，传入用户消息 ID 作为 anchor
                        void handleCompareRequest(userMessageId);
                        setInput("");
                        setFiles([]);
                    }}
                    onOpenComparisonConfig={() => setIsComparisonConfigOpen(true)}
                    isCompareLoading={isComparisonRunning}
                    interactionLocked={requiresBranchDecision || !selectedModel}
                />
                </div>
            </CardFooter>

        </Card>
        <Dialog open={isContactDialogOpen} onOpenChange={setIsContactDialogOpen}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>交流联系</DialogTitle>
                    <DialogDescription>
                        如果你在使用 FlowPilot 或图表创作时遇到问题、希望一起探讨方案，
                        欢迎通过微信联系我。
                    </DialogDescription>
                </DialogHeader>
                <div className="rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50 via-white to-slate-50 p-4 shadow-inner">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.3em] text-violet-500">
                        微信号
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-3">
                        <span className="text-lg font-semibold tracking-wide text-slate-900">
                            leland1999
                        </span>
                        <button
                            type="button"
                            onClick={handleCopyWechat}
                            className={cn(
                                "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-[12px] font-medium transition",
                                contactCopyState === "copied"
                                    ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                                    : "border-violet-200 bg-white text-violet-600 hover:border-violet-300"
                            )}
                        >
                            {contactCopyState === "copied" ? (
                                <>
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                    已复制
                                </>
                            ) : (
                                <>
                                    <Copy className="h-3.5 w-3.5" />
                                    复制
                                </>
                            )}
                        </button>
                    </div>
                    <p className="mt-3 text-xs text-slate-500">
                        简单备注一下问题背景或想聊的主题，我会在方便时尽快回复。
                    </p>
                </div>
            </DialogContent>
        </Dialog>
        <FlowPilotBriefDialog
            open={isBriefDialogOpen}
            onOpenChange={setIsBriefDialogOpen}
            state={briefState}
            onChange={(next) =>
                setBriefState((prev) => ({
                    ...prev,
                    ...next,
                }))
            }
            disabled={status === "streaming"}
        />
        <ModelComparisonConfigDialog
            open={isComparisonConfigOpen}
            onOpenChange={setIsComparisonConfigOpen}
            config={comparisonConfig}
            onConfigChange={setComparisonConfig}
            defaultPrimaryKey={selectedModelKey}
            models={modelOptions}
            onManageModels={() => setIsModelConfigOpen(true)}
        />
        <ModelConfigDialog
            open={isModelConfigOpen}
            onOpenChange={setIsModelConfigOpen}
            endpoints={modelEndpoints}
            onSave={saveEndpoints}
        />
        </>
    );
}
