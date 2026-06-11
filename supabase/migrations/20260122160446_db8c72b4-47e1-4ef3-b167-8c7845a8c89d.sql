-- Create automation_rules table
CREATE TABLE public.automation_rules (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    trigger_type TEXT NOT NULL CHECK (trigger_type IN ('new_message', 'keyword_match')),
    trigger_config JSONB NOT NULL DEFAULT '{}'::jsonb,
    action_type TEXT NOT NULL CHECK (action_type IN ('auto_reply', 'assign_agent')),
    action_config JSONB NOT NULL DEFAULT '{}'::jsonb,
    priority INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.automation_rules ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Members can view automation rules"
ON public.automation_rules FOR SELECT
USING (is_system_admin() OR is_tenant_member(tenant_id));

CREATE POLICY "Owners/Managers can create automation rules"
ON public.automation_rules FOR INSERT
WITH CHECK (is_system_admin() OR is_tenant_owner_or_manager(tenant_id));

CREATE POLICY "Owners/Managers can update automation rules"
ON public.automation_rules FOR UPDATE
USING (is_system_admin() OR is_tenant_owner_or_manager(tenant_id));

CREATE POLICY "Owners/Managers can delete automation rules"
ON public.automation_rules FOR DELETE
USING (is_system_admin() OR is_tenant_owner_or_manager(tenant_id));

-- Add trigger for updated_at
CREATE TRIGGER update_automation_rules_updated_at
BEFORE UPDATE ON public.automation_rules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster queries
CREATE INDEX idx_automation_rules_tenant_active ON public.automation_rules(tenant_id, is_active);
CREATE INDEX idx_automation_rules_trigger_type ON public.automation_rules(trigger_type);