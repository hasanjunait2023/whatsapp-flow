import {
  LlmError,
  type LlmMessage,
  type LlmProvider,
  type LlmRequest,
  type LlmResult,
  type LlmToolCall,
} from "../types.js";

const API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

type GeminiPart =
  | { text: string }
  | { functionCall: { name: string; args: Record<string, unknown> } }
  | { functionResponse: { name: string; response: Record<string, unknown> } };

interface GeminiResponse {
  candidates?: Array<{
    content?: { parts?: GeminiPart[] };
    finishReason?: string;
  }>;
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
  error?: { message?: string };
}

/**
 * Gemini's API has no tool-call ids; calls are matched to responses by tool
 * name and order. We synthesize ids as `name:index` for the common contract.
 */
function toContents(messages: LlmMessage[]): Array<Record<string, unknown>> {
  const out: Array<Record<string, unknown>> = [];
  for (const m of messages) {
    if (m.role === "system") continue;
    if (m.role === "tool") {
      let response: Record<string, unknown>;
      try {
        response = JSON.parse(m.content) as Record<string, unknown>;
      } catch {
        response = { result: m.content };
      }
      out.push({
        role: "user",
        parts: [{ functionResponse: { name: m.toolName ?? "tool", response } }],
      });
    } else if (m.role === "assistant" && m.toolCalls?.length) {
      const parts: GeminiPart[] = [];
      if (m.content) parts.push({ text: m.content });
      for (const tc of m.toolCalls) {
        parts.push({ functionCall: { name: tc.name, args: tc.arguments } });
      }
      out.push({ role: "model", parts });
    } else {
      out.push({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] });
    }
  }
  return out;
}

/** Gemini's response schema dialect rejects some JSON Schema keys. */
function sanitizeSchema(schema: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(schema)) {
    if (key === "additionalProperties" || key === "$schema") continue;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      out[key] = sanitizeSchema(value as Record<string, unknown>);
    } else if (Array.isArray(value)) {
      out[key] = value.map((v) =>
        v && typeof v === "object" ? sanitizeSchema(v as Record<string, unknown>) : v,
      );
    } else {
      out[key] = value;
    }
  }
  return out;
}

export const geminiProvider: LlmProvider = {
  name: "gemini",

  async chat(req: LlmRequest, apiKey: string): Promise<LlmResult> {
    const system = req.messages
      .filter((m) => m.role === "system")
      .map((m) => m.content)
      .join("\n\n");

    const generationConfig: Record<string, unknown> = {};
    if (req.temperature != null) generationConfig.temperature = req.temperature;
    if (req.maxTokens != null) generationConfig.maxOutputTokens = req.maxTokens;
    if (req.jsonSchema) {
      generationConfig.responseMimeType = "application/json";
      generationConfig.responseSchema = sanitizeSchema(req.jsonSchema.schema);
    }

    const body: Record<string, unknown> = {
      contents: toContents(req.messages),
      generationConfig,
    };
    if (system) body.systemInstruction = { parts: [{ text: system }] };
    if (req.tools?.length && !req.jsonSchema) {
      body.tools = [
        {
          functionDeclarations: req.tools.map((t) => ({
            name: t.name,
            description: t.description,
            parameters: sanitizeSchema(t.parameters),
          })),
        },
      ];
    }

    const res = await fetch(`${API_BASE}/${encodeURIComponent(req.model)}:generateContent`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify(body),
    });
    const data = (await res.json()) as GeminiResponse;
    if (!res.ok) {
      throw new LlmError("gemini", res.status, data.error?.message ?? "request failed");
    }

    const candidate = data.candidates?.[0];
    let text: string | null = null;
    const toolCalls: LlmToolCall[] = [];
    for (const part of candidate?.content?.parts ?? []) {
      if ("text" in part) {
        text = (text ?? "") + part.text;
      } else if ("functionCall" in part) {
        toolCalls.push({
          id: `${part.functionCall.name}:${toolCalls.length}`,
          name: part.functionCall.name,
          arguments: part.functionCall.args ?? {},
        });
      }
    }

    const finish = candidate?.finishReason;
    return {
      text,
      toolCalls,
      usage: {
        promptTokens: data.usageMetadata?.promptTokenCount ?? 0,
        completionTokens: data.usageMetadata?.candidatesTokenCount ?? 0,
      },
      stopReason: toolCalls.length
        ? "tool_use"
        : finish === "STOP"
          ? "stop"
          : finish === "MAX_TOKENS"
            ? "max_tokens"
            : "other",
    };
  },
};
