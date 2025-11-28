"use client";

import React, { useState, useRef, useCallback, useEffect, useMemo } from "react";
import {
  Upload,
  FileCode,
  ClipboardPaste,
  X,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  History,
  ExternalLink,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useSvgEditor } from "@/contexts/svg-editor-context";
import { cn } from "@/lib/utils";

const MAX_HEIGHT = 1200;

interface SvgImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (svgContent: string) => void;
}

export function SvgImportDialog({ open, onOpenChange, onImport }: SvgImportDialogProps) {
  const { importHistory } = useSvgEditor();
  const [activeTab, setActiveTab] = useState<"paste" | "upload">("paste");
  const [pasteContent, setPasteContent] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{
    type: "idle" | "success" | "error";
    message?: string;
  }>({ type: "idle" });
  const [charCount, setCharCount] = useState(0);
  const [showPreview, setShowPreview] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [svgStats, setSvgStats] = useState<{ width?: number; height?: number; elementCount: number; pathCount: number } | null>(null);
  const [pendingImportName, setPendingImportName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const pastePreviewRef = useRef<SVGSVGElement | null>(null);

  // 自动聚焦到文本框
  useEffect(() => {
    if (open && activeTab === "paste" && textareaRef.current) {
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [open, activeTab]);

  // 更新字符计数
  useEffect(() => {
    setCharCount(pasteContent.length);
  }, [pasteContent]);

  const resetState = useCallback(() => {
    setPasteContent("");
    setCharCount(0);
    setUploadStatus({ type: "idle" });
    setDragActive(false);
    setShowPreview(false);
    setPreviewError(null);
    setSvgStats(null);
    setPendingImportName(null);
  }, []);

  const parseSvgDimensions = (content: string) => {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(content, "image/svg+xml");
      const svgEl = doc.querySelector("svg");
      if (!svgEl) {
        return null;
      }
      const width = svgEl.getAttribute("width") ? parseFloat(svgEl.getAttribute("width") || "") : undefined;
      const height = svgEl.getAttribute("height") ? parseFloat(svgEl.getAttribute("height") || "") : undefined;
      const viewBox = svgEl.getAttribute("viewBox")?.split(/[\s,]+/).map((value) => parseFloat(value));
      if ((!width || !height) && viewBox && viewBox.length === 4) {
        return { width: viewBox[2], height: viewBox[3] };
      }
      return { width, height };
    } catch {
      return null;
    }
  };

  const validateSvg = (content: string): { valid: boolean; error?: string; height?: number; width?: number } => {
    if (!content.trim()) {
      return { valid: false, error: "内容不能为空" };
    }
    if (!content.includes("<svg")) {
      return { valid: false, error: "内容必须包含 <svg> 标签" };
    }
    const dims = parseSvgDimensions(content);
    if (dims?.height && dims.height > MAX_HEIGHT) {
      return { valid: false, error: `SVG 高度 ${Math.round(dims.height)} 超出允许范围，最大 ${MAX_HEIGHT}`, height: dims.height, width: dims.width };
    }
    return { valid: true, height: dims?.height, width: dims?.width };
  };

  const handleImport = useCallback(
    (content: string, options?: { name?: string; type?: "paste" | "upload" }) => {
      const validation = validateSvg(content);
      if (!validation.valid) {
        setUploadStatus({ type: "error", message: validation.error });
        setSvgStats(null);
        return;
      }

      try {
        onImport(content);
        setUploadStatus({ type: "success", message: "导入成功！" });
        setSvgStats((prev) => ({
          width: validation.width ?? prev?.width,
          height: validation.height ?? prev?.height,
          elementCount: prev?.elementCount ?? 0,
          pathCount: prev?.pathCount ?? 0,
        }));
        setTimeout(() => {
          onOpenChange(false);
          resetState();
        }, 800);
      } catch (error) {
        setUploadStatus({
          type: "error",
          message: error instanceof Error ? error.message : "导入失败，请检查 SVG 格式",
        });
      }
    },
    [onImport, onOpenChange, resetState]
  );

  const handlePasteImport = () => {
    handleImport(pasteContent, { name: pendingImportName ?? "粘贴导入", type: "paste" });
  };

  const handleFileRead = (file: File) => {
    if (!file.type.includes("svg") && !file.name.endsWith(".svg")) {
      setUploadStatus({ type: "error", message: "请选择 SVG 文件" });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setPendingImportName(file.name);
      handleImport(content, { name: file.name, type: "upload" });
    };
    reader.onerror = () => {
      setUploadStatus({ type: "error", message: "文件读取失败" });
    };
    reader.readAsText(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileRead(file);
    }
    // Reset input
    e.target.value = "";
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragIn = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setDragActive(true);
    }
  };

  const handleDragOut = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileRead(file);
    }
  };

  const handleQuickPaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setPasteContent(text);
        setUploadStatus({ type: "idle" });
        setPendingImportName("剪贴板 SVG");
      }
    } catch (error) {
      setUploadStatus({
        type: "error",
        message: "无法访问剪贴板，请手动粘贴",
      });
    }
  };

  useEffect(() => {
    if (!pasteContent.trim()) {
      setShowPreview(false);
      setPreviewError(null);
      setSvgStats(null);
      return;
    }
    const validation = validateSvg(pasteContent);
    if (!validation.valid) {
      setPreviewError(validation.error ?? null);
      setShowPreview(false);
      setSvgStats(null);
      return;
    }
    setPreviewError(null);
    setShowPreview(true);
    const stats = parseSvgDimensions(pasteContent);
    setSvgStats((prev) => ({
      width: stats?.width ?? prev?.width,
      height: stats?.height ?? prev?.height,
      elementCount: prev?.elementCount ?? 0,
      pathCount: prev?.pathCount ?? 0,
    }));
  }, [pasteContent]);

  const renderPreview = useCallback(() => {
    if (!showPreview) return null;
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-600">实时预览</span>
          {svgStats && (
            <span className="text-xs text-slate-400">
              {svgStats.width ? `${Math.round(svgStats.width)}w` : "--"} × {svgStats.height ? `${Math.round(svgStats.height)}h` : "--"}
            </span>
          )}
        </div>
        <div className="mt-2 h-48 overflow-hidden rounded-md border border-dashed border-slate-200 bg-white">
          <div className="flex h-full items-center justify-center">
            <div className="max-h-full max-w-full overflow-hidden">
              <div className="pointer-events-none flex items-center justify-center">
                <div className="max-h-44 max-w-[360px] overflow-hidden" dangerouslySetInnerHTML={{ __html: pasteContent }} />
              </div>
            </div>
          </div>
        </div>
        {previewError && (
          <p className="mt-2 text-xs text-red-600">{previewError}</p>
        )}
      </div>
    );
  }, [showPreview, svgStats, pasteContent, previewError]);

  const renderHistory = useMemo(() => {
    if (!importHistory.length) return null;
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
          <History className="h-3.5 w-3.5" />
          最近导入
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50">
          {importHistory.slice(0, 3).map((item, index) => (
            <button
              key={item.id}
              type="button"
              onClick={() => handleImport(item.content, { name: item.name, type: item.type })}
              className={cn(
                "flex w-full items-center justify-between gap-3 px-3 py-2 text-left transition hover:bg-slate-100",
                index !== importHistory.length - 1 && "border-b border-slate-200/60"
              )}
            >
              <div className="flex flex-col">
                <span className="text-xs font-medium text-slate-700">{item.name}</span>
                <span className="text-[11px] text-slate-400">
                  {item.type === "paste" ? "粘贴" : "上传"} · {new Date(item.timestamp).toLocaleString()}
                </span>
              </div>
              {item.stats && (
                <span className="text-[11px] text-slate-400">
                  {item.stats.width ? `${Math.round(item.stats.width)}w` : "--"}×{item.stats.height ? `${Math.round(item.stats.height)}h` : "--"}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    );
  }, [importHistory, handleImport]);

  const handleDialogChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetState();
    }
    onOpenChange(newOpen);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleDialogChange}>
        <DialogContent className="sm:max-w-[640px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
              <FileCode className="h-5 w-5 text-blue-600" />
              导入 SVG
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="ml-1 text-slate-400 transition hover:text-slate-600">
                      <ExternalLink className="h-3.5 w-3.5" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs text-xs">
                    支持粘贴 draw.io / Figma 导出的 SVG，若高度超过 {MAX_HEIGHT} 会提示调整。
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </DialogTitle>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "paste" | "upload")} className="w-full space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="paste" className="gap-2">
                <ClipboardPaste className="h-4 w-4" />
                粘贴代码
              </TabsTrigger>
              <TabsTrigger value="upload" className="gap-2">
                <Upload className="h-4 w-4" />
                上传文件
              </TabsTrigger>
            </TabsList>

            {renderHistory}
            <TabsContent value="paste" className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-slate-700">SVG 代码</label>
                  <div className="flex items-center gap-2">
                    {charCount > 0 && (
                      <span className="text-xs text-slate-400">
                        {charCount.toLocaleString()} 字符
                      </span>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleQuickPaste}
                      className="h-7 gap-1 text-xs"
                    >
                      <ClipboardPaste className="h-3 w-3" />
                      从剪贴板粘贴
                    </Button>
                  </div>
                </div>
                <div className="relative">
                  <Textarea
                    ref={textareaRef}
                    placeholder="粘贴 SVG 代码到这里...&#10;&#10;例如：<svg width=&quot;100&quot; height=&quot;100&quot;>&#10;  <circle cx=&quot;50&quot; cy=&quot;50&quot; r=&quot;40&quot; />&#10;</svg>"
                    value={pasteContent}
                    onChange={(e) => {
                      setPasteContent(e.target.value);
                      setUploadStatus({ type: "idle" });
                    }}
                    onKeyDown={(e) => {
                      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                        e.preventDefault();
                        handlePasteImport();
                      }
                    }}
                    className="min-h-[260px] max-h-[360px] resize-y font-mono text-xs leading-relaxed"
                    spellCheck={false}
                  />
                  {pasteContent && (
                    <button
                      type="button"
                      onClick={() => setPasteContent("")}
                      className="absolute right-2 top-2 rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                      title="清空"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <div className="flex items-start justify-between gap-2 text-xs text-slate-500">
                  <p className="flex-1">
                    支持标准 SVG 格式，可从 draw.io / Figma / Illustrator 导出后粘贴
                  </p>
                  <p className="whitespace-nowrap text-slate-400">
                    ⌘+Enter 导入
                  </p>
                </div>
              </div>

              {renderPreview()}

              {previewError && (
                <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{previewError}</span>
                </div>
              )}

              {uploadStatus.type !== "idle" && uploadStatus.type !== "success" && !previewError && (
                <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{uploadStatus.message}</span>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  取消
                </Button>
                <Button
                  type="button"
                  onClick={handlePasteImport}
                  disabled={!pasteContent.trim() || !!previewError}
                  className="gap-2"
                >
                  <FileCode className="h-4 w-4" />
                  导入并适配
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="upload" className="space-y-4">
              <div
                className={cn(
                  "relative flex min-h-[280px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed transition-all",
                  dragActive
                    ? "border-blue-500 bg-blue-50"
                    : uploadStatus.type === "success"
                    ? "border-green-300 bg-green-50"
                    : uploadStatus.type === "error"
                    ? "border-red-300 bg-red-50"
                    : "border-slate-300 bg-slate-50 hover:border-slate-400 hover:bg-slate-100"
                )}
                onDragEnter={handleDragIn}
                onDragLeave={handleDragOut}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="pointer-events-none flex flex-col items-center gap-3 text-center">
                  <div
                    className={cn(
                      "rounded-full p-4",
                      dragActive
                        ? "bg-blue-100"
                        : uploadStatus.type === "success"
                        ? "bg-green-100"
                        : uploadStatus.type === "error"
                        ? "bg-red-100"
                        : "bg-slate-200"
                    )}
                  >
                    {uploadStatus.type === "success" ? (
                      <CheckCircle2 className="h-8 w-8 text-green-600" />
                    ) : uploadStatus.type === "error" ? (
                      <AlertCircle className="h-8 w-8 text-red-600" />
                    ) : (
                      <Upload
                        className={cn("h-8 w-8", dragActive ? "text-blue-600" : "text-slate-500")}
                      />
                    )}
                  </div>

                  {uploadStatus.type === "success" ? (
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-green-800">{uploadStatus.message}</p>
                    </div>
                  ) : uploadStatus.type === "error" ? (
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-red-800">上传失败</p>
                      <p className="text-xs text-red-600">{uploadStatus.message}</p>
                      <p className="text-xs text-slate-500">点击重新选择文件</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-slate-700">
                        {dragActive ? "释放以上传文件" : "拖拽 SVG 文件到这里"}
                      </p>
                      <p className="text-xs text-slate-500">或点击选择文件</p>
                      <p className="mt-2 text-xs text-slate-400">支持 .svg 格式</p>
                    </div>
                  )}
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".svg,image/svg+xml"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>

              <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2.5 text-xs text-blue-800">
                <div className="flex items-start gap-2">
                  <Sparkles className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold mb-1">💡 温馨提示</p>
                    <ul className="space-y-0.5 pl-4 list-disc">
                      <li>导入的 SVG 会适配当前画布尺寸</li>
                      <li>复杂路径将保留，可编辑基础属性（颜色、描边等）</li>
                      <li>建议导入前在设计工具中优化 SVG 结构</li>
                      <li>超大文件可能影响编辑器性能</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  关闭
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </>
  );
}
