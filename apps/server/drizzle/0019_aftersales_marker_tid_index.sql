-- 0019_aftersales_marker_tid_index.sql
-- Expression index on the tenant_id JSON path inside admin_marketing_sends marker rows.
-- advanceAftersales() bulk pre-fetches all fired aftersales markers for active tenants
-- (Fix 64 — replaces up to 7000 per-tenant alreadyFired() SELECT calls with 1 query).
-- The partial WHERE ensures only the small 'aftersales-marker' subset is indexed,
-- keeping the index tiny regardless of total admin_marketing_sends row count.

CREATE INDEX IF NOT EXISTS "admin_marketing_sends_aftersales_tid_idx"
    ON "admin_marketing_sends" ((content->>'tenant_id'))
    WHERE enrollment_id = 'aftersales-marker';
