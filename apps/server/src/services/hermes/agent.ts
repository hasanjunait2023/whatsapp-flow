import { sqlite } from "../../db/index.js";
import { resolveLlm } from "../../llm/registry.js";
import { checkBudget, recordUsage } from "../../llm/usage.js";
import type { LlmMessage } from "../../llm/types.js";
import { getApprovedSystemPrompt } from "../soul/index.js";
import { HERMES_TOOLS, executeHermesTool } from "./tools.js";

/**
 * Hermes orchestrator: soul prompt + recent conversation -> tool loop ->
 * reply text or handoff decision. Pure compute + DB reads; sending and
 * handoff side effects belong to the pipeline.
 */

const MAX_TOOL_ITERATIONS = 5;
const HISTORY_LIMIT = 20;
const PREVIEW_CHARS = 200;

export interface HermesOutcome {
  kind: "reply" | "handoff" | "skip";
  reply?: string;
  handoffReason?: string;
  runId: string;
}

interface MessageRow {
  direction: string;
  content: string | null;
  content_type: string;
  is_from_ai: number;
}

function conversationHistory(contactId: string): LlmMessage[] {
  const rows = sqlite
    .prepare(
      `SELECT direction, content, content_type, is_from_ai FROM messages
       WHERE contact_id = ? ORDER BY created_at DESC LIMIT ${HISTORY_LIMIT}`,
    )
    .all(contactId) as MessageRow[];
  return rows.reverse().map((m) => ({
    role: m.direction === "inbound" ? ("user" as const) : ("assistant" as const),
    content: m.content ?? `[${m.content_type}]`,
  }));
}

function getModelOverride(tenantId: string): string | null {
  const row = sqlite
    .prepare(`SELECT model_override FROM agent_configs WHERE tenant_id = ? AND agent = 'hermes' LIMIT 1`)
    .get(tenantId) as { model_override: string | null } | undefined;
  return row?.model_override ?? null;
}

export interface RunOptions {
  trigger: string;
  /** Replaces DB history with an ad-hoc conversation (playground mode). */
  adHocMessages?: LlmMessage[];
}

export async function runHermesAgent(
  tenantId: string,
  contactId: string | null,
  options: RunOptions,
): Promise<HermesOutcome> {
  const startedAt = Date.now();
  const runId = crypto.randomUUID();

  const systemPrompt = getApprovedSystemPrompt(tenantId);
  const history = options.adHocMessages ?? (contactId ? conversationHistory(contactId) : []);
  const inputPreview =
    history.filter((m) => m.role === "user").at(-1)?.content.slice(0, PREVIEW_CHARS) ?? "";

  const recordRun = (
    status: string,
    outputPreview: string | null,
    toolCalls: unknown[],
    usage: { promptTokens: number; completionTokens: number },
    error?: string,
  ): void => {
    sqlite
      .prepare(
        `INSERT INTO agent_runs
           (id, tenant_id, agent, contact_id, trigger, status, input_preview, output_preview,
            tool_calls, prompt_tokens, completion_tokens, latency_ms, error)
         VALUES (?, ?, 'hermes', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        runId,
        tenantId,
        contactId,
        options.trigger,
        status,
        inputPreview,
        outputPreview,
        JSON.stringify(toolCalls),
        usage.promptTokens,
        usage.completionTokens,
        Date.now() - startedAt,
        error ?? null,
      );
  };

  if (!systemPrompt) {
    recordRun("skipped", null, [], { promptTokens: 0, completionTokens: 0 }, "No approved soul");
    return { kind: "skip", runId };
  }
  if (history.length === 0) {
    recordRun("skipped", null, [], { promptTokens: 0, completionTokens: 0 }, "No conversation");
    return { kind: "skip", runId };
  }

  checkBudget(tenantId);
  const resolved = resolveLlm(tenantId);
  const model = getModelOverride(tenantId) ?? resolved.model;

  const messages: LlmMessage[] = [{ role: "system", content: systemPrompt }, ...history];
  const totalUsage = { promptTokens: 0, completionTokens: 0 };
  const executedTools: Array<{ name: string; arguments: Record<string, unknown> }> = [];

  try {
    for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
      const result = await resolved.provider.chat(
        {
          model,
          messages,
          tools: HERMES_TOOLS,
          temperature: resolved.temperature ?? 0.5,
          maxTokens: 1024,
        },
        resolved.apiKey,
      );
      totalUsage.promptTokens += result.usage.promptTokens;
      totalUsage.completionTokens += result.usage.completionTokens;
      recordUsage(tenantId, "hermes", resolved.provider.name, model, result.usage);

      if (result.stopReason !== "tool_use" || result.toolCalls.length === 0) {
        const reply = result.text?.trim();
        if (!reply) {
          recordRun("error", null, executedTools, totalUsage, "Empty reply");
          return { kind: "skip", runId };
        }
        recordRun("replied", reply.slice(0, PREVIEW_CHARS), executedTools, totalUsage);
        return { kind: "reply", reply, runId };
      }

      messages.push({ role: "assistant", content: result.text ?? "", toolCalls: result.toolCalls });
      for (const call of result.toolCalls) {
        executedTools.push({ name: call.name, arguments: call.arguments });
        const outcome = executeHermesTool(tenantId, call.name, call.arguments);
        if (outcome.handoffReason) {
          recordRun("handoff", outcome.handoffReason, executedTools, totalUsage);
          return { kind: "handoff", handoffReason: outcome.handoffReason, runId };
        }
        messages.push({
          role: "tool",
          content: outcome.result,
          toolCallId: call.id,
          toolName: call.name,
        });
      }
    }

    recordRun("error", null, executedTools, totalUsage, "Tool iteration limit reached");
    return { kind: "handoff", handoffReason: "Agent could not resolve the request", runId };
  } catch (err) {
    const message = err instanceof Error ? err.message : "agent error";
    recordRun("error", null, executedTools, totalUsage, message);
    throw err;
  }
}
