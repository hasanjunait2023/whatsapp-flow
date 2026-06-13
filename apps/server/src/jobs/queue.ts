import { dbGet, dbRun } from "../db/raw.js";

/**
 * Durable background-job queue on the job_queue table. Jobs survive restarts
 * (unlike plain setInterval work) and support delayed runs + coalescing via
 * dedupe_key (used by the Hermes reply debounce). The scheduler calls
 * processDueJobs() on a short interval; handlers register at boot.
 */

export interface JobRow {
  id: string;
  kind: string;
  tenant_id: string | null;
  payload: string | null;
  attempts: number;
  run_at: string;
}

export type JobHandler = (payload: unknown, job: JobRow) => Promise<void>;

const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 30_000;

const handlers = new Map<string, JobHandler>();

export function registerJobHandler(kind: string, handler: JobHandler): void {
  handlers.set(kind, handler);
}

export interface EnqueueOptions {
  kind: string;
  tenantId?: string | null;
  payload?: unknown;
  /** ISO timestamp; defaults to now. */
  runAt?: string;
  /** Replaces a still-queued job with the same key instead of inserting. */
  dedupeKey?: string;
}

export async function enqueueJob(opts: EnqueueOptions): Promise<string> {
  const runAt = opts.runAt ?? new Date().toISOString();
  const payload = opts.payload === undefined ? null : JSON.stringify(opts.payload);

  if (opts.dedupeKey) {
    const existing = (await dbGet(
      `SELECT id FROM job_queue WHERE dedupe_key = ? AND status = 'queued' LIMIT 1`,
      opts.dedupeKey,
    )) as { id: string } | undefined;
    if (existing) {
      await dbRun(
        `UPDATE job_queue SET payload = ?, run_at = ?, updated_at = ? WHERE id = ?`,
        payload,
        runAt,
        new Date().toISOString(),
        existing.id,
      );
      return existing.id;
    }
  }

  const id = crypto.randomUUID();
  await dbRun(
    `INSERT INTO job_queue (id, kind, tenant_id, payload, run_at, dedupe_key, status)
       VALUES (?, ?, ?, ?, ?, ?, 'queued')`,
    id,
    opts.kind,
    opts.tenantId ?? null,
    payload,
    runAt,
    opts.dedupeKey ?? null,
  );
  return id;
}

/** Claims one due job atomically; returns undefined when none are due. */
async function claimNextJob(): Promise<JobRow | undefined> {
  const now = new Date().toISOString();
  const job = (await dbGet(
    `SELECT id, kind, tenant_id, payload, attempts, run_at FROM job_queue
       WHERE status = 'queued' AND run_at <= ?
       ORDER BY run_at LIMIT 1`,
    now,
  )) as JobRow | undefined;
  if (!job) return undefined;
  const claimed = await dbRun(
    `UPDATE job_queue SET status = 'running', updated_at = ? WHERE id = ? AND status = 'queued'`,
    new Date().toISOString(),
    job.id,
  );
  return claimed.changes === 1 ? job : undefined;
}

/** Runs due jobs one at a time until the queue is drained. */
export async function processDueJobs(): Promise<number> {
  let processed = 0;
  for (;;) {
    const job = await claimNextJob();
    if (!job) break;
    processed += 1;

    const handler = handlers.get(job.kind);
    if (!handler) {
      await dbRun(
        `UPDATE job_queue SET status = 'failed', last_error = ?, updated_at = ? WHERE id = ?`,
        `No handler for kind "${job.kind}"`,
        new Date().toISOString(),
        job.id,
      );
      continue;
    }

    try {
      const payload = job.payload
        ? typeof job.payload === "string"
          ? JSON.parse(job.payload)
          : job.payload
        : null;
      await handler(payload, job);
      await dbRun(
        `UPDATE job_queue SET status = 'done', updated_at = ? WHERE id = ?`,
        new Date().toISOString(),
        job.id,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "job failed";
      const attempts = job.attempts + 1;
      if (attempts < MAX_ATTEMPTS) {
        const retryAt = new Date(Date.now() + RETRY_DELAY_MS * attempts).toISOString();
        await dbRun(
          `UPDATE job_queue SET status = 'queued', attempts = ?, last_error = ?, run_at = ?, updated_at = ? WHERE id = ?`,
          attempts,
          message,
          retryAt,
          new Date().toISOString(),
          job.id,
        );
      } else {
        await dbRun(
          `UPDATE job_queue SET status = 'failed', attempts = ?, last_error = ?, updated_at = ? WHERE id = ?`,
          attempts,
          message,
          new Date().toISOString(),
          job.id,
        );
      }
    }
  }
  return processed;
}
