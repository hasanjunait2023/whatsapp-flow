-- 0010_perf_indexes.sql
-- Missing performance indexes from Phase-2 scaling audit.
-- Covers gaps NOT already addressed by 0008_indexes_and_constraints.sql:
--   · contact_thread_state.assigned_to  (agent-inbox view queries)
--   · notifications.status              (pending-sweep queries)
--   · webhook_events_log.created_at     (cleanup sweeps, time-range scans)
-- 0008 already adds tenant_id indexes for webhook_events_log and error_logs.

CREATE INDEX IF NOT EXISTS "contact_thread_state_assigned_to_idx"
    ON "contact_thread_state" ("assigned_to");

CREATE INDEX IF NOT EXISTS "notifications_status_idx"
    ON "notifications" ("status");

CREATE INDEX IF NOT EXISTS "webhook_events_log_created_at_idx"
    ON "webhook_events_log" ("created_at");
