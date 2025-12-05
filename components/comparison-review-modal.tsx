"use client";

import Image from "next/image";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    ComparisonHistoryEntry,
    ComparisonCardResult,
} from "@/types/comparison";
import { cn, decodeDiagramXml } from "@/lib/utils";
import { useMemo } from "react";

interface ComparisonReviewModalProps {
    entry: ComparisonHistoryEntry | null;
    onClose: () => void;
    buildPreviewUrl: (xml: string) => string | null;
    onPreviewResult?: (requestId: string, result: ComparisonCardResult) => void;
    onApplyResult?: (result: ComparisonCardResult) => void;
    onCopyXml?: (xml: string) => void;
    onDownloadResult?: (result: ComparisonCardResult) => void;
    onRetryResult?: (
        entry: ComparisonHistoryEntry,
        result: ComparisonCardResult
    ) => void;
    activePreview?: { requestId: string; resultId: string } | null;
}

function PreviewPanel({
    result,
    entry,
    buildPreviewUrl,
    onPreviewResult,
    onApplyResult,
    onCopyXml,
    onDownloadResult,
    onRetryResult,
    isActivePreview,
}: {
    result: ComparisonCardResult;
    entry: ComparisonHistoryEntry;
    buildPreviewUrl: (xml: string) => string | null;
    onPreviewResult?: (requestId: string, result: ComparisonCardResult) => void;
    onApplyResult?: (result: ComparisonCardResult) => void;
    onCopyXml?: (xml: string) => void;
    onDownloadResult?: (result: ComparisonCardResult) => void;
    onRetryResult?: (
        entry: ComparisonHistoryEntry,
        result: ComparisonCardResult
    ) => void;
    isActivePreview?: boolean;
}) {
    const trimmedEncodedXml = result.encodedXml?.trim();
    const trimmedXml = result.xml?.trim();
    const rawXmlForPreview =
        trimmedEncodedXml && trimmedEncodedXml.length > 0
            ? trimmedEncodedXml
            : trimmedXml && trimmedXml.length > 0
            ? trimmedXml
            : "";
    const previewUrl =
        result.status === "ok" &&
        rawXmlForPreview &&
        buildPreviewUrl
            ? buildPreviewUrl(rawXmlForPreview)
            : null;
    const previewSvg = result.previewSvg?.trim();
    const hasPreviewSvg = Boolean(previewSvg);
    const hasPreviewImage = Boolean(result.previewImage?.trim());
    const normalizedXml = useMemo(() => {
        if (result.xml?.trim()) {
            return result.xml.trim();
        }
        if (result.encodedXml?.trim()) {
            return decodeDiagramXml(result.encodedXml.trim()) ?? "";
        }
        return "";
    }, [result.encodedXml, result.xml]);
    const diagramStats = useMemo(() => {
        if (!normalizedXml) {
            return null;
        }
        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(normalizedXml, "text/xml");
            const root = doc.querySelector("root");
            if (!root) {
                return null;
            }
            let nodes = 0;
            let edges = 0;
            root.querySelectorAll("mxCell").forEach((cell) => {
                const isVertex = cell.getAttribute("vertex") === "1";
                const isEdge = cell.getAttribute("edge") === "1";
                if (isVertex) {
                    nodes += 1;
                } else if (isEdge) {
                    edges += 1;
                }
            });
            return { nodes, edges };
        } catch (error) {
            console.warn("Failed to parse xml stats", error);
            return null;
        }
    }, [normalizedXml]);
    const statusLabel =
        result.status === "ok"
            ? isActivePreview
                ? "预览中"
                : "生成成功"
            : result.status === "loading"
                ? "正在生成"
                : result.status === "cancelled"
                    ? "已暂停"
                    : "生成失败";
    const statusTone =
        result.status === "ok"
            ? "text-emerald-600 bg-emerald-50 border-emerald-200"
            : result.status === "loading"
                ? "text-slate-500 bg-slate-100 border-slate-200"
                : result.status === "cancelled"
                    ? "text-amber-600 bg-amber-50 border-amber-200"
                    : "text-rose-600 bg-rose-50 border-rose-200";
    const cardSurface =
        result.status === "ok"
            ? "border-slate-200 bg-white"
            : result.status === "loading"
                ? "border-slate-200 bg-slate-50"
                : result.status === "cancelled"
                    ? "border-amber-200 bg-amber-50/70"
                    : "border-rose-200 bg-rose-50/70";

    return (
        <div
            className={cn(
                "flex min-h-[36rem] flex-col gap-5 rounded-[32px] border bg-white p-6 shadow-lg shadow-slate-950/5 transition",
                cardSurface
            )}
        >
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <span
                            className={cn(
                                "inline-flex items-center rounded-full border px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.28em]",
                                result.slot === "A"
                                    ? "border-emerald-200 bg-emerald-50 text-emerald-600"
                                    : "border-blue-200 bg-blue-50 text-blue-600"
                            )}
                        >
                            模型 {result.slot}
                        </span>
                        <span
                            className={cn(
                                "inline-flex items-center rounded-full border px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.24em]",
                                statusTone
                            )}
                        >
                            {statusLabel}
                        </span>
                    </div>
                    <div className="text-lg font-semibold text-slate-900">
                        {result.label || result.modelId}
                    </div>
                    {result.provider && (
                        <div className="text-xs uppercase tracking-[0.28em] text-slate-500">
                            Provider · {result.provider}
                        </div>
                    )}
                </div>
                {diagramStats ? (
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                        <span className="rounded-full border border-slate-200 px-3 py-1 text-slate-600">
                            节点 {diagramStats.nodes}
                        </span>
                        <span className="rounded-full border border-slate-200 px-3 py-1 text-slate-600">
                            连线 {diagramStats.edges}
                        </span>
                    </div>
                ) : null}
            </div>

            <div className="flex-1 rounded-[28px] border border-dashed border-slate-200 bg-slate-50/70 p-1.5">
                <div className="relative flex h-[200px] w-full justify-center overflow-hidden rounded-[24px] bg-white shadow-inner">
                    <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-between px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                        <span>{entry.prompt ? "预览快照" : "生成快照"}</span>
                        {isActivePreview && (
                            <span className="text-emerald-500">画布预览中</span>
                        )}
                    </div>
                    {result.status === "ok" ? (
                        hasPreviewSvg ? (
                            <div 
                                className="h-full w-full flex items-center justify-center p-4"
                                dangerouslySetInnerHTML={{ __html: previewSvg ?? "" }}
                            />
                        ) : hasPreviewImage ? (
                            <div className="relative h-full w-full">
                                <Image
                                    src={result.previewImage ?? ""}
                                    alt={`comparison-preview-${result.id}`}
                                    fill
                                    className="object-cover"
                                    sizes="(max-width: 768px) 100vw, 400px"
                                    unoptimized
                                />
                            </div>
                        ) : previewUrl ? (
                            <iframe
                                src={previewUrl}
                                title={`comparison-preview-${result.id}`}
                                className="h-full w-full border-0"
                                loading="lazy"
                                allowFullScreen
                            />
                        ) : (
                            <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">
                                暂无预览
                            </div>
                        )
                    ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">
                            {result.status === "loading"
                                ? "正在生成预览…"
                                : result.error ?? "无法生成预览"}
                        </div>
                    )}
                </div>
            </div>

            <div className="space-y-3">

                <div className="flex flex-wrap items-center gap-2">
                    {result.status === "ok" ? (
                        <>
                            <Button
                                size="sm"
                                variant="secondary"
                                className="rounded-full px-4"
                                onClick={() =>
                                    onPreviewResult?.(entry.requestId, result)
                                }
                            >
                                {isActivePreview ? "退出预览" : "画布预览"}
                            </Button>
                            <Button
                                size="sm"
                                className="rounded-full px-4"
                                disabled={!result.xml}
                                onClick={() => result.xml && onApplyResult?.(result)}
                            >
                                设为画布
                            </Button>
                        </>
                    ) : (
                        <Button
                            size="sm"
                            variant="outline"
                            className="rounded-full px-4"
                            onClick={() => onRetryResult?.(entry, result)}
                        >
                            重新生成
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}

export function ComparisonReviewModal({
    entry,
    onClose,
    buildPreviewUrl,
    onPreviewResult,
    onApplyResult,
    onCopyXml,
    onDownloadResult,
    onRetryResult,
    activePreview,
}: ComparisonReviewModalProps) {
    const open = Boolean(entry);

    return (
        <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
            <DialogContent className="w-[106vw] max-w-[1360px]">
                {entry ? (
                    <>
                        <DialogHeader>
                            <DialogTitle>模型对比详情</DialogTitle>
                            <DialogDescription>
                                快速对照两个模型的输出，并记录你自己的观察。
                            </DialogDescription>
                        </DialogHeader>
                        <div className="flex flex-col gap-6">
                            <details className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm text-slate-600 transition">
                                <summary className="cursor-pointer list-none text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                                    提示词
                                </summary>
                                <div className="mt-3 whitespace-pre-wrap leading-relaxed text-slate-700">
                                    {entry.prompt}
                                </div>
                            </details>
                            <ScrollArea className="max-h-[80vh]">
                                <div className="grid gap-6 xl:grid-cols-2">
                                    {entry.results.map((result) => (
                                        <PreviewPanel
                                            key={result.id}
                                            entry={entry}
                                            result={result}
                                            buildPreviewUrl={buildPreviewUrl}
                                            onPreviewResult={onPreviewResult}
                                            onApplyResult={onApplyResult}
                                            onCopyXml={onCopyXml}
                                            onDownloadResult={onDownloadResult}
                                            onRetryResult={onRetryResult}
                                            isActivePreview={
                                                activePreview?.requestId ===
                                                    entry.requestId &&
                                                activePreview?.resultId === result.id
                                            }
                                        />
                                    ))}
                                </div>
                            </ScrollArea>
                        </div>
                        <DialogFooter className="mt-4">
                            <Button variant="outline" onClick={onClose}>
                                关闭
                            </Button>
                        </DialogFooter>
                    </>
                ) : null}
            </DialogContent>
        </Dialog>
    );
}
