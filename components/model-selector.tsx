"use client";

import React, {
    useMemo,
    useRef,
    useState,
    useEffect,
    useCallback,
} from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Check, Database, Zap, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { RuntimeModelOption } from "@/types/model-config";

// Simple Switch component
function Switch({ 
    checked, 
    onCheckedChange, 
    disabled,
    onClick,
}: { 
    checked: boolean; 
    onCheckedChange: (checked: boolean) => void;
    disabled?: boolean;
    onClick?: (e: React.MouseEvent) => void;
}) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            disabled={disabled}
            onClick={(e) => {
                e.stopPropagation();
                onClick?.(e);
                onCheckedChange(!checked);
            }}
            className={cn(
                "relative inline-flex h-5 w-9 items-center rounded-full transition-colors",
                checked ? "bg-blue-600" : "bg-gray-300",
                disabled && "opacity-50 cursor-not-allowed"
            )}
        >
            <span
                className={cn(
                    "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                    checked ? "translate-x-5" : "translate-x-0.5"
                )}
            />
        </button>
    );
}

interface ModelSelectorProps {
    selectedModelKey?: string;
    onModelChange: (modelKey: string) => void;
    models: RuntimeModelOption[];
    onManage?: () => void;
    disabled?: boolean;
    onModelStreamingChange?: (modelKey: string, isStreaming: boolean) => void;
}

interface GroupedModelOptions {
    endpointId: string;
    endpointName: string;
    providerHint: string;
    items: RuntimeModelOption[];
}

export function ModelSelector({
    selectedModelKey,
    onModelChange,
    models,
    onManage,
    disabled = false,
    onModelStreamingChange,
}: ModelSelectorProps) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const [isMounted, setIsMounted] = useState(false);
    const [menuPosition, setMenuPosition] = useState<{
        top: number;
        left: number;
        width: number;
    } | null>(null);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const updateMenuPosition = useCallback(() => {
        if (!triggerRef.current) return;
        const rect = triggerRef.current.getBoundingClientRect();
        setMenuPosition({
            top: rect.top + window.scrollY,
            left: rect.left + window.scrollX,
            width: rect.width,
        });
    }, []);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            const target = event.target as Node;
            console.log('[ModelSelector] Click outside detected:', {
                target,
                triggerContains: triggerRef.current?.contains(target),
                dropdownContains: dropdownRef.current?.contains(target),
                isOpen
            });
            if (
                triggerRef.current?.contains(target) ||
                dropdownRef.current?.contains(target)
            ) {
                return;
            }
            console.log('[ModelSelector] Closing dropdown');
            setIsOpen(false);
        }

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;
        updateMenuPosition();
        const handleWindowChange = () => updateMenuPosition();
        window.addEventListener("resize", handleWindowChange);
        window.addEventListener("scroll", handleWindowChange, true);
        return () => {
            window.removeEventListener("resize", handleWindowChange);
            window.removeEventListener("scroll", handleWindowChange, true);
        };
    }, [isOpen, updateMenuPosition]);

    const groupedModels = useMemo<GroupedModelOptions[]>(() => {
        const map = new Map<string, GroupedModelOptions>();
        models.forEach((model) => {
            if (!map.has(model.endpointId)) {
                map.set(model.endpointId, {
                    endpointId: model.endpointId,
                    endpointName: model.endpointName,
                    providerHint: model.providerHint,
                    items: [],
                });
            }
            map.get(model.endpointId)?.items.push(model);
        });
        return Array.from(map.values());
    }, [models]);

    const selectedModel = useMemo(
        () => models.find((model) => model.key === selectedModelKey),
        [models, selectedModelKey]
    );

    const handleSelect = (modelKey: string) => {
        console.log('[ModelSelector] handleSelect called:', modelKey);
        onModelChange(modelKey);
        setIsOpen(false);
    };

    const buttonLabel = selectedModel
        ? `${selectedModel.label || selectedModel.modelId}`
        : "配置模型";

    const isStreaming = selectedModel?.isStreaming ?? false;

    return (
        <div className="relative">
            <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={(e) => {
                    console.log('[ModelSelector] Trigger clicked, current isOpen:', isOpen);
                    e.stopPropagation();
                    setIsOpen((prev) => !prev);
                }}
                disabled={disabled}
                ref={triggerRef}
                className={cn(
                    "h-8 min-w-[160px] justify-between rounded-full border-slate-200 px-3 text-xs font-medium text-slate-700 hover:border-slate-300",
                    !selectedModel && "text-slate-400"
                )}
            >
                <span className="flex items-center gap-2 truncate">
                    {!selectedModel && <Database className="h-3.5 w-3.5" />}
                    {selectedModel && (
                        isStreaming ? (
                            <span title="流式输出">
                                <Zap className="h-3.5 w-3.5 text-blue-500" />
                            </span>
                        ) : (
                            <span title="普通输出">
                                <FileText className="h-3.5 w-3.5 text-slate-400" />
                            </span>
                        )
                    )}
                    <span className="truncate max-w-[120px]">{buttonLabel}</span>
                </span>
                <ChevronDown className="ml-1 h-3 w-3 shrink-0" />
            </Button>

            {isMounted &&
                isOpen &&
                menuPosition &&
                createPortal(
                    <div
                        ref={dropdownRef}
                        className="z-[9999] pointer-events-auto"
                        style={{
                            position: "absolute",
                            top: menuPosition.top,
                            left: menuPosition.left,
                            width: Math.max(menuPosition.width, 280),
                            transform: "translateY(calc(-100% - 8px))",
                        }}
                        onClick={(e) => {
                            e.stopPropagation();
                        }}
                        onMouseDown={(e) => {
                            e.stopPropagation();
                        }}
                    >
                        <div className="w-full rounded-2xl border border-slate-100 bg-white/95 shadow-xl">
                            {models.length === 0 ? (
                                <div className="p-4 text-sm text-slate-500">
                                    暂无可用模型，请先完成接口配置。
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="mt-3 w-full rounded-full border-dashed"
                                        onClick={() => {
                                            setIsOpen(false);
                                            onManage?.();
                                        }}
                                    >
                                        去配置模型
                                    </Button>
                                </div>
                            ) : (
                                <div className="max-h-80 overflow-y-auto py-2">
                                    {groupedModels.map((group) => (
                                        <div key={group.endpointId} className="py-1">
                                            <div className="px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400">
                                                {group.endpointName}
                                                <span className="ml-1 text-[10px] uppercase text-slate-300">
                                                    {group.providerHint}
                                                </span>
                                            </div>
                                            {group.items.map((model) => (
                                                <div
                                                    key={model.key}
                                                    className={cn(
                                                        "flex w-full flex-col items-start gap-2 px-4 py-2 text-left text-sm transition hover:bg-slate-50",
                                                        selectedModelKey === model.key &&
                                                            "bg-slate-900/5"
                                                    )}
                                                >
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            handleSelect(model.key);
                                                        }}
                                                        onMouseDown={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                        }}
                                                        className="flex w-full items-center justify-between"
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            {model.isStreaming ? (
                                                                <span title="流式输出">
                                                                    <Zap className="h-3.5 w-3.5 text-blue-500" />
                                                                </span>
                                                            ) : (
                                                                <span title="普通输出">
                                                                    <FileText className="h-3.5 w-3.5 text-slate-400" />
                                                                </span>
                                                            )}
                                                            <span className="font-medium text-slate-900">
                                                                {model.label || model.modelId}
                                                            </span>
                                                        </div>
                                                        {selectedModelKey === model.key && (
                                                            <Check className="h-4 w-4 text-slate-900" />
                                                        )}
                                                    </button>
                                                    <div className="ml-5 text-xs font-mono text-slate-400">
                                                        {model.modelId}
                                                    </div>
                                                    {/* 流式输出开关 */}
                                                    {onModelStreamingChange && (
                                                        <div className="ml-5 flex items-center gap-2 text-xs">
                                                            <span className="text-slate-600">流式输出:</span>
                                                            <Switch
                                                                checked={model.isStreaming ?? false}
                                                                onCheckedChange={(checked) => {
                                                                    onModelStreamingChange(model.key, checked);
                                                                }}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                }}
                                                            />
                                                            <span className="text-slate-400">
                                                                {model.isStreaming ? '开启' : '关闭'}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    ))}
                                </div>
                            )}
                            <div className="border-t border-slate-100 p-2">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    className="w-full rounded-full text-xs font-semibold text-slate-500 hover:text-slate-900"
                                    onClick={(e) => {
                                        console.log('[ModelSelector] Manage button clicked');
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setIsOpen(false);
                                        console.log('[ModelSelector] Calling onManage');
                                        onManage?.();
                                    }}
                                    onMouseDown={(e) => {
                                        e.stopPropagation();
                                    }}
                                >
                                    管理模型
                                </Button>
                            </div>
                        </div>
                    </div>,
                    document.body
                )}
        </div>
    );
}
