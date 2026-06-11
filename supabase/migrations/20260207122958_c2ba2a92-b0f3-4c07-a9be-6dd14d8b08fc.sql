-- Speed up tenant deletion cascades (tenants -> messages)
-- Fixes statement timeout when deleting large tenants.
CREATE INDEX IF NOT EXISTS idx_messages_tenant_id
  ON public.messages (tenant_id);
