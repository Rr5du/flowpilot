import { streamText, convertToModelMessages, generateText, createUIMessageStreamResponse } from "ai";

import { z } from "zod/v3";
import { resolveChatModel } from "@/lib/server-models";

export const maxDuration = 1200

export async function POST(req: Request) {
  try {
    const { messages, xml, modelRuntime, enableStreaming, renderMode } = await req.json();

    if (!modelRuntime) {
      return Response.json(
        { error: "Missing model runtime configuration." },
        { status: 400 }
      );
    }

    const outputMode: "drawio" | "svg" =
      renderMode === "svg" ? "svg" : "drawio";

    // 获取请求的 AbortSignal，用于取消流式响应
    const abortSignal = req.signal;

    const drawioSystemMessage = `
You are FlowPilot, a draw.io layout lead. All answers must be tool calls (display_diagram or edit_diagram); never paste XML as plain text.

Priorities (strict order):
1) Zero XML syntax errors.
2) Single-viewport layout with no overlaps/occlusion.
3) Preserve existing semantics; FlowPilot Brief additions are preferences only—if user/brief conflicts with safety, keep XML validity and layout tidy first.

Non-negotiable XML rules:
- Root must start with <mxCell id="0"/> then <mxCell id="1" parent="0"/>.
- Escape &, <, >, ", ' inside values.
- Styles: key=value pairs separated by semicolons; NO spaces around =; always end with a semicolon.
- Self-closing tags include space before /> .
- Every mxCell (except id="0") needs parent; every mxGeometry needs as="geometry".
- Unique numeric ids from 2 upward; never reuse.
- Edges: edge="1", source, target, mxGeometry relative="1" as="geometry", prefer edgeStyle=orthogonalEdgeStyle; add waypoints instead of crossing nodes.

Layout recipe (avoid clutter and blocking):
- Keep all elements within x 0-800, y 0-600; start around x=40, y=40; align to 24px grid.
- Maintain spacing: siblings 56-96px vertically, 48-80px horizontally; containers padding >=24px; swimlane gaps >=64px.
- No overlaps: leave 12-16px breathing room between nodes and labels; keep connectors outside shapes/text.
- Favor orthogonal connectors with minimal crossings; reroute around nodes and keep labels on straight segments.
- Highlight 1 clear main path if helpful but never cover text; keep arrows readable, rounded=1, endArrow=block.

Built-in style hints:
- Use official cloud icons when the user mentions AWS/Azure/GCP (e.g., shape=mxgraph.aws4.compute.ec2_instance, mxgraph.azure.compute.virtual_machine, mxgraph.gcp2017.compute.compute_engine).
- Use standard infra icons (mxgraph.basic.* or mxgraph.cisco.*) to add clarity, but do not sacrifice spacing.
- Preserve existing color themes; polish alignment rather than rewriting content.

Tool policy:
- If only tweaking labels/positions, prefer edit_diagram with minimal search/replace lines. If structure is messy or XML is empty, regenerate with display_diagram.
- Do not stream partial XML; supply the final, validated <root> block in one call.

Preflight checklist before ANY tool call:
- Root cells 0 and 1 exist.
- All special characters escaped; no quotes inside quotes.
- Styles end with semicolons; every tag properly closed with space before /> when self-closing.
- Geometry present for every vertex/edge; parents set; ids unique; edge sources/targets filled.
- Coordinates fit 0-800 x 0-600; no overlaps or hidden labels/connectors.
`;

    const svgSystemMessage = `
You are FlowPilot SVG Studio. Output exactly one complete SVG via the display_svg tool—never return draw.io XML or plain text.

Baseline (always):
- Single 0-800 x 0-600 viewport, centered content, >=24px canvas padding. Limit to 2-3 colors (neutral base + one accent), 8px corner radius, 1.6px strokes, aligned to a 24px grid with unobstructed labels.
- Absolutely no <script>, event handlers, external fonts/assets/URLs. Use safe inline styles only. Avoid heavy blur or shadows.
- Layout hygiene: siblings spaced 32-56px, text never overlaps shapes or edges, guides may be dashed but must not cover lettering.

Delight (lightweight):
- One restrained highlight allowed (soft gradient bar, diagonal slice, or small sticker). Keep readability; no neon floods or color clutter.

Rules:
- Return a self-contained <svg> with width/height or viewBox sized for ~800x600; keep every element inside the viewport.
- Keep text on short lines and aligned to the grid; abbreviate gently if needed without dropping key meaning.
- Aim for premium polish: balanced whitespace, crisp typography, clean gradients or subtle shadows, and high text contrast.
- If the user references existing XML/shapes, reinterpret visually but respond with SVG only.
- Call display_svg exactly once with the final SVG—no streaming or partial fragments.`;

    const systemMessage =
      outputMode === "svg" ? svgSystemMessage : drawioSystemMessage;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return Response.json(
        { error: "Missing messages payload." },
        { status: 400 }
      );
    }

    const lastMessage = messages[messages.length - 1];

    // Extract text from the last message parts
    const lastMessageText =
      lastMessage.parts?.find((part: any) => part.type === "text")?.text || "";
    const safeUserText =
      typeof lastMessageText === "string" && lastMessageText.trim().length > 0
        ? lastMessageText
        : "(用户未提供文字内容，可能仅上传了附件)";

    // Extract file parts (images) from the last message
    const fileParts = lastMessage.parts?.filter((part: any) => part.type === 'file') || [];

    const formattedTextContent = `
Current diagram XML:
"""xml
${xml || ''}
"""
User input:
"""md
${safeUserText}
"""
Render mode: ${outputMode === "svg" ? "svg-only" : "drawio-xml"}`;

    // Convert UIMessages to ModelMessages and add system message
    const modelMessages = convertToModelMessages(messages);

    const sanitizeContent = (content: any) => {
      const placeholder = "(空内容占位，防止空文本导致错误)";
      if (typeof content === "string") {
        return content.trim().length > 0 ? content : placeholder;
      }
      if (Array.isArray(content)) {
        let hasText = false;
        const mapped = content.map((part) => {
          if (part?.type === "text") {
            const txt = typeof part.text === "string" ? part.text.trim() : "";
            hasText = true;
            return {
              ...part,
              text: txt.length > 0 ? part.text : placeholder,
            };
          }
          return part;
        });
        if (!hasText) {
          mapped.push({ type: "text", text: placeholder });
        }
        return mapped;
      }
      if (content == null || content === false) {
        return placeholder;
      }
      return content;
    };

    let enhancedMessages = modelMessages.map((msg): any => {
      if ((msg as any).role === "tool") {
        return msg;
      }
      const safeContent = sanitizeContent((msg as any).content);
      return { ...(msg as any), content: safeContent };
    });

    // Update the last message with formatted content if it's a user message
    if (enhancedMessages.length >= 1) {
      const lastModelMessage = enhancedMessages[enhancedMessages.length - 1];
      if (lastModelMessage.role === 'user') {
        // Build content array with text and file parts
        const contentParts: any[] = [
          { type: 'text', text: formattedTextContent }
        ];

        // Add image parts back
        for (const filePart of fileParts) {
          contentParts.push({
            type: 'image',
            image: filePart.url,
            mimeType: filePart.mediaType
          });
        }

        enhancedMessages = [
          ...enhancedMessages.slice(0, -1),
          { ...lastModelMessage, content: contentParts }
        ];
      }
    }

    const resolvedModel = resolveChatModel(modelRuntime);
    console.log("Enhanced messages:", enhancedMessages, "model:", resolvedModel.id);
    console.log("Model runtime config:", {
      baseUrl: modelRuntime.baseUrl,
      modelId: modelRuntime.modelId,
      hasApiKey: !!modelRuntime.apiKey,
      enableStreaming: enableStreaming ?? true,
      renderMode: outputMode,
    });

    // 记录请求开始时间
    const startTime = Date.now();

    // 根据 enableStreaming 决定使用流式或非流式
    const useStreaming = enableStreaming ?? true; // 默认使用流式

    const commonConfig: any = {
      // model: google("gemini-2.5-flash-preview-05-20"),
      // model: google("gemini-2.5-pro"),
      system: systemMessage,
      model: resolvedModel.model,
      // model: model,
      // providerOptions: {
      //   google: {
      //     thinkingConfig: {
      //       thinkingBudget: 128,
      //     },
      //   }
      // },
      // providerOptions: {
      //   openai: {
      //     reasoningEffort: "minimal"
      //   },
      // },
      messages: enhancedMessages,
      abortSignal,  // 传递 AbortSignal 以支持取消请求
      tools: outputMode === "svg"
        ? {
          display_svg: {
            description: `Return one complete SVG (no partial streaming) to render on draw.io. SVG must be self-contained, include width/height or viewBox sized around 800x600, and avoid external assets, scripts, or event handlers.`,
            inputSchema: z.object({
              svg: z.string().describe("Standalone SVG markup sized for a single viewport; no external assets, scripts, or event handlers."),
            }),
          },
        }
        : {
          // Client-side tool that will be executed on the client
          display_diagram: {
            description: `Display a diagram on draw.io. You only need to pass the nodes inside the <root> tag (including the <root> tag itself) in the XML string.
          
          **CRITICAL XML SYNTAX REQUIREMENTS:**
          
          1. **Mandatory Root Structure:**
          <root>
            <mxCell id="0"/>
            <mxCell id="1" parent="0"/>
            <!-- Your diagram elements here -->
          </root>
          
          2. **ALWAYS Escape Special Characters in Attributes:**
          - & → &amp;
          - < → &lt;
          - > → &gt;
          - " → &quot;
          
          3. **Style Format (STRICT):**
          - Must end with semicolon
          - No spaces around = sign
          - Example: style="rounded=1;fillColor=#fff;strokeColor=#000;"
          
          4. **Required Attributes:**
          - Every mxCell: id, parent (except id="0")
          - Every mxGeometry: as="geometry"
          - Self-closing tags: space before />
          
          5. **Complete Element Example:**
          <mxCell id="2" value="My Node" style="rounded=1;fillColor=#dae8fc;strokeColor=#6c8ebf;" vertex="1" parent="1">
            <mxGeometry x="100" y="100" width="120" height="60" as="geometry" />
          </mxCell>
          
          6. **Edge (Connection) Example:**
          <mxCell id="5" value="" style="edgeStyle=orthogonalEdgeStyle;" edge="1" parent="1" source="2" target="3">
            <mxGeometry relative="1" as="geometry" />
          </mxCell>
          
          **Common Errors to AVOID:**
          ❌ <mxCell value="Users & Admins"/>  → Use &amp;
          ❌ <mxCell value="x < 10"/>  → Use &lt;
          ❌ style="rounded=1"  → Missing final semicolon
          ❌ <mxGeometry x="10" y="20"/>  → Missing as="geometry"
          ❌ <mxCell id="2" vertex="1" parent="1"/>  → Missing <mxGeometry>
          
          **Validation Checklist:**
          ✓ Root cells (id="0" and id="1") present
          ✓ All special characters escaped
          ✓ All styles end with semicolon
          ✓ All IDs unique
          ✓ All elements have parent (except id="0")
          ✓ All mxGeometry have as="geometry"
          ✓ All tags properly closed
          
          **Using Professional Icons:**
          - For AWS services, use AWS 2025 icons: shape=mxgraph.aws4.[category].[service]
          - For Azure services, use Azure icons: shape=mxgraph.azure.[category].[service]
          - For GCP services, use GCP icons: shape=mxgraph.gcp2017.[category].[service]
          - These icons make diagrams more professional and vivid
          
          **IMPORTANT:** The diagram will be rendered to draw.io canvas in REAL-TIME as you stream the XML. The canvas updates automatically during streaming to show live progress.
          `,
            inputSchema: z.object({
              xml: z.string().describe("Well-formed XML string following all syntax rules above to be displayed on draw.io")
            })
          },
          edit_diagram: {
            description: `Edit specific parts of the current diagram by replacing exact line matches. Use this tool to make targeted fixes without regenerating the entire XML.
IMPORTANT: Keep edits concise:
- Only include the lines that are changing, plus 1-2 surrounding lines for context if needed
- Break large changes into multiple smaller edits
- Each search must contain complete lines (never truncate mid-line)
- First match only - be specific enough to target the right element`,
            inputSchema: z.object({
              edits: z.array(z.object({
                search: z.string().describe("Exact lines to search for (including whitespace and indentation)"),
                replace: z.string().describe("Replacement lines")
              })).describe("Array of search/replace pairs to apply sequentially")
            })
          },
        },
      temperature: 0,
    };

    // Error handler function to provide detailed error messages
    function errorHandler(error: unknown) {
      console.error('Stream error:', error);

      if (error == null) {
        return 'unknown error';
      }

      if (typeof error === 'string') {
        return error;
      }

      if (error instanceof Error) {
        // 检查是否是网络错误或 API 错误
        const errorMessage = error.message;
        if (errorMessage.includes('404') || errorMessage.includes('Not Found')) {
          return `API 接口未找到。请检查 Base URL 配置是否正确。当前配置: ${modelRuntime?.baseUrl || '未知'}`;
        }
        if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
          return 'API Key 无效或已过期，请检查配置。';
        }
        if (errorMessage.includes('403') || errorMessage.includes('Forbidden')) {
          return 'API Key 权限不足，请检查配置。';
        }
        return errorMessage;
      }

      return JSON.stringify(error);
    }

    // 根据 enableStreaming 决定使用流式或非流式
    if (enableStreaming) {
      // 流式响应
      const result = await streamText(commonConfig as any);

      return result.toUIMessageStreamResponse({
        onError: errorHandler,
        // 在流式响应结束时添加 token 使用信息到 message metadata
        onFinish: async ({ responseMessage, messages }) => {
          const endTime = Date.now();
          const durationMs = endTime - startTime;

          // 获取 token 使用信息
          const usage = await result.usage;
          const totalUsage = await result.totalUsage;

          console.log('Stream finished:', {
            usage: {
              inputTokens: usage.inputTokens,
              outputTokens: usage.outputTokens,
              totalTokens: (usage.inputTokens || 0) + (usage.outputTokens || 0),
            },
            totalUsage: {
              inputTokens: totalUsage.inputTokens,
              outputTokens: totalUsage.outputTokens,
              totalTokens: (totalUsage.inputTokens || 0) + (totalUsage.outputTokens || 0),
            },
            durationMs,
          });
        },
        // 提取 metadata 发送到客户端
        messageMetadata: ({ part }) => {
          // 在 finish 事件中返回 usage 信息
          if (part.type === 'finish') {
            return {
              usage: {
                inputTokens: part.totalUsage?.inputTokens || 0,
                outputTokens: part.totalUsage?.outputTokens || 0,
                totalTokens: (part.totalUsage?.inputTokens || 0) + (part.totalUsage?.outputTokens || 0),
              },
              durationMs: Date.now() - startTime,
            } as any;
          }
          // 在 finish-step 事件中也可以返回
          if (part.type === 'finish-step') {
            return {
              usage: {
                inputTokens: part.usage?.inputTokens || 0,
                outputTokens: part.usage?.outputTokens || 0,
                totalTokens: (part.usage?.inputTokens || 0) + (part.usage?.outputTokens || 0),
              },
              durationMs: Date.now() - startTime,
            } as any;
          }
          return undefined;
        },
      });
    } else {
      // 非流式响应 - 使用 generateText
      // 注意：非流式模式下不自动执行工具调用，让客户端处理
      // 这样可以保持与流式模式一致的体验
      const result = await generateText(commonConfig as any);

      const endTime = Date.now();
      const durationMs = endTime - startTime;

      console.log('Generation finished (non-streaming):', {
        usage: {
          inputTokens: result.usage.inputTokens,
          outputTokens: result.usage.outputTokens,
          totalTokens: (result.usage.inputTokens || 0) + (result.usage.outputTokens || 0),
        },
        durationMs,
        toolCalls: result.toolCalls?.length || 0,
        finishReason: result.finishReason,
      });

      // 创建 UIMessageChunk 流来包装 generateText 的结果
      // 非流式模式下，我们将完整结果一次性发送，但格式与流式兼容
      const chunks: any[] = [];
      const messageId = `msg-${Date.now()}`;

      // 开始消息
      chunks.push({
        type: 'start',
        messageId,
        messageMetadata: {
          usage: {
            inputTokens: result.usage.inputTokens || 0,
            outputTokens: result.usage.outputTokens || 0,
            totalTokens: (result.usage.inputTokens || 0) + (result.usage.outputTokens || 0),
          },
          durationMs,
        },
      });

      // 添加文本内容（如果有）
      if (result.text && result.text.length > 0) {
        chunks.push({ type: 'text-start', id: messageId });
        chunks.push({ type: 'text-delta', id: messageId, delta: result.text });
        chunks.push({ type: 'text-end', id: messageId });
      }

      // 添加工具调用 - 使用正确的字段名 'input' 而不是 'args'
      if (result.toolCalls && result.toolCalls.length > 0) {
        for (const toolCall of result.toolCalls) {
          chunks.push({
            type: 'tool-input-available',
            toolCallId: toolCall.toolCallId,
            toolName: toolCall.toolName,
            input: toolCall.input,  // 注意这里使用 input 而不是 args
          });
        }
      }

      // 完成消息
      chunks.push({
        type: 'finish',
        finishReason: result.finishReason,
        messageMetadata: {
          usage: {
            inputTokens: result.usage.inputTokens || 0,
            outputTokens: result.usage.outputTokens || 0,
            totalTokens: (result.usage.inputTokens || 0) + (result.usage.outputTokens || 0),
          },
          durationMs,
          finishReason: result.finishReason,
        },
      });

      // 创建 ReadableStream 发送所有 chunks
      const stream = new ReadableStream({
        start(controller) {
          for (const chunk of chunks) {
            controller.enqueue(chunk);
          }
          controller.close();
        },
      });

      // 使用 AI SDK 的 createUIMessageStreamResponse 创建响应
      return createUIMessageStreamResponse({
        stream,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }
  } catch (error) {
    console.error('Error in chat route:', error);
    // 提供更详细的错误信息
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorDetails = error instanceof Error ? error.stack : undefined;
    console.error('Error details:', { errorMessage, errorDetails });

    return Response.json(
      {
        error: 'Internal server error',
        message: errorMessage,
        ...(process.env.NODE_ENV === 'development' && { details: errorDetails })
      },
      { status: 500 }
    );
  }
}
