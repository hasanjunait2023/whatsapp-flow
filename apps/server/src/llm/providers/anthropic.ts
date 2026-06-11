import {
  LlmError,
  type LlmMessage,
  type LlmProvider,
  type LlmRequest,
  type LlmResult,
  type LlmToolCall,
} from "../types.js";

const API_URL = "https://api.anthropic.com/v1/messages";
const API_VERSION = "2023-06-01";
const DEFAULT_MAX_TOKENS = 2048;
/** Name of the synthetic tool used to force structured-output JSON. */
const JSON_TOOL = "__json_output";

type ContentBlock =
  | { type: "text"; text: string }
  | { type: "tool_use"; id: string; name: string; input: Record<string, unknown> }
  | { type: "tool_result"; tool_use_id: string; content: string };

interface AnthropicResponse {
  content: ContentBlock[];
  stop_reason: string;
  usage?: { input_tokens?: number; output_tokens?: number };
  error?: { message?: string };
}

/** Anthropic alternates user/assistant turns; tool results ride in user turns. */
function toWireMessages(messages: LlmMessage[]): Array<Record<string, unknown>> {
  const out: Array<Record<string, unknown>> = [];
  for (const m of messages) {
    if (m.role === "system") continue;
    if (m.role === "tool") {
      out.push({
        role: "user",
        content: [{ type: "tool_result", tool_use_id: m.toolCallId, content: m.content }],
      });
    } else if (m.role === "assistant" && m.toolCalls?.length) {
      const blocks: ContentBlock[] = [];
      if (m.content) blocks.push({ type: "text", text: m.content });
      for (const tc of m.toolCalls) {
        blocks.push({ type: "tool_use", id: tc.id, name: tc.name, input: tc.arguments });
      }
      out.push({ role: "assistant", content: blocks });
    } else {
      out.push({ role: m.role, content: m.content });
    }
  }
  return out;
}

export const anthropicProvider: LlmProvider = {
  name: "anthropic",

  async chat(req: LlmRequest, apiKey: string): Promise<LlmResult> {
    const system = req.messages
      .filter((m) => m.role === "system")
      .map((m) => m.content)
      .join("\n\n");

    const tools = (req.tools ?? []).map((t) => ({
      name: t.name,
      description: t.description,
      input_schema: t.parameters,
    }));

    const body: Record<string, unknown> = {
      model: req.model,
      max_tokens: req.maxTokens ?? DEFAULT_MAX_TOKENS,
      messages: toWireMessages(req.messages),
    };
    if (system) body.system = system;
    if (req.temperature != null) body.temperature = req.temperature;

    if (req.jsonSchema) {
      // Structured output via a forced tool call.
      body.tools = [
        ...tools,
        { name: JSON_TOOL, description: "Return the result as JSON.", input_schema: req.jsonSchema.schema },
      ];
      body.tool_choice = { type: "tool", name: JSON_TOOL };
    } else if (tools.length) {
      body.tools = tools;
    }

    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": API_VERSION,
      },
      body: JSON.stringify(body),
    });
    const data = (await res.json()) as AnthropicResponse;
    if (!res.ok) {
      throw new LlmError("anthropic", res.status, data.error?.message ?? "request failed");
    }

    let text: string | null = null;
    const toolCalls: LlmToolCall[] = [];
    for (const block of data.content ?? []) {
      if (block.type === "text") {
        text = (text ?? "") + block.text;
      } else if (block.type === "tool_use") {
        if (req.jsonSchema && block.name === JSON_TOOL) {
          // Unwrap the forced structured-output tool back into plain text JSON.
          text = JSON.stringify(block.input);
        } else {
          toolCalls.push({ id: block.id, name: block.name, arguments: block.input });
        }
      }
    }

    return {
      text,
      toolCalls,
      usage: {
        promptTokens: data.usage?.input_tokens ?? 0,
        completionTokens: data.usage?.output_tokens ?? 0,
      },
      stopReason:
        data.stop_reason === "tool_use" && toolCalls.length
          ? "tool_use"
          : data.stop_reason === "end_turn" || data.stop_reason === "tool_use"
            ? "stop"
            : data.stop_reason === "max_tokens"
              ? "max_tokens"
              : "other",
    };
  },
};
