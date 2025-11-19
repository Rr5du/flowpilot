"use client";

import React, { useCallback, useRef, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ResetWarningModal } from "@/components/reset-warning-modal";
import {
    Loader2,
    Send,
    RotateCcw,
    Image as ImageIcon,
    History,
    Sparkles,
    Settings,
} from "lucide-react";
import { ButtonWithTooltip } from "@/components/button-with-tooltip";
import { FilePreviewList } from "@/components/file-preview-list";
import { useDiagram } from "@/contexts/diagram-context";
import { HistoryDialog } from "@/components/history-dialog";
import { ModelSelector } from "@/components/model-selector";
import { cn } from "@/lib/utils";
import type { RuntimeModelOption } from "@/types/model-config";

interface ChatInputOptimizedProps {
    input: string;
    status: "submitted" | "streaming" | "ready" | "error";
    onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
    onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
    onClearChat: () => void;
    files?: File[];
    onFileChange?: (files: File[]) => void;
    showHistory?: boolean;
    onToggleHistory?: (show: boolean) => void;
    isCompactMode?: boolean;
    selectedModelKey?: string;
    modelOptions?: RuntimeModelOption[];
    onModelChange?: (modelKey: string) => void;
    onManageModels?: () => void;
    onCompareRequest?: () => void;
    onOpenComparisonConfig?: () => void;
    isCompareLoading?: boolean;
    interactionLocked?: boolean;
    // 流式配置回调
    onModelStreamingChange?: (modelKey: string, isStreaming: boolean) => void;
}

export function ChatInputOptimized({
    input,
    status,
    onSubmit,
    onChange,
    onClearChat,
    files = [],
    onFileChange = () => {},
    showHistory = false,
    onToggleHistory = () => {},
    isCompactMode = false,
    selectedModelKey,
    modelOptions = [],
    onModelChange = () => {},
    onManageModels,
    onCompareRequest = () => {},
    onOpenComparisonConfig = () => {},
    isCompareLoading = false,
    interactionLocked = false,
    onModelStreamingChange,
}: ChatInputOptimizedProps) {
    const { diagramHistory } = useDiagram();
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [showClearDialog, setShowClearDialog] = useState(false);

    const MAX_VISIBLE_LINES = 6;

    // Auto-resize textarea based on content
    const adjustTextareaHeight = useCallback(() => {
        const textarea = textareaRef.current;
        if (textarea) {
            const lineHeight =
                parseFloat(window.getComputedStyle(textarea).lineHeight || "24") ||
                24;
            const maxHeight = lineHeight * MAX_VISIBLE_LINES;
            textarea.style.height = "auto";
            textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`;
        }
    }, []);

    useEffect(() => {
        adjustTextareaHeight();
    }, [input, adjustTextareaHeight]);

    // Handle keyboard shortcuts and paste events
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
            e.preventDefault();
            const form = e.currentTarget.closest("form");
            if (form && input.trim() && status !== "streaming") {
                form.requestSubmit();
            }
        }
    };

    // Handle clipboard paste
    const handlePaste = async (e: React.ClipboardEvent) => {
        if (status === "streaming") return;

        const items = e.clipboardData.items;
        const imageItems = Array.from(items).filter((item) =>
            item.type.startsWith("image/")
        );

        if (imageItems.length > 0) {
            const imageFiles = await Promise.all(
                imageItems.map(async (item) => {
                    const file = item.getAsFile();
                    if (!file) return null;
                    // Create a new file with a unique name
                    return new File(
                        [file],
                        `pasted-image-${Date.now()}.${file.type.split("/")[1]}`,
                        {
                            type: file.type,
                        }
                    );
                })
            );

            const validFiles = imageFiles.filter(
                (file): file is File => file !== null
            );
            if (validFiles.length > 0) {
                onFileChange([...files, ...validFiles]);
            }
        }
    };

    // Handle file changes
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newFiles = Array.from(e.target.files || []);
        onFileChange([...files, ...newFiles]);
    };

    // Remove individual file
    const handleRemoveFile = (fileToRemove: File) => {
        onFileChange(files.filter((file) => file !== fileToRemove));
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const handleRemoveAllFiles = () => {
        if (files.length === 0) return;
        onFileChange([]);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    // Trigger file input click
    const triggerFileInput = () => {
        fileInputRef.current?.click();
    };

    // Handle drag events
    const handleDragOver = (e: React.DragEvent<HTMLFormElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent<HTMLFormElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent<HTMLFormElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        if (status === "streaming") return;

        const droppedFiles = e.dataTransfer.files;

        // Only process image files
        const imageFiles = Array.from(droppedFiles).filter((file) =>
            file.type.startsWith("image/")
        );

        if (imageFiles.length > 0) {
            onFileChange([...files, ...imageFiles]);
        }
    };

    // Handle clearing conversation and diagram
    const handleClear = () => {
        onClearChat();
        setShowClearDialog(false);
    };

    return (
        <form
            onSubmit={onSubmit}
            className="w-full"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            <div
                className={cn(
                    "relative overflow-hidden rounded-2xl border border-slate-200 bg-white/90 shadow-md transition-all",
                    isDragging && "ring-2 ring-slate-300"
                )}
            >
                {files.length > 0 && (
                    <div className="flex flex-col gap-1 border-b border-slate-200/80 px-3 py-2">
                        <div className="flex items-center justify-between text-[11px] font-medium text-slate-500">
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-900 px-2 py-0.5 text-[10px] uppercase tracking-wide text-white">
                                {files.length} 个附件
                            </span>
                            <button
                                type="button"
                                onClick={handleRemoveAllFiles}
                                className="rounded-full px-2 py-0.5 text-[11px] text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                            >
                                移除全部
                            </button>
                        </div>
                        <FilePreviewList
                            files={files}
                            onRemoveFile={handleRemoveFile}
                            variant="chip"
                        />
                    </div>
                )}

                <div className="px-3 py-2">
                    <Textarea
                        ref={textareaRef}
                        value={input}
                        onChange={onChange}
                        onKeyDown={handleKeyDown}
                        onPaste={handlePaste}
                        placeholder="描述你想让流程图如何调整，支持拖拽或粘贴图片作为参考素材"
                        disabled={status === "streaming"}
                        aria-label="聊天输入框"
                        className="h-auto min-h-[56px] resize-none border-0 !border-none bg-transparent p-0 text-sm leading-5 text-slate-900 outline-none shadow-none focus-visible:border-0 focus-visible:ring-0 focus-visible:outline-none focus-visible:!border-none focus-visible:!outline-none focus-visible:shadow-none"
                    />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 px-3 pt-1 pb-1.5">
                    <div className="flex items-center gap-1.5">
                        <ButtonWithTooltip
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 rounded-full"
                            onClick={() => setShowClearDialog(true)}
                            tooltipContent="清空当前对话与图表"
                            disabled={status === "streaming"}
                        >
                            <RotateCcw className="h-4 w-4" />
                        </ButtonWithTooltip>

                        <ButtonWithTooltip
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 rounded-full"
                            onClick={() => onToggleHistory(true)}
                            disabled={
                                status === "streaming" ||
                                diagramHistory.length === 0 ||
                                interactionLocked
                            }
                            tooltipContent="查看图表变更记录"
                        >
                            <History className="h-4 w-4" />
                        </ButtonWithTooltip>

                        <ButtonWithTooltip
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 rounded-full"
                            onClick={triggerFileInput}
                            disabled={status === "streaming" || interactionLocked}
                            tooltipContent="上传图片"
                        >
                            <ImageIcon className="h-4 w-4" />
                        </ButtonWithTooltip>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                            <ModelSelector
                                selectedModelKey={selectedModelKey}
                                onModelChange={onModelChange}
                                models={modelOptions}
                                onManage={onManageModels}
                                disabled={status === "streaming" || interactionLocked}
                                onModelStreamingChange={onModelStreamingChange}
                            />

                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 gap-1 rounded-full px-3 text-xs font-semibold text-slate-600 hover:text-slate-900"
                            onClick={onOpenComparisonConfig}
                            disabled={status === "streaming" || interactionLocked}
                        >
                            <Settings className="h-3.5 w-3.5" />
                            对比设置
                        </Button>
                        <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            className="h-8 gap-1 rounded-full bg-slate-900/10 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-900/20 disabled:opacity-60"
                            disabled={
                                status === "streaming" ||
                                !input.trim() ||
                                isCompareLoading ||
                                interactionLocked
                            }
                            onClick={onCompareRequest}
                            aria-label="使用当前提示词进行多模型对比"
                        >
                            {isCompareLoading ? (
                                <>
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    正在生成…
                                </>
                            ) : (
                                <>
                                    <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                                    对比生成
                                </>
                            )}
                        </Button>
                        <Button
                            type="submit"
                            disabled={
                                status === "streaming" ||
                                !input.trim() ||
                                interactionLocked
                            }
                            className="h-8 min-w-[88px] gap-2 rounded-full bg-slate-900 text-white shadow-sm transition hover:bg-slate-900/90 disabled:opacity-60"
                            size="sm"
                            aria-label={
                                status === "streaming"
                                    ? "正在发送消息…"
                                    : "发送消息"
                            }
                        >
                            {status === "streaming" ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Send className="h-4 w-4" />
                            )}
                            发送
                        </Button>
                    </div>
                </div>
            </div>

            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                onChange={handleFileChange}
                accept="image/*"
                multiple
                disabled={status === "streaming" || interactionLocked}
            />

            <ResetWarningModal
                open={showClearDialog}
                onOpenChange={setShowClearDialog}
                onClear={handleClear}
            />

            <HistoryDialog
                showHistory={showHistory}
                onToggleHistory={onToggleHistory}
            />
        </form>
    );
}
