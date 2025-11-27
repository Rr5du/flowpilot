import { NextResponse } from "next/server";
import { z } from "zod";
import PptxGenJS from "pptxgenjs";

export const runtime = "nodejs";
export const maxDuration = 1200;

const slideSchema = z.object({
    id: z.string(),
    title: z.string(),
    narrative: z.string().optional(),
    bullets: z.array(z.string()).default([]),
    xml: z.string().optional(),
});

const requestSchema = z.object({
    topic: z.string().optional(),
    slides: z.array(slideSchema).min(1),
});

const CONVERT_ENDPOINT = 
    process.env.NEXT_PUBLIC_DRAWIO_CONVERT_URL || 
    "https://convert.diagrams.net/export";

function encodeRFC5987ValueChars(str: string) {
    return encodeURIComponent(str)
        .replace(/['()]/g, (char) =>
            `%${char.charCodeAt(0).toString(16).toUpperCase()}`
        )
        .replace(/\*/g, "%2A");
}

async function renderDiagramPng(xml?: string): Promise<string | null> {
    if (!xml) return null;
    try {
        const params = new URLSearchParams();
        params.set("format", "png");
        params.set("w", "1280");
        params.set("h", "720");
        params.set("bg", "#ffffff");
        params.set("xml", xml);

        const response = await fetch(CONVERT_ENDPOINT, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: params.toString(),
        });

        if (!response.ok) {
            console.warn("convert.diagrams.net returned non-200 response");
            return null;
        }

        const buffer = await response.arrayBuffer();
        const base64 = Buffer.from(buffer).toString("base64");
        return `data:image/png;base64,${base64}`;
    } catch (error) {
        console.error("[ppt/export] failed to render png:", error);
        return null;
    }
}

export async function POST(req: Request) {
    try {
        const payload = requestSchema.parse(await req.json());
        const pptx = new PptxGenJS();
        pptx.layout = "LAYOUT_16x9";

        for (const slideData of payload.slides) {
            const slide = pptx.addSlide();
            slide.addText(slideData.title, {
                x: 0.5,
                y: 0.3,
                w: 9,
                fontSize: 28,
                bold: true,
                color: "0B1221",
            });
            if (slideData.narrative) {
                slide.addText(slideData.narrative, {
                    x: 0.5,
                    y: 0.9,
                    w: 4.5,
                    fontSize: 16,
                    color: "4B5563",
                });
            }
            if (slideData.bullets.length > 0) {
                slide.addText(
                    slideData.bullets.map((bullet) => `• ${bullet}`).join("\n"),
                    {
                        x: 0.5,
                        y: 1.4,
                        w: 4.5,
                        fontSize: 18,
                        color: "111827",
                        lineSpacing: 24,
                    }
                );
            }

            const imageData = await renderDiagramPng(slideData.xml);
            if (imageData) {
                slide.addImage({
                    data: imageData,
                    x: 5.3,
                    y: 0.8,
                    w: 4.5,
                    h: 4.5,
                });
            } else {
                slide.addText("（图示生成失败，请参考 draw.io 文件）", {
                    x: 5.3,
                    y: 0.9,
                    w: 4.5,
                    fontSize: 12,
                    color: "D97706",
                });
            }
        }

        const rawOutput = await pptx.write({ outputType: "nodebuffer" });
        const buffer = Buffer.isBuffer(rawOutput)
            ? rawOutput
            : Buffer.from(rawOutput as ArrayBuffer);

        const baseName =
            (payload.topic || "FlowPilot")
                .replace(/[^a-zA-Z0-9\u4e00-\u9fa5-_]+/g, "-")
                .slice(0, 60) || "FlowPilot";
        const preferredFileName = `${baseName}.pptx`;
        const asciiFallbackBase =
            baseName.replace(/[^a-zA-Z0-9-_]+/g, "") || "FlowPilot";
        const asciiFallback = `${asciiFallbackBase}.pptx`;
        const encodedFileName = encodeRFC5987ValueChars(preferredFileName);
        const contentDisposition = `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodedFileName}`;

        return new Response(new Uint8Array(buffer), {
            headers: {
                "Content-Type":
                    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
                "Content-Disposition": contentDisposition,
            },
        });
    } catch (error) {
        console.error("[ppt/export] failed:", error);
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: "请求参数不合法", details: error.issues },
                { status: 400 }
            );
        }
        const message =
            error instanceof Error ? error.message : "导出 PPTX 失败。";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
