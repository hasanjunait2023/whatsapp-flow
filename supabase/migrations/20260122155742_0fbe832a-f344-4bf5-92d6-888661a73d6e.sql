-- Team Invitations Table
CREATE TABLE public.team_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role tenant_role NOT NULL DEFAULT 'agent',
    invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '7 days'),
    accepted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, email)
);

ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;

-- RLS for team_invitations
CREATE POLICY "Members can view invitations for their tenant"
ON public.team_invitations FOR SELECT
USING (public.is_system_admin() OR public.is_tenant_member(tenant_id));

CREATE POLICY "Owners/Managers can create invitations"
ON public.team_invitations FOR INSERT
WITH CHECK (
    public.is_system_admin() OR (
        public.is_tenant_owner_or_manager(tenant_id) 
        AND role <> 'owner'
    )
);

CREATE POLICY "Owners/Managers can delete invitations"
ON public.team_invitations FOR DELETE
USING (public.is_system_admin() OR public.is_tenant_owner_or_manager(tenant_id));

CREATE POLICY "Invitees can update their invitation"
ON public.team_invitations FOR UPDATE
USING (public.is_system_admin() OR email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- Index for fast token lookups
CREATE INDEX idx_team_invitations_token ON public.team_invitations(token);
CREATE INDEX idx_team_invitations_email ON public.team_invitations(email);