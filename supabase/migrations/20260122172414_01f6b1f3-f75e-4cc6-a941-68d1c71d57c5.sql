-- Create admin audit logs table for tracking admin actions
CREATE TABLE public.admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for efficient querying
CREATE INDEX idx_audit_logs_admin ON admin_audit_logs(admin_id);
CREATE INDEX idx_audit_logs_created ON admin_audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_entity ON admin_audit_logs(entity_type, entity_id);

-- Enable RLS
ALTER TABLE admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Only system admins can view and insert audit logs
CREATE POLICY "System admins can view audit logs"
ON admin_audit_logs
FOR SELECT
USING (is_system_admin());

CREATE POLICY "System admins can create audit logs"
ON admin_audit_logs
FOR INSERT
WITH CHECK (is_system_admin());

-- Prevent updates and deletes (audit logs should be immutable)
-- No UPDATE or DELETE policies means these operations are blocked