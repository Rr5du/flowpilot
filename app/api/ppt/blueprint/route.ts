import { NextResponse } from "next/server";
import { z } from "zod";
import { generateText } from "ai";
import { resolveChatModel } from "@/lib/server-models";
import {
    pptBriefSchema,
    blueprintSchema,
    type PptBlueprint,
} from "@/types/ppt";

const requestSchema = z.object({
    brief: pptBriefSchema,
    modelRuntime: z.object({
        modelId: z.string(),
        baseUrl: z.string(),
        apiKey: z.string(),
        label: z.string().optional(),
    }),
});

const SYSTEM_PROMPT = `
You are a senior presentation strategy consultant specialized in creating professional slide decks. Your responsibilities:

1. Transform input brief into a comprehensive JSON blueprint containing: story arc, unified visual theme, and slide-by-slide structure
2. Strictly adhere to the provided JSON Schema with all fields properly populated
3. For each slide, include:
   - Clear, engaging title
   - Narrative intent and key message
   - Bullet points (3-5 items max for readability)
   - Visual suggestion (diagrams, charts, imagery style)
   - Transition note connecting to previous/next slide
4. Ensure visual consistency across all slides:
   - Cohesive color palette (2-3 primary colors + neutrals)
   - Unified typography hierarchy (headings, body, captions)
   - Consistent iconography and visual language
5. Follow presentation design best practices:
   - Strong opening and closing slides
   - Logical flow with clear narrative arc
   - Visual hierarchy and white space
   - Accessibility considerations (contrast, readability)
6. Strictly limit slide count to user's specified range
7. Output ONLY valid JSON with no additional explanation or markdown formatting`;

function extractJsonPayload(text: string): string {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) {
        throw new Error("模型未返回有效 JSON。");
    }
    return text.slice(start, end + 1);
}

export async function POST(req: Request) {
    try {
        const payload = requestSchema.parse(await req.json());
        const { brief, modelRuntime } = payload;
        const resolvedModel = resolveChatModel(modelRuntime);

        const userPrompt = `
以下为演示简报，请输出 Blueprint JSON：
${JSON.stringify(brief, null, 2)}
`;

        const result = await generateText({
            model: resolvedModel.model,
            system: SYSTEM_PROMPT,
            prompt: userPrompt,
            temperature: 0.3,
        });

        const raw = extractJsonPayload(result.text);
        const modelPayload = JSON.parse(raw);
        const normalized = normalizeBlueprintResponse(modelPayload, brief.slideCount);
        const parsed = blueprintSchema.parse(normalized);

        return NextResponse.json({ blueprint: parsed satisfies PptBlueprint });
    } catch (error) {
        console.error("[ppt/blueprint] Failed to generate blueprint:", error);
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: "输入参数不合法", details: error.issues },
                { status: 400 }
            );
        }
        const message =
            error instanceof Error ? error.message : "生成 PPT 骨架失败。";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

const DEFAULT_THEME = {
    palette: ["#0B5CFF", "#111827", "#F4F6FB"],
    typography: "Sans-serif, 粗细对比标题，正文左对齐",
    iconography: "双色线性图标，简洁几何图形",
    layoutPrinciples: [
        "保持统一边距与栅格",
        "标题与关键信息左对齐",
        "确保所有元素在单屏内可读",
    ],
};

function coerceString(
    value: unknown,
    fallback = ""
): string {
    if (typeof value === "string") {
        const trimmed = value.trim();
        if (trimmed.length > 0) {
            return trimmed;
        }
        return fallback;
    }
    if (typeof value === "number" || typeof value === "boolean") {
        return String(value);
    }
    if (value && typeof value === "object") {
        if ("text" in (value as any) && typeof (value as any).text === "string") {
            const trimmed = ((value as any).text as string).trim();
            return trimmed || fallback;
        }
        try {
            const candidate = JSON.stringify(value);
            return candidate.length > 0 ? candidate : fallback;
        } catch {
            return fallback;
        }
    }
    return fallback;
}

function normalizePalette(input: unknown): string[] {
    if (!Array.isArray(input)) {
        return DEFAULT_THEME.palette;
    }
    const sanitized = input
        .map((item) => coerceString(item))
        .map((token) => token.replace(/['"]+/g, "").trim())
        .filter(Boolean);
    return sanitized.length > 0 ? sanitized : DEFAULT_THEME.palette;
}

function normalizeBullets(input: unknown): string[] {
    if (Array.isArray(input)) {
        const bullets = input
            .map((item) => coerceString(item))
            .filter(Boolean);
        if (bullets.length > 0) {
            return bullets;
        }
    }
    const fallback = coerceString(input);
    if (fallback) {
        return fallback
            .split(/[\n，,]/g)
            .map((token) => token.trim())
            .filter(Boolean);
    }
    return ["关键要点 1", "关键要点 2"];
}

function normalizeSlides(rawSlides: unknown, expectedCount: number | undefined) {
    const list = Array.isArray(rawSlides) ? rawSlides : [];
    const trimmed =
        typeof expectedCount === "number" && expectedCount > 0
            ? list.slice(0, expectedCount)
            : list;

    if (trimmed.length === 0) {
        return Array.from({ length: expectedCount ?? 6 }).map((_, index) => ({
            id: `slide-${index + 1}`,
            title: `幻灯片 ${index + 1}`,
            narrative: "描述这一页的叙事重点。",
            bullets: ["关键要点 1", "关键要点 2"],
            visualIdea: "结构化图示",
            transitionNote: "",
            status: "draft",
        }));
    }

    return trimmed.map((slide, index) => {
        const safe = slide && typeof slide === "object" ? (slide as Record<string, unknown>) : {};
        const narrative =
            coerceString(safe.narrative) ||
            coerceString((safe as any).summary) ||
            "描述这一页的叙事重点。";
        const visualIdea =
            coerceString(safe.visualIdea) ||
            coerceString((safe as any).visualConcept) ||
            "结构化图示";
        return {
            id: coerceString(safe.id, `slide-${index + 1}`) || `slide-${index + 1}`,
            title: coerceString(safe.title, `幻灯片 ${index + 1}`),
            narrative,
            bullets: normalizeBullets(safe.bullets ?? (safe as any).bulletPoints),
            visualIdea,
            transitionNote: coerceString(safe.transitionNote),
            status: "draft" as const,
        };
    });
}

function normalizeThemeGuidelines(theme: unknown) {
    if (!theme || typeof theme !== "object") {
        return DEFAULT_THEME;
    }
    const safe = theme as Record<string, unknown>;
    return {
        palette: normalizePalette(safe.palette),
        typography:
            coerceString(safe.typography) ||
            coerceString((safe as any).fontStyle) ||
            DEFAULT_THEME.typography,
        iconography:
            coerceString(safe.iconography) ||
            coerceString((safe as any).iconStyle) ||
            DEFAULT_THEME.iconography,
        layoutPrinciples:
            Array.isArray(safe.layoutPrinciples) && safe.layoutPrinciples.length > 0
                ? safe.layoutPrinciples
                      .map((item) => coerceString(item))
                      .filter(Boolean)
                : DEFAULT_THEME.layoutPrinciples,
    };
}

function normalizeBlueprintResponse(payload: any, expectedCount?: number) {
    return {
        storyArc:
            coerceString(payload?.storyArc) ||
            coerceString(payload?.narrativeArc) ||
            "从问题、解决方案到落地价值的叙事主线。",
        themeGuidelines: normalizeThemeGuidelines(payload?.themeGuidelines),
        slides: normalizeSlides(payload?.slides, expectedCount),
    };
}
