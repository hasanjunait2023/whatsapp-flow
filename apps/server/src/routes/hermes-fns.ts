import { runHermesAgent } from "../services/hermes/agent.js";
import { BudgetExceededError } from "../llm/usage.js";
import type { FnContext, FnResult } from "./waha/session.js";
import type { LlmMessage } from "../llm/types.js";

/** Hermes fn handlers, spread into the /api/fn registry. */

type FnHandler = (body: Record<string, unknown>, ctx: FnContext) => Promise<FnResult>;

interface TestBody {
  messages?: Array<{ role: string; content: string }>;
}

export const HERMES_HANDLERS: Record<string, FnHandler> = {
  /**
   * Playground: runs the agent against an ad-hoc conversation WITHOUT sending
   * anything or touching contact state. Tools run read-only against real
   * tenant data so owners can validate behavior before enabling.
   */
  "hermes-test": async (body, ctx) => {
    if (!ctx.tenantId) return { data: null, error: { message: "No active tenant" } };
    const raw = (body as TestBody).messages ?? [];
    const messages: LlmMessage[] = raw
      .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
      .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));
    if (messages.length === 0) {
      return { data: null, error: { message: "messages array is required" } };
    }
    try {
      const outcome = await runHermesAgent(ctx.tenantId, null, {
        trigger: "playground",
        adHocMessages: messages,
      });
      return {
        data: {
          kind: outcome.kind,
          reply: outcome.reply ?? null,
          handoff_reason: outcome.handoffReason ?? null,
          run_id: outcome.runId,
        },
        error: null,
      };
    } catch (err) {
      if (err instanceof BudgetExceededError) {
        return { data: null, error: { message: "Monthly LLM budget exceeded" } };
      }
      return {
        data: null,
        error: { message: err instanceof Error ? err.message : "agent failed" },
      };
    }
  },
};
