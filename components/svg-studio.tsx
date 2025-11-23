"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
    MousePointer2,
    Square,
    Circle,
    Minus,
    Plus,
    Type,
    Upload,
    Eraser,
    Copy,
    Eye,
    EyeOff,
    Lock,
    Unlock,
    Grid,
    AlignStartHorizontal,
    AlignCenterHorizontal,
    AlignEndHorizontal,
    AlignStartVertical,
    AlignCenterVertical,
    ArrowDownToLine,
    RotateCcw,
    RotateCw,
} from "lucide-react";
import { useSvgEditor, SvgElement, SvgTool } from "@/contexts/svg-editor-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type DraftShape =
    | {
        mode: "rect" | "ellipse" | "line";
        start: { x: number; y: number };
        current: { x: number; y: number };
        startSnap?: SnapAttach | null;
        endSnap?: SnapAttach | null;
    }
    | null;

type SnapAttach = { elementId: string; x: number; y: number };

type PointerDrag =
    | {
        id: string;
        start: { x: number; y: number };
    }
    | null;

type ResizeHandle =
    | "n"
    | "s"
    | "e"
    | "w"
    | "ne"
    | "nw"
    | "se"
    | "sw";

const TOOL_CONFIG: Array<{
    id: SvgTool;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
}> = [
        { id: "select", label: "选择", icon: MousePointer2 },
        { id: "rect", label: "矩形", icon: Square },
        { id: "ellipse", label: "圆/椭圆", icon: Circle },
        { id: "line", label: "线条", icon: Minus },
        { id: "text", label: "文本", icon: Type },
    ];

const GRID_SIZE = 12;
const SNAP_RADIUS = 14;
const ZOOM_MIN = 0.2;
const ZOOM_MAX = 8;
const ZOOM_STEP = 0.1;

function getBounds(element: SvgElement): { x: number; y: number; width: number; height: number } | null {
    const applyTransform = (
        bounds: { x: number; y: number; width: number; height: number },
        transform?: { x?: number; y?: number; scaleX?: number; scaleY?: number }
    ) => {
        if (!transform) return bounds;
        const scaleX = transform.scaleX ?? 1;
        const scaleY = transform.scaleY ?? transform.scaleX ?? 1;
        return {
            x: (bounds.x + (transform.x ?? 0)) * scaleX,
            y: (bounds.y + (transform.y ?? 0)) * scaleY,
            width: bounds.width * scaleX,
            height: bounds.height * scaleY,
        };
    };

    switch (element.type) {
        case "rect":
            return applyTransform(
                {
                    x: element.x,
                    y: element.y,
                    width: element.width,
                    height: element.height,
                },
                element.transform
            );
        case "ellipse":
            return applyTransform(
                {
                    x: element.cx - element.rx,
                    y: element.cy - element.ry,
                    width: element.rx * 2,
                    height: element.ry * 2,
                },
                element.transform
            );
        case "line": {
            const x1 = (element.x1 + (element.transform?.x ?? 0)) * (element.transform?.scaleX ?? 1);
            const x2 = (element.x2 + (element.transform?.x ?? 0)) * (element.transform?.scaleX ?? 1);
            const y1 = (element.y1 + (element.transform?.y ?? 0)) * (element.transform?.scaleY ?? element.transform?.scaleX ?? 1);
            const y2 = (element.y2 + (element.transform?.y ?? 0)) * (element.transform?.scaleY ?? element.transform?.scaleX ?? 1);
            const padding = (element.strokeWidth || 2) / 2;
            return {
                x: Math.min(x1, x2) - padding,
                y: Math.min(y1, y2) - padding,
                width: Math.abs(x2 - x1) + padding * 2,
                height: Math.abs(y2 - y1) + padding * 2,
            };
        }
        case "text":
            return applyTransform(
                {
                    x: element.x,
                    y: element.y - (element.fontSize || 16),
                    width: Math.max((element.text?.length || 1) * (element.fontSize || 16) * 0.5, 10),
                    height: element.fontSize || 16,
                },
                element.transform
            );
        default:
            return null;
    }
}

function transformStyle(element: SvgElement) {
    if (!element.transform) return undefined;
    const parts: string[] = [];
    if (element.transform.x || element.transform.y) {
        parts.push(`translate(${element.transform.x || 0} ${element.transform.y || 0})`);
    }
    if (element.transform.scaleX || element.transform.scaleY) {
        const sx = element.transform.scaleX ?? 1;
        const sy = element.transform.scaleY ?? sx;
        parts.push(`scale(${sx} ${sy})`);
    }
    if (element.transform.rotation) {
        parts.push(`rotate(${element.transform.rotation})`);
    }
    return parts.length > 0 ? parts.join(" ") : undefined;
}

export function SvgStudio() {
    const {
        doc,
        elements,
        tool,
        setTool,
        updateDoc,
        selectedId,
        setSelectedId,
        selectedIds,
        setSelectedIds,
        addElement,
        updateElement,
        moveElement,
        removeElement,
        duplicateElement,
        exportSvgMarkup,
        loadSvgMarkup,
        clearSvg,
        history,
        undo,
        redo,
        commitSnapshot,
        duplicateMany,
        removeMany,
        defsMarkup,
    } = useSvgEditor();
    const svgRef = useRef<SVGSVGElement | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const [draft, setDraft] = useState<DraftShape>(null);
    const [dragging, setDragging] = useState<PointerDrag>(null);
    const [isMarqueeSelecting, setIsMarqueeSelecting] = useState(false);
    const marqueeStartRef = useRef<{ x: number; y: number } | null>(null);
    const [marqueeRect, setMarqueeRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
    const [snapEnabled, setSnapEnabled] = useState(true);
    const [activeHandle, setActiveHandle] = useState<ResizeHandle | null>(null);
    const elementRefs = useRef<Record<string, SVGGraphicsElement | null>>({});
    const [measuredBounds, setMeasuredBounds] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
    const resizeOriginRef = useRef<{
        handle: ResizeHandle;
        start: { x: number; y: number };
        bbox: { x: number; y: number; width: number; height: number };
        elementId: string;
        snapshot: SvgElement;
    } | null>(null);
    const [canvasWidthInput, setCanvasWidthInput] = useState<string>(() => doc.width.toString());
    const [canvasHeightInput, setCanvasHeightInput] = useState<string>(() => doc.height.toString());
    const [zoom, setZoom] = useState(1);
    const dragLastPointRef = useRef<{ x: number; y: number } | null>(null);
    const dragAppliedPointRef = useRef<{ x: number; y: number } | null>(null);
    const dragRafRef = useRef<number | null>(null);
    const resizePointerRef = useRef<{ x: number; y: number } | null>(null);
    const resizeRafRef = useRef<number | null>(null);
    const selectedIdsRef = useRef<Set<string>>(selectedIds);
    const selectedIdRef = useRef<string | null>(selectedId);
    const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
    const [isSpacePressed, setIsSpacePressed] = useState(false);
    const isPanningRef = useRef(false);
    const [isPanning, setIsPanning] = useState(false);
    const panStartRef = useRef<{ x: number; y: number } | null>(null);
    const [panCursor, setPanCursor] = useState(false);
    const [snapIndicator, setSnapIndicator] = useState<{ x: number; y: number } | null>(null);
    const [hoveredElementId, setHoveredElementId] = useState<string | null>(null);
    const lineHandleDragRef = useRef<{
        id: string;
        mode: "start" | "end" | "move";
        startPointer: { x: number; y: number };
        original: { x1: number; y1: number; x2: number; y2: number };
    } | null>(null);

    const snapValue = (value: number) =>
        snapEnabled ? Math.round(value / GRID_SIZE) * GRID_SIZE : value;
    const clampZoom = (value: number) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, value));
    const changeZoom = (delta: number) => setZoom((prev) => clampZoom(prev + delta));

    const canvasPoint = (event: React.PointerEvent | PointerEvent) => {
        const svg = svgRef.current;
        if (!svg) return { x: 0, y: 0 };
        const rect = svg.getBoundingClientRect();
        const x = (event.clientX - rect.left - pan.x) / zoom;
        const y = (event.clientY - rect.top - pan.y) / zoom;
        return { x: snapValue(x), y: snapValue(y) };
    };

    useEffect(() => {
        selectedIdsRef.current = selectedIds;
    }, [selectedIds]);

    useEffect(() => {
        selectedIdRef.current = selectedId;
    }, [selectedId]);

    useEffect(() => {
        setCanvasWidthInput(doc.width.toString());
    }, [doc.width]);

    useEffect(() => {
        setCanvasHeightInput(doc.height.toString());
    }, [doc.height]);

    const getElementBoundsWithRef = React.useCallback(
        (el: SvgElement) => {
            // Prefer math-based bounds for primitives to avoid lag
            if (el.type === "rect" || el.type === "ellipse" || el.type === "line") {
                const bounds = getBounds(el);
                if (bounds) return bounds;
            }

            const node = elementRefs.current[el.id];
            if (node && "getBBox" in node) {
                try {
                    const box = (node as SVGGraphicsElement).getBBox();
                    return { x: box.x, y: box.y, width: box.width, height: box.height };
                } catch {
                    // fall through
                }
            }
            return getBounds(el);
        },
        []
    );

    const getAnchorPoints = React.useCallback(
        (el: SvgElement) => {
            if (el.type === "line") return [];
            const bounds = getElementBoundsWithRef(el);
            if (!bounds) return [];
            const { x, y, width, height } = bounds;
            const cx = x + width / 2;
            const cy = y + height / 2;
            return [
                { x: cx, y },
                { x: cx, y: y + height },
                { x, y: cy },
                { x: x + width, y: cy },
                { x: cx, y: cy },
            ];
        },
        [getElementBoundsWithRef]
    );

    useEffect(() => {
        const targetId = selectedId || (selectedIds.size === 1 ? Array.from(selectedIds)[0] : null);
        if (!targetId) {
            setMeasuredBounds(null);
            return;
        }
        const element = elements.find((item) => item.id === targetId);
        if (!element) {
            setMeasuredBounds(null);
            return;
        }
        const bounds = getElementBoundsWithRef(element);
        setMeasuredBounds(bounds);
    }, [selectedId, selectedIds, elements, getElementBoundsWithRef]);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            const active = document.activeElement as HTMLElement | null;
            const inInput =
                active &&
                (active.tagName === "INPUT" ||
                    active.tagName === "TEXTAREA" ||
                    active.tagName === "SELECT" ||
                    active.isContentEditable);
            if (inInput) return;
            if (event.code === "Space") {
                setIsSpacePressed(true);
                setPanCursor(true);
            }
        };
        const handleKeyUp = (event: KeyboardEvent) => {
            if (event.code === "Space") {
                setIsSpacePressed(false);
                setPanCursor(false);
                isPanningRef.current = false;
                panStartRef.current = null;
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        window.addEventListener("keyup", handleKeyUp);
        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            window.removeEventListener("keyup", handleKeyUp);
        };
        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            window.removeEventListener("keyup", handleKeyUp);
        };
    }, []);

    // Initial Zoom Effect
    useEffect(() => {
        // Fit to 70% height
        const vh = window.innerHeight;
        const targetHeight = vh * 0.7;
        const contentHeight = doc.height || 800; // Fallback
        const initialZoom = Math.min(1, targetHeight / contentHeight);

        // Center it
        const vw = window.innerWidth; // Approximation, better to use container ref but window is ok for initial
        const contentWidth = doc.width || 1200;

        // We can't easily get container dim here without ref, so we'll just center based on window for now
        // or just set a reasonable default.
        // Let's try to center the document content (0,0 to width,height) in the view.

        setZoom(initialZoom);
        setPan({
            x: (vw - contentWidth * initialZoom) / 2,
            y: (vh - contentHeight * initialZoom) / 2
        });
    }, []); // Run once on mount

    const findSnapAnchor = (point: { x: number; y: number }): SnapAttach | null => {
        let best: SnapAttach | null = null;
        let bestDist = Infinity;
        elements.forEach((el) => {
            if (el.visible === false || el.locked) return;
            if (el.type === "line") return;
            const anchors = getAnchorPoints(el);
            anchors.forEach((anchor) => {
                const dx = anchor.x - point.x;
                const dy = anchor.y - point.y;
                const dist2 = dx * dx + dy * dy;
                if (dist2 < bestDist && dist2 <= SNAP_RADIUS * SNAP_RADIUS) {
                    bestDist = dist2;
                    best = { elementId: el.id, x: anchor.x, y: anchor.y };
                }
            });
        });
        return best;
    };

    const beginLineHandleDrag = (line: SvgElement & { type: "line" }, mode: "start" | "end" | "move", event: React.PointerEvent) => {
        event.stopPropagation();
        event.preventDefault();
        commitSnapshot();
        lineHandleDragRef.current = {
            id: line.id,
            mode,
            startPointer: canvasPoint(event),
            original: { x1: line.x1, y1: line.y1, x2: line.x2, y2: line.y2 },
        };
    };

    // Removed old handleWheel as it's now attached via ref
    // const handleWheel = ...

    useEffect(() => {
        const applyDragFrame = () => {
            dragRafRef.current = null;
            if (!dragging) return;
            if (!dragging) return;
            // if (isPanningRef.current) return; // Allow dragging while panning? No, usually mutually exclusive.
            // Actually, isPanningRef check is good.
            const last = dragLastPointRef.current;
            const applied = dragAppliedPointRef.current;
            if (!last || !applied) return;
            const dx = last.x - applied.x;
            const dy = last.y - applied.y;
            if (dx === 0 && dy === 0) return;
            const ids =
                selectedIdsRef.current.size > 0
                    ? Array.from(selectedIdsRef.current)
                    : selectedIdRef.current
                        ? [selectedIdRef.current]
                        : [];
            ids.forEach((id) => moveElement(id, dx, dy, { record: false }));
            dragAppliedPointRef.current = last;
        };

        const scheduleDragFrame = () => {
            if (dragRafRef.current !== null) return;
            dragRafRef.current = requestAnimationFrame(applyDragFrame);
        };

        const handleMove = (event: PointerEvent) => {
            if (isPanningRef.current) {
                const start = panStartRef.current;
                if (!start) return;
                setPan((prev) => ({
                    x: prev.x + event.clientX - start.x,
                    y: prev.y + event.clientY - start.y,
                }));
                panStartRef.current = { x: event.clientX, y: event.clientY };
                return;
            }
            if (isMarqueeSelecting) {
                const start = marqueeStartRef.current;
                if (!start) return;
                const { x, y } = canvasPoint(event);
                const rect = {
                    x: Math.min(start.x, x),
                    y: Math.min(start.y, y),
                    width: Math.abs(x - start.x),
                    height: Math.abs(y - start.y),
                };
                setMarqueeRect(rect);
                const next = new Set<string>();
                const margin = 4;
                elements.forEach((el) => {
                    if (el.visible === false) return;
                    const bounds = getElementBoundsWithRef(el);
                    if (!bounds) return;
                    const intersects =
                        bounds.x - margin <= rect.x + rect.width &&
                        bounds.x + bounds.width + margin >= rect.x &&
                        bounds.y - margin <= rect.y + rect.height &&
                        bounds.y + bounds.height + margin >= rect.y;
                    if (intersects) {
                        next.add(el.id);
                    }
                });
                setSelectedIds(next);
                setSelectedId(next.size === 1 ? Array.from(next)[0] : null);
                return;
            }
            if (!dragging) {
                // Global hover detection
                const target = document.elementFromPoint(event.clientX, event.clientY);
                let foundId: string | null = null;
                if (target) {
                    // Traverse up to find if we hit an element
                    let current: Element | null = target;
                    while (current && current !== svgRef.current) {
                        // Check if this node corresponds to a known element
                        const id = Object.keys(elementRefs.current).find(
                            key => elementRefs.current[key] === current
                        );
                        if (id) {
                            foundId = id;
                            break;
                        }
                        current = current.parentElement;
                    }
                }
                setHoveredElementId(foundId);
                return;
            }
            dragLastPointRef.current = canvasPoint(event);
            scheduleDragFrame();
        };

        const handleUp = () => {
            isPanningRef.current = false;
            setIsPanning(false);
            panStartRef.current = null;
            if (isMarqueeSelecting) {
                setIsMarqueeSelecting(false);
                setMarqueeRect(null);
                marqueeStartRef.current = null;
            }
            setDragging(null);
            setSnapIndicator(null);
            dragLastPointRef.current = null;
            dragAppliedPointRef.current = null;
            if (dragRafRef.current !== null) {
                cancelAnimationFrame(dragRafRef.current);
                dragRafRef.current = null;
            }
        };

        window.addEventListener("pointermove", handleMove);
        window.addEventListener("pointerup", handleUp);
        window.addEventListener("pointercancel", handleUp);
        return () => {
            window.removeEventListener("pointermove", handleMove);
            window.removeEventListener("pointerup", handleUp);
            window.removeEventListener("pointercancel", handleUp);
            if (dragRafRef.current !== null) {
                cancelAnimationFrame(dragRafRef.current);
                dragRafRef.current = null;
            }
        };
    }, [dragging, moveElement, isMarqueeSelecting, elements, canvasPoint, setSelectedId, setSelectedIds, getElementBoundsWithRef]);

    useEffect(() => {
        const applyResizeFrame = () => {
            resizeRafRef.current = null;
            const origin = resizeOriginRef.current;
            const pointer = resizePointerRef.current;
            if (!origin || !pointer) return;
            const { start, handle, bbox, elementId, snapshot } = origin;
            const { x, y } = pointer;
            const dx = x - start.x;
            const dy = y - start.y;
            const applyRectResize = (el: SvgElement) => {
                const next = { ...(el as any) };
                let newX = bbox.x;
                let newY = bbox.y;
                let newW = bbox.width;
                let newH = bbox.height;
                const applyX = () => {
                    if (handle.includes("e")) newW = Math.max(2, bbox.width + dx);
                    if (handle.includes("w")) {
                        newW = Math.max(2, bbox.width - dx);
                        newX = bbox.x + dx;
                    }
                };
                const applyY = () => {
                    if (handle.includes("s")) newH = Math.max(2, bbox.height + dy);
                    if (handle.includes("n")) {
                        newH = Math.max(2, bbox.height - dy);
                        newY = bbox.y + dy;
                    }
                };
                applyX();
                applyY();
                return { next, newX, newY, newW, newH };
            };
            updateElement(elementId, () => {
                switch (snapshot.type) {
                    case "rect": {
                        const { newX, newY, newW, newH } = applyRectResize(snapshot);
                        return {
                            ...snapshot,
                            x: snapValue(newX),
                            y: snapValue(newY),
                            width: snapValue(newW),
                            height: snapValue(newH),
                        };
                    }
                    case "ellipse": {
                        const { newX, newY, newW, newH } = applyRectResize(snapshot);
                        return {
                            ...snapshot,
                            cx: snapValue(newX + newW / 2),
                            cy: snapValue(newY + newH / 2),
                            rx: snapValue(newW / 2),
                            ry: snapValue(newH / 2),
                        };
                    }
                    case "line": {
                        const { newX, newY, newW, newH } = applyRectResize(snapshot);
                        const cx = newX + newW / 2;
                        const cy = newY + newH / 2;
                        return {
                            ...snapshot,
                            x1: snapValue(cx - newW / 2),
                            x2: snapValue(cx + newW / 2),
                            y1: snapValue(cy - newH / 2),
                            y2: snapValue(cy + newH / 2),
                            startRef: undefined,
                            endRef: undefined,
                        };
                    }
                    case "text": {
                        const { newY, newH } = applyRectResize(snapshot);
                        const nextSize = Math.max(8, newH);
                        return {
                            ...snapshot,
                            y: snapValue(newY + nextSize),
                            fontSize: snapValue(nextSize),
                        };
                    }
                    case "path": {
                        const { newX, newY, newW, newH } = applyRectResize(snapshot);
                        const scaleX = newW / Math.max(1, bbox.width);
                        const scaleY = newH / Math.max(1, bbox.height);
                        return {
                            ...snapshot,
                            transform: {
                                ...(snapshot.transform || {}),
                                x: snapValue(newX),
                                y: snapValue(newY),
                                scaleX,
                                scaleY,
                            },
                        };
                    }
                    default:
                        return snapshot;
                }
            }, { record: false });
        };

        const scheduleResizeFrame = () => {
            if (resizeRafRef.current !== null) return;
            resizeRafRef.current = requestAnimationFrame(applyResizeFrame);
        };

        const handleResizeMove = (event: PointerEvent) => {
            if (!resizeOriginRef.current) return;
            resizePointerRef.current = canvasPoint(event);
            scheduleResizeFrame();
        };
        const handleResizeUp = () => {
            resizeOriginRef.current = null;
            setActiveHandle(null);
            resizePointerRef.current = null;
            if (resizeRafRef.current !== null) {
                cancelAnimationFrame(resizeRafRef.current);
                resizeRafRef.current = null;
            }
        };
        window.addEventListener("pointermove", handleResizeMove);
        window.addEventListener("pointerup", handleResizeUp);
        window.addEventListener("pointercancel", handleResizeUp);
        return () => {
            window.removeEventListener("pointermove", handleResizeMove);
            window.removeEventListener("pointerup", handleResizeUp);
            window.removeEventListener("pointercancel", handleResizeUp);
            if (resizeRafRef.current !== null) {
                cancelAnimationFrame(resizeRafRef.current);
                resizeRafRef.current = null;
            }
        };
    }, [canvasPoint, updateElement, snapValue]);

    useEffect(() => {
        const handleMove = (event: PointerEvent) => {
            const drag = lineHandleDragRef.current;
            if (!drag) return;
            const pointer = canvasPoint(event);
            if (drag.mode === "move") {
                const dx = pointer.x - drag.startPointer.x;
                const dy = pointer.y - drag.startPointer.y;
                updateElement(
                    drag.id,
                    (el) => {
                        if (el.type !== "line") return el;
                        return {
                            ...el,
                            x1: drag.original.x1 + dx,
                            y1: drag.original.y1 + dy,
                            x2: drag.original.x2 + dx,
                            y2: drag.original.y2 + dy,
                            startRef: undefined,
                            endRef: undefined,
                        };
                    },
                    { record: false }
                );
                return;
            }
            const snap: SnapAttach | null = findSnapAnchor(pointer);
            updateElement(
                drag.id,
                (el) => {
                    if (el.type !== "line") return el;
                    const target = snap ? { x: snap.x, y: snap.y } : pointer;
                    if (drag.mode === "start") {
                        return {
                            ...el,
                            x1: target.x,
                            y1: target.y,
                            startRef: snap?.elementId,
                        };
                    }
                    return {
                        ...el,
                        x2: target.x,
                        y2: target.y,
                        endRef: snap?.elementId,
                    };
                },
                { record: false }
            );
            setSnapIndicator(snap ? { x: snap.x, y: snap.y } : null);
        };
        const handleUp = () => {
            lineHandleDragRef.current = null;
            setSnapIndicator(null);
        };
        window.addEventListener("pointermove", handleMove);
        window.addEventListener("pointerup", handleUp);
        window.addEventListener("pointercancel", handleUp);
        return () => {
            window.removeEventListener("pointermove", handleMove);
            window.removeEventListener("pointerup", handleUp);
            window.removeEventListener("pointercancel", handleUp);
        };
    }, [canvasPoint, updateElement, findSnapAnchor]);



    const handleAnchorDown = (event: React.PointerEvent, anchor: { x: number; y: number }, elementId: string) => {
        event.stopPropagation();
        event.preventDefault();
        commitSnapshot();
        const startPoint = { x: anchor.x, y: anchor.y };
        setDraft({
            mode: "line",
            start: startPoint,
            current: startPoint,
            startSnap: { elementId, x: anchor.x, y: anchor.y },
            endSnap: null,
        });
    };

    const handleCanvasPointerDown = (event: React.PointerEvent) => {
        event.preventDefault();
        if (event.button !== 0) return;
        if (isSpacePressed) {
            isPanningRef.current = true;
            setIsPanning(true);
            panStartRef.current = { x: event.clientX, y: event.clientY };
            return;
        }
        const point = canvasPoint(event);
        if (tool === "select") {
            // draw.io 风格：空白拖拽直接框选，不要求按 Shift
            // 如果已有选中且点击落在选中包围盒内，则直接进入拖动选中集合
            if (selectedIds.size > 0) {
                const ids = Array.from(selectedIds);
                const boxes = ids
                    .map((id) => {
                        const el = elements.find((item) => item.id === id && item.visible !== false);
                        return el ? getElementBoundsWithRef(el) : null;
                    })
                    .filter(Boolean) as Array<{ x: number; y: number; width: number; height: number }>;
                if (boxes.length > 0) {
                    const minX = Math.min(...boxes.map((b) => b.x));
                    const minY = Math.min(...boxes.map((b) => b.y));
                    const maxX = Math.max(...boxes.map((b) => b.x + b.width));
                    const maxY = Math.max(...boxes.map((b) => b.y + b.height));
                    const inside =
                        point.x >= minX &&
                        point.x <= maxX &&
                        point.y >= minY &&
                        point.y <= maxY;
                    if (inside) {
                        commitSnapshot();
                        dragLastPointRef.current = point;
                        dragAppliedPointRef.current = point;
                        setDragging({ id: ids[0], start: point });
                        return;
                    }
                }
            }
            dragLastPointRef.current = null;
            dragAppliedPointRef.current = null;
            setSelectedIds(new Set());
            setSelectedId(null);
            marqueeStartRef.current = point;
            setMarqueeRect({ x: point.x, y: point.y, width: 0, height: 0 });
            setIsMarqueeSelecting(true);
            return;
        }
        if (tool === "text") {
            const id = addElement({
                type: "text",
                x: point.x,
                y: point.y,
                text: "双击编辑文本",
                fill: "#0f172a",
                fontSize: 16,
            });
            setSelectedIds(new Set([id]));
            setSelectedId(id);
            setTool("select");
            return;
        }
        const drawMode: "rect" | "ellipse" | "line" =
            tool === "rect" || tool === "ellipse" || tool === "line" ? tool : "rect";
        if (drawMode === "line") {
            const snapStart: SnapAttach | null = findSnapAnchor(point);
            const startPoint = snapStart ? { x: snapStart.x, y: snapStart.y } : point;
            setDraft({
                mode: drawMode,
                start: startPoint,
                current: startPoint,
                startSnap: snapStart,
                endSnap: null,
            });
            return;
        }
        setDraft({
            mode: drawMode,
            start: point,
            current: point,
        });
    };

    const handleCanvasPointerMove = (event: React.PointerEvent) => {
        if (!draft) return;
        const point = canvasPoint(event);
        if (draft.mode === "line") {
            const snapEnd: SnapAttach | null = findSnapAnchor(point);
            setDraft((prev) =>
                prev
                    ? {
                        ...prev,
                        current: snapEnd ? { x: snapEnd.x, y: snapEnd.y } : point,
                        endSnap: snapEnd,
                    }
                    : null
            );
            setSnapIndicator(snapEnd ? { x: snapEnd.x, y: snapEnd.y } : null);
            return;
        }
        setDraft((prev) => (prev ? { ...prev, current: point } : null));
    };

    const handleCanvasPointerUp = () => {
        if (!draft) return;
        const { start, current, mode, startSnap, endSnap } = draft;
        const width = current.x - start.x;
        const height = current.y - start.y;
        const normalized = {
            x: width >= 0 ? start.x : start.x + width,
            y: height >= 0 ? start.y : start.y + height,
            width: Math.abs(width) || 2,
            height: Math.abs(height) || 2,
        };
        const tooSmall =
            (mode === "line" && Math.hypot(width, height) < 6) ||
            (mode !== "line" && normalized.width < 4 && normalized.height < 4);
        if (tooSmall) {
            setDraft(null);
            setTool("select");
            return;
        }
        if (mode === "rect") {
            addElement({
                type: "rect",
                x: normalized.x,
                y: normalized.y,
                width: normalized.width,
                height: normalized.height,
                fill: "#ffffff",
                stroke: "#0f172a",
                strokeWidth: 1.6,
            });
        } else if (mode === "ellipse") {
            addElement({
                type: "ellipse",
                cx: normalized.x + normalized.width / 2,
                cy: normalized.y + normalized.height / 2,
                rx: normalized.width / 2,
                ry: normalized.height / 2,
                fill: "#ffffff",
                stroke: "#0f172a",
                strokeWidth: 1.6,
            });
        } else if (mode === "line") {
            addElement({
                type: "line",
                x1: startSnap?.x ?? start.x,
                y1: startSnap?.y ?? start.y,
                x2: endSnap?.x ?? current.x,
                y2: endSnap?.y ?? current.y,
                startRef: startSnap?.elementId,
                endRef: endSnap?.elementId,
                stroke: "#0f172a",
                strokeWidth: 1.6,
            });
        }
        setDraft(null);
        setTool("select");
        setSnapIndicator(null);
    };

    const handleElementPointerDown = (event: React.PointerEvent, element: SvgElement) => {
        if (element.locked) return;
        if (tool !== "select") return;
        event.stopPropagation();
        event.preventDefault();
        commitSnapshot();
        const point = canvasPoint(event);
        const alreadySelected = selectedIds.has(element.id);
        if (event.shiftKey || event.metaKey || event.ctrlKey) {
            const next = new Set(selectedIds);
            if (alreadySelected) {
                next.delete(element.id);
            } else {
                next.add(element.id);
            }
            setSelectedIds(next);
            setSelectedId(next.size === 1 ? element.id : null);
        } else {
            if (alreadySelected && selectedIds.size > 1) {
                // 保持多选集合不变
                setSelectedIds(new Set(selectedIds));
                setSelectedId(null);
            } else {
                setSelectedIds(new Set([element.id]));
                setSelectedId(element.id);
            }
        }
        dragLastPointRef.current = point;
        dragAppliedPointRef.current = point;
        setDragging({
            id: element.id,
            start: point,
        });
    };

    const selectedElement = useMemo(
        () => elements.find((item) => item.id === selectedId),
        [elements, selectedId]
    );

    const handlePropertyChange = <K extends keyof SvgElement>(key: K, value: SvgElement[K]) => {
        if (!selectedElement) return;
        updateElement(selectedElement.id, { [key]: value } as Partial<SvgElement>);
    };

    const handleStyleChange = (partial: Partial<SvgElement>) => {
        if (!selectedElement) return;
        updateElement(selectedElement.id, partial);
    };

    const handleExport = async () => {
        const svg = exportSvgMarkup();
        try {
            await navigator.clipboard.writeText(svg);
        } catch (error) {
            console.error("复制 SVG 失败", error);
        }
    };

    const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        const text = await file.text();
        loadSvgMarkup(text);
        event.target.value = "";
    };

    const commitCanvasSize = (key: "width" | "height") => {
        const raw = key === "width" ? canvasWidthInput : canvasHeightInput;
        const value = parseFloat(raw);
        if (!Number.isFinite(value)) {
            if (key === "width") {
                setCanvasWidthInput(doc.width.toString());
            } else {
                setCanvasHeightInput(doc.height.toString());
            }
            return;
        }
        const next = Math.max(100, Math.round(value));
        if (key === "width") {
            setCanvasWidthInput(next.toString());
        } else {
            setCanvasHeightInput(next.toString());
        }
        updateDoc({ [key]: next } as any);
    };

    const alignSelection = (direction: "left" | "centerX" | "right" | "top" | "centerY" | "bottom") => {
        const target = selectedElement;
        if (!target) return;
        const padding = 16;
        const docWidth = doc.width;
        const docHeight = doc.height;
        updateElement(target.id, (el) => {
            switch (el.type) {
                case "rect": {
                    const next = { ...el };
                    if (direction === "left") next.x = padding;
                    if (direction === "right") next.x = docWidth - padding - el.width;
                    if (direction === "centerX") next.x = (docWidth - el.width) / 2;
                    if (direction === "top") next.y = padding;
                    if (direction === "bottom") next.y = docHeight - padding - el.height;
                    if (direction === "centerY") next.y = (docHeight - el.height) / 2;
                    return next;
                }
                case "ellipse": {
                    const next = { ...el };
                    if (direction === "left") next.cx = padding + el.rx;
                    if (direction === "right") next.cx = docWidth - padding - el.rx;
                    if (direction === "centerX") next.cx = docWidth / 2;
                    if (direction === "top") next.cy = padding + el.ry;
                    if (direction === "bottom") next.cy = docHeight - padding - el.ry;
                    if (direction === "centerY") next.cy = docHeight / 2;
                    return next;
                }
                case "line": {
                    const dx = el.x2 - el.x1;
                    const dy = el.y2 - el.y1;
                    const next = { ...el };
                    if (direction === "left") {
                        next.x1 = padding;
                        next.x2 = padding + dx;
                    }
                    if (direction === "right") {
                        next.x1 = docWidth - padding - dx;
                        next.x2 = docWidth - padding;
                    }
                    if (direction === "centerX") {
                        const midX = docWidth / 2;
                        const halfDx = dx / 2;
                        next.x1 = midX - halfDx;
                        next.x2 = midX + halfDx;
                    }
                    if (direction === "top") {
                        next.y1 = padding;
                        next.y2 = padding + dy;
                    }
                    if (direction === "bottom") {
                        next.y1 = docHeight - padding - dy;
                        next.y2 = docHeight - padding;
                    }
                    if (direction === "centerY") {
                        const midY = docHeight / 2;
                        const halfDy = dy / 2;
                        next.y1 = midY - halfDy;
                        next.y2 = midY + halfDy;
                    }
                    return next;
                }
                case "text": {
                    const next = { ...el };
                    if (direction === "left") next.x = padding;
                    if (direction === "right") next.x = docWidth - padding;
                    if (direction === "centerX") next.x = docWidth / 2;
                    if (direction === "top") next.y = padding + (el.fontSize || 16);
                    if (direction === "bottom") next.y = docHeight - padding;
                    if (direction === "centerY") next.y = docHeight / 2;
                    return next;
                }
                case "path": {
                    const transform = { ...(el.transform || {}) };
                    if (direction === "left") transform.x = padding;
                    if (direction === "right") transform.x = docWidth - padding;
                    if (direction === "centerX") transform.x = docWidth / 2;
                    if (direction === "top") transform.y = padding;
                    if (direction === "bottom") transform.y = docHeight - padding;
                    if (direction === "centerY") transform.y = docHeight / 2;
                    return { ...el, transform };
                }
                default:
                    return el;
            }
        });
    };

    const toggleLock = (id: string, locked: boolean) => {
        updateElement(id, { locked });
        if (locked && selectedId === id) {
            setSelectedId(null);
        }
    };

    const toggleVisible = (id: string, visible: boolean) => {
        updateElement(id, { visible });
        if (!visible && selectedId === id) {
            setSelectedId(null);
        }
    };

    const elementCenter = (el: SvgElement) => {
        const bounds = getElementBoundsWithRef(el);
        if (!bounds) return { x: 0, y: 0 };
        return { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
    };

    const aiAutoConnect = () => {
        const ids = Array.from(selectedIds);
        if (ids.length < 2) return;
        const list = ids
            .map((id) => elements.find((el) => el.id === id && el.visible !== false))
            .filter(Boolean) as SvgElement[];
        if (list.length < 2) return;
        const sorted = [...list].sort((a, b) => elementCenter(a).x - elementCenter(b).x);
        commitSnapshot();
        for (let i = 0; i < sorted.length - 1; i += 1) {
            const from = sorted[i];
            const to = sorted[i + 1];
            const fromCenter = elementCenter(from);
            const toCenter = elementCenter(to);
            addElement({
                type: "line",
                x1: fromCenter.x,
                y1: fromCenter.y,
                x2: toCenter.x,
                y2: toCenter.y,
                startRef: from.id,
                endRef: to.id,
                stroke: "#0f172a",
                strokeWidth: 1.6,
            });
        }
    };

    const aiDistributeHorizontally = () => {
        const ids = Array.from(selectedIds);
        if (ids.length < 3) return;
        const list = ids
            .map((id) => elements.find((el) => el.id === id && el.visible !== false))
            .filter(Boolean) as SvgElement[];
        if (list.length < 3) return;
        const boundsList = list
            .map((el) => ({ el, bounds: getElementBoundsWithRef(el) }))
            .filter((item) => item.bounds) as Array<{ el: SvgElement; bounds: { x: number; y: number; width: number; height: number } }>;
        const sorted = [...boundsList].sort((a, b) => a.bounds.x - b.bounds.x);
        const first = sorted[0].bounds.x;
        const last = sorted[sorted.length - 1].bounds.x;
        const gap = sorted.length > 1 ? (last - first) / (sorted.length - 1) : 0;
        commitSnapshot();
        sorted.forEach((item, idx) => {
            const targetX = first + gap * idx;
            const dx = targetX - item.bounds.x;
            moveElement(item.el.id, dx, 0, { record: false });
        });
    };

    const aiCopyStyleFromFirst = () => {
        const ids = Array.from(selectedIds);
        if (ids.length < 2) return;
        const base = elements.find((el) => el.id === ids[0]);
        if (!base) return;
        const styleKeys: Array<keyof SvgElement> = ["fill", "stroke", "strokeWidth", "opacity"];
        commitSnapshot();
        ids.slice(1).forEach((id) => {
            updateElement(
                id,
                (el) => {
                    const next = { ...el };
                    styleKeys.forEach((key) => {
                        (next as any)[key] = (base as any)[key];
                    });
                    return next;
                },
                { record: false }
            );
        });
    };

    useEffect(() => {
        const handleKey = (event: KeyboardEvent) => {
            const activeElement = document.activeElement as HTMLElement | null;
            if (
                activeElement &&
                (activeElement.tagName === "INPUT" ||
                    activeElement.tagName === "TEXTAREA" ||
                    activeElement.tagName === "SELECT" ||
                    activeElement.isContentEditable)
            ) {
                return;
            }
            const isMeta = event.metaKey || event.ctrlKey;
            if (isMeta && !event.shiftKey && event.key.toLowerCase() === "z") {
                event.preventDefault();
                undo();
                return;
            }
            if (isMeta && event.shiftKey && event.key.toLowerCase() === "z") {
                event.preventDefault();
                redo();
                return;
            }
            const currentSelection = selectedIds.size > 0 ? Array.from(selectedIds) : selectedId ? [selectedId] : [];
            if (currentSelection.length === 0) return;
            if (event.key === "ArrowUp" || event.key === "ArrowDown" || event.key === "ArrowLeft" || event.key === "ArrowRight") {
                event.preventDefault();
                const step = event.shiftKey ? 10 : 1;
                const dx = event.key === "ArrowLeft" ? -step : event.key === "ArrowRight" ? step : 0;
                const dy = event.key === "ArrowUp" ? -step : event.key === "ArrowDown" ? step : 0;
                if (!event.repeat) {
                    commitSnapshot();
                }
                currentSelection.forEach((id) => moveElement(id, dx, dy, { record: false }));
                return;
            }
            if (event.key === "Backspace" || event.key === "Delete") {
                event.preventDefault();
                removeMany(currentSelection);
            }
            if (isMeta && event.key.toLowerCase() === "d") {
                event.preventDefault();
                duplicateMany(currentSelection);
            }
            if (isMeta && event.key.toLowerCase() === "c") {
                event.preventDefault();
                duplicateMany(currentSelection);
            }
            if (isMeta && event.key.toLowerCase() === "x") {
                event.preventDefault();
                removeMany(currentSelection);
                return;
            }
            if (isMeta && event.key.toLowerCase() === "a") {
                event.preventDefault();
                const all = elements.filter((el) => el.visible !== false && el.locked !== true).map((el) => el.id);
                setSelectedIds(new Set(all));
                setSelectedId(all.length === 1 ? all[0] : null);
            }
        };
        window.addEventListener("keydown", handleKey);
        return () => window.removeEventListener("keydown", handleKey);
    }, [selectedId, selectedIds, removeMany, duplicateMany, undo, redo, moveElement, commitSnapshot, elements]);

    const draftShape = useMemo(() => {
        if (!draft) return null;
        const { start, current, mode } = draft;
        if (mode === "line") {
            return (
                <line
                    x1={start.x}
                    y1={start.y}
                    x2={current.x}
                    y2={current.y}
                    className="pointer-events-none"
                    stroke="#4f46e5"
                    strokeDasharray="4 2"
                    strokeWidth={1.4}
                />
            );
        }
        const width = current.x - start.x;
        const height = current.y - start.y;
        const normalized = {
            x: width >= 0 ? start.x : start.x + width,
            y: height >= 0 ? start.y : start.y + height,
            width: Math.abs(width),
            height: Math.abs(height),
        };
        if (mode === "rect") {
            return (
                <rect
                    x={normalized.x}
                    y={normalized.y}
                    width={normalized.width}
                    height={normalized.height}
                    className="pointer-events-none"
                    stroke="#4f46e5"
                    strokeDasharray="4 2"
                    strokeWidth={1.4}
                    fill="none"
                />
            );
        }
        if (mode === "ellipse") {
            return (
                <ellipse
                    cx={normalized.x + normalized.width / 2}
                    cy={normalized.y + normalized.height / 2}
                    rx={normalized.width / 2}
                    ry={normalized.height / 2}
                    className="pointer-events-none"
                    stroke="#4f46e5"
                    strokeDasharray="4 2"
                    strokeWidth={1.4}
                    fill="none"
                />
            );
        }
        return null;
    }, [draft]);

    return (
        <div className="flex h-full w-full gap-3">
            <div className="flex min-w-0 flex-1 flex-col rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex flex-col gap-2 border-b border-slate-100 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap items-center gap-1">
                        {TOOL_CONFIG.map((item) => {
                            const Icon = item.icon;
                            const active = tool === item.id;
                            return (
                                <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => setTool(item.id)}
                                    className={cn(
                                        "flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold transition",
                                        active
                                            ? "bg-slate-900 text-white shadow-sm"
                                            : "bg-slate-50 text-slate-700 hover:bg-slate-100"
                                    )}
                                >
                                    <Icon className="h-4 w-4" />
                                    {item.label}
                                </button>
                            );
                        })}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="flex items-center gap-1 rounded-full border border-slate-200 bg-white/90 px-2 py-1">
                            <button
                                type="button"
                                className="rounded-full p-1 text-slate-600 hover:bg-slate-100"
                                onClick={() => undo()}
                                title="撤销 (Cmd/Ctrl+Z)"
                            >
                                <RotateCcw className="h-4 w-4" />
                            </button>
                            <button
                                type="button"
                                className="rounded-full p-1 text-slate-600 hover:bg-slate-100"
                                onClick={() => redo()}
                                title="重做 (Cmd/Ctrl+Shift+Z)"
                            >
                                <RotateCw className="h-4 w-4" />
                            </button>
                            <div className="h-5 w-px bg-slate-200" />
                            <button
                                type="button"
                                onClick={() => setSnapEnabled((prev) => !prev)}
                                className={cn(
                                    "flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold transition",
                                    snapEnabled
                                        ? "bg-slate-900 text-white"
                                        : "text-slate-700 hover:bg-slate-100"
                                )}
                            >
                                <Grid className="h-4 w-4" />
                                吸附
                            </button>
                            <div className="h-5 w-px bg-slate-200" />
                            <div className="flex items-center gap-1">
                                <button
                                    type="button"
                                    className="rounded-full p-1 text-slate-600 hover:bg-slate-100"
                                    onClick={() => alignSelection("left")}
                                    title="左对齐"
                                >
                                    <AlignStartHorizontal className="h-4 w-4" />
                                </button>
                                <button
                                    type="button"
                                    className="rounded-full p-1 text-slate-600 hover:bg-slate-100"
                                    onClick={() => alignSelection("centerX")}
                                    title="水平居中"
                                >
                                    <AlignCenterHorizontal className="h-4 w-4" />
                                </button>
                                <button
                                    type="button"
                                    className="rounded-full p-1 text-slate-600 hover:bg-slate-100"
                                    onClick={() => alignSelection("right")}
                                    title="右对齐"
                                >
                                    <AlignEndHorizontal className="h-4 w-4" />
                                </button>
                                <button
                                    type="button"
                                    className="rounded-full p-1 text-slate-600 hover:bg-slate-100"
                                    onClick={() => alignSelection("top")}
                                    title="顶部对齐"
                                >
                                    <AlignStartVertical className="h-4 w-4" />
                                </button>
                                <button
                                    type="button"
                                    className="rounded-full p-1 text-slate-600 hover:bg-slate-100"
                                    onClick={() => alignSelection("centerY")}
                                    title="垂直居中"
                                >
                                    <AlignCenterVertical className="h-4 w-4" />
                                </button>
                                <button
                                    type="button"
                                    className="rounded-full p-1 text-slate-600 hover:bg-slate-100"
                                    onClick={() => alignSelection("bottom")}
                                    title="底部对齐"
                                >
                                    <ArrowDownToLine className="h-4 w-4" />
                                </button>
                            </div>
                            <div className="h-5 w-px bg-slate-200" />
                            <div className="flex items-center gap-1 rounded-full bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-700">
                                <button
                                    type="button"
                                    className="rounded-full p-1 hover:bg-slate-100"
                                    onClick={() => changeZoom(-ZOOM_STEP)}
                                    title="缩小"
                                >
                                    <Minus className="h-4 w-4" />
                                </button>
                                <span className="min-w-[52px] text-center">{Math.round(zoom * 100)}%</span>
                                <button
                                    type="button"
                                    className="rounded-full p-1 hover:bg-slate-100"
                                    onClick={() => changeZoom(ZOOM_STEP)}
                                    title="放大"
                                >
                                    <Plus className="h-4 w-4" />
                                </button>
                                <button
                                    type="button"
                                    className="rounded-full px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-100"
                                    onClick={() => setZoom(1)}
                                >
                                    100%
                                </button>
                            </div>
                        </div>
                        <div className="flex items-center gap-1">
                            <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                className="gap-1"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <Upload className="h-4 w-4" />
                                导入 SVG
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="gap-1"
                                onClick={handleExport}
                            >
                                <Copy className="h-4 w-4" />
                                复制 SVG
                            </Button>
                            <Button
                                type="button"
                                variant="default"
                                size="sm"
                                className="gap-1"
                                onClick={() => clearSvg()}
                            >
                                <Eraser className="h-4 w-4" />
                                清空
                            </Button>
                        </div>
                    </div>
                </div>

                <div
                    className={cn(
                        "relative flex-1 overflow-hidden bg-slate-50 select-none",
                        (panCursor || isPanning) && "cursor-grab",
                        isPanning && "cursor-grabbing"
                    )}
                    ref={(node) => {
                        if (node) {
                            const handleWheel = (e: WheelEvent) => {
                                e.preventDefault();
                                if (e.ctrlKey || e.metaKey) {
                                    const delta = -e.deltaY * 0.0015;
                                    const rect = node.getBoundingClientRect();
                                    setZoom((prev) => {
                                        const nextZoom = clampZoom(prev + delta);
                                        const scale = nextZoom / prev;
                                        setPan((prevPan) => {
                                            const cursorX = e.clientX - rect.left - prevPan.x;
                                            const cursorY = e.clientY - rect.top - prevPan.y;
                                            return {
                                                x: prevPan.x - cursorX * (scale - 1),
                                                y: prevPan.y - cursorY * (scale - 1),
                                            };
                                        });
                                        return nextZoom;
                                    });
                                } else {
                                    setPan((prev) => ({
                                        x: prev.x - e.deltaX,
                                        y: prev.y - e.deltaY,
                                    }));
                                }
                            };
                            node.addEventListener("wheel", handleWheel, { passive: false });
                            return () => {
                                node.removeEventListener("wheel", handleWheel);
                            };
                        }
                    }}
                >
                    <div
                        className="relative h-full w-full"
                    >
                        <div
                            className="pointer-events-none absolute inset-0"
                            style={{
                                backgroundPosition: `${pan.x}px ${pan.y}px`,
                                backgroundSize: `${20 * zoom}px ${20 * zoom}px` // Assuming grid size scales? Or just fixed?
                                // Actually GridPattern usually handles its own sizing. 
                                // If GridPattern is SVG based, we might need to transform it too.
                                // Let's just wrap GridPattern in the transformed group for now or leave it fixed?
                                // User wants infinite canvas.
                            }}
                        >
                            {/* GridPattern usually needs to be inside the SVG to scale correctly or we transform the container */}
                        </div>
                        <svg
                            ref={svgRef}
                            className="relative z-10 h-full w-full select-none"
                            width="100%"
                            height="100%"
                            onPointerDown={handleCanvasPointerDown}
                            onPointerMove={handleCanvasPointerMove}
                            onPointerUp={handleCanvasPointerUp}
                        >
                            <defs>
                                <pattern id="grid" width={GRID_SIZE * zoom} height={GRID_SIZE * zoom} patternUnits="userSpaceOnUse" x={pan.x} y={pan.y}>
                                    <path d={`M ${GRID_SIZE * zoom} 0 L 0 0 0 ${GRID_SIZE * zoom}`} fill="none" stroke="rgba(0,0,0,0.05)" strokeWidth={1} />
                                </pattern>
                            </defs>
                            <rect width="100%" height="100%" fill="url(#grid)" />

                            <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
                                {defsMarkup && (
                                    <defs dangerouslySetInnerHTML={{ __html: defsMarkup }} />
                                )}
                                {elements.map((element) => {
                                    if (element.visible === false) return null;
                                    const transform = transformStyle(element);
                                    const commonProps = {
                                        ref: (node: SVGGraphicsElement | null) => {
                                            elementRefs.current[element.id] = node;
                                        },
                                        onPointerDown: (event: React.PointerEvent) =>
                                            handleElementPointerDown(event, element),
                                        transform,
                                        className: cn(
                                            "cursor-default",
                                            (selectedIds.has(element.id) || selectedId === element.id) &&
                                            "outline-none ring-2 ring-offset-2 ring-blue-500/50"
                                        ),
                                    } as const;
                                    switch (element.type) {
                                        case "rect":
                                            return (
                                                <rect
                                                    key={element.id}
                                                    {...commonProps}
                                                    x={element.x}
                                                    y={element.y}
                                                    width={element.width}
                                                    height={element.height}
                                                    rx={element.rx}
                                                    ry={element.ry}
                                                    fill={element.fill || "none"}
                                                    stroke={element.stroke}
                                                    strokeWidth={element.strokeWidth || 1.4}
                                                    strokeDasharray={element.strokeDasharray}
                                                    markerEnd={element.markerEnd}
                                                    markerStart={element.markerStart}
                                                    opacity={element.opacity}
                                                />
                                            );
                                        case "ellipse":
                                            return (
                                                <ellipse
                                                    key={element.id}
                                                    {...commonProps}
                                                    cx={element.cx}
                                                    cy={element.cy}
                                                    rx={element.rx}
                                                    ry={element.ry}
                                                    fill={element.fill || "none"}
                                                    stroke={element.stroke}
                                                    strokeWidth={element.strokeWidth || 1.4}
                                                    strokeDasharray={element.strokeDasharray}
                                                    markerEnd={element.markerEnd}
                                                    markerStart={element.markerStart}
                                                    opacity={element.opacity}
                                                />
                                            );
                                        case "line":
                                            return (
                                                <React.Fragment key={element.id}>
                                                    <line
                                                        x1={element.x1}
                                                        y1={element.y1}
                                                        x2={element.x2}
                                                        y2={element.y2}
                                                        stroke="transparent"
                                                        strokeWidth={12}
                                                        className="cursor-pointer"
                                                        transform={transform}
                                                        onPointerDown={(event) =>
                                                            handleElementPointerDown(event, element)
                                                        }
                                                    />
                                                    <line
                                                        {...commonProps}
                                                        x1={element.x1}
                                                        y1={element.y1}
                                                        x2={element.x2}
                                                        y2={element.y2}
                                                        stroke={element.stroke}
                                                        strokeWidth={element.strokeWidth || 1.6}
                                                        strokeDasharray={element.strokeDasharray}
                                                        markerEnd={element.markerEnd}
                                                        markerStart={element.markerStart}
                                                        opacity={element.opacity}
                                                        pointerEvents="none"
                                                    />
                                                </React.Fragment>
                                            );
                                        case "path":
                                            return (
                                                <path
                                                    key={element.id}
                                                    {...commonProps}
                                                    d={element.d}
                                                    fill={element.fill || "none"}
                                                    stroke={element.stroke}
                                                    strokeWidth={element.strokeWidth || 1.4}
                                                    strokeDasharray={element.strokeDasharray}
                                                    markerEnd={element.markerEnd}
                                                    markerStart={element.markerStart}
                                                    opacity={element.opacity}
                                                />
                                            );
                                        case "text":
                                            return (
                                                <text
                                                    key={element.id}
                                                    {...commonProps}
                                                    x={element.x}
                                                    y={element.y}
                                                    fill={element.fill || "#0f172a"}
                                                    fontSize={element.fontSize || 16}
                                                    fontWeight={element.fontWeight}
                                                    textAnchor={element.textAnchor}
                                                    dominantBaseline={element.dominantBaseline}
                                                    className={cn(
                                                        "select-none",
                                                        element.visible === (false as any) && "opacity-30"
                                                    )}
                                                >
                                                    {element.text}
                                                </text>
                                            );
                                        default:
                                            return null;
                                    }
                                })}

                                {draftShape}

                                {measuredBounds && (
                                    <rect
                                        x={measuredBounds.x - 4}
                                        y={measuredBounds.y - 4}
                                        width={measuredBounds.width + 8}
                                        height={measuredBounds.height + 8}
                                        fill="none"
                                        stroke="#3b82f6"
                                        strokeDasharray="6 4"
                                        strokeWidth={1.4}
                                        pointerEvents="none"
                                    />
                                )}
                                {marqueeRect && isMarqueeSelecting && (
                                    <rect
                                        x={marqueeRect.x}
                                        y={marqueeRect.y}
                                        width={marqueeRect.width}
                                        height={marqueeRect.height}
                                        fill="rgba(59,130,246,0.08)"
                                        stroke="#3b82f6"
                                        strokeDasharray="4 2"
                                        strokeWidth={1}
                                        pointerEvents="none"
                                    />
                                )}
                                {Array.from(selectedIds)
                                    .map((id) => {
                                        const el = elements.find((item) => item.id === id);
                                        if (!el || el.visible === false) return null;
                                        const bounds = getElementBoundsWithRef(el);
                                        if (!bounds) return null;
                                        return { id, bounds };
                                    })
                                    .filter(Boolean)
                                    .map((item) => (
                                        <rect
                                            key={item!.id}
                                            x={item!.bounds.x - 4}
                                            y={item!.bounds.y - 4}
                                            width={item!.bounds.width + 8}
                                            height={item!.bounds.height + 8}
                                            fill="none"
                                            stroke="#3b82f6"
                                            strokeDasharray="4 2"
                                            strokeWidth={1.2}
                                            pointerEvents="none"
                                        />
                                    ))}
                                {selectedElement?.type === "line" && selectedElement.visible !== false ? (
                                    <LineHandles
                                        line={selectedElement as Extract<SvgElement, { type: "line" }>}
                                        onHandleDown={beginLineHandleDrag}
                                    />
                                ) : (
                                    measuredBounds &&
                                    selectedElement &&
                                    selectedElement.visible !== false && (
                                        <ResizeHandles
                                            bounds={measuredBounds}
                                            onHandleDown={(handle, event) => {
                                                const bbox = measuredBounds;
                                                commitSnapshot();
                                                const startPoint = canvasPoint(event);
                                                resizeOriginRef.current = {
                                                    handle,
                                                    start: startPoint,
                                                    bbox,
                                                    elementId: selectedElement.id,
                                                    snapshot: selectedElement,
                                                };
                                                resizePointerRef.current = startPoint;
                                                setActiveHandle(handle);
                                                event.stopPropagation();
                                                event.preventDefault();
                                            }}
                                            activeHandle={activeHandle}
                                        />
                                    )
                                )}


                                {/* Connection Anchors */}
                                {(() => {
                                    const targetId = hoveredElementId || selectedId;
                                    if (!targetId) return null;
                                    const element = elements.find(el => el.id === targetId);
                                    if (!element || element.type === 'line' || element.locked || element.visible === false) return null;
                                    const anchors = getAnchorPoints(element);
                                    return anchors.map((anchor, i) => (
                                        <circle
                                            key={i}
                                            cx={anchor.x}
                                            cy={anchor.y}
                                            r={4}
                                            fill="#3b82f6"
                                            fillOpacity={0.5}
                                            stroke="#fff"
                                            strokeWidth={1}
                                            className="cursor-crosshair hover:fill-opacity-100 hover:r-5 transition-all"
                                            onPointerDown={(e) => handleAnchorDown(e, anchor, element.id)}
                                        />
                                    ));
                                })()}

                                {snapIndicator && (
                                    <circle
                                        cx={snapIndicator.x}
                                        cy={snapIndicator.y}
                                        r={6}
                                        fill="none"
                                        stroke="#ef4444"
                                        strokeWidth={2}
                                        className="pointer-events-none animate-pulse"
                                    />
                                )}
                            </g>
                        </svg>
                    </div>
                </div>
            </div>

            <div className="w-72 shrink-0 rounded-2xl border border-slate-200 bg-white px-3 py-3 shadow-sm">
                <div className="flex items-center justify-between pb-2">
                    <div>
                        <p className="text-sm font-semibold text-slate-900">属性</p>
                        <p className="text-xs text-slate-500">
                            选择图形后调整样式
                        </p>
                    </div>
                    <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => setSelectedId(null)}
                        title="取消选择"
                    >
                        <MousePointer2 className="h-4 w-4" />
                    </Button>
                </div>
                <div className="mb-3 rounded-lg border border-slate-200 bg-slate-50 px-2 py-2">
                    <p className="text-xs font-semibold text-slate-700">画布尺寸</p>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                            <label className="text-[11px] text-slate-500">宽度</label>
                            <Input
                                type="number"
                                min={100}
                                step={10}
                                value={canvasWidthInput}
                                onChange={(e) => setCanvasWidthInput(e.target.value)}
                                onBlur={() => commitCanvasSize("width")}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                        commitCanvasSize("width");
                                    }
                                }}
                                className="h-9"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[11px] text-slate-500">高度</label>
                            <Input
                                type="number"
                                min={100}
                                step={10}
                                value={canvasHeightInput}
                                onChange={(e) => setCanvasHeightInput(e.target.value)}
                                onBlur={() => commitCanvasSize("height")}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                        commitCanvasSize("height");
                                    }
                                }}
                                className="h-9"
                            />
                        </div>
                    </div>
                    <p className="mt-1 text-[10px] text-slate-400">
                        自动同步 viewBox，保持坐标一致。
                    </p>
                </div>
                {selectedElement ? (
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => selectedElement && duplicateElement(selectedElement.id)}
                                className="gap-1"
                            >
                                复制
                            </Button>
                            <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                onClick={() => selectedElement && removeElement(selectedElement.id)}
                                className="gap-1"
                            >
                                删除
                            </Button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <label className="text-xs text-slate-600">填充</label>
                            <label className="text-xs text-slate-600">描边</label>
                            <Input
                                type="color"
                                value={selectedElement.fill || "#ffffff"}
                                onChange={(e) =>
                                    handleStyleChange({ fill: e.target.value })
                                }
                                className="h-9 px-2"
                            />
                            <Input
                                type="color"
                                value={selectedElement.stroke || "#0f172a"}
                                onChange={(e) =>
                                    handleStyleChange({ stroke: e.target.value })
                                }
                                className="h-9 px-2"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <label className="text-xs text-slate-600">线宽</label>
                            <Input
                                type="number"
                                min={0}
                                step={0.2}
                                value={selectedElement.strokeWidth ?? 1.6}
                                onChange={(e) =>
                                    handleStyleChange({
                                        strokeWidth: parseFloat(e.target.value) || 0,
                                    })
                                }
                                className="col-span-1 h-9"
                            />
                            <label className="text-xs text-slate-600">不透明度</label>
                            <Input
                                type="number"
                                min={0}
                                max={1}
                                step={0.05}
                                value={selectedElement.opacity ?? 1}
                                onChange={(e) =>
                                    handleStyleChange({
                                        opacity: Math.min(
                                            1,
                                            Math.max(0, parseFloat(e.target.value) || 0)
                                        ),
                                    })
                                }
                                className="col-span-1 h-9"
                            />
                        </div>

                        {selectedElement.type === "text" && (
                            <div className="space-y-2">
                                <label className="text-xs text-slate-600">文本</label>
                                <Input
                                    value={(selectedElement as any).text ?? ""}
                                    onChange={(e) =>
                                        handlePropertyChange("text" as keyof SvgElement, e.target.value)
                                    }
                                    className="h-9"
                                />
                                <label className="text-xs text-slate-600">字号</label>
                                <Input
                                    type="number"
                                    min={8}
                                    max={96}
                                    value={selectedElement.fontSize ?? 16}
                                    onChange={(e) =>
                                        handlePropertyChange(
                                            "fontSize" as keyof SvgElement,
                                            parseFloat(e.target.value) || 16
                                        )
                                    }
                                    className="h-9"
                                />
                            </div>
                        )}

                        {selectedElement.type === "rect" && (
                            <>
                                <div className="grid grid-cols-2 gap-2">
                                    <label className="text-xs text-slate-600">宽度</label>
                                    <Input
                                        type="number"
                                        min={1}
                                        value={selectedElement.width ?? 0}
                                        onChange={(e) =>
                                            handlePropertyChange(
                                                "width" as any,
                                                Math.max(1, parseFloat(e.target.value) || 0) as any
                                            )
                                        }
                                        className="h-9"
                                    />
                                    <label className="text-xs text-slate-600">高度</label>
                                    <Input
                                        type="number"
                                        min={1}
                                        value={selectedElement.height ?? 0}
                                        onChange={(e) =>
                                            handlePropertyChange(
                                                "height" as any,
                                                Math.max(1, parseFloat(e.target.value) || 0) as any
                                            )
                                        }
                                        className="h-9"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <label className="text-xs text-slate-600">圆角 rx</label>
                                    <Input
                                        type="number"
                                        min={0}
                                        value={selectedElement.rx ?? 0}
                                        onChange={(e) =>
                                            handlePropertyChange(
                                                "rx" as any,
                                                Math.max(0, parseFloat(e.target.value) || 0) as any
                                            )
                                        }
                                        className="h-9"
                                    />
                                    <label className="text-xs text-slate-600">圆角 ry</label>
                                    <Input
                                        type="number"
                                        min={0}
                                        value={selectedElement.ry ?? 0}
                                        onChange={(e) =>
                                            handlePropertyChange(
                                                "ry" as any,
                                                Math.max(0, parseFloat(e.target.value) || 0) as any
                                            )
                                        }
                                        className="h-9"
                                    />
                                </div>
                            </>
                        )}
                    </div>
                ) : (
                    <div className="rounded-md border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-xs text-slate-500">
                        选择任意图形以编辑属性，或使用工具栏添加新的 SVG 元素。
                    </div>
                )}


                <div className="mt-4 border-t border-slate-100 pt-3">
                    <p className="text-xs font-semibold text-slate-700 mb-1">历史</p>
                    {history.length === 0 ? (
                        <p className="text-xs text-slate-500">
                            暂无快照，AI 生成或导入时会自动记录。
                        </p>
                    ) : (
                        <p className="text-xs text-slate-500">
                            已记录 {history.length} 版，使用对话历史可恢复。
                        </p>
                    )}
                </div>
                <div className="mt-4 border-t border-slate-100 pt-3">
                    <p className="text-xs font-semibold text-slate-700 mb-2">AI 辅助（低风险快捷）</p>
                    <div className="space-y-2">
                        <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            className="w-full justify-start text-xs"
                            onClick={aiAutoConnect}
                            disabled={selectedIds.size < 2}
                        >
                            自动连线选中（按 X 排序）
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            className="w-full justify-start text-xs"
                            onClick={aiDistributeHorizontally}
                            disabled={selectedIds.size < 3}
                        >
                            水平均分分布选中
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            className="w-full justify-start text-xs"
                            onClick={aiCopyStyleFromFirst}
                            disabled={selectedIds.size < 2}
                        >
                            复制首个样式到其余
                        </Button>
                        <p className="text-[10px] text-slate-400">
                            每次执行前自动快照，撤销可恢复。
                        </p>
                    </div>
                </div>
            </div>

            <input
                type="file"
                accept="image/svg+xml,.svg"
                ref={fileInputRef}
                className="hidden"
                onChange={handleImportFile}
            />
        </div >
    );
}

function GridPattern() {
    const size = 20;
    return (
        <svg className="h-full w-full" aria-hidden>
            <defs>
                <pattern
                    id="grid"
                    x="0"
                    y="0"
                    width={size}
                    height={size}
                    patternUnits="userSpaceOnUse"
                >
                    <path
                        d={`M ${size} 0 L 0 0 0 ${size}`}
                        fill="none"
                        stroke="#e2e8f0"
                        strokeWidth="0.8"
                    />
                </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
    );
}

function ResizeHandles({
    bounds,
    onHandleDown,
    activeHandle,
}: {
    bounds: { x: number; y: number; width: number; height: number };
    onHandleDown: (handle: ResizeHandle, event: React.PointerEvent) => void;
    activeHandle: ResizeHandle | null;
}) {
    const { x, y, width, height } = bounds;
    const cx = x + width / 2;
    const cy = y + height / 2;
    const size = 8;
    const handles: Array<{ handle: ResizeHandle; cx: number; cy: number }> = [
        { handle: "nw", cx: x, cy: y },
        { handle: "n", cx, cy: y },
        { handle: "ne", cx: x + width, cy: y },
        { handle: "w", cx: x, cy },
        { handle: "e", cx: x + width, cy },
        { handle: "sw", cx: x, cy: y + height },
        { handle: "s", cx, cy: y + height },
        { handle: "se", cx: x + width, cy: y + height },
    ];
    return (
        <>
            {handles.map((h) => (
                <rect
                    key={h.handle}
                    x={h.cx - size / 2}
                    y={h.cy - size / 2}
                    width={size}
                    height={size}
                    rx={2}
                    ry={2}
                    fill={activeHandle === h.handle ? "#2563eb" : "#ffffff"}
                    stroke="#2563eb"
                    strokeWidth={1.2}
                    className="cursor-pointer"
                    onPointerDown={(event) => onHandleDown(h.handle, event)}
                />
            ))}
        </>
    );
}

function LineHandles({
    line,
    onHandleDown,
}: {
    line: Extract<SvgElement, { type: "line" }>;
    onHandleDown: (line: Extract<SvgElement, { type: "line" }>, mode: "start" | "end" | "move", event: React.PointerEvent) => void;
}) {
    const mid = { x: (line.x1 + line.x2) / 2, y: (line.y1 + line.y2) / 2 };
    const handle = (mode: "start" | "end" | "move") =>
        (event: React.PointerEvent) => onHandleDown(line, mode, event);
    return (
        <>
            <circle
                cx={line.x1}
                cy={line.y1}
                r={6}
                fill="#2563eb"
                stroke="#fff"
                strokeWidth={1.2}
                className="cursor-pointer"
                onPointerDown={handle("start")}
            />
            <circle
                cx={line.x2}
                cy={line.y2}
                r={6}
                fill="#2563eb"
                stroke="#fff"
                strokeWidth={1.2}
                className="cursor-pointer"
                onPointerDown={handle("end")}
            />
            <rect
                x={mid.x - 5}
                y={mid.y - 5}
                width={10}
                height={10}
                rx={2}
                ry={2}
                fill="#0ea5e9"
                stroke="#fff"
                strokeWidth={1.2}
                className="cursor-move"
                onPointerDown={handle("move")}
            />
        </>
    );
}
