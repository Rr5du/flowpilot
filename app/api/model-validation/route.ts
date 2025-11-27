import { generateText } from "ai";
import { resolveChatModel } from "@/lib/server-models";

export const maxDuration = 60; // 1 minute timeout

export async function POST(req: Request) {
  try {
    const { baseUrl, apiKey, modelId } = await req.json();

    if (!baseUrl || !apiKey || !modelId) {
      return Response.json(
        { 
          success: false,
          error: "缺少必要参数：baseUrl、apiKey 或 modelId" 
        },
        { status: 400 }
      );
    }

    // 构造运行时模型配置
    const modelRuntime = {
      baseUrl: baseUrl.trim(),
      apiKey: apiKey.trim(),
      modelId: modelId.trim(),
    };

    console.log("开始验证模型配置:", { 
      baseUrl: modelRuntime.baseUrl, 
      modelId: modelRuntime.modelId,
      hasApiKey: !!modelRuntime.apiKey
    });

    try {
      // 解析模型配置
      const resolvedModel = resolveChatModel(modelRuntime);
      
      // 发送一个简单的测试消息
      const testMessage = "Hello! Please respond with a simple 'OK' to confirm the connection.";
      
      const startTime = Date.now();
      const result = await generateText({
        model: resolvedModel.model,
        messages: [
          {
            role: "user",
            content: testMessage,
          },
        ],
        temperature: 0,
        maxRetries: 1, // 最多重试一次
        abortSignal: AbortSignal.timeout(30000), // 30秒超时
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      console.log("模型验证成功:", {
        modelId: modelRuntime.modelId,
        duration: `${duration}ms`,
        responseLength: result.text?.length || 0,
        usage: result.usage,
      });

      return Response.json({
        success: true,
        message: "模型配置验证成功",
        details: {
          modelId: modelRuntime.modelId,
          responseTime: `${duration}ms`,
          tokensUsed: {
            input: result.usage.inputTokens || 0,
            output: result.usage.outputTokens || 0,
            total: (result.usage.inputTokens || 0) + (result.usage.outputTokens || 0),
          },
          testResponse: result.text?.substring(0, 100) + (result.text?.length > 100 ? "..." : ""),
        },
      });

    } catch (modelError: any) {
      console.error("模型验证失败:", modelError);

      // 根据错误类型返回更具体的错误信息
      let errorMessage = "模型验证失败";
      let errorDetails = modelError.message || String(modelError);

      if (errorDetails.includes("404") || errorDetails.includes("Not Found")) {
        errorMessage = "API 接口未找到，请检查 Base URL 配置是否正确";
      } else if (errorDetails.includes("401") || errorDetails.includes("Unauthorized")) {
        errorMessage = "API Key 无效或已过期，请检查配置";
      } else if (errorDetails.includes("403") || errorDetails.includes("Forbidden")) {
        errorMessage = "API Key 权限不足，无法访问该模型";
      } else if (errorDetails.includes("timeout") || errorDetails.includes("TIMEOUT")) {
        errorMessage = "请求超时，请检查网络连接或 Base URL 配置";
      } else if (errorDetails.includes("ENOTFOUND") || errorDetails.includes("DNS")) {
        errorMessage = "无法解析域名，请检查 Base URL 配置";
      } else if (errorDetails.includes("ECONNREFUSED")) {
        errorMessage = "连接被拒绝，请检查 Base URL 和端口配置";
      } else if (errorDetails.includes("model") && errorDetails.includes("not found")) {
        errorMessage = "指定的模型 ID 不存在或不可用";
      }

      return Response.json({
        success: false,
        error: errorMessage,
        details: errorDetails,
        modelId: modelRuntime.modelId,
        baseUrl: modelRuntime.baseUrl,
      });
    }

  } catch (error: any) {
    console.error("验证API发生错误:", error);
    
    return Response.json(
      {
        success: false,
        error: "服务器内部错误",
        details: error.message || String(error),
      },
      { status: 500 }
    );
  }
}
