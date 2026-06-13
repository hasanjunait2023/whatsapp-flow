import { dbGet, dbRun } from "../../db/raw.js";
import { emitChange } from "../../realtime/emitter.js";
import { resolveLlm } from "../../llm/registry.js";
import { checkBudget, recordUsage } from "../../llm/usage.js";
import { getApprovedSystemPrompt } from "../soul/index.js";
import { linkedChatIds, sendTelegramMessage } from "../telegram.js";

/**
 * CEO report generation: gather tenant business stats -> LLM summary grounded
 * by the soul profile -> store ceo_reports row -> deliver to linked Telegram
 * chats + the in-app notifications feed.
 */

export type ReportType = "daily" | "weekly" | "marketing_ideas" | "adhoc";

export interface BusinessSnapshot {
  period_days: number;
  conversations: { inbound: number; outbound: number; new_conversations: number };
  orders: { count: number; revenue: number; pending: number };
  hermes: { replies: number; handoffs: number };
  contacts_total: number;
}

export async function gatherSnapshot(tenantId: string, periodDays: number): Promise<BusinessSnapshot> {
  const since = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  const sinceIso = `${since}T00:00:00.000Z`;

  const stats = (await dbGet(
    `SELECT COALESCE(SUM(inbound_count),0)::float8 AS inbound,
              COALESCE(SUM(outbound_count),0)::float8 AS outbound,
              COALESCE(SUM(new_conversations),0)::float8 AS new_conversations
       FROM tenant_daily_stats WHERE tenant_id = ? AND stat_date >= ?`,
    tenantId,
    since,
  )) as { inbound: number; outbound: number; new_conversations: number };

  const orders = (await dbGet(
    `SELECT COUNT(*)::int AS count,
              COALESCE(SUM(total),0)::float8 AS revenue,
              COALESCE(SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END),0)::float8 AS pending
       FROM orders WHERE tenant_id = ? AND created_at >= ?`,
    tenantId,
    sinceIso,
  )) as { count: number; revenue: number; pending: number };

  const hermes = (await dbGet(
    `SELECT COALESCE(SUM(CASE WHEN status = 'replied' THEN 1 ELSE 0 END),0)::float8 AS replies,
              COALESCE(SUM(CASE WHEN status = 'handoff' THEN 1 ELSE 0 END),0)::float8 AS handoffs
       FROM agent_runs WHERE tenant_id = ? AND agent = 'hermes' AND created_at >= ?`,
    tenantId,
    sinceIso,
  )) as { replies: number; handoffs: number };

  const contacts = (await dbGet(
    `SELECT COUNT(*)::int AS total FROM contacts WHERE tenant_id = ?`,
    tenantId,
  )) as { total: number };

  return {
    period_days: periodDays,
    conversations: stats,
    orders,
    hermes,
    contacts_total: contacts.total,
  };
}

const REPORT_SYSTEM_PROMPT = `You are the tenant's CEO agent: a sharp, honest business advisor reporting to the owner over Telegram. Write in Markdown. Be concrete and brief — an owner reads this on a phone. Structure: a 2-3 line summary, key numbers with deltas where possible, one or two observations, and one actionable suggestion. If the soul profile below indicates the business communicates in another language, write the report in that language.`;

function periodFor(type: ReportType): number {
  return type === "weekly" ? 7 : 1;
}

export async function generateCeoReport(tenantId: string, type: ReportType): Promise<string> {
  const reportId = crypto.randomUUID();
  await dbRun(
    `INSERT INTO ceo_reports (id, tenant_id, type, status) VALUES (?, ?, ?, 'generating')`,
    reportId,
    tenantId,
    type,
  );

  try {
    await checkBudget(tenantId);
    const snapshot = await gatherSnapshot(tenantId, periodFor(type));
    const soulPrompt = await getApprovedSystemPrompt(tenantId);
    const resolved = await resolveLlm(tenantId);

    const system = soulPrompt
      ? `${REPORT_SYSTEM_PROMPT}\n\n--- Business profile (soul) ---\n${soulPrompt}`
      : REPORT_SYSTEM_PROMPT;

    const result = await resolved.provider.chat(
      {
        model: resolved.model,
        temperature: resolved.temperature ?? 0.4,
        maxTokens: 1500,
        messages: [
          { role: "system", content: system },
          {
            role: "user",
            content: `Write the ${type} business report from this data:\n${JSON.stringify(snapshot, null, 2)}`,
          },
        ],
      },
      resolved.apiKey,
    );
    await recordUsage(tenantId, "ceo", resolved.provider.name, resolved.model, result.usage);

    const content = result.text?.trim();
    if (!content) throw new Error("Report generation returned no content");

    await dbRun(
      `UPDATE ceo_reports SET status = 'generated', content_md = ?, data_snapshot = ? WHERE id = ?`,
      content,
      JSON.stringify(snapshot),
      reportId,
    );

    await deliverReport(tenantId, reportId, content);
    emitChange("ceo_reports", tenantId, { id: reportId });
    return reportId;
  } catch (err) {
    await dbRun(
      `UPDATE ceo_reports SET status = 'error', error = ? WHERE id = ?`,
      err instanceof Error ? err.message : "generation failed",
      reportId,
    );
    emitChange("ceo_reports", tenantId, { id: reportId });
    throw err;
  }
}

export async function deliverReport(
  tenantId: string,
  reportId: string,
  content: string,
): Promise<void> {
  const chats = await linkedChatIds(tenantId);
  let delivered = false;
  for (const chatId of chats) {
    try {
      await sendTelegramMessage(chatId, content);
      delivered = true;
    } catch {
      // Per-chat failure must not block other chats or the in-app copy.
    }
  }
  await dbRun(
    `UPDATE ceo_reports SET status = ?, sent_at = ? WHERE id = ?`,
    delivered ? "sent" : "generated",
    delivered ? new Date().toISOString() : null,
    reportId,
  );

  await dbRun(
    `INSERT INTO notifications (id, tenant_id, channel, type, status, metadata)
       VALUES (?, ?, 'in_app', 'ceo_report', 'pending', ?)`,
    crypto.randomUUID(),
    tenantId,
    JSON.stringify({ report_id: reportId }),
  );
  emitChange("notifications", tenantId, {});
}
