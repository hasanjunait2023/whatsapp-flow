-- 0009_order_counter.sql
-- Per-tenant order counter (race-safe ORD-000001 generation).
-- Invoice counter already exists in invoice_settings; orders previously used
-- COUNT(*) + 1 which races under concurrent ORDER creation.

CREATE TABLE IF NOT EXISTS order_counters (
  tenant_id          text PRIMARY KEY,
  next_order_number  integer NOT NULL DEFAULT 1,
  created_at         text    NOT NULL DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
  updated_at         text    NOT NULL DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
);

-- Backfill from existing order counts so the first generated number doesn't collide.
INSERT INTO order_counters (tenant_id, next_order_number)
SELECT tenant_id, COUNT(*) + 1 FROM orders GROUP BY tenant_id
ON CONFLICT (tenant_id) DO NOTHING;