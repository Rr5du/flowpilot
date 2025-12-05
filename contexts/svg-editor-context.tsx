"use client";

import React, {
    createContext,
    useCallback,
    useContext,
    useMemo,
    useState,
    useEffect,
} from "react";
import { nanoid } from "nanoid";
import { svgToDataUrl } from "@/lib/svg";

export type SvgTool = "select" | "rect" | "ellipse" | "line" | "text";

type Transform = {
    x?: number;
    y?: number;
    scaleX?: number;
    scaleY?: number;
    rotation?: number;
    rotationCx?: number;  // 旋转中心点 X
    rotationCy?: number;  // 旋转中心点 Y
};

export type SvgElementBase = {
    id: string;
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
    strokeDasharray?: string;
    strokeLinecap?: "butt" | "round" | "square";
    strokeLinejoin?: "miter" | "round" | "bevel";
    strokeMiterlimit?: number;
    markerEnd?: string;
    markerStart?: string;
    opacity?: number;
    fillRule?: "nonzero" | "evenodd";
    transform?: Transform;
    visible?: boolean;
    locked?: boolean;
    filter?: string;
    className?: string; // CSS class names for styling
};

export type RectElement = SvgElementBase & {
    type: "rect";
    x: number;
    y: number;
    width: number;
    height: number;
    rx?: number;
    ry?: number;
};

export type EllipseElement = SvgElementBase & {
    type: "ellipse";
    cx: number;
    cy: number;
    rx: number;
    ry: number;
};

export type CircleElement = SvgElementBase & {
    type: "circle";
    cx: number;
    cy: number;
    r: number;
};

export type LineElement = SvgElementBase & {
    type: "line";
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    startRef?: string | null;
    endRef?: string | null;
};

export type PathElement = SvgElementBase & {
    type: "path";
    d: string;
};

export type TextElement = SvgElementBase & {
    type: "text";
    x: number;
    y: number;
    text: string;
    fontSize?: number;
    fontWeight?: string;
    fontFamily?: string;
    textAnchor?: "start" | "middle" | "end";
    dominantBaseline?: "auto" | "middle" | "hanging" | "central" | "text-before-edge" | "text-after-edge" | "ideographic" | "alphabetic" | "mathematical";
    tspans?: Array<{
        text: string;
        x?: number;
        y?: number;
        dx?: number;
        dy?: number;
        fontSize?: number;
        fontWeight?: string;
        fontFamily?: string;
        fontStyle?: string;
        textDecoration?: string;
        fill?: string;
    }>;
};

export type ImageElement = SvgElementBase & {
    type: "image";
    x: number;
    y: number;
    width: number;
    height: number;
    href: string;
    preserveAspectRatio?: string;
};

export type UseElement = SvgElementBase & {
    type: "use";
    x: number;
    y: number;
    width?: number;
    height?: number;
    href: string;  // 引用的元素 ID (#id)
};

export type GroupElement = SvgElementBase & {
    type: "g";
    children: SvgElement[];
    fontSize?: number;
    fontWeight?: string;
    fontFamily?: string;
    textAnchor?: "start" | "middle" | "end";
    dominantBaseline?: "auto" | "middle" | "hanging" | "central" | "text-before-edge" | "text-after-edge" | "ideographic" | "alphabetic" | "mathematical";
};

export type SvgElement =
    | RectElement
    | EllipseElement
    | CircleElement
    | LineElement
    | PathElement
    | TextElement
    | ImageElement
    | UseElement
    | GroupElement;

type SvgDocument = {
    width: number;
    height: number;
    viewBox?: string | null;
};

type HistoryEntry = {
    svg: string;
    dataUrl: string | null;
    timestamp: number;
};

type EditorSnapshot = {
    doc: SvgDocument;
    elements: SvgElement[];
    defs?: string | null;
};

type ImportRecord = {
    id: string;
    name: string;
    type: "paste" | "upload";
    content: string;
    timestamp: number;
    stats?: {
        width?: number;
        height?: number;
        elementCount: number;
        pathCount: number;
    };
};

type SvgEditorContextValue = {
    doc: SvgDocument;
    elements: SvgElement[];
    tool: SvgTool;
    setTool: (tool: SvgTool) => void;
    updateDoc: (partial: Partial<SvgDocument>) => void;
    selectedId: string | null;
    setSelectedId: (id: string | null) => void;
    selectedIds: Set<string>;
    setSelectedIds: (ids: Set<string>) => void;
    addElement: (element: Omit<SvgElement, "id"> | SvgElement) => string;
    updateElement: (
        id: string,
        updater: Partial<SvgElement> | ((element: SvgElement) => SvgElement),
        options?: { record?: boolean }
    ) => void;
    moveElement: (id: string, dx: number, dy: number, options?: { record?: boolean }) => void;
    removeElement: (id: string) => void;
    duplicateElement: (id: string) => string | null;
    duplicateMany: (ids: Iterable<string>) => string[];
    removeMany: (ids: Iterable<string>) => void;
    loadSvgMarkup: (svg: string, options?: { saveHistory?: boolean; skipSnapshot?: boolean; skipOptimization?: boolean; recordMeta?: { name?: string; type?: "paste" | "upload" } }) => void;
    exportSvgMarkup: () => string;
    clearSvg: () => void;
    history: HistoryEntry[];
    activeHistoryIndex: number;
    restoreHistoryAt: (index: number) => void;
    undo: () => void;
    redo: () => void;
    commitSnapshot: () => void;
    defsMarkup?: string | null;
    symbolLibrary: Map<string, SvgElement>;
    registerSymbol: (id: string, element: SvgElement) => void;
    resolveUseReference: (href: string) => SvgElement | null;
    importHistory: ImportRecord[];
    addImportRecord: (record: Omit<ImportRecord, "id">) => void;
    streamingSvgContent: string | null;
    setStreamingSvgContent: (content: string | null) => void;
    previewSvgMarkup: string | null;
    rawSvgMarkup: string | null;
};

const DEFAULT_DOC: SvgDocument = {
    width: 960,
    height: 640,
    viewBox: "0 0 960 640",
};

const SvgEditorContext = createContext<SvgEditorContextValue | null>(null);

function parseNumber(value: string | null | undefined, fallback = 0) {
    if (!value) return fallback;
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function parseOptionalNumber(value: string | null | undefined): number | undefined {
    if (!value) return undefined;
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : undefined;
}

function parseTransform(transform: string | null): Transform | undefined {
    if (!transform) return undefined;
    const result: Transform = {};
    const translateMatch = transform.match(/translate\(([^)]+)\)/);
    if (translateMatch?.[1]) {
        const [x, y] = translateMatch[1].split(/[, ]+/).map(parseFloat);
        if (Number.isFinite(x)) result.x = x;
        if (Number.isFinite(y)) result.y = y;
    }
    const scaleMatch = transform.match(/scale\(([^)]+)\)/);
    if (scaleMatch?.[1]) {
        const [sx, sy] = scaleMatch[1].split(/[, ]+/).map(parseFloat);
        if (Number.isFinite(sx)) result.scaleX = sx;
        if (Number.isFinite(sy)) result.scaleY = sy;
    }
    // 支持 rotate(angle) 和 rotate(angle cx cy) 两种格式
    const rotateMatch = transform.match(/rotate\(([^)]+)\)/);
    if (rotateMatch?.[1]) {
        const parts = rotateMatch[1].split(/[\s,]+/).map(parseFloat);
        if (Number.isFinite(parts[0])) result.rotation = parts[0];
        if (Number.isFinite(parts[1])) result.rotationCx = parts[1];
        if (Number.isFinite(parts[2])) result.rotationCy = parts[2];
    }
    return Object.keys(result).length > 0 ? result : undefined;
}

function serializeTransform(transform?: Transform): string | undefined {
    if (!transform) return undefined;
    const segments: string[] = [];
    if (Number.isFinite(transform.x) || Number.isFinite(transform.y)) {
        const x = transform.x ?? 0;
        const y = transform.y ?? 0;
        segments.push(`translate(${x} ${y})`);
    }
    if (
        Number.isFinite(transform.scaleX) ||
        Number.isFinite(transform.scaleY)
    ) {
        const sx = transform.scaleX ?? 1;
        const sy = transform.scaleY ?? sx;
        segments.push(`scale(${sx} ${sy})`);
    }
    // 支持输出完整的 rotate 信息（包括中心点）
    if (Number.isFinite(transform.rotation)) {
        if (Number.isFinite(transform.rotationCx) && Number.isFinite(transform.rotationCy)) {
            segments.push(`rotate(${transform.rotation} ${transform.rotationCx} ${transform.rotationCy})`);
        } else {
            segments.push(`rotate(${transform.rotation})`);
        }
    }
    return segments.length > 0 ? segments.join(" ") : undefined;
}

function elementToMarkup(element: SvgElement): string {
    const common = [
        element.fill !== undefined ? `fill="${element.fill}"` : "",
        element.stroke !== undefined ? `stroke="${element.stroke}"` : "",
        element.strokeWidth !== undefined
            ? `stroke-width="${element.strokeWidth}"`
            : "",
        element.strokeDasharray ? `stroke-dasharray="${element.strokeDasharray}"` : "",
        element.strokeLinecap ? `stroke-linecap="${element.strokeLinecap}"` : "",
        element.strokeLinejoin ? `stroke-linejoin="${element.strokeLinejoin}"` : "",
        element.strokeMiterlimit !== undefined ? `stroke-miterlimit="${element.strokeMiterlimit}"` : "",
        element.fillRule ? `fill-rule="${element.fillRule}"` : "",
        element.markerEnd ? `marker-end="${element.markerEnd}"` : "",
        element.markerStart ? `marker-start="${element.markerStart}"` : "",
        element.opacity != null ? `opacity="${element.opacity}"` : "",
        element.filter ? `filter="${element.filter}"` : "",
        element.className ? `class="${element.className}"` : "", // Preserve CSS classes
    ]
        .filter(Boolean)
        .join(" ");

    const transform = serializeTransform(element.transform);
    const transformAttr = transform ? ` transform="${transform}"` : "";

    switch (element.type) {
        case "rect":
            return `<rect id="${element.id}" x="${element.x}" y="${element.y}" width="${element.width}" height="${element.height}"${element.rx ? ` rx="${element.rx}"` : ""}${element.ry ? ` ry="${element.ry}"` : ""} ${common}${transformAttr} />`;
        case "circle":
            return `<circle id="${element.id}" cx="${element.cx}" cy="${element.cy}" r="${element.r}" ${common}${transformAttr} />`;
        case "ellipse":
            return `<ellipse id="${element.id}" cx="${element.cx}" cy="${element.cy}" rx="${element.rx}" ry="${element.ry}" ${common}${transformAttr} />`;
        case "line":
            return `<line id="${element.id}" x1="${element.x1}" y1="${element.y1}" x2="${element.x2}" y2="${element.y2}"${element.startRef ? ` data-start-ref="${element.startRef}"` : ""}${element.endRef ? ` data-end-ref="${element.endRef}"` : ""} ${common}${transformAttr} />`;
        case "path":
            return `<path id="${element.id}" d="${element.d}" ${common}${transformAttr} />`;
        case "text":
            return `<text id="${element.id}" x="${element.x}" y="${element.y}" ${element.fontSize ? `font-size="${element.fontSize}"` : ""} ${element.fontWeight ? `font-weight="${element.fontWeight}"` : ""} ${element.fontFamily ? `font-family="${element.fontFamily}"` : ""} ${element.textAnchor ? `text-anchor="${element.textAnchor}"` : ""} ${common}${transformAttr}>${element.text}</text>`;
        case "image":
            return `<image id="${element.id}" x="${element.x}" y="${element.y}" width="${element.width}" height="${element.height}" href="${element.href}"${element.preserveAspectRatio ? ` preserveAspectRatio="${element.preserveAspectRatio}"` : ""} ${common}${transformAttr} />`;
        case "use":
            return `<use id="${element.id}" href="${element.href}" x="${element.x}" y="${element.y}"${element.width ? ` width="${element.width}"` : ""}${element.height ? ` height="${element.height}"` : ""} ${common}${transformAttr} />`;
        case "g": {
            const childrenMarkup = element.children
                .filter((child) => child.visible !== false)
                .map(elementToMarkup)
                .join("\n");
            return `<g id="${element.id}"${transformAttr ? ` ${transformAttr}` : ""}${common ? ` ${common}` : ""}>${childrenMarkup}</g>`;
        }
        default:
            return "";
    }
}

function buildSvgMarkup(doc: SvgDocument, elements: SvgElement[]): string {
    const viewBox =
        doc.viewBox && doc.viewBox.trim().length > 0
            ? doc.viewBox
            : `0 0 ${doc.width} ${doc.height}`;
    const body = elements
        .filter((el) => el.visible !== false)
        .map(elementToMarkup)
        .join("\n");
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${doc.width}" height="${doc.height}" viewBox="${viewBox}">${body}</svg>`;
}

function parseElement(node: Element, inheritedTransform?: string): SvgElement | null {
    const nodeTransform = node.getAttribute("transform");
    const combinedTransform = [inheritedTransform, nodeTransform]
        .filter(Boolean)
        .join(" ")
        .trim();
    const transform = parseTransform(combinedTransform || null);
    const className = node.getAttribute("class") || undefined; // Preserve CSS classes
    switch (node.tagName.toLowerCase()) {
        case "rect":
            return {
                id: node.getAttribute("id") || nanoid(),
                type: "rect",
                x: parseNumber(node.getAttribute("x")),
                y: parseNumber(node.getAttribute("y")),
                width: parseNumber(node.getAttribute("width")),
                height: parseNumber(node.getAttribute("height")),
                rx: parseOptionalNumber(node.getAttribute("rx")),
                ry: parseOptionalNumber(node.getAttribute("ry")),
                fill: node.getAttribute("fill") || undefined,
                stroke: node.getAttribute("stroke") || undefined,
                strokeWidth: parseOptionalNumber(node.getAttribute("stroke-width")),
                strokeDasharray: node.getAttribute("stroke-dasharray") || undefined,
                strokeLinecap: (node.getAttribute("stroke-linecap") as any) || undefined,
                strokeLinejoin: (node.getAttribute("stroke-linejoin") as any) || undefined,
                strokeMiterlimit: parseOptionalNumber(node.getAttribute("stroke-miterlimit")),
                fillRule: (node.getAttribute("fill-rule") as any) || undefined,
                markerEnd: node.getAttribute("marker-end") || undefined,
                markerStart: node.getAttribute("marker-start") || undefined,
                opacity: parseOptionalNumber(node.getAttribute("opacity")),
                transform,
                className,
                visible: node.getAttribute("data-visible") !== "false",
                locked: node.getAttribute("data-locked") === "true",
                filter: node.getAttribute("filter") || undefined,
            } as RectElement;
        case "circle": {
            return {
                id: node.getAttribute("id") || nanoid(),
                type: "circle",
                cx: parseNumber(node.getAttribute("cx")),
                cy: parseNumber(node.getAttribute("cy")),
                r: parseNumber(node.getAttribute("r")),
                fill: node.getAttribute("fill") || undefined,
                stroke: node.getAttribute("stroke") || undefined,
                strokeWidth: parseOptionalNumber(node.getAttribute("stroke-width")),
                strokeDasharray: node.getAttribute("stroke-dasharray") || undefined,
                strokeLinecap: (node.getAttribute("stroke-linecap") as any) || undefined,
                strokeLinejoin: (node.getAttribute("stroke-linejoin") as any) || undefined,
                strokeMiterlimit: parseOptionalNumber(node.getAttribute("stroke-miterlimit")),
                fillRule: (node.getAttribute("fill-rule") as any) || undefined,
                markerEnd: node.getAttribute("marker-end") || undefined,
                markerStart: node.getAttribute("marker-start") || undefined,
                opacity: parseOptionalNumber(node.getAttribute("opacity")),
                transform,
                className,
                visible: node.getAttribute("data-visible") !== "false",
                locked: node.getAttribute("data-locked") === "true",
                filter: node.getAttribute("filter") || undefined,
            } as CircleElement;
        }
        case "ellipse":
            return {
                id: node.getAttribute("id") || nanoid(),
                type: "ellipse",
                cx: parseNumber(node.getAttribute("cx")),
                cy: parseNumber(node.getAttribute("cy")),
                rx: parseNumber(node.getAttribute("rx")),
                ry: parseNumber(node.getAttribute("ry")),
                fill: node.getAttribute("fill") || undefined,
                stroke: node.getAttribute("stroke") || undefined,
                strokeWidth: parseOptionalNumber(node.getAttribute("stroke-width")),
                strokeDasharray: node.getAttribute("stroke-dasharray") || undefined,
                strokeLinecap: (node.getAttribute("stroke-linecap") as any) || undefined,
                strokeLinejoin: (node.getAttribute("stroke-linejoin") as any) || undefined,
                strokeMiterlimit: parseOptionalNumber(node.getAttribute("stroke-miterlimit")),
                fillRule: (node.getAttribute("fill-rule") as any) || undefined,
                markerEnd: node.getAttribute("marker-end") || undefined,
                markerStart: node.getAttribute("marker-start") || undefined,
                opacity: parseOptionalNumber(node.getAttribute("opacity")),
                transform,
                className,
                visible: node.getAttribute("data-visible") !== "false",
                locked: node.getAttribute("data-locked") === "true",
                filter: node.getAttribute("filter") || undefined,
            } as EllipseElement;
        case "line":
            return {
                id: node.getAttribute("id") || nanoid(),
                type: "line",
                x1: parseNumber(node.getAttribute("x1")),
                y1: parseNumber(node.getAttribute("y1")),
                x2: parseNumber(node.getAttribute("x2")),
                y2: parseNumber(node.getAttribute("y2")),
                startRef: node.getAttribute("data-start-ref"),
                endRef: node.getAttribute("data-end-ref"),
                stroke: node.getAttribute("stroke") || undefined,
                strokeWidth: parseOptionalNumber(node.getAttribute("stroke-width")),
                strokeDasharray: node.getAttribute("stroke-dasharray") || undefined,
                strokeLinecap: (node.getAttribute("stroke-linecap") as any) || undefined,
                strokeLinejoin: (node.getAttribute("stroke-linejoin") as any) || undefined,
                strokeMiterlimit: parseOptionalNumber(node.getAttribute("stroke-miterlimit")),
                markerEnd: node.getAttribute("marker-end") || undefined,
                markerStart: node.getAttribute("marker-start") || undefined,
                opacity: parseOptionalNumber(node.getAttribute("opacity")),
                transform,
                className,
                visible: node.getAttribute("data-visible") !== "false",
                locked: node.getAttribute("data-locked") === "true",
                filter: node.getAttribute("filter") || undefined,
            } as LineElement;
        case "path":
            return {
                id: node.getAttribute("id") || nanoid(),
                type: "path",
                d: node.getAttribute("d") || "",
                fill: node.getAttribute("fill") || undefined,
                stroke: node.getAttribute("stroke") || undefined,
                strokeWidth: parseOptionalNumber(node.getAttribute("stroke-width")),
                strokeDasharray: node.getAttribute("stroke-dasharray") || undefined,
                strokeLinecap: (node.getAttribute("stroke-linecap") as any) || undefined,
                strokeLinejoin: (node.getAttribute("stroke-linejoin") as any) || undefined,
                strokeMiterlimit: parseOptionalNumber(node.getAttribute("stroke-miterlimit")),
                fillRule: (node.getAttribute("fill-rule") as any) || undefined,
                markerEnd: node.getAttribute("marker-end") || undefined,
                markerStart: node.getAttribute("marker-start") || undefined,
                opacity: parseOptionalNumber(node.getAttribute("opacity")),
                transform,
                className,
                visible: node.getAttribute("data-visible") !== "false",
                locked: node.getAttribute("data-locked") === "true",
                filter: node.getAttribute("filter") || undefined,
            } as PathElement;
        case "polyline":
        case "polygon": {
            const points = node.getAttribute("points");
            if (!points) return null;
            const coords = points.trim().split(/\s+|,/);
            let d = "";
            for (let i = 0; i < coords.length; i += 2) {
                const x = parseFloat(coords[i]);
                const y = parseFloat(coords[i + 1]);
                if (Number.isFinite(x) && Number.isFinite(y)) {
                    d += (i === 0 ? "M" : "L") + `${x} ${y} `;
                }
            }
            if (node.tagName.toLowerCase() === "polygon") {
                d += "Z";
            }
            return {
                id: node.getAttribute("id") || nanoid(),
                type: "path",
                d: d.trim(),
                fill: node.getAttribute("fill") || "none",
                stroke: node.getAttribute("stroke") || undefined,
                strokeWidth: parseOptionalNumber(node.getAttribute("stroke-width")),
                strokeDasharray: node.getAttribute("stroke-dasharray") || undefined,
                strokeLinecap: (node.getAttribute("stroke-linecap") as any) || undefined,
                strokeLinejoin: (node.getAttribute("stroke-linejoin") as any) || undefined,
                strokeMiterlimit: parseOptionalNumber(node.getAttribute("stroke-miterlimit")),
                fillRule: (node.getAttribute("fill-rule") as any) || undefined,
                markerEnd: node.getAttribute("marker-end") || undefined,
                markerStart: node.getAttribute("marker-start") || undefined,
                opacity: parseOptionalNumber(node.getAttribute("opacity")),
                transform,
                className,
                visible: node.getAttribute("data-visible") !== "false",
                locked: node.getAttribute("data-locked") === "true",
                filter: node.getAttribute("filter") || undefined,
            } as PathElement;
        }
        case "text":
            return {
                id: node.getAttribute("id") || nanoid(),
                type: "text",
                x: parseNumber(node.getAttribute("x")),
                y: parseNumber(node.getAttribute("y")),
                text: node.textContent || "",
                fontSize: parseOptionalNumber(node.getAttribute("font-size")),
                fontWeight: node.getAttribute("font-weight") || undefined,
                fontFamily: node.getAttribute("font-family") || undefined,
                textAnchor: (node.getAttribute("text-anchor") as any) || undefined,
                dominantBaseline: (node.getAttribute("dominant-baseline") as any) || undefined,
                fill: node.getAttribute("fill") || undefined,
                stroke: node.getAttribute("stroke") || undefined,
                strokeWidth: parseOptionalNumber(node.getAttribute("stroke-width")),
                strokeDasharray: node.getAttribute("stroke-dasharray") || undefined,
                strokeLinecap: (node.getAttribute("stroke-linecap") as any) || undefined,
                strokeLinejoin: (node.getAttribute("stroke-linejoin") as any) || undefined,
                markerEnd: node.getAttribute("marker-end") || undefined,
                markerStart: node.getAttribute("marker-start") || undefined,
                opacity: parseOptionalNumber(node.getAttribute("opacity")),
                transform,
                className,
                visible: node.getAttribute("data-visible") !== "false",
                locked: node.getAttribute("data-locked") === "true",
                filter: node.getAttribute("filter") || undefined,
            } as TextElement;
        case "image": {
            const href = node.getAttribute("href") || node.getAttribute("xlink:href") || "";
            return {
                id: node.getAttribute("id") || nanoid(),
                type: "image",
                x: parseNumber(node.getAttribute("x")),
                y: parseNumber(node.getAttribute("y")),
                width: parseNumber(node.getAttribute("width")),
                height: parseNumber(node.getAttribute("height")),
                href,
                preserveAspectRatio: node.getAttribute("preserveAspectRatio") || undefined,
                fill: node.getAttribute("fill") || undefined,
                stroke: node.getAttribute("stroke") || undefined,
                strokeWidth: parseOptionalNumber(node.getAttribute("stroke-width")),
                opacity: parseOptionalNumber(node.getAttribute("opacity")),
                transform,
                className,
                visible: node.getAttribute("data-visible") !== "false",
                locked: node.getAttribute("data-locked") === "true",
                filter: node.getAttribute("filter") || undefined,
            } as ImageElement;
        }
        case "use": {
            const href = node.getAttribute("href") || node.getAttribute("xlink:href") || "";
            return {
                id: node.getAttribute("id") || nanoid(),
                type: "use",
                x: parseNumber(node.getAttribute("x")),
                y: parseNumber(node.getAttribute("y")),
                width: parseOptionalNumber(node.getAttribute("width")),
                height: parseOptionalNumber(node.getAttribute("height")),
                href,
                fill: node.getAttribute("fill") || undefined,
                stroke: node.getAttribute("stroke") || undefined,
                strokeWidth: parseOptionalNumber(node.getAttribute("stroke-width")),
                opacity: parseOptionalNumber(node.getAttribute("opacity")),
                transform,
                className,
                visible: node.getAttribute("data-visible") !== "false",
                locked: node.getAttribute("data-locked") === "true",
                filter: node.getAttribute("filter") || undefined,
            } as UseElement;
        }
        case "g": {
            const groupTransform = node.getAttribute("transform");
            // const combinedTransform = [inheritedTransform, groupTransform].filter(Boolean).join(" ").trim();

            const children: SvgElement[] = [];
            // console.log(`[parseElement] Parsing group: ${node.id}, children count: ${node.children.length}`);
            // console.log(`[parseElement] Group outerHTML: ${node.outerHTML.slice(0, 100)}`);

            Array.from(node.children).forEach((child) => {
                if (!(child instanceof Element)) return;
                const tagName = child.tagName.toLowerCase();
                // 跳过定义元素
                if (["defs", "symbol", "marker", "pattern", "mask", "clippath", "style", "script", "title", "desc", "metadata"].includes(tagName)) {
                    return;
                }
                // Don't pass combinedTransform to children, as they will inherit it from the group element itself
                const parsed = parseElement(child, undefined);
                if (parsed) {
                    children.push(parsed);
                } else {
                    // console.log(`[parseElement] Failed to parse child: ${tagName}`);
                }
            });
            // console.log(`[parseElement] Group parsed with ${children.length} children`);

            return {
                id: node.getAttribute("id") || nanoid(),
                type: "g",
                children,
                fill: node.getAttribute("fill") || undefined,
                stroke: node.getAttribute("stroke") || undefined,
                strokeWidth: parseOptionalNumber(node.getAttribute("stroke-width")),
                strokeDasharray: node.getAttribute("stroke-dasharray") || undefined,
                strokeLinecap: (node.getAttribute("stroke-linecap") as any) || undefined,
                strokeLinejoin: (node.getAttribute("stroke-linejoin") as any) || undefined,
                strokeMiterlimit: parseOptionalNumber(node.getAttribute("stroke-miterlimit")),
                fillRule: (node.getAttribute("fill-rule") as any) || undefined,
                opacity: parseOptionalNumber(node.getAttribute("opacity")),
                transform: parseTransform(groupTransform || null),
                className,
                visible: node.getAttribute("data-visible") !== "false",
                locked: node.getAttribute("data-locked") === "true",
                filter: node.getAttribute("filter") || undefined,
            } as GroupElement;
        }
        default:
            return null;
    }
}

function decodeSvgContent(svg: string): string {
    const trimmed = svg.trim();
    if (trimmed.startsWith("data:image/svg+xml")) {
        const commaIndex = trimmed.indexOf(",");
        const payload = commaIndex >= 0 ? trimmed.slice(commaIndex + 1) : trimmed;
        try {
            return decodeURIComponent(payload);
        } catch {
            return trimmed;
        }
    }
    return trimmed;
}

function removeDuplicateAttributes(svg: string): string {
    // 匹配标签开始部分 <tag ... >
    return svg.replace(/<([a-zA-Z0-9:-]+)([^>]+)>/g, (match, tagName, attributes) => {
        const seen = new Set<string>();
        // 匹配属性 key="value" 或 key='value' 或 key=value
        const cleanedAttributes = attributes.replace(/([a-zA-Z0-9:-]+)\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/g, (attrMatch: string, name: string, value: string) => {
            if (seen.has(name)) {
                return ""; // 移除重复属性
            }
            seen.add(name);
            return attrMatch;
        });
        return `<${tagName}${cleanedAttributes}>`;
    });
}

function parseSvgMarkup(svg: string, skipOptimization = false): { doc: SvgDocument; elements: SvgElement[]; defs?: string | null; valid: boolean } {
    // console.log("Parsing SVG...", svg.slice(0, 200));
    let normalized = decodeSvgContent(svg);

    // 简单的预处理：转义未转义的 & 符号，防止 DOMParser 解析失败导致截断
    // 匹配 & 后面不是 (字母/数字/# 开头 + ;) 的情况
    normalized = normalized.replace(/&(?![a-zA-Z0-9#]+;)/g, "&amp;");

    // 移除重复属性 (修复 Attribute redefined 错误)
    // 在流式渲染等高性能场景下可以跳过此步骤
    if (!skipOptimization) {
        normalized = removeDuplicateAttributes(normalized);
    }

    const parser = new DOMParser();
    const parsed = parser.parseFromString(normalized, "image/svg+xml");

    const parserError = parsed.querySelector("parsererror");
    if (parserError) {
        console.error("DOMParser error:", parserError.textContent);
        console.log("Normalized SVG:", normalized);
    }

    const svgEl = parsed.querySelector("svg");
    if (!svgEl) {
        console.warn("SVG 内容缺少 <svg> 根节点，忽略载入。内容片段：", normalized.slice(0, 120));
        return {
            doc: { ...DEFAULT_DOC },
            elements: [],
            defs: null,
            valid: false,
        };
    }
    const widthAttr = svgEl.getAttribute("width");
    const heightAttr = svgEl.getAttribute("height");
    const viewBox = svgEl.getAttribute("viewBox");
    const [vbX, vbY, vbW, vbH] = (viewBox || "")
        .split(/[\s,]+/)
        .map((value) => parseFloat(value))
        .filter((value) => Number.isFinite(value));
    const width =
        parseNumber(widthAttr, Number.isFinite(vbW) ? vbW : DEFAULT_DOC.width) || DEFAULT_DOC.width;
    const height =
        parseNumber(heightAttr, Number.isFinite(vbH) ? vbH : DEFAULT_DOC.height) || DEFAULT_DOC.height;

    const elements: SvgElement[] = [];
    const defsEl = svgEl.querySelector("defs");
    let defs = defsEl ? defsEl.innerHTML : "";

    // 收集所有 marker、gradient、filter、pattern 定义（包括 defs 外的）
    const markerNodes = svgEl.querySelectorAll("marker");
    const gradientNodes = svgEl.querySelectorAll("linearGradient, radialGradient");
    const filterNodes = svgEl.querySelectorAll("filter");
    const patternNodes = svgEl.querySelectorAll("pattern");

    const additionalDefs: string[] = [];

    // 收集不在 defs 内的定义元素
    [...markerNodes, ...gradientNodes, ...filterNodes, ...patternNodes].forEach(node => {
        if (!defsEl || !defsEl.contains(node)) {
            additionalDefs.push(node.outerHTML);
        }
    });

    if (additionalDefs.length > 0) {
        defs = defs + "\n" + additionalDefs.join("\n");
    }
    const walker = (nodeList: Iterable<Node>, inheritedTransform?: string) => {
        for (const node of nodeList) {
            if (!(node instanceof Element)) continue;

            // STOP recursion for non-renderable containers
            const tagName = node.tagName.toLowerCase();
            if (["defs", "symbol", "marker", "pattern", "mask", "clippath", "style", "script", "title", "desc", "metadata"].includes(tagName)) {
                continue;
            }

            const parsedElement = parseElement(node, inheritedTransform);
            const nextTransform = [inheritedTransform, node.getAttribute("transform")]
                .filter(Boolean)
                .join(" ")
                .trim();
            if (parsedElement) {
                elements.push(parsedElement);
            }
            if (node.children && node.children.length > 0 && tagName !== "g") {
                walker(Array.from(node.children), nextTransform || undefined);
            }
        }
    };
    walker(Array.from(svgEl.children));
    console.log(`Parsed ${elements.length} elements from SVG.`);

    return {
        doc: { width, height, viewBox: viewBox || `0 0 ${width} ${height}` },
        elements,
        defs: defs.trim() || null,
        valid: true,
    };
}

export function SvgEditorProvider({ children }: { children: React.ReactNode }) {
    const [doc, setDoc] = useState<SvgDocument>(DEFAULT_DOC);
    const [elements, setElements] = useState<SvgElement[]>([]);
    const [tool, setTool] = useState<SvgTool>("select");
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [history, setHistory] = useState<HistoryEntry[]>([]);
    const [activeHistoryIndex, setActiveHistoryIndex] = useState(-1);
    const [past, setPast] = useState<EditorSnapshot[]>([]);
    const [future, setFuture] = useState<EditorSnapshot[]>([]);
    const [defsMarkup, setDefsMarkup] = useState<string | null>(null);
    const [symbolLibrary, setSymbolLibrary] = useState<Map<string, SvgElement>>(new Map());
    const [importHistory, setImportHistory] = useState<ImportRecord[]>([]);
    const [streamingSvgContent, setStreamingSvgContent] = useState<string | null>(null);
    const [previewSvgMarkup, setPreviewSvgMarkup] = useState<string | null>(null);
    const [rawSvgMarkup, setRawSvgMarkup] = useState<string | null>(null);
    const [hasLocalChanges, setHasLocalChanges] = useState(false);

    const markLocalChange = useCallback(() => {
        setHasLocalChanges(true);
    }, []);

    const takeSnapshot = useCallback(
        (
            customElements?: SvgElement[],
            customDoc?: SvgDocument,
            customDefs?: string | null
        ): EditorSnapshot => ({
            doc: { ...(customDoc ?? doc) },
            elements: (customElements ?? elements).map((el) => ({ ...el })),
            defs: customDefs ?? defsMarkup,
        }),
        [doc, elements, defsMarkup]
    );

    const pushHistorySnapshot = useCallback(
        (customElements?: SvgElement[], customDoc?: SvgDocument, customDefs?: string | null) => {
            setPast((prev) => {
                const next = [...prev, takeSnapshot(customElements, customDoc, customDefs)];
                return next.slice(-50);
            });
            setFuture([]);
        },
        [takeSnapshot]
    );

    const updateDoc = useCallback(
        (partial: Partial<SvgDocument>) => {
            pushHistorySnapshot();
            setDoc((prev) => {
                const next = { ...prev, ...partial };
                const targetWidth = partial.width ?? prev.width;
                const targetHeight = partial.height ?? prev.height;
                const viewBoxMatchesSize =
                    prev.viewBox === `0 0 ${prev.width} ${prev.height}` || !prev.viewBox;
                if (viewBoxMatchesSize && (partial.width || partial.height)) {
                    next.viewBox = `0 0 ${targetWidth} ${targetHeight}`;
                }
                return next;
            });
            markLocalChange();
        },
        [pushHistorySnapshot, markLocalChange]
    );

    const addHistory = useCallback(
        (snapshotSvg: string) => {
            const dataUrl = svgToDataUrl(snapshotSvg);
            setHistory((prev) => {
                const next = [...prev, { svg: snapshotSvg, dataUrl, timestamp: Date.now() }];
                setActiveHistoryIndex(next.length - 1);
                return next;
            });
        },
        []
    );

    const exportSvgMarkup = useCallback(() => {
        const viewBox =
            doc.viewBox && doc.viewBox.trim().length > 0
                ? doc.viewBox
                : `0 0 ${doc.width} ${doc.height}`;
        const defsContent = defsMarkup ? `<defs>${defsMarkup}</defs>` : "";
        const body = elements
            .filter((el) => el.visible !== false)
            .map(elementToMarkup)
            .join("\n");
        return `<svg xmlns="http://www.w3.org/2000/svg" width="${doc.width}" height="${doc.height}" viewBox="${viewBox}">${defsContent}${body}</svg>`;
    }, [doc, elements, defsMarkup]);

    // Keep the preview pane rendering the most accurate SVG we have.
    useEffect(() => {
        if (streamingSvgContent) return;
        if (hasLocalChanges) {
            const latest = exportSvgMarkup();
            setPreviewSvgMarkup(latest);
            setRawSvgMarkup(latest);
            setHasLocalChanges(false);
        }
    }, [exportSvgMarkup, hasLocalChanges, streamingSvgContent]);

    const addElement = useCallback(
        (element: Omit<SvgElement, "id"> | SvgElement) => {
            pushHistorySnapshot();
            const next: SvgElement =
                "id" in element && element.id
                    ? (element as SvgElement)
                    : { ...(element as SvgElement), id: nanoid() };
            if (next.visible === undefined) next.visible = true;
            if (next.locked === undefined) next.locked = false;
            setElements((prev) => [...prev, next]);
            setSelectedId(next.id);
            markLocalChange();
            return next.id;
        },
        [pushHistorySnapshot, markLocalChange]
    );

    const updateElement = useCallback(
        (
            id: string,
            updater: Partial<SvgElement> | ((element: SvgElement) => SvgElement),
            options?: { record?: boolean }
        ) => {
            if (options?.record !== false) {
                pushHistorySnapshot();
            }
            setElements((prev) => {
                let delta: { dx: number; dy: number } | null = null;
                const getPosition = (el: SvgElement) => {
                    switch (el.type) {
                        case "rect":
                            return { x: el.x, y: el.y };
                        case "circle":
                            return { x: el.cx, y: el.cy };
                        case "ellipse":
                            return { x: el.cx, y: el.cy };
                        case "line":
                            return null;
                        case "text":
                            return { x: el.x, y: el.y };
                        case "image":
                            return { x: el.x, y: el.y };
                        case "use":
                            return { x: el.x, y: el.y };
                        case "path":
                            return { x: el.transform?.x ?? 0, y: el.transform?.y ?? 0 };
                        case "g":
                            return { x: el.transform?.x ?? 0, y: el.transform?.y ?? 0 };
                        default:
                            return null;
                    }
                };
                const updated = prev.map((item) => {
                    if (item.id !== id) return item;
                    const next =
                        typeof updater === "function"
                            ? (updater as (element: SvgElement) => SvgElement)(item)
                            : { ...item, ...updater };
                    if (item.type !== "line") {
                        const prevPos = getPosition(item);
                        const nextPos = getPosition(next as SvgElement);
                        if (prevPos && nextPos) {
                            delta = {
                                dx: (nextPos.x ?? 0) - (prevPos.x ?? 0),
                                dy: (nextPos.y ?? 0) - (prevPos.y ?? 0),
                            };
                        }
                    }
                    return next as SvgElement;
                }) as SvgElement[];
                if (delta && ((delta as { dx: number; dy: number }).dx !== 0 || (delta as { dx: number; dy: number }).dy !== 0)) {
                    return updated.map((item) => {
                        if (item.type === "line" && (item.startRef === id || item.endRef === id)) {
                            return {
                                ...item,
                                x1: item.x1 + (item.startRef === id ? delta!.dx : 0),
                                y1: item.y1 + (item.startRef === id ? delta!.dy : 0),
                                x2: item.x2 + (item.endRef === id ? delta!.dx : 0),
                                y2: item.y2 + (item.endRef === id ? delta!.dy : 0),
                            };
                        }
                        return item;
                    }) as SvgElement[];
                }
                return updated;
            }
            );
            markLocalChange();
        },
        [pushHistorySnapshot, markLocalChange]
    );

    const moveElement = useCallback(
        (id: string, dx: number, dy: number, options?: { record?: boolean }) => {
            if (options?.record) {
                pushHistorySnapshot();
            }
            setElements((prev) =>
                prev.map((element) => {
                    if (element.id === id) {
                        switch (element.type) {
                            case "rect":
                                return { ...element, x: element.x + dx, y: element.y + dy };
                            case "circle":
                                return { ...element, cx: element.cx + dx, cy: element.cy + dy };
                            case "ellipse":
                                return { ...element, cx: element.cx + dx, cy: element.cy + dy };
                            case "line":
                                return {
                                    ...element,
                                    x1: element.x1 + dx,
                                    y1: element.y1 + dy,
                                    x2: element.x2 + dx,
                                    y2: element.y2 + dy,
                                };
                            case "text":
                                return { ...element, x: element.x + dx, y: element.y + dy };
                            case "image":
                                return { ...element, x: element.x + dx, y: element.y + dy };
                            case "use":
                                return { ...element, x: element.x + dx, y: element.y + dy };
                            case "path":
                            case "g": {
                                const transform = {
                                    ...(element.transform || {}),
                                    x: (element.transform?.x || 0) + dx,
                                    y: (element.transform?.y || 0) + dy,
                                };
                                return { ...element, transform };
                            }
                            default:
                                return element;
                        }
                    }
                    if (
                        element.type === "line" &&
                        (element.startRef === id || element.endRef === id)
                    ) {
                        return {
                            ...element,
                            x1: element.x1 + (element.startRef === id ? dx : 0),
                            y1: element.y1 + (element.startRef === id ? dy : 0),
                            x2: element.x2 + (element.endRef === id ? dx : 0),
                            y2: element.y2 + (element.endRef === id ? dy : 0),
                        };
                    }
                    return element;
                })
            );
            markLocalChange();
        },
        [pushHistorySnapshot, markLocalChange]
    );

    const removeElement = useCallback(
        (id: string) => {
            pushHistorySnapshot();
            setElements((prev) => prev.filter((item) => item.id !== id));
            setSelectedId((prev) => (prev === id ? null : prev));
            markLocalChange();
        },
        [pushHistorySnapshot, markLocalChange]
    );

    const duplicateElement = useCallback(
        (id: string) => {
            const original = elements.find((el) => el.id === id);
            if (!original) return null;
            pushHistorySnapshot();
            const clone: SvgElement = {
                ...(original as SvgElement),
                id: nanoid(),
            };
            switch (clone.type) {
                case "rect":
                    clone.x += 12;
                    clone.y += 12;
                    break;
                case "circle":
                    clone.cx += 12;
                    clone.cy += 12;
                    break;
                case "ellipse":
                    clone.cx += 12;
                    clone.cy += 12;
                    break;
                case "line":
                    clone.x1 += 12;
                    clone.x2 += 12;
                    clone.y1 += 12;
                    clone.y2 += 12;
                    break;
                case "text":
                    clone.x += 12;
                    clone.y += 12;
                    break;
                case "image":
                    clone.x += 12;
                    clone.y += 12;
                    break;
                case "use":
                    clone.x += 12;
                    clone.y += 12;
                    break;
                case "path":
                case "g":
                    clone.transform = {
                        ...(clone.transform || {}),
                        x: (clone.transform?.x || 0) + 12,
                        y: (clone.transform?.y || 0) + 12,
                    };
                    break;
                default:
                    break;
            }
            // Group 需要递归复制子元素
            if (clone.type === "g") {
                clone.children = clone.children.map(child => ({
                    ...child,
                    id: nanoid()
                }));
            }
            setElements((prev) => [...prev, clone]);
            setSelectedId(clone.id);
            markLocalChange();
            return clone.id;
        },
        [elements, pushHistorySnapshot, markLocalChange]
    );

    const duplicateMany = useCallback(
        (ids: Iterable<string>) => {
            const idList = Array.from(ids);
            if (idList.length === 0) return [];
            pushHistorySnapshot();
            const created: string[] = [];
            setElements((prev) => {
                const next: SvgElement[] = [...prev];
                idList.forEach((id) => {
                    const original = prev.find((el) => el.id === id);
                    if (!original) return;
                    const clone: SvgElement = {
                        ...(original as SvgElement),
                        id: nanoid(),
                    };
                    switch (clone.type) {
                        case "rect":
                            clone.x += 12;
                            clone.y += 12;
                            break;
                        case "circle":
                            clone.cx += 12;
                            clone.cy += 12;
                            break;
                        case "ellipse":
                            clone.cx += 12;
                            clone.cy += 12;
                            break;
                        case "line":
                            clone.x1 += 12;
                            clone.x2 += 12;
                            clone.y1 += 12;
                            clone.y2 += 12;
                            break;
                        case "text":
                            clone.x += 12;
                            clone.y += 12;
                            break;
                        case "image":
                            clone.x += 12;
                            clone.y += 12;
                            break;
                        case "use":
                            clone.x += 12;
                            clone.y += 12;
                            break;
                        case "path":
                        case "g":
                            clone.transform = {
                                ...(clone.transform || {}),
                                x: (clone.transform?.x || 0) + 12,
                                y: (clone.transform?.y || 0) + 12,
                            };
                            break;
                        default:
                            break;
                    }
                    // Group 需要递归复制子元素
                    if (clone.type === "g") {
                        clone.children = clone.children.map(child => ({
                            ...child,
                            id: nanoid()
                        }));
                    }
                    created.push(clone.id);
                    next.push(clone);
                });
                return next;
            });
            setSelectedId(created.length === 1 ? created[0] : null);
            setSelectedIds(new Set(created));
            markLocalChange();
            return created;
        },
        [elements, pushHistorySnapshot, markLocalChange]
    );

    const removeMany = useCallback(
        (ids: Iterable<string>) => {
            const idList = Array.from(ids);
            if (idList.length === 0) return;
            pushHistorySnapshot();
            setElements((prev) => prev.filter((item) => !idList.includes(item.id)));
            setSelectedId(null);
            setSelectedIds(new Set());
            markLocalChange();
        },
        [pushHistorySnapshot, markLocalChange]
    );

    const summarizeSvgStats = (elements: SvgElement[]) => {
        let elementCount = 0;
        let pathCount = 0;
        const visit = (list: SvgElement[]) => {
            list.forEach((el) => {
                elementCount += 1;
                if (el.type === "path") {
                    pathCount += 1;
                }
                if (el.type === "g") {
                    visit(el.children);
                }
            });
        };
        visit(elements);
        return { elementCount, pathCount };
    };

    const addImportRecord = useCallback((record: Omit<ImportRecord, "id">) => {
        setImportHistory((prev) => {
            const next = [{ ...record, id: nanoid() }, ...prev];
            return next.slice(0, 5);
        });
    }, []);

    const loadSvgMarkup = useCallback(
        (svg: string, options?: { saveHistory?: boolean; skipSnapshot?: boolean; skipOptimization?: boolean; recordMeta?: { name?: string; type?: "paste" | "upload" } }) => {
            try {
                const content = svg.trim();
                if (!content.toLowerCase().includes("<svg")) {
                    console.warn("忽略非 SVG 内容载入：", content.slice(0, 120));
                    return;
                }
                const normalized = decodeSvgContent(content);
                const parsed = parseSvgMarkup(normalized, options?.skipOptimization);
                if (!parsed.valid) {
                    return;
                }
                setRawSvgMarkup(content);
                setPreviewSvgMarkup(normalized);
                setHasLocalChanges(false);
                setDoc(parsed.doc);
                setElements(parsed.elements);
                setDefsMarkup(parsed.defs ?? null);
                setSelectedId(null);
                if (options?.skipSnapshot !== true) {
                    pushHistorySnapshot(parsed.elements, parsed.doc, parsed.defs ?? null);
                }
                if (options?.saveHistory !== false) {
                    const snapshot = buildSvgMarkup(parsed.doc, parsed.elements);
                    addHistory(snapshot);
                }
                if (options?.recordMeta) {
                    const stats = summarizeSvgStats(parsed.elements);
                    addImportRecord({
                        name: options.recordMeta.name ?? "SVG 导入",
                        type: options.recordMeta.type ?? "upload",
                        content: normalized,
                        timestamp: Date.now(),
                        stats: {
                            width: parsed.doc.width,
                            height: parsed.doc.height,
                            elementCount: stats.elementCount,
                            pathCount: stats.pathCount,
                        },
                    });
                }
            } catch (error) {
                console.error("解析 SVG 失败：", error);
            }
        },
        [addHistory, pushHistorySnapshot, addImportRecord]
    );

    const clearSvg = useCallback(() => {
        pushHistorySnapshot();
        setDoc(DEFAULT_DOC);
        setElements([]);
        setDefsMarkup(null);
        setSelectedId(null);
        setHistory([]);
        setActiveHistoryIndex(-1);
        setPast([]);
        setFuture([]);
        setPreviewSvgMarkup(null);
        setRawSvgMarkup(null);
        setHasLocalChanges(false);
    }, [pushHistorySnapshot]);

    const restoreHistoryAt = useCallback((index: number) => {
        const entry = history[index];
        if (!entry) return;
        try {
            const parsed = parseSvgMarkup(entry.svg);
            setDoc(parsed.doc);
            setElements(
                parsed.elements.map((el) => ({
                    ...el,
                    visible: el.visible !== false,
                    locked: el.locked === true,
                }))
            );
            setSelectedId(null);
            setActiveHistoryIndex(index);
            setPreviewSvgMarkup(entry.svg);
            setRawSvgMarkup(entry.svg);
            setHasLocalChanges(false);
        } catch (error) {
            console.error("恢复历史失败：", error);
        }
    }, [history]);

    const undo = useCallback(() => {
        setPast((prev) => {
            if (prev.length === 0) return prev;
            const last = prev[prev.length - 1];
            setFuture((f) => [takeSnapshot(), ...f].slice(0, 50));
            setDoc(last.doc);
            setElements(last.elements);
            setSelectedId(null);
            markLocalChange();
            return prev.slice(0, -1);
        });
    }, [takeSnapshot, markLocalChange]);

    const redo = useCallback(() => {
        setFuture((prev) => {
            if (prev.length === 0) return prev;
            const next = prev[0];
            setPast((p) => [...p, takeSnapshot()].slice(-50));
            setDoc(next.doc);
            setElements(next.elements);
            setSelectedId(null);
            return prev.slice(1);
        });
    }, [takeSnapshot, markLocalChange]);

    const registerSymbol = useCallback((id: string, element: SvgElement) => {
        setSymbolLibrary((prev) => {
            const next = new Map(prev);
            next.set(id, element);
            return next;
        });
    }, []);

    const resolveUseReference = useCallback((href: string): SvgElement | null => {
        const id = href.startsWith("#") ? href.slice(1) : href;
        return symbolLibrary.get(id) || null;
    }, [symbolLibrary]);

    const value = useMemo(
        () => ({
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
            loadSvgMarkup,
            exportSvgMarkup,
            clearSvg,
            removeElement,
            duplicateElement,
            duplicateMany,
            removeMany,
            history,
            activeHistoryIndex,
            restoreHistoryAt,
            undo,
            redo,
            commitSnapshot: () => pushHistorySnapshot(),
            defsMarkup,
            symbolLibrary,
            registerSymbol,
            resolveUseReference,
            importHistory,
            addImportRecord,
            streamingSvgContent,
            setStreamingSvgContent,
            previewSvgMarkup,
            rawSvgMarkup,
        }),
        [
            doc,
            elements,
            tool,
            selectedId,
            selectedIds,
            addElement,
            updateElement,
            moveElement,
            updateDoc,
            loadSvgMarkup,
            exportSvgMarkup,
            clearSvg,
            removeElement,
            duplicateElement,
            duplicateMany,
            removeMany,
            history,
            activeHistoryIndex,
            restoreHistoryAt,
            undo,
            redo,
            pushHistorySnapshot,
            defsMarkup,
            symbolLibrary,
            registerSymbol,
            resolveUseReference,
            importHistory,
            addImportRecord,
            streamingSvgContent,
            previewSvgMarkup,
            rawSvgMarkup,
        ]
    );

    return (
        <SvgEditorContext.Provider value={value}>
            {children}
        </SvgEditorContext.Provider>
    );
}

export function useSvgEditor() {
    const context = useContext(SvgEditorContext);
    if (!context) {
        throw new Error("useSvgEditor must be used within SvgEditorProvider");
    }
    return context;
}
