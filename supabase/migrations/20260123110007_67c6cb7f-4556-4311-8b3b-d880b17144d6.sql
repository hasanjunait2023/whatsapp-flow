-- Add created_by column to orders table to track which team member created each order
ALTER TABLE orders ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- Create team_activity_logs table to track all team activities
CREATE TABLE IF NOT EXISTS team_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  activity_type TEXT NOT NULL, -- 'message_sent', 'order_created', 'order_updated', 'contact_assigned', 'parcel_booked', 'complaint_resolved'
  entity_type TEXT, -- 'message', 'order', 'contact', 'complaint', 'shipment'
  entity_id UUID,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_team_activity_tenant_user ON team_activity_logs(tenant_id, user_id);
CREATE INDEX IF NOT EXISTS idx_team_activity_created ON team_activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_team_activity_type ON team_activity_logs(activity_type);

-- Create team_kpi_targets table for performance targets
CREATE TABLE IF NOT EXISTS team_kpi_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id), -- NULL means applies to all team members
  metric TEXT NOT NULL, -- 'messages_per_day', 'orders_per_day', 'response_time_minutes', 'conversion_rate', 'sales_amount'
  target_value NUMERIC NOT NULL,
  period TEXT NOT NULL DEFAULT 'daily', -- 'daily', 'weekly', 'monthly'
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for KPI targets
CREATE INDEX IF NOT EXISTS idx_kpi_targets_tenant ON team_kpi_targets(tenant_id);

-- Enable RLS on new tables
ALTER TABLE team_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_kpi_targets ENABLE ROW LEVEL SECURITY;

-- RLS policies for team_activity_logs
CREATE POLICY "Team members can view activity logs for their tenant"
ON team_activity_logs FOR SELECT
USING (is_tenant_member(tenant_id));

CREATE POLICY "Team members can insert activity logs for their tenant"
ON team_activity_logs FOR INSERT
WITH CHECK (is_tenant_member(tenant_id));

-- RLS policies for team_kpi_targets
CREATE POLICY "Team members can view KPI targets for their tenant"
ON team_kpi_targets FOR SELECT
USING (is_tenant_member(tenant_id));

CREATE POLICY "Owners and managers can manage KPI targets"
ON team_kpi_targets FOR ALL
USING (is_tenant_owner_or_manager(tenant_id));

-- Add trigger for updated_at on team_kpi_targets
CREATE TRIGGER update_team_kpi_targets_updated_at
BEFORE UPDATE ON team_kpi_targets
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();