-- WhatsApp Auto Messages Settings Table
CREATE TABLE public.whatsapp_auto_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  
  -- Welcome Message (triggered for new contacts)
  welcome_enabled BOOLEAN DEFAULT false,
  welcome_message TEXT DEFAULT 'Welcome! Thank you for reaching out. How can we help you today?',
  welcome_media_items JSONB DEFAULT '[]',
  
  -- Away Message (triggered when no team online)
  away_enabled BOOLEAN DEFAULT false,
  away_message TEXT DEFAULT 'We are currently unavailable. We will respond as soon as possible!',
  away_media_items JSONB DEFAULT '[]',
  away_cooldown_hours INTEGER DEFAULT 24,
  
  -- Follow-up Message (Pro plan only - triggered after delay if no order)
  followup_enabled BOOLEAN DEFAULT false,
  followup_message TEXT DEFAULT 'Hi! We noticed you were browsing. Can we help you with anything?',
  followup_media_items JSONB DEFAULT '[]',
  followup_delay_hours INTEGER DEFAULT 6,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(tenant_id)
);

-- Enable RLS
ALTER TABLE public.whatsapp_auto_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for whatsapp_auto_messages
CREATE POLICY "Tenant members can view auto messages"
ON public.whatsapp_auto_messages
FOR SELECT
USING (public.is_tenant_member(tenant_id));

CREATE POLICY "Tenant owners/managers can insert auto messages"
ON public.whatsapp_auto_messages
FOR INSERT
WITH CHECK (public.is_tenant_owner_or_manager(tenant_id));

CREATE POLICY "Tenant owners/managers can update auto messages"
ON public.whatsapp_auto_messages
FOR UPDATE
USING (public.is_tenant_owner_or_manager(tenant_id));

CREATE POLICY "Tenant owners can delete auto messages"
ON public.whatsapp_auto_messages
FOR DELETE
USING (public.is_tenant_owner(tenant_id));

-- Trigger for updated_at
CREATE TRIGGER update_whatsapp_auto_messages_updated_at
BEFORE UPDATE ON public.whatsapp_auto_messages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Auto Message Log Table (tracks sent messages for cooldown)
CREATE TABLE public.whatsapp_auto_message_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  message_type TEXT NOT NULL CHECK (message_type IN ('welcome', 'away', 'followup')),
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.whatsapp_auto_message_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for whatsapp_auto_message_log
CREATE POLICY "Tenant members can view auto message logs"
ON public.whatsapp_auto_message_log
FOR SELECT
USING (public.is_tenant_member(tenant_id));

CREATE POLICY "Tenant members can insert auto message logs"
ON public.whatsapp_auto_message_log
FOR INSERT
WITH CHECK (public.is_tenant_member(tenant_id));

-- Index for efficient cooldown lookup
CREATE INDEX idx_auto_message_log_lookup 
ON public.whatsapp_auto_message_log(contact_id, message_type, sent_at DESC);

-- Follow-up Queue Table
CREATE TABLE public.whatsapp_followup_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  instance_id UUID NOT NULL REFERENCES public.whatsapp_instances(id) ON DELETE CASCADE,
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'cancelled', 'skipped')),
  skip_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.whatsapp_followup_queue ENABLE ROW LEVEL SECURITY;

-- RLS Policies for whatsapp_followup_queue
CREATE POLICY "Tenant members can view followup queue"
ON public.whatsapp_followup_queue
FOR SELECT
USING (public.is_tenant_member(tenant_id));

CREATE POLICY "Tenant members can insert followup queue"
ON public.whatsapp_followup_queue
FOR INSERT
WITH CHECK (public.is_tenant_member(tenant_id));

CREATE POLICY "Tenant members can update followup queue"
ON public.whatsapp_followup_queue
FOR UPDATE
USING (public.is_tenant_member(tenant_id));

-- Index for cron worker
CREATE INDEX idx_followup_queue_pending 
ON public.whatsapp_followup_queue(scheduled_for, status) 
WHERE status = 'pending';