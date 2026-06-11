-- Create team member access table for granular resource permissions
CREATE TABLE IF NOT EXISTS public.team_member_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  resource_type TEXT NOT NULL CHECK (resource_type IN ('whatsapp_instance', 'facebook_page')),
  resource_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, user_id, resource_type, resource_id)
);

-- Create indexes for fast lookups
CREATE INDEX idx_team_member_access_user ON public.team_member_access(user_id, resource_type);
CREATE INDEX idx_team_member_access_tenant ON public.team_member_access(tenant_id, user_id);

-- Enable RLS
ALTER TABLE public.team_member_access ENABLE ROW LEVEL SECURITY;

-- Policy: Owners/managers can fully manage
CREATE POLICY "Owners and managers can manage access"
  ON public.team_member_access
  FOR ALL
  USING (public.is_tenant_owner_or_manager(tenant_id));

-- Policy: Users can view their own access
CREATE POLICY "Users can view own access"
  ON public.team_member_access
  FOR SELECT
  USING (auth.uid() = user_id);