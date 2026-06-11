-- Create admin_notifications table for central admin workflow error notifications
CREATE TABLE IF NOT EXISTS admin_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  tenant_id UUID REFERENCES tenants(id),
  entity_type TEXT,
  entity_id TEXT,
  is_read BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX idx_admin_notifications_type ON admin_notifications(type);
CREATE INDEX idx_admin_notifications_created ON admin_notifications(created_at DESC);
CREATE INDEX idx_admin_notifications_unread ON admin_notifications(is_read) WHERE is_read = false;

-- Enable RLS for admin notifications
ALTER TABLE admin_notifications ENABLE ROW LEVEL SECURITY;

-- Only system admins can read admin notifications
CREATE POLICY "System admins can read admin notifications"
  ON admin_notifications FOR SELECT
  USING (public.is_system_admin());

-- Only system admins can update (mark as read)
CREATE POLICY "System admins can update admin notifications"
  ON admin_notifications FOR UPDATE
  USING (public.is_system_admin());

-- Service role can insert (from edge functions)
CREATE POLICY "Service role can insert admin notifications"
  ON admin_notifications FOR INSERT
  WITH CHECK (true);