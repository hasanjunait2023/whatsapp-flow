-- Create team member permissions table
CREATE TABLE public.team_member_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  
  -- Module Access
  can_access_inbox BOOLEAN DEFAULT true,
  can_access_orders BOOLEAN DEFAULT true,
  can_access_products BOOLEAN DEFAULT false,
  can_access_contacts BOOLEAN DEFAULT true,
  can_access_groups BOOLEAN DEFAULT false,
  can_access_automation BOOLEAN DEFAULT false,
  can_access_workflows BOOLEAN DEFAULT false,
  can_access_analytics BOOLEAN DEFAULT false,
  can_access_reports BOOLEAN DEFAULT false,
  can_access_complaints BOOLEAN DEFAULT true,
  can_access_accounts BOOLEAN DEFAULT false,
  can_access_team BOOLEAN DEFAULT false,
  can_access_settings BOOLEAN DEFAULT false,
  can_access_fb_inbox BOOLEAN DEFAULT false,
  can_access_ai_agent BOOLEAN DEFAULT false,
  can_access_internal_chat BOOLEAN DEFAULT true,
  
  -- Order Permissions
  can_create_orders BOOLEAN DEFAULT true,
  can_edit_orders BOOLEAN DEFAULT false,
  can_delete_orders BOOLEAN DEFAULT false,
  can_update_order_status BOOLEAN DEFAULT true,
  can_update_payment_status BOOLEAN DEFAULT false,
  
  -- Product Permissions
  can_create_products BOOLEAN DEFAULT false,
  can_edit_products BOOLEAN DEFAULT false,
  can_delete_products BOOLEAN DEFAULT false,
  
  -- Contact Permissions
  can_create_contacts BOOLEAN DEFAULT true,
  can_edit_contacts BOOLEAN DEFAULT true,
  can_delete_contacts BOOLEAN DEFAULT false,
  can_assign_contacts BOOLEAN DEFAULT false,
  
  -- Message Permissions
  can_send_messages BOOLEAN DEFAULT true,
  can_delete_messages BOOLEAN DEFAULT false,
  can_send_bulk_messages BOOLEAN DEFAULT false,
  
  -- Data Permissions
  can_view_revenue BOOLEAN DEFAULT false,
  can_export_data BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(tenant_id, user_id)
);

-- Create permission templates table
CREATE TABLE public.permission_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  permissions JSONB NOT NULL DEFAULT '{}',
  is_system BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.team_member_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permission_templates ENABLE ROW LEVEL SECURITY;

-- Policies for team_member_permissions
CREATE POLICY "Owners and managers can manage permissions"
ON public.team_member_permissions FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.tenant_id = team_member_permissions.tenant_id 
    AND user_roles.user_id = auth.uid() 
    AND user_roles.role IN ('owner', 'manager')
  )
);

CREATE POLICY "Users can view own permissions"
ON public.team_member_permissions FOR SELECT
USING (user_id = auth.uid());

-- Policies for permission_templates
CREATE POLICY "Tenant members can view templates"
ON public.permission_templates FOR SELECT
USING (
  tenant_id IS NULL OR
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.tenant_id = permission_templates.tenant_id 
    AND user_roles.user_id = auth.uid()
  )
);

CREATE POLICY "Owners can manage templates"
ON public.permission_templates FOR ALL
USING (
  tenant_id IS NULL OR
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.tenant_id = permission_templates.tenant_id 
    AND user_roles.user_id = auth.uid() 
    AND user_roles.role = 'owner'
  )
);

-- Insert system templates
INSERT INTO public.permission_templates (name, description, permissions, is_system) VALUES
(
  'Sales Agent',
  'Basic sales agent with order and contact management',
  '{
    "can_access_inbox": true,
    "can_access_orders": true,
    "can_access_products": false,
    "can_access_contacts": true,
    "can_access_groups": false,
    "can_access_automation": false,
    "can_access_workflows": false,
    "can_access_analytics": false,
    "can_access_reports": false,
    "can_access_complaints": true,
    "can_access_accounts": false,
    "can_access_team": false,
    "can_access_settings": false,
    "can_access_fb_inbox": false,
    "can_access_ai_agent": false,
    "can_access_internal_chat": true,
    "can_create_orders": true,
    "can_edit_orders": false,
    "can_delete_orders": false,
    "can_update_order_status": true,
    "can_update_payment_status": false,
    "can_create_products": false,
    "can_edit_products": false,
    "can_delete_products": false,
    "can_create_contacts": true,
    "can_edit_contacts": true,
    "can_delete_contacts": false,
    "can_assign_contacts": false,
    "can_send_messages": true,
    "can_delete_messages": false,
    "can_send_bulk_messages": false,
    "can_view_revenue": false,
    "can_export_data": false
  }',
  true
),
(
  'Customer Support',
  'Full inbox access with complaint handling',
  '{
    "can_access_inbox": true,
    "can_access_orders": true,
    "can_access_products": false,
    "can_access_contacts": true,
    "can_access_groups": false,
    "can_access_automation": false,
    "can_access_workflows": false,
    "can_access_analytics": false,
    "can_access_reports": false,
    "can_access_complaints": true,
    "can_access_accounts": false,
    "can_access_team": false,
    "can_access_settings": false,
    "can_access_fb_inbox": true,
    "can_access_ai_agent": false,
    "can_access_internal_chat": true,
    "can_create_orders": true,
    "can_edit_orders": false,
    "can_delete_orders": false,
    "can_update_order_status": true,
    "can_update_payment_status": false,
    "can_create_products": false,
    "can_edit_products": false,
    "can_delete_products": false,
    "can_create_contacts": true,
    "can_edit_contacts": true,
    "can_delete_contacts": false,
    "can_assign_contacts": false,
    "can_send_messages": true,
    "can_delete_messages": false,
    "can_send_bulk_messages": false,
    "can_view_revenue": false,
    "can_export_data": false
  }',
  true
),
(
  'Senior Agent',
  'Extended access with groups and reports',
  '{
    "can_access_inbox": true,
    "can_access_orders": true,
    "can_access_products": true,
    "can_access_contacts": true,
    "can_access_groups": true,
    "can_access_automation": false,
    "can_access_workflows": false,
    "can_access_analytics": true,
    "can_access_reports": true,
    "can_access_complaints": true,
    "can_access_accounts": false,
    "can_access_team": false,
    "can_access_settings": false,
    "can_access_fb_inbox": true,
    "can_access_ai_agent": false,
    "can_access_internal_chat": true,
    "can_create_orders": true,
    "can_edit_orders": true,
    "can_delete_orders": false,
    "can_update_order_status": true,
    "can_update_payment_status": true,
    "can_create_products": false,
    "can_edit_products": false,
    "can_delete_products": false,
    "can_create_contacts": true,
    "can_edit_contacts": true,
    "can_delete_contacts": false,
    "can_assign_contacts": true,
    "can_send_messages": true,
    "can_delete_messages": false,
    "can_send_bulk_messages": true,
    "can_view_revenue": true,
    "can_export_data": false
  }',
  true
),
(
  'Manager Lite',
  'Full access except team and financial settings',
  '{
    "can_access_inbox": true,
    "can_access_orders": true,
    "can_access_products": true,
    "can_access_contacts": true,
    "can_access_groups": true,
    "can_access_automation": true,
    "can_access_workflows": true,
    "can_access_analytics": true,
    "can_access_reports": true,
    "can_access_complaints": true,
    "can_access_accounts": false,
    "can_access_team": false,
    "can_access_settings": false,
    "can_access_fb_inbox": true,
    "can_access_ai_agent": true,
    "can_access_internal_chat": true,
    "can_create_orders": true,
    "can_edit_orders": true,
    "can_delete_orders": true,
    "can_update_order_status": true,
    "can_update_payment_status": true,
    "can_create_products": true,
    "can_edit_products": true,
    "can_delete_products": false,
    "can_create_contacts": true,
    "can_edit_contacts": true,
    "can_delete_contacts": true,
    "can_assign_contacts": true,
    "can_send_messages": true,
    "can_delete_messages": true,
    "can_send_bulk_messages": true,
    "can_view_revenue": true,
    "can_export_data": true
  }',
  true
);

-- Create trigger for updated_at
CREATE TRIGGER update_team_member_permissions_updated_at
BEFORE UPDATE ON public.team_member_permissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();