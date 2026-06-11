-- Create table for storing synced WhatsApp groups
CREATE TABLE public.whatsapp_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  instance_id UUID NOT NULL REFERENCES whatsapp_instances(id) ON DELETE CASCADE,
  wa_group_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  invite_link TEXT,
  participant_count INTEGER DEFAULT 0,
  is_admin BOOLEAN DEFAULT true,
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tenant_id, wa_group_id)
);

-- Create table for group participants
CREATE TABLE public.whatsapp_group_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES whatsapp_groups(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  phone_number TEXT NOT NULL,
  is_admin BOOLEAN DEFAULT false,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  added_by TEXT,
  UNIQUE(group_id, phone_number)
);

-- Create table for batch add queue
CREATE TABLE public.group_add_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES whatsapp_groups(id) ON DELETE CASCADE,
  phone_numbers TEXT[] NOT NULL,
  batch_size INTEGER DEFAULT 5,
  interval_minutes INTEGER DEFAULT 30,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'paused')),
  scheduled_for DATE NOT NULL,
  processed_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  error_log JSONB DEFAULT '[]',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Create table for daily group limits
CREATE TABLE public.tenant_daily_group_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  members_added INTEGER DEFAULT 0,
  max_daily_limit INTEGER DEFAULT 50,
  UNIQUE(tenant_id, date)
);

-- Enable RLS
ALTER TABLE public.whatsapp_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_group_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_add_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_daily_group_limits ENABLE ROW LEVEL SECURITY;

-- RLS policies for whatsapp_groups
CREATE POLICY "Tenants can view their own groups"
ON public.whatsapp_groups FOR SELECT
USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Tenants can insert their own groups"
ON public.whatsapp_groups FOR INSERT
WITH CHECK (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Tenants can update their own groups"
ON public.whatsapp_groups FOR UPDATE
USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Tenants can delete their own groups"
ON public.whatsapp_groups FOR DELETE
USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- RLS policies for whatsapp_group_participants
CREATE POLICY "Tenants can view participants of their groups"
ON public.whatsapp_group_participants FOR SELECT
USING (group_id IN (
  SELECT id FROM whatsapp_groups 
  WHERE tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
));

CREATE POLICY "Tenants can insert participants to their groups"
ON public.whatsapp_group_participants FOR INSERT
WITH CHECK (group_id IN (
  SELECT id FROM whatsapp_groups 
  WHERE tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
));

CREATE POLICY "Tenants can update participants of their groups"
ON public.whatsapp_group_participants FOR UPDATE
USING (group_id IN (
  SELECT id FROM whatsapp_groups 
  WHERE tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
));

CREATE POLICY "Tenants can delete participants from their groups"
ON public.whatsapp_group_participants FOR DELETE
USING (group_id IN (
  SELECT id FROM whatsapp_groups 
  WHERE tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
));

-- RLS policies for group_add_queue
CREATE POLICY "Tenants can view their own queue"
ON public.group_add_queue FOR SELECT
USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Tenants can insert to their own queue"
ON public.group_add_queue FOR INSERT
WITH CHECK (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Tenants can update their own queue"
ON public.group_add_queue FOR UPDATE
USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Tenants can delete from their own queue"
ON public.group_add_queue FOR DELETE
USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- RLS policies for tenant_daily_group_limits
CREATE POLICY "Tenants can view their own limits"
ON public.tenant_daily_group_limits FOR SELECT
USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Tenants can insert their own limits"
ON public.tenant_daily_group_limits FOR INSERT
WITH CHECK (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Tenants can update their own limits"
ON public.tenant_daily_group_limits FOR UPDATE
USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- Create indexes for performance
CREATE INDEX idx_whatsapp_groups_tenant ON public.whatsapp_groups(tenant_id);
CREATE INDEX idx_whatsapp_groups_instance ON public.whatsapp_groups(instance_id);
CREATE INDEX idx_group_participants_group ON public.whatsapp_group_participants(group_id);
CREATE INDEX idx_group_participants_contact ON public.whatsapp_group_participants(contact_id);
CREATE INDEX idx_group_add_queue_tenant_status ON public.group_add_queue(tenant_id, status);
CREATE INDEX idx_group_add_queue_scheduled ON public.group_add_queue(scheduled_for, status);
CREATE INDEX idx_daily_limits_tenant_date ON public.tenant_daily_group_limits(tenant_id, date);

-- Trigger for updating updated_at
CREATE TRIGGER update_whatsapp_groups_updated_at
BEFORE UPDATE ON public.whatsapp_groups
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();