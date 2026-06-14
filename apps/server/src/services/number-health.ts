import { dbAll, dbGet } from "../db/raw.js";
import { warmupState, type WarmupPhase } from "../lib/warmup.js";

/**
 * Per-number "health" metrics — the closest proxy an unofficial WAHA setup has
 * to WhatsApp's hidden quality score. Reply rate and opt-out volume are the
 * leading ban indicators; warm-up phase gates how aggressively a number may send.
 * All computed from existing tables (messages, contacts) — no new storage.
 */

export interface NumberHealth {
  instance_id: string;
  name: string | null;
  phone_number: string | null;
  status: string;
  warmup_phase: WarmupPhase;
  warmup_day: number;
  daily_cap: number;
  sent_7d: number;
  received_7d: number;
  reply_rate: number; // 0..1
  sent_today: number;
  health: "good" | "watch" | "at_risk";
}

interface InstanceRow {
  id: string;
  name: string | null;
  phone_number: string | null;
  status: string;
  warmup_started_at: string | null;
}

interface CountRow {
  n: number;
}

async function countMessages(
  tenantId: string,
  instanceId: string,
  direction: "inbound" | "outbound",
  sinceIso: string,
): Promise<number> {
  const row = (await dbGet(
    `SELECT COUNT(*)::int AS n FROM messages
       WHERE tenant_id = ? AND instance_id = ? AND direction = ? AND created_at >= ?`,
    tenantId,
    instanceId,
    direction,
    sinceIso,
  )) as CountRow;
  return row?.n ?? 0;
}

/** Classifies number health from reply rate (the dominant ban signal). */
function classify(replyRate: number, sent7d: number): NumberHealth["health"] {
  if (sent7d < 20) return "good"; // too little volume to judge
  if (replyRate >= 0.3) return "good";
  if (replyRate >= 0.15) return "watch";
  return "at_risk";
}

export async function computeNumberHealth(
  tenantId: string,
  instanceId?: string | null,
): Promise<NumberHealth[]> {
  const instances = (await dbAll(
    `SELECT id, name, phone_number, status, warmup_started_at
       FROM whatsapp_instances
      WHERE tenant_id = ? AND (is_deleted IS NOT TRUE)
        ${instanceId ? "AND id = ?" : ""}
      ORDER BY is_default DESC, created_at ASC`,
    ...(instanceId ? [tenantId, instanceId] : [tenantId]),
  )) as InstanceRow[];

  const now = Date.now();
  const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
  const startOfTodayIso = new Date(new Date(now).toISOString().slice(0, 10)).toISOString();

  const out: NumberHealth[] = [];
  for (const inst of instances) {
    const [sent7d, received7d, sentToday] = await Promise.all([
      countMessages(tenantId, inst.id, "outbound", sevenDaysAgo),
      countMessages(tenantId, inst.id, "inbound", sevenDaysAgo),
      countMessages(tenantId, inst.id, "outbound", startOfTodayIso),
    ]);
    const replyRate = sent7d > 0 ? received7d / sent7d : 0;
    const w = warmupState(inst.warmup_started_at, now);
    out.push({
      instance_id: inst.id,
      name: inst.name,
      phone_number: inst.phone_number,
      status: inst.status,
      warmup_phase: w.phase,
      warmup_day: w.day,
      daily_cap: w.dailyCap,
      sent_7d: sent7d,
      received_7d: received7d,
      reply_rate: Math.round(replyRate * 100) / 100,
      sent_today: sentToday,
      health: classify(replyRate, sent7d),
    });
  }
  return out;
}
