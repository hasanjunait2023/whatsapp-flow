/**
 * Provider-agnostic LLM contract. Adapters in ./providers normalize the three
 * wire formats (OpenAI tool_calls / Anthropic tool_use / Gemini functionCall)
 * into this shape so agent code never branches on provider.
 */

export type ProviderName = "openai" | "anthropic" | "gemini";

export interface LlmToolCall {
  /** Provider call id (echoed back in the tool-result message). */
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface LlmMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  /** Set on role:"assistant" messages that requested tool calls. */
  toolCalls?: LlmToolCall[];
  /** Set on role:"tool" messages: the id of the call being answered. */
  toolCallId?: string;
  /** Set on role:"tool" messages: the name of the tool that was called. */
  toolName?: string;
}

export interface LlmTool {
  name: string;
  description: string;
  /** JSON Schema for the tool arguments. */
  parameters: Record<string, unknown>;
}

export interface LlmRequest {
  model: string;
  messages: LlmMessage[];
  tools?: LlmTool[];
  temperature?: number;
  maxTokens?: number;
  /**
   * Force a JSON object response matching this schema (structured output).
   * Adapters implement it natively where supported, else via a forced tool call.
   */
  jsonSchema?: { name: string; schema: Record<string, unknown> };
}

export interface LlmUsage {
  promptTokens: number;
  completionTokens: number;
}

export interface LlmResult {
  text: string | null;
  toolCalls: LlmToolCall[];
  usage: LlmUsage;
  stopReason: "stop" | "tool_use" | "max_tokens" | "other";
}

export interface LlmProvider {
  readonly name: ProviderName;
  chat(req: LlmRequest, apiKey: string): Promise<LlmResult>;
}

export class LlmError extends Error {
  status: number;
  provider: ProviderName;
  constructor(provider: ProviderName, status: number, message: string) {
    super(`[${provider}] ${status}: ${message}`);
    this.provider = provider;
    this.status = status;
  }
}
