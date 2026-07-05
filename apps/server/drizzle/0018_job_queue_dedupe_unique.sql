-- 0018_job_queue_dedupe_unique.sql
-- Partial unique index on job_queue.dedupe_key for queued rows only.
-- Enables atomic INSERT ... ON CONFLICT DO UPDATE in enqueueJob(),
-- eliminating the SELECT+INSERT race that could double-enqueue Hermes debounce jobs.
-- Partial (WHERE status = 'queued') so completed/failed rows with the same key
-- can be re-inserted after the prior job finishes.

CREATE UNIQUE INDEX IF NOT EXISTS "job_queue_dedupe_key_queued_unique_idx"
    ON "job_queue" ("dedupe_key")
    WHERE dedupe_key IS NOT NULL AND status = 'queued';
