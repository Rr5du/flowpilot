"use client";

import { useMemo } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
    Image as ImageIcon,
    Download,
} from "lucide-react";

interface DiagramResult {
    id: string;
    type: "svg" | "diagram";
    content: string;
    xml?: string;
    svg?: string;
}

interface DiagramGalleryDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    diagramResults: Map<string, any>;
    version?: number;
}

export function DiagramGalleryDialog({
    open,
    onOpenChange,
    diagramResults,
    version = 0,
}: DiagramGalleryDialogProps) {
    // 提取所有的图表
    const diagrams = useMemo(() => {
        const results: DiagramResult[] = [];

        diagramResults.forEach((data, id) => {
            if (data.svg || data.xml) {
                results.push({
                    id,
                    type: data.mode === "svg" ? "svg" : "diagram",
                    content: data.svg || data.xml,
                    xml: data.xml,
                    svg: data.svg,
                });
            } else {
                console.warn("Diagram entry missing content:", id, data);
            }
        });
        console.log("Diagrams found:", results.length);
        return results.reverse(); // 最新的在前面
    }, [diagramResults, version]);

    const handleDownload = (diagram: DiagramResult) => {
        const content = diagram.type === "svg" ? diagram.svg || diagram.content : diagram.xml || diagram.content;
        const blob = new Blob([content], {
            type: diagram.type === "svg" ? "image/svg+xml" : "application/xml"
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `diagram-${diagram.id}.${diagram.type === "svg" ? "svg" : "xml"}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[80vh]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <ImageIcon className="h-5 w-5" />
                        图表画廊 ({diagrams.length})
                    </DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto">
                    {diagrams.length === 0 ? (
                        <div className="text-center p-8 text-gray-500">
                            <ImageIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                            <p className="text-sm">本次对话还没有生成图表</p>
                            <p className="text-xs text-gray-400 mt-1">
                                向 AI 发送绘图请求后，图表会显示在这里
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-2">
                            {diagrams.map((diagram, index) => (
                                <div
                                    key={diagram.id}
                                    className="group relative border rounded-xl overflow-hidden hover:border-gray-300 transition-all bg-white"
                                >
                                    <div className="aspect-square bg-gray-50 flex items-center justify-center p-4">
                                        {diagram.type === "svg" && diagram.svg ? (
                                            <div
                                                className="w-full h-full"
                                                dangerouslySetInnerHTML={{ __html: diagram.svg }}
                                            />
                                        ) : (
                                            <div className="w-full h-full bg-white rounded border flex items-center justify-center text-xs text-gray-500">
                                                DrawIO XML
                                            </div>
                                        )}
                                    </div>

                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                        <Button
                                            size="sm"
                                            variant="secondary"
                                            onClick={() => handleDownload(diagram)}
                                        >
                                            <Download className="h-4 w-4" />
                                        </Button>
                                    </div>

                                    <div className="absolute bottom-2 left-2 right-2">
                                        <div className="bg-white/90 backdrop-blur-sm rounded px-2 py-1 text-xs text-gray-600">
                                            图表 #{diagrams.length - index}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
