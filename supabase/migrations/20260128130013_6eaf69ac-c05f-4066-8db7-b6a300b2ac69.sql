-- Admin WhatsApp Instances for admin business communication
CREATE TABLE public.admin_whatsapp_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  phone_number VARCHAR(20),
  api_key_encrypted TEXT,
  session_id VARCHAR(100),
  status VARCHAR(20) DEFAULT 'disconnected',
  is_default BOOLEAN DEFAULT false,
  qr_code TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Admin Facebook Pages for admin business communication
CREATE TABLE public.admin_facebook_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id VARCHAR(50) NOT NULL,
  page_name VARCHAR(255) NOT NULL,
  page_access_token TEXT,
  app_secret TEXT,
  profile_picture_url TEXT,
  status VARCHAR(20) DEFAULT 'disconnected',
  webhook_verify_token VARCHAR(64) DEFAULT encode(gen_random_bytes(16), 'hex'),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Support Tickets for tenant support
CREATE TABLE public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number VARCHAR(20) UNIQUE NOT NULL,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  subject VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50) DEFAULT 'general',
  priority VARCHAR(20) DEFAULT 'medium',
  status VARCHAR(20) DEFAULT 'open',
  assigned_to UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Support Ticket Messages for conversations
CREATE TABLE public.support_ticket_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES public.support_tickets(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES auth.users(id),
  sender_type VARCHAR(20) NOT NULL,
  message TEXT NOT NULL,
  attachments JSONB,
  is_internal_note BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Admin Tasks for team task management
CREATE TABLE public.admin_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(20) DEFAULT 'todo',
  priority VARCHAR(20) DEFAULT 'medium',
  assigned_to UUID REFERENCES auth.users(id),
  assigned_by UUID REFERENCES auth.users(id),
  related_ticket_id UUID REFERENCES public.support_tickets(id),
  related_tenant_id UUID REFERENCES public.tenants(id),
  due_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on all new tables
ALTER TABLE public.admin_whatsapp_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_facebook_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_tasks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for admin_whatsapp_instances (only system admins)
CREATE POLICY "System admins can manage admin WhatsApp instances"
ON public.admin_whatsapp_instances
FOR ALL
TO authenticated
USING (public.is_system_admin())
WITH CHECK (public.is_system_admin());

-- RLS Policies for admin_facebook_pages (only system admins)
CREATE POLICY "System admins can manage admin Facebook pages"
ON public.admin_facebook_pages
FOR ALL
TO authenticated
USING (public.is_system_admin())
WITH CHECK (public.is_system_admin());

-- RLS Policies for support_tickets
CREATE POLICY "System admins can view all support tickets"
ON public.support_tickets
FOR SELECT
TO authenticated
USING (public.is_system_admin());

CREATE POLICY "System admins can manage support tickets"
ON public.support_tickets
FOR ALL
TO authenticated
USING (public.is_system_admin())
WITH CHECK (public.is_system_admin());

CREATE POLICY "Tenants can view their own tickets"
ON public.support_tickets
FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR tenant_id IN (SELECT tenant_id FROM public.user_roles WHERE user_id = auth.uid()));

CREATE POLICY "Tenants can create their own tickets"
ON public.support_tickets
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- RLS Policies for support_ticket_messages
CREATE POLICY "System admins can manage ticket messages"
ON public.support_ticket_messages
FOR ALL
TO authenticated
USING (public.is_system_admin())
WITH CHECK (public.is_system_admin());

CREATE POLICY "Ticket participants can view messages"
ON public.support_ticket_messages
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.support_tickets 
    WHERE id = ticket_id 
    AND (user_id = auth.uid() OR tenant_id IN (SELECT tenant_id FROM public.user_roles WHERE user_id = auth.uid()))
  )
);

CREATE POLICY "Ticket participants can add messages"
ON public.support_ticket_messages
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.support_tickets 
    WHERE id = ticket_id 
    AND (user_id = auth.uid() OR public.is_system_admin())
  )
);

-- RLS Policies for admin_tasks (only system admins)
CREATE POLICY "System admins can manage admin tasks"
ON public.admin_tasks
FOR ALL
TO authenticated
USING (public.is_system_admin())
WITH CHECK (public.is_system_admin());

-- Updated at triggers
CREATE TRIGGER update_admin_whatsapp_instances_updated_at
  BEFORE UPDATE ON public.admin_whatsapp_instances
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_admin_facebook_pages_updated_at
  BEFORE UPDATE ON public.admin_facebook_pages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_support_tickets_updated_at
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_admin_tasks_updated_at
  BEFORE UPDATE ON public.admin_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to generate ticket number
CREATE OR REPLACE FUNCTION public.generate_ticket_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.ticket_number := 'TKT-' || LPAD(CAST(EXTRACT(EPOCH FROM NOW())::BIGINT % 1000000 AS TEXT), 6, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER generate_ticket_number_trigger
  BEFORE INSERT ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.generate_ticket_number();

-- Indexes for performance
CREATE INDEX idx_support_tickets_tenant ON public.support_tickets(tenant_id);
CREATE INDEX idx_support_tickets_status ON public.support_tickets(status);
CREATE INDEX idx_support_tickets_assigned ON public.support_tickets(assigned_to);
CREATE INDEX idx_support_ticket_messages_ticket ON public.support_ticket_messages(ticket_id);
CREATE INDEX idx_admin_tasks_assigned ON public.admin_tasks(assigned_to);
CREATE INDEX idx_admin_tasks_status ON public.admin_tasks(status);