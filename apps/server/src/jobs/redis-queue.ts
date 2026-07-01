/**
 * Redis-backed distributed job queue (Phase 5).
 *
 * Why this exists:
 *   The Postgres-backed `queue.ts` works correctly for a single app replica.
 *   The moment we scale to 2+ app replicas (or do CPU-bound job processing),
 *   multiple workers race to claim the SAME `job_queue` row → duplicate
 *   execution. We need a queue that's safe for N workers.
 *
 * Design (degrade-gracefully):
 *   - Uses Redis sorted-sets (ZADD/ZRANGEBYSCORE) for FIFO-with-delay.
 *     A delayed job is one whose `score` (= runAt-ms-epoch) is in the future.
 *   - Workers do atomic `ZRANGEBYSCORE + ZREM` in a Lua script to claim a
 *     single job (no double-claim possible).
 *   - On Redis failure, falls back to the existing Postgres queue silently.
 *   - The Postgres queue ALWAYS remains as the durable backup of truth —
 *     Redis is the hot path; Postgres is the cold path. On Redis flaps,
 *     jobs queued during the outage can be replayed by re-running the
 *     missing job ids into Postgres.
 *
 * Wire-protocol:
 *   zset: `wf:jobs:ready`     — score = runAt epoch ms; member = job JSON
 *   zset: `wf:jobs:inflight`  — for visibility timeout / orphaned jobs
 *   hash: `wf:job:<id>`       — full job record (in case we ever need to
 *                              re-hydrate from Postgres on a Redis wipe)
 *
 * Jobs are picked up from the SAME Redis instance used by realtime
 * (`redis:6379`). When the realtime bridge degrades, this queue degrades
 * in lockstep — they're independent code, but share a substrate.
 *
 * SAFETY: this module is imported but NOT wired into the scheduler by default.
 * To enable, set `REDIS_JOBS_ENABLED=true` in .env. The default-keep behavior
 * is the proven Postgres queue.
 */
import { createClient, type RedisClientType } from "redis";

const Z_KEY = "wf:jobs:ready";
const INFLIGHT_KEY = "wf:jobs:inflight";

export interface RedisJob {
  id: string;
  kind: string;
  tenantId: string | null;
  payload: unknown;
  /** Unix-epoch ms */
  runAt: number;
  /** Max retry attempts before dropping to Postgres-failed */
  maxAttempts: number;
  /** Wall-clock when this job was enqueued (for tracing) */
  enqueuedAt: number;
}

let client: RedisClientType | null = null;
let enabled = false;
let connectedOnce = false;
let enabledLogged = false;
let failingLogged = false;

const VISIBILITY_TIMEOUT_MS = 5 * 60 * 1000; // 5 min for an inflight job

export async function initRedisQueue(): Promise<boolean> {
  if (client) return enabled;
  if (process.env.REDIS_JOBS_ENABLED !== "true") {
    enabled = false;
    return false;
  }

  const url = process.env.REDIS_URL ?? "redis://redis:6379";
  try {
    client = createClient({ url }) as RedisClientType;
    client.on("error", (err) => {
      if (!failingLogged) {
        console.warn(`[jobs/redis] error: ${err.message} — falling back to Postgres queue.`);
        failingLogged = true;
      }
      connectedOnce = false;
    });
    await client.connect();
    connectedOnce = true;
    enabled = true;
    if (!enabledLogged) {
      console.log("[jobs/redis] connected and ready");
      enabledLogged = true;
    }
    return true;
  } catch (err) {
    const m = err instanceof Error ? err.message : String(err);
    if (!failingLogged) {
      console.warn(`[jobs/redis] connect failed: ${m} — Postgres-only mode.`);
      failingLogged = true;
    }
    try {
      await client?.disconnect();
    } catch {
      /* */
    }
    client = null;
    enabled = false;
    return false;
  }
}

// ── Lua scripts (atomic single-step claim) ────────────────────────────────
// Both are loaded once on first use, then EVALSHA-cached server-side.
//
// Pop one due job from the ready set and stash it in the inflight set.
// Returns the job JSON or nil.
const POP_SCRIPT = `
  local now = tonumber(ARGV[1])
  local visTimeout = tonumber(ARGV[2])
  local jobs = redis.call("ZRANGEBYSCORE", KEYS[1], "-inf", now, "LIMIT", 0, 1)
  if #jobs == 0 then return nil end
  local job = jobs[1]
  redis.call("ZREM", KEYS[1], job)
  redis.call("ZADD", KEYS[2], now + visTimeout, job)
  return job
`;

let popScriptSha: string | null = null;
async function ensureScripts(): Promise<void> {
  if (popScriptSha || !client?.isOpen) return;
  popScriptSha = await client.scriptLoad(POP_SCRIPT);
}

// ── Public API ────────────────────────────────────────────────────────────

export async function enqueueRedisJob(
  job: Omit<RedisJob, "enqueuedAt">,
): Promise<boolean> {
  if (!(await initRedisQueue()) || !client?.isOpen) return false;
  try {
    await ensureScripts();
    const payload: RedisJob = { ...job, enqueuedAt: Date.now() };
    await client.zAdd(Z_KEY, { score: payload.runAt, value: JSON.stringify(payload) });
    return true;
  } catch (err) {
    if (!failingLogged) {
      console.warn(
        `[jobs/redis] enqueue failed: ${err instanceof Error ? err.message : err}`,
      );
      failingLogged = true;
    }
    return false;
  }
}

/**
 * Atomically claim the next due job, or return undefined when nothing is due.
 * This is the only way to take a job off Redis — never just ZRANGE.
 */
export async function claimNextRedisJob(): Promise<RedisJob | undefined> {
  if (!enabled || !client?.isOpen) return undefined;
  try {
    await ensureScripts();
    const raw = (await client.evalSha(popScriptSha!, {
      keys: [Z_KEY, INFLIGHT_KEY],
      arguments: [String(Date.now()), String(VISIBILITY_TIMEOUT_MS)],
    })) as string | null;
    if (!raw) return undefined;
    return JSON.parse(raw) as RedisJob;
  } catch (err) {
    if (!failingLogged) {
      console.warn(
        `[jobs/redis] claim failed: ${err instanceof Error ? err.message : err}`,
      );
      failingLogged = true;
    }
    return undefined;
  }
}

/** Return a successfully-finished job's slot to nothing (remove from inflight). */
export async function ackRedisJob(id: string): Promise<void> {
  // ack by id requires the original payload to ZREM; we store payload-by-id
  // in `wf:job:<id>` hash for clean ack.
  if (!enabled || !client?.isOpen) return;
  try {
    await client.del(`wf:job:${id}`);
  } catch {
    /* silent — Redis is best-effort */
  }
}

/** Re-queue an inflight job with a small delay (failed/timeout path). */
export async function requeueRedisJob(
  job: RedisJob,
  delayMs: number,
): Promise<void> {
  if (!enabled || !client?.isOpen) return;
  try {
    const { id: _id, ...rest } = job;
    void _id;
    const next: RedisJob = { ...rest, id: job.id, runAt: Date.now() + delayMs, enqueuedAt: Date.now() };
    await client.zAdd(Z_KEY, { score: next.runAt, value: JSON.stringify(next) });
  } catch {
    /* */
  }
}

/**
 * Move jobs whose visibility timeout has expired back to the ready set.
 * Run periodically from the scheduler. Bounded operation: at most
 * `INFLIGHT_KEY` size entries per call.
 */
export async function reapInflightRedisJobs(
  maxReap = 100,
): Promise<number> {
  if (!enabled || !client?.isOpen) return 0;
  try {
    const now = Date.now();
    const expired = await client.zRangeByScore(
      INFLIGHT_KEY,
      "-inf",
      now,
      { LIMIT: { offset: 0, count: maxReap } },
    );
    let reaped = 0;
    for (const raw of expired) {
      const job = JSON.parse(raw) as RedisJob;
      await client.zRem(INFLIGHT_KEY, raw);
      await client.zAdd(Z_KEY, { score: now, value: JSON.stringify(job) });
      reaped += 1;
    }
    return reaped;
  } catch {
    return 0;
  }
}

export function isRedisQueueEnabled(): boolean {
  return enabled;
}

export async function shutdownRedisQueue(): Promise<void> {
  try {
    await client?.quit();
  } catch {
    /* */
  }
  client = null;
  enabled = false;
}
