import {
  LlmError,
  type LlmMessage,
  type LlmProvider,
  type LlmRequest,
  type LlmResult,
  type LlmToolCall,
} from "../types.js";

const API_URL = "https://api.openai.com/v1/chat/completions";

interface OpenAiToolCall {
  id: string;
  function: { name: string; arguments: string };
}

interface OpenAiResponse {
  choices: Array<{
    message: { content: string | null; tool_calls?: OpenAiToolCall[] };
    finish_reason: string;
  }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number };
  error?: { message?: string };
}

function toWireMessage(m: LlmMessage): Record<string, unknown> {
  if (m.role === "tool") {
    return { role: "tool", tool_call_id: m.toolCallId, content: m.content };
  }
  if (m.role === "assistant" && m.toolCalls?.length) {
    return {
      role: "assistant",
      content: m.content || null,
      tool_calls: m.toolCalls.map((tc) => ({
        id: tc.id,
        type: "function",
        function: { name: tc.name, arguments: JSON.stringify(tc.arguments) },
      })),
    };
  }
  return { role: m.role, content: m.content };
}

function parseToolCalls(calls: OpenAiToolCall[] | undefined): LlmToolCall[] {
  return (calls ?? []).map((tc) => {
    let args: Record<string, unknown> = {};
    try {
      args = JSON.parse(tc.function.arguments) as Record<string, unknown>;
    } catch {
      // leave args empty on malformed JSON from the model
    }
    return { id: tc.id, name: tc.function.name, arguments: args };
  });
}

export const openaiProvider: LlmProvider = {
  name: "openai",

  async chat(req: LlmRequest, apiKey: string): Promise<LlmResult> {
    const body: Record<string, unknown> = {
      model: req.model,
      messages: req.messages.map(toWireMessage),
    };
    if (req.temperature != null) body.temperature = req.temperature;
    if (req.maxTokens != null) body.max_tokens = req.maxTokens;
    if (req.tools?.length) {
      body.tools = req.tools.map((t) => ({
        type: "function",
        function: { name: t.name, description: t.description, parameters: t.parameters },
      }));
    }
    if (req.jsonSchema) {
      body.response_format = {
        type: "json_schema",
        json_schema: { name: req.jsonSchema.name, schema: req.jsonSchema.schema, strict: true },
      };
    }

    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });
    const data = (await res.json()) as OpenAiResponse;
    if (!res.ok) {
      throw new LlmError("openai", res.status, data.error?.message ?? "request failed");
    }

    const choice = data.choices[0];
    const toolCalls = parseToolCalls(choice?.message.tool_calls);
    const finish = choice?.finish_reason;
    return {
      text: choice?.message.content ?? null,
      toolCalls,
      usage: {
        promptTokens: data.usage?.prompt_tokens ?? 0,
        completionTokens: data.usage?.completion_tokens ?? 0,
      },
      stopReason:
        finish === "tool_calls"
          ? "tool_use"
          : finish === "stop"
            ? "stop"
            : finish === "length"
              ? "max_tokens"
              : "other",
    };
  },
};
