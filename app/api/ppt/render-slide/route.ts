import { NextResponse } from "next/server";
import { generateText } from "ai";
import { z } from "zod";
import { resolveChatModel } from "@/lib/server-models";
import { buildSvgRootXml } from "@/lib/svg";
import {
    slideBlueprintSchema,
    styleOverridesSchema,
    blueprintSchema,
} from "@/types/ppt";

const requestSchema = z.object({
    slide: slideBlueprintSchema,
    blueprintContext: z.object({
        storyArc: z.string(),
        themeGuidelines: blueprintSchema.shape.themeGuidelines,
        previousSlide: z
            .object({
                title: z.string(),
                narrative: z.string(),
                bullets: z.array(z.string()),
            })
            .nullable()
            .optional(),
        nextSlide: z
            .object({
                title: z.string(),
                narrative: z.string(),
            })
            .nullable()
            .optional(),
    }),
    styleLocks: styleOverridesSchema,
    renderMode: z.enum(["drawio", "svg"]).default("drawio").optional(),
    modelRuntime: z.object({
        modelId: z.string(),
        baseUrl: z.string(),
        apiKey: z.string(),
        label: z.string().optional(),
    }),
});

const SYSTEM_MESSAGE = `
You are a senior visual designer for FlowPilot Studio, specializing in creating professional, high-quality presentation slides using draw.io format.

CORE REQUIREMENTS:

1. OUTPUT STRUCTURE
   - Generate complete <mxfile>...</mxfile> with single <diagram>
   - Canvas size: 1280×720 (16:9 presentation aspect ratio)
   - Coordinate bounds: x(20-1260), y(20-700) with 20-30px safety margins
   - All elements must fit within single viewport - no scrolling

2. PRESENTATION DESIGN STANDARDS
   - Follow professional slide deck aesthetics, NOT flowchart diagrams
   - Use layout zones: header (title/subtitle), main content area, footer
   - Implement 1-3 content cards/columns with rounded corners (rounded=1; arcSize=12)
   - Apply subtle shadows (shadow=1) and elegant backgrounds
   - Maintain generous white space for visual breathing room
   
3. VISUAL CONSISTENCY
   - Strictly follow themeGuidelines palette (fillColor, strokeColor, fontColor)
   - Respect styleLocks constraints, especially layoutTone specifications
   - Interpret and implement the tone/material feel from styleLocks.layoutTone
   - Use systematic typography hierarchy (24-32px titles, 14-18px body text)
   - Apply consistent iconography style throughout

4. LAYOUT VOCABULARY - Choose based on slide content:
   • Hero + KPI Cards: Large visual + metric callouts
   • Two-Column Story: Left-right narrative flow
   • Circular Timeline: Radial process steps
   • Central Badge + Satellites: Hub-and-spoke structure
   • Floating Roadmap: Layered timeline with milestones
   • Comparison Matrix: Side-by-side contrast
   • Timeline + Milestones: Linear progress visualization
   • Dashboard + Annotations: Data panels with callout bubbles
   
5. CONTENT ORGANIZATION
   - Structure information into semantic blocks: KPI cards, process steps, bullet lists, timelines
   - Select appropriate layout based on content type (data → dashboard; process → timeline; comparison → matrix)
   - Avoid generic rectangular arrangements - use creative, purposeful layouts
   - If previous slide used similar structure, vary alignment/layout for rhythm
   
6. POLISH & REFINEMENT
   - Add breathing backgrounds (subtle gradients/grids/textures)
   - Include icon placeholders or simple geometric shapes
   - Optional: brand logo, page footer, slide number
   - Use connecting arrows sparingly and only when showing flow/relationship
   - Maintain readability - never sacrifice clarity for decoration
   
7. ACCESSIBILITY
   - Ensure 4.5:1 minimum contrast for text (7:1 for important information)
   - Use font sizes ≥14px for body text
   - Provide clear visual hierarchy with size, weight, and color

OUTPUT FORMAT:
XML:
<mxfile>...</mxfile>

NOTES:
- Brief explanation of layout choices and design rationale
`;

const SYSTEM_MESSAGE_SVG = `
You are a senior visual designer for FlowPilot Studio, specializing in creating professional, high-quality presentation slides using SVG format.

CORE REQUIREMENTS:

1. OUTPUT STRUCTURE
   - Generate complete self-contained <svg> with no external dependencies
   - Canvas: 1280×720 or equivalent viewBox mapping (16:9 aspect ratio)
   - All elements within bounds (0-1280, 0-720) with 20-30px margins
   - No scripts, events, or external resource links

2. PRESENTATION DESIGN STANDARDS
   - Professional slide deck aesthetics with clear information hierarchy
   - Layout zones: header (title/subtitle) + 1-3 content cards/columns
   - Rounded corners, subtle shadows, light gradients for depth
   - Clear, non-overlapping information blocks
   
3. VISUAL CONSISTENCY
   - Follow themeGuidelines and styleLocks specifications
   - Interpret and implement layoutTone characteristics
   - Restrained color palette with high text contrast
   - Systematic spacing and alignment
   
4. ENHANCEMENT ELEMENTS
   - Optional: Background textures or light grid patterns (not affecting readability)
   - Dashed lines or arrows for transitions/connections when needed
   - Accessibility: Minimum 4.5:1 contrast ratio, ≥14px text
   
OUTPUT FORMAT:
SVG:
<svg ...>...</svg>

NOTES:
- Brief explanation of layout choices and design rationale
`;

function extractPayload(text: string, mode: "drawio" | "svg"): { xml: string; notes?: string } {
    const notesSection = text.split(/NOTES:/i)[1]?.trim();
    if (mode === "svg") {
        const svgMatch = text.match(/<svg[\s\S]+<\/svg>/i);
        if (!svgMatch) {
            throw new Error("未检测到有效的 SVG 内容。");
        }
        const svg = svgMatch[0];
        const { rootXml } = buildSvgRootXml(svg);
        const mxfile = `<mxfile><diagram name="Page-1" id="page-1"><mxGraphModel>${rootXml}</mxGraphModel></diagram></mxfile>`;
        return { xml: mxfile, notes: notesSection };
    }
    const xmlMatch = text.match(/<mxfile[\s\S]+<\/mxfile>/i);
    if (!xmlMatch) {
        throw new Error("未检测到有效的 mxfile 内容。");
    }
    return { xml: xmlMatch[0], notes: notesSection };
}

export async function POST(req: Request) {
    try {
        const payload = requestSchema.parse(await req.json());
        const { slide, blueprintContext, styleLocks, renderMode = "drawio", modelRuntime } = payload;
        const resolvedModel = resolveChatModel(modelRuntime);

        const patternHints = `
LAYOUT INSPIRATION PATTERNS:

Hero Layouts:
- Hero Banner: Large heading + accent badge/year + bottom KPI metrics
- Visual + Text Split: Left (gradient rounded image) + Right (bullet card)

Radial & Hub Layouts:
- Central Hub: Center circle/badge + 4 radiating satellite cards
- Circular Timeline: Ring arrangement with milestone markers

Process & Flow:
- Horizontal Timeline: Ribbon-style with milestone points
- Stepped Progression: Staircase/ladder steps with directional arrows
- Dual-Column Comparison: Left "Current State" vs Right "Future Plan"

Data & Metrics:
- Dashboard Panel: Metric cards + side annotation callouts
- KPI Grid: 2×2 or 3×2 metric cards with icons

DESIGN PRINCIPLES:
- Choose layout based on content type and narrative intent
- Vary layouts between consecutive slides for visual rhythm
- Use generous white space (40-60px between major elements)
- Limit to 1-2 visual concepts per slide for clarity
- Apply consistent padding within cards (20-30px)
`.trim();

        const userPrompt = `
Generate ${renderMode === "svg" ? "SVG" : "draw.io XML"} for the following slide. Reference layoutTone and pattern hints. Combine layouts creatively while maintaining professional PPT aesthetics:
${JSON.stringify(
    {
        slide,
        storyArc: blueprintContext.storyArc,
        themeGuidelines: blueprintContext.themeGuidelines,
        previousSlide: blueprintContext.previousSlide ?? null,
        nextSlide: blueprintContext.nextSlide ?? null,
        styleLocks,
    },
    null,
    2
)}

${patternHints}
`;

        const result = await generateText({
            model: resolvedModel.model,
            system: renderMode === "svg" ? SYSTEM_MESSAGE_SVG : SYSTEM_MESSAGE,
            prompt: userPrompt,
            temperature: 0.2,
        });

        const { xml, notes } = extractPayload(result.text, renderMode === "svg" ? "svg" : "drawio");

        return NextResponse.json({
            result: {
                xml,
                reasoning: notes ?? "",
            },
        });
    } catch (error) {
        console.error("[ppt/render-slide] Failed:", error);
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: "输入参数不合法", details: error.issues },
                { status: 400 }
            );
        }
        const message =
            error instanceof Error ? error.message : "生成幻灯片失败。";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
