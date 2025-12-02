import React from "react";
import { SvgElement } from "@/contexts/svg-editor-context";
import { cn } from "@/lib/utils";

function transformStyle(element: SvgElement) {
    if (!element.transform) return undefined;
    const { x, y, scaleX, scaleY, rotation, rotationCx, rotationCy } = element.transform;
    const parts = [];
    if (x || y) parts.push(`translate(${x || 0} ${y || 0})`);
    if (scaleX || scaleY) parts.push(`scale(${scaleX || 1} ${scaleY || (scaleX || 1)})`);
    if (rotation) {
        if (rotationCx !== undefined && rotationCy !== undefined) {
            parts.push(`rotate(${rotation} ${rotationCx} ${rotationCy})`);
        } else {
            parts.push(`rotate(${rotation})`);
        }
    }
    return parts.join(" ");
}

export function SvgElementRenderer({
    element,
    selectedIds,
    selectedId,
    onPointerDown,
    registerRef,
}: {
    element: SvgElement;
    selectedIds: Set<string>;
    selectedId: string | null;
    onPointerDown: (event: React.PointerEvent, element: SvgElement) => void;
    registerRef: (id: string, node: SVGGraphicsElement | null) => void;
}) {
    if (element.visible === false) return null;
    const transform = transformStyle(element);
    const commonProps = {
        ref: (node: SVGGraphicsElement | null) => registerRef(element.id, node),
        onPointerDown: (event: React.PointerEvent) => {
            console.log(`[SvgElementRenderer] onPointerDown triggered for:`, element.type, element.id);
            onPointerDown(event, element);
        },
        transform,
        className: cn(
            element.className, // Preserve original CSS classes from imported SVG
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
                    strokeLinecap={element.strokeLinecap}
                    strokeLinejoin={element.strokeLinejoin}
                    markerEnd={element.markerEnd}
                    markerStart={element.markerStart}
                    opacity={element.opacity}
                    filter={element.filter}
                />
            );
        case "circle":
            return (
                <circle
                    key={element.id}
                    {...commonProps}
                    cx={element.cx}
                    cy={element.cy}
                    r={element.r}
                    fill={element.fill || "none"}
                    stroke={element.stroke}
                    strokeWidth={element.strokeWidth || 1.4}
                    strokeDasharray={element.strokeDasharray}
                    strokeLinecap={element.strokeLinecap}
                    strokeLinejoin={element.strokeLinejoin}
                    markerEnd={element.markerEnd}
                    markerStart={element.markerStart}
                    opacity={element.opacity}
                    filter={element.filter}
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
                    strokeLinecap={element.strokeLinecap}
                    strokeLinejoin={element.strokeLinejoin}
                    markerEnd={element.markerEnd}
                    markerStart={element.markerStart}
                    opacity={element.opacity}
                    filter={element.filter}
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
                            onPointerDown(event, element)
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
                        strokeLinecap={element.strokeLinecap}
                        strokeLinejoin={element.strokeLinejoin}
                        markerEnd={element.markerEnd}
                        markerStart={element.markerStart}
                        opacity={element.opacity}
                        filter={element.filter}
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
                    strokeLinecap={element.strokeLinecap}
                    strokeLinejoin={element.strokeLinejoin}
                    markerEnd={element.markerEnd}
                    markerStart={element.markerStart}
                    opacity={element.opacity}
                    filter={element.filter}
                />
            );
        case "text":
            return (
                <text
                    key={element.id}
                    ref={(node: SVGGraphicsElement | null) => registerRef(element.id, node)}
                    transform={transform}
                    x={element.x}
                    y={element.y}
                    fill={element.fill || "#0f172a"}
                    fontSize={element.fontSize || 16}
                    fontWeight={element.fontWeight}
                    fontFamily={element.fontFamily}
                    textAnchor={element.textAnchor}
                    dominantBaseline={element.dominantBaseline}
                    filter={element.filter}
                    // Allow clicks to pass through text to elements behind
                    pointerEvents="none"
                    className={cn(
                        "select-none",
                        element.visible === (false as any) && "opacity-30",
                        (selectedIds.has(element.id) || selectedId === element.id) &&
                        "outline-none ring-2 ring-offset-2 ring-blue-500/50"
                    )}
                >
                    {element.tspans && element.tspans.length > 0 ? (
                        element.tspans.map((tspan, index) => (
                            <tspan
                                key={index}
                                x={tspan.x}
                                y={tspan.y}
                                dx={tspan.dx}
                                dy={tspan.dy}
                                fontSize={tspan.fontSize}
                                fontWeight={tspan.fontWeight}
                                fontFamily={tspan.fontFamily}
                                fill={tspan.fill}
                            >
                                {tspan.text}
                            </tspan>
                        ))
                    ) : (
                        element.text
                    )}
                </text>
            );
        case "image":
            return (
                <image
                    key={element.id}
                    {...commonProps}
                    x={element.x}
                    y={element.y}
                    width={element.width}
                    height={element.height}
                    href={element.href}
                    preserveAspectRatio={element.preserveAspectRatio}
                    opacity={element.opacity}
                    filter={element.filter}
                />
            );
        case "use":
            return (
                <use
                    key={element.id}
                    {...commonProps}
                    href={element.href}
                    x={element.x}
                    y={element.y}
                    width={element.width}
                    height={element.height}
                    fill={element.fill}
                    stroke={element.stroke}
                    strokeWidth={element.strokeWidth}
                    opacity={element.opacity}
                    filter={element.filter}
                />
            );
        case "g":
            return (
                <g
                    key={element.id}
                    ref={(node: SVGGraphicsElement | null) => registerRef(element.id, node)}
                    transform={transform}
                    className={cn(
                        "cursor-default",
                        (selectedIds.has(element.id) || selectedId === element.id) &&
                        "outline-none ring-2 ring-offset-2 ring-blue-500/50"
                    )}
                    fill={element.fill}
                    stroke={element.stroke}
                    strokeWidth={element.strokeWidth}
                    opacity={element.opacity}
                    filter={element.filter}
                    fontSize={element.fontSize}
                    fontWeight={element.fontWeight}
                    fontFamily={element.fontFamily}
                    textAnchor={element.textAnchor}
                    dominantBaseline={element.dominantBaseline}
                >
                    {element.children.map((child) => (
                        <SvgElementRenderer
                            key={child.id}
                            element={child}
                            selectedIds={selectedIds}
                            selectedId={selectedId}
                            onPointerDown={onPointerDown}
                            registerRef={registerRef}
                        />
                    ))}
                </g>
            );
        default:
            return null;
    }
}
