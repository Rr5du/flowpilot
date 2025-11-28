"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  Upload,
  FileCode,
  ClipboardPaste,
  X,
  CheckCircle2,
  AlertTriangle,
  Info,
  Sparkles,
  History,
  ZapOff,
  Eye,
  Download,
  Loader2,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useSvgEditor } from "@/contexts/svg-editor-context";
import { cn } from "@/lib/utils";

// 配置常量
const MAX_HEIGHT = 1200; // SVG 最大高度限制
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB 文件大小限制
const SUPPORTED_FORMATS = [".svg", "image/svg+xml"];

interface EnhancedSvgImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (svgContent: string, metadata?: ImportMetadata) => void;
}

interface ImportMetadata {
  name: string;
  type: "paste" | "upload";
  size?: number;
  dimensions?: { width: number; height: number };
}

interface ValidationResult {
  valid: boolean;
  error?: string;
  warning?: string;
  dimensions?: { width: number; height: number };
  elementCount?: number;
  fileSize?: number;
}

export function EnhancedSvgImportDialog({ 
  open, 
  onOpenChange, 
  onImport 
}: EnhancedSvgImportDialogProps) {
  const { importHistory } = useSvgEditor();
  
  // 状态管理
  const [activeTab, setActiveTab] = useState<"paste" | "upload">("paste");
  const [pasteContent, setPasteContent] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [validation, setValidation] = useState<ValidationResult>({ valid: false });
  const [showPreview, setShowPreview] = useState(false);
  
  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dragCounterRef = useRef(0);

  // 自动聚焦
  useEffect(() => {
    if (open && activeTab === "paste" && textareaRef.current) {
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [open, activeTab]);

  // 重置状态
  const resetState = useCallback(() => {
    setPasteContent("");
    setIsDragging(false);
    setIsProcessing(false);
    setValidation({ valid: false });
    setShowPreview(false);
    dragCounterRef.current = 0;
  }, []);

  // SVG 解析和验证
  const parseSvgDimensions = useCallback((content: string) => {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(content, "image/svg+xml");
      const svgEl = doc.querySelector("svg");
      
      if (!svgEl) return null;
      
      // 获取尺寸信息
      const width = svgEl.getAttribute("width");
      const height = svgEl.getAttribute("height");
      const viewBox = svgEl.getAttribute("viewBox");
      
      let parsedWidth: number | undefined;
      let parsedHeight: number | undefined;
      
      if (width && height) {
        parsedWidth = parseFloat(width.replace(/[^\d.-]/g, ""));
        parsedHeight = parseFloat(height.replace(/[^\d.-]/g, ""));
      } else if (viewBox) {
        const [, , vbWidth, vbHeight] = viewBox.split(/[\s,]+/).map(Number);
        parsedWidth = vbWidth;
        parsedHeight = vbHeight;
      }
      
      // 统计元素数量
      const elementCount = svgEl.querySelectorAll("*").length;
      
      return {
        width: parsedWidth,
        height: parsedHeight,
        elementCount,
      };
    } catch {
      return null;
    }
  }, []);

  const validateSvg = useCallback((content: string, size?: number): ValidationResult => {
    if (!content.trim()) {
      return { valid: false, error: "内容不能为空" };
    }

    if (!content.toLowerCase().includes("<svg")) {
      return { valid: false, error: "内容必须包含有效的 SVG 标签" };
    }

    // 文件大小检查
    if (size && size > MAX_FILE_SIZE) {
      return { 
        valid: false, 
        error: `文件大小 ${(size / 1024 / 1024).toFixed(1)}MB 超出限制，最大允许 ${MAX_FILE_SIZE / 1024 / 1024}MB` 
      };
    }

    const stats = parseSvgDimensions(content);
    if (!stats) {
      return { valid: false, error: "无法解析 SVG 结构，请检查格式" };
    }

    // 高度限制检查
    if (stats.height && stats.height > MAX_HEIGHT) {
      return {
        valid: false,
        error: `SVG 高度 ${Math.round(stats.height)}px 超出限制，最大允许 ${MAX_HEIGHT}px`,
        dimensions: { width: stats.width || 0, height: stats.height },
      };
    }

    // 复杂度警告
    let warning: string | undefined;
    if (stats.elementCount && stats.elementCount > 500) {
      warning = `SVG 包含 ${stats.elementCount} 个元素，可能影响编辑性能`;
    }

    return {
      valid: true,
      warning,
      dimensions: stats.width && stats.height ? { width: stats.width, height: stats.height } : undefined,
      elementCount: stats.elementCount,
      fileSize: size,
    };
  }, [parseSvgDimensions]);

  // 处理导入
  const handleImport = useCallback(async (
    content: string, 
    metadata: Omit<ImportMetadata, "dimensions"> = { name: "导入的 SVG", type: "paste" }
  ) => {
    setIsProcessing(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 100)); // 模拟处理时间
      
      const result = validateSvg(content, metadata.size);
      
      if (!result.valid) {
        setValidation(result);
        return;
      }

      const fullMetadata: ImportMetadata = {
        ...metadata,
        dimensions: result.dimensions,
      };

      onImport(content, fullMetadata);
      
      // 成功提示
      setValidation({ 
        valid: true, 
        warning: result.warning,
        dimensions: result.dimensions,
        elementCount: result.elementCount,
      });
      
      // 延迟关闭
      setTimeout(() => {
        onOpenChange(false);
        resetState();
      }, 800);
      
    } catch (error) {
      setValidation({
        valid: false,
        error: error instanceof Error ? error.message : "导入失败，请重试",
      });
    } finally {
      setIsProcessing(false);
    }
  }, [onImport, onOpenChange, resetState, validateSvg]);

  // 粘贴内容变化处理
  useEffect(() => {
    if (!pasteContent.trim()) {
      setValidation({ valid: false });
      setShowPreview(false);
      return;
    }

    const result = validateSvg(pasteContent);
    setValidation(result);
    setShowPreview(result.valid);
  }, [pasteContent, validateSvg]);

  // 粘贴导入
  const handlePasteImport = () => {
    handleImport(pasteContent, { name: "粘贴的 SVG", type: "paste" });
  };

  // 剪贴板快速粘贴
  const handleQuickPaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setPasteContent(text);
      }
    } catch {
      setValidation({
        valid: false,
        error: "无法访问剪贴板，请手动粘贴内容",
      });
    }
  };

  // 文件上传处理
  const handleFileRead = (file: File) => {
    if (!SUPPORTED_FORMATS.some(format => 
      file.type === format || file.name.toLowerCase().endsWith(format.replace("image/", "."))
    )) {
      setValidation({ 
        valid: false, 
        error: "请选择 SVG 格式文件" 
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      handleImport(content, { 
        name: file.name, 
        type: "upload", 
        size: file.size 
      });
    };
    
    reader.onerror = () => {
      setValidation({ 
        valid: false, 
        error: "文件读取失败，请重试" 
      });
    };
    
    reader.readAsText(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileRead(file);
    }
    e.target.value = ""; // 重置
  };

  // 拖拽处理
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current <= 0) {
      setIsDragging(false);
      dragCounterRef.current = 0;
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounterRef.current = 0;

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileRead(file);
    }
  };

  // 历史记录导入
  const handleHistoryImport = (historyItem: any) => {
    handleImport(historyItem.content, {
      name: `${historyItem.name} (历史)`,
      type: historyItem.type,
    });
  };

  // 对话框关闭处理
  const handleDialogChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetState();
    }
    onOpenChange(newOpen);
  };

  // 预览组件
  const PreviewSection = () => {
    if (!showPreview) return null;
    
    return (
      <div className="mt-4 rounded-lg border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-slate-600" />
            <span className="text-sm font-medium text-slate-700">实时预览</span>
          </div>
          {validation.dimensions && (
            <span className="text-xs text-slate-500 font-mono">
              {Math.round(validation.dimensions.width)} × {Math.round(validation.dimensions.height)}px
            </span>
          )}
        </div>
        
        <div className="relative h-40 rounded-md border border-dashed border-slate-200 bg-white overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center">
            <div 
              className="max-h-36 max-w-full pointer-events-none" 
              dangerouslySetInnerHTML={{ __html: pasteContent }} 
            />
          </div>
        </div>
        
        {validation.elementCount && (
          <div className="mt-2 text-xs text-slate-500">
            包含 {validation.elementCount} 个 SVG 元素
          </div>
        )}
      </div>
    );
  };

  // 状态指示器
  const StatusIndicator = () => {
    if (isProcessing) {
      return (
        <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
          <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
          <span className="text-sm text-blue-800">正在处理...</span>
        </div>
      );
    }

    if (validation.valid && !validation.warning) {
      return (
        <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <span className="text-sm text-green-800">格式验证通过</span>
        </div>
      );
    }

    if (validation.warning) {
      return (
        <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <span className="text-sm text-amber-800">{validation.warning}</span>
        </div>
      );
    }

    if (validation.error) {
      return (
        <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
          <ZapOff className="h-4 w-4 text-red-600" />
          <span className="text-sm text-red-800">{validation.error}</span>
        </div>
      );
    }

    return null;
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogContent className="w-[95vw] sm:max-w-[680px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100">
              <FileCode className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <span className="text-lg font-semibold">导入 SVG</span>
              <p className="text-sm font-normal text-slate-600 mt-1">
                支持粘贴代码或上传文件，自动适配画布尺寸
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "paste" | "upload")} className="w-full">
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

          {/* 历史记录部分 */}
          {importHistory.length > 0 && (
            <div className="mt-4 space-y-2">
              <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
                <History className="h-3.5 w-3.5" />
                最近导入
              </div>
              <div className="grid grid-cols-1 gap-2">
                {importHistory.slice(0, 3).map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleHistoryImport(item)}
                    className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
                  >
                    <div className="flex-1">
                      <div className="text-sm font-medium text-slate-700 truncate">
                        {item.name}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        {item.type === "paste" ? "粘贴" : "上传"} · 
                        {new Date(item.timestamp).toLocaleDateString()}
                        {item.stats && ` · ${item.stats.width}×${item.stats.height}px`}
                      </div>
                    </div>
                    <Download className="h-4 w-4 text-slate-400" />
                  </button>
                ))}
              </div>
            </div>
          )}

          <TabsContent value="paste" className="space-y-4 mt-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-slate-700">SVG 代码</label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleQuickPaste}
                  className="h-8 gap-1 text-xs"
                >
                  <ClipboardPaste className="h-3 w-3" />
                  从剪贴板粘贴
                </Button>
              </div>

              <div className="relative">
                <Textarea
                  ref={textareaRef}
                  placeholder="粘贴 SVG 代码到这里...&#10;&#10;支持从 Figma、draw.io、Illustrator 等工具导出的 SVG"
                  value={pasteContent}
                  onChange={(e) => setPasteContent(e.target.value)}
                  onKeyDown={(e) => {
                    if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && validation.valid) {
                      e.preventDefault();
                      handlePasteImport();
                    }
                  }}
                  className="min-h-[200px] max-h-[300px] resize-y font-mono text-xs leading-relaxed"
                  spellCheck={false}
                />
                {pasteContent && (
                  <button
                    type="button"
                    onClick={() => setPasteContent("")}
                    className="absolute right-3 top-3 rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              <div className="flex items-center justify-between text-xs">
                <div className="text-slate-500">
                  支持标准 SVG 格式，自动验证并适配画布
                </div>
                <div className="text-slate-400">
                  ⌘+Enter 快速导入
                </div>
              </div>

              <StatusIndicator />
              <PreviewSection />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                取消
              </Button>
              <Button
                type="button"
                onClick={handlePasteImport}
                disabled={!validation.valid || isProcessing}
                className="gap-2 min-w-[120px]"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    导入中...
                  </>
                ) : (
                  <>
                    <FileCode className="h-4 w-4" />
                    导入 SVG
                  </>
                )}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="upload" className="space-y-4 mt-4">
            <div
              className={cn(
                "relative min-h-[240px] border-2 border-dashed rounded-xl transition-all duration-200 cursor-pointer",
                isDragging
                  ? "border-blue-500 bg-blue-50 scale-[1.02]"
                  : validation.valid
                  ? "border-green-300 bg-green-50"
                  : validation.error
                  ? "border-red-300 bg-red-50"
                  : "border-slate-300 bg-slate-50 hover:border-slate-400 hover:bg-slate-100"
              )}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
                <div className={cn(
                  "rounded-full p-4 mb-4",
                  isDragging ? "bg-blue-100" : 
                  validation.valid ? "bg-green-100" :
                  validation.error ? "bg-red-100" : "bg-slate-200"
                )}>
                  {isProcessing ? (
                    <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
                  ) : validation.valid ? (
                    <CheckCircle2 className="h-8 w-8 text-green-600" />
                  ) : validation.error ? (
                    <ZapOff className="h-8 w-8 text-red-600" />
                  ) : (
                    <Upload className={cn(
                      "h-8 w-8",
                      isDragging ? "text-blue-600" : "text-slate-500"
                    )} />
                  )}
                </div>

                <div className="space-y-2">
                  {isProcessing ? (
                    <p className="text-sm font-semibold text-blue-800">正在处理文件...</p>
                  ) : validation.valid ? (
                    <div>
                      <p className="text-sm font-semibold text-green-800">文件导入成功！</p>
                      {validation.dimensions && (
                        <p className="text-xs text-green-600 mt-1">
                          尺寸：{Math.round(validation.dimensions.width)} × {Math.round(validation.dimensions.height)}px
                        </p>
                      )}
                    </div>
                  ) : validation.error ? (
                    <div>
                      <p className="text-sm font-semibold text-red-800">导入失败</p>
                      <p className="text-xs text-red-600 mt-1">{validation.error}</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm font-semibold text-slate-700">
                        {isDragging ? "释放文件以上传" : "拖拽 SVG 文件到这里"}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        或点击选择文件，支持 .svg 格式
                      </p>
                      <p className="text-xs text-slate-400 mt-2">
                        最大文件大小：{MAX_FILE_SIZE / 1024 / 1024}MB
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <StatusIndicator />

            {/* 功能提示 */}
            <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
              <div className="flex items-start gap-3">
                <Sparkles className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-blue-900">智能导入特性</h4>
                  <ul className="text-xs text-blue-800 space-y-1 list-disc list-inside">
                    <li>自动适配画布尺寸，保持原始比例</li>
                    <li>智能解析复杂路径和图形元素</li>
                    <li>支持渐变、滤镜等高级 SVG 特性</li>
                    <li>导入后可单独编辑颜色、描边等属性</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                关闭
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        <input
          ref={fileInputRef}
          type="file"
          accept={SUPPORTED_FORMATS.join(",")}
          onChange={handleFileChange}
          className="hidden"
        />
      </DialogContent>
    </Dialog>
  );
}
