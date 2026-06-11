-- Create workflows table for storing workflow definitions
CREATE TABLE public.workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT false,
  trigger_type TEXT NOT NULL, -- 'message_received', 'keyword', 'schedule', 'webhook'
  trigger_config JSONB DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create workflow nodes table
CREATE TABLE public.workflow_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
  node_type TEXT NOT NULL, -- 'trigger', 'condition', 'action', 'delay'
  node_subtype TEXT, -- 'send_message', 'add_label', 'assign_agent', etc.
  node_config JSONB DEFAULT '{}',
  position_x DOUBLE PRECISION DEFAULT 0,
  position_y DOUBLE PRECISION DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create workflow edges table
CREATE TABLE public.workflow_edges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
  source_node_id UUID NOT NULL REFERENCES public.workflow_nodes(id) ON DELETE CASCADE,
  target_node_id UUID NOT NULL REFERENCES public.workflow_nodes(id) ON DELETE CASCADE,
  source_handle TEXT,
  target_handle TEXT,
  label TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create workflow execution logs
CREATE TABLE public.workflow_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'running', -- 'running', 'completed', 'failed'
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  execution_data JSONB DEFAULT '{}'
);

-- Enable RLS
ALTER TABLE public.workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_edges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_executions ENABLE ROW LEVEL SECURITY;

-- Policies for workflows
CREATE POLICY "Members can view workflows" ON public.workflows
  FOR SELECT USING (is_system_admin() OR is_tenant_member(tenant_id));

CREATE POLICY "Owners/Managers can create workflows" ON public.workflows
  FOR INSERT WITH CHECK (is_system_admin() OR is_tenant_owner_or_manager(tenant_id));

CREATE POLICY "Owners/Managers can update workflows" ON public.workflows
  FOR UPDATE USING (is_system_admin() OR is_tenant_owner_or_manager(tenant_id));

CREATE POLICY "Owners/Managers can delete workflows" ON public.workflows
  FOR DELETE USING (is_system_admin() OR is_tenant_owner_or_manager(tenant_id));

-- Policies for workflow nodes (inherit from workflow)
CREATE POLICY "Members can view workflow nodes" ON public.workflow_nodes
  FOR SELECT USING (is_system_admin() OR EXISTS (
    SELECT 1 FROM public.workflows w WHERE w.id = workflow_nodes.workflow_id AND is_tenant_member(w.tenant_id)
  ));

CREATE POLICY "Owners/Managers can manage workflow nodes" ON public.workflow_nodes
  FOR ALL USING (is_system_admin() OR EXISTS (
    SELECT 1 FROM public.workflows w WHERE w.id = workflow_nodes.workflow_id AND is_tenant_owner_or_manager(w.tenant_id)
  ));

-- Policies for workflow edges (inherit from workflow)
CREATE POLICY "Members can view workflow edges" ON public.workflow_edges
  FOR SELECT USING (is_system_admin() OR EXISTS (
    SELECT 1 FROM public.workflows w WHERE w.id = workflow_edges.workflow_id AND is_tenant_member(w.tenant_id)
  ));

CREATE POLICY "Owners/Managers can manage workflow edges" ON public.workflow_edges
  FOR ALL USING (is_system_admin() OR EXISTS (
    SELECT 1 FROM public.workflows w WHERE w.id = workflow_edges.workflow_id AND is_tenant_owner_or_manager(w.tenant_id)
  ));

-- Policies for workflow executions
CREATE POLICY "Members can view workflow executions" ON public.workflow_executions
  FOR SELECT USING (is_system_admin() OR is_tenant_member(tenant_id));

CREATE POLICY "System can manage workflow executions" ON public.workflow_executions
  FOR ALL USING (is_system_admin());

-- Create indexes
CREATE INDEX idx_workflows_tenant ON public.workflows(tenant_id);
CREATE INDEX idx_workflow_nodes_workflow ON public.workflow_nodes(workflow_id);
CREATE INDEX idx_workflow_edges_workflow ON public.workflow_edges(workflow_id);
CREATE INDEX idx_workflow_executions_workflow ON public.workflow_executions(workflow_id);
CREATE INDEX idx_workflow_executions_status ON public.workflow_executions(status);

-- Add trigger for updated_at
CREATE TRIGGER update_workflows_updated_at
  BEFORE UPDATE ON public.workflows
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();