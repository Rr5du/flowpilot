"use client";
import React, { useState, useEffect } from "react";
import { DrawIoEmbed } from "react-drawio";
import ChatPanelOptimized from "@/components/chat-panel-optimized";
import { useDiagram } from "@/contexts/diagram-context";
import { useLocale } from "@/contexts/locale-context";
import { cn } from "@/lib/utils";
import { MessageSquare, Minimize2 } from "lucide-react";
import { useDrawioDiagnostics } from "@/hooks/use-drawio-diagnostics";
import { WorkspaceNav } from "@/components/workspace-nav";

export default function Home() {
    const { drawioRef, handleDiagramExport, setRuntimeError } = useDiagram();
    const { t } = useLocale();
    const [isMobile, setIsMobile] = useState(false);
    const [drawioError, setDrawioError] = useState<string | null>(null);
    const [isDrawioLoading, setIsDrawioLoading] = useState(true);
    const [isChatVisible, setIsChatVisible] = useState(true);

    // 可配置的 DrawIO baseUrl，支持环境变量或使用默认值
    // 如果 embed.diagrams.net 无法访问，可以尝试：
    // - https://app.diagrams.net (官方备用地址)
    // - 或者使用本地部署的 draw.io
    const drawioBaseUrl = "https://embed.diagrams.net ";

    useDrawioDiagnostics({
        baseUrl: drawioBaseUrl,
        onRuntimeError: (payload) => {
            setRuntimeError(payload);
        },
        onRuntimeSignal: (event) => {
            if (event?.event === "load") {
                setRuntimeError(null);
            }
        },
    });

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };

        // Check on mount
        checkMobile();

        // Add event listener for resize
        window.addEventListener("resize", checkMobile);

        // Cleanup
        return () => window.removeEventListener("resize", checkMobile);
    }, []);

    // 监听 DrawIO 加载超时
    useEffect(() => {
        // 设置超时检测 - 如果 15 秒后仍未加载成功，显示错误
        const timeout = setTimeout(() => {
            if (isDrawioLoading) {
                setDrawioError(t("drawio.loadTimeout"));
                setIsDrawioLoading(false);
            }
        }, 15000); // 15秒超时

        return () => {
            clearTimeout(timeout);
        };
    }, [isDrawioLoading, t]);

    const handleDrawioLoad = () => {
        setIsDrawioLoading(false);
        setDrawioError(null);
    };

    if (isMobile) {
        return (
            <div className="flex h-screen flex-col bg-gray-100">
                <WorkspaceNav />
                <div className="flex flex-1 items-center justify-center px-6">
                    <div className="text-center rounded-2xl border border-gray-200 bg-white/90 p-8 shadow-sm">
                        <h1 className="text-2xl font-semibold text-gray-800">
                            {t("workspace.mobileWarning")}
                        </h1>
                        <p className="mt-2 text-sm text-gray-500">
                            {t("workspace.mobileHint")}
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    const desktopGridCols = isChatVisible
        ? "lg:grid-cols-[minmax(0,68%)_minmax(360px,1fr)]"
        : "lg:grid-cols-[minmax(0,1fr)_0px]";

    return (
        <div className="flex h-screen flex-col bg-gray-100">
            <WorkspaceNav />
            <div
                className={cn(
                    "flex-1 lg:grid",
                    desktopGridCols
                )}
            >
                <div className="relative h-full min-h-0 p-1">
                <div
                    className={cn(
                        "pointer-events-none",
                        isChatVisible
                            ? "absolute right-4 top-4 z-30"
                            : "fixed right-6 top-24 z-40"
                    )}
                >
                    <button
                        type="button"
                        aria-label={isChatVisible ? t("workspace.focusCanvas") : t("workspace.showChat")}
                        onClick={() => setIsChatVisible((prev) => !prev)}
                        className={cn(
                            "pointer-events-auto inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium transition",
                            isChatVisible
                                ? "border-gray-200 bg-white/90 text-gray-700 shadow-sm hover:bg-white"
                                : "border-blue-500 bg-blue-600 text-white shadow-lg hover:bg-blue-500/90"
                        )}
                    >
                        {isChatVisible ? (
                            <>
                                <Minimize2 className="h-3.5 w-3.5" />
                                {t("workspace.focusCanvas")}
                            </>
                        ) : (
                            <>
                                <MessageSquare className="h-3.5 w-3.5" />
                                {t("workspace.showChat")}
                            </>
                        )}
                    </button>
                </div>
                {drawioError ? (
                    <div className="flex items-center justify-center h-full bg-white rounded border-2 border-red-200">
                        <div className="text-center p-8 max-w-md">
                            <h2 className="text-xl font-semibold text-red-600 mb-4">
                                {t("drawio.loadFailed")}
                            </h2>
                            <p className="text-gray-700 mb-4">{drawioError}</p>
                            <div className="text-sm text-gray-600 text-left bg-gray-50 p-4 rounded">
                                <p className="font-semibold mb-2">{t("drawio.solutions")}</p>
                                <ol className="list-decimal list-inside space-y-1">
                                    <li>{t("drawio.solution1")}</li>
                                    <li>{t("drawio.solution2")}</li>
                                    <li className="ml-4 font-mono text-xs bg-white p-2 rounded mt-2">
                                        NEXT_PUBLIC_DRAWIO_BASE_URL=https://app.diagrams.net
                                    </li>
                                    <li>{t("drawio.solution3")}</li>
                                </ol>
                            </div>
                        </div>
                    </div>
                ) : (
                    <>
                        {isDrawioLoading && (
                            <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 z-10">
                                <div className="text-center">
                                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                                    <p className="text-gray-600">{t("drawio.loadingEditor")}</p>
                                </div>
                            </div>
                        )}
                        <DrawIoEmbed
                            ref={drawioRef}
                            baseUrl={drawioBaseUrl}
                            onExport={handleDiagramExport}
                            onLoad={handleDrawioLoad}
                            urlParameters={{
                                spin: true,
                                libraries: false,
                                saveAndExit: false,
                                noExitBtn: true,
                            }}
                        />
                    </>
                )}
                </div>
                <div
                    className={cn(
                        "hidden h-full min-h-0 p-1 transition-all duration-300 lg:block",
                        isChatVisible
                            ? "opacity-100"
                            : "pointer-events-none opacity-0 translate-x-4"
                    )}
                >
                    <ChatPanelOptimized
                        onCollapse={() => setIsChatVisible(false)}
                        isCollapsible
                    />
                </div>
            </div>
        </div>
    );
}
