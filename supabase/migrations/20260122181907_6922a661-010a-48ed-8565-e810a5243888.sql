-- Add new columns to whatsapp_instances for Wasender integration
ALTER TABLE public.whatsapp_instances 
ADD COLUMN IF NOT EXISTS wasender_session_id TEXT,
ADD COLUMN IF NOT EXISTS last_qr_sent_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS last_status_at TIMESTAMP WITH TIME ZONE;

-- Create onboarding_jobs table to track automated session setup
CREATE TABLE public.onboarding_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  instance_id UUID REFERENCES public.whatsapp_instances(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'creating_session', 'connecting', 'awaiting_scan', 'connected', 'failed', 'cancelled')),
  step TEXT,
  error_message TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  next_retry_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create notifications table for tracking sent notifications
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  instance_id UUID REFERENCES public.whatsapp_instances(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('qr_ready', 'qr_updated', 'connected', 'disconnected')),
  channel TEXT NOT NULL CHECK (channel IN ('email', 'sms', 'whatsapp', 'in_app')),
  recipient TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  sent_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create webhook_events_log table for observability
CREATE TABLE public.webhook_events_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  instance_id UUID REFERENCES public.whatsapp_instances(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  processed BOOLEAN NOT NULL DEFAULT false,
  error TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_onboarding_jobs_tenant_id ON public.onboarding_jobs(tenant_id);
CREATE INDEX idx_onboarding_jobs_status ON public.onboarding_jobs(status);
CREATE INDEX idx_onboarding_jobs_next_retry ON public.onboarding_jobs(next_retry_at) WHERE status = 'failed';

CREATE INDEX idx_notifications_tenant_id ON public.notifications(tenant_id);
CREATE INDEX idx_notifications_instance_id ON public.notifications(instance_id);
CREATE INDEX idx_notifications_type_status ON public.notifications(type, status);

CREATE INDEX idx_webhook_events_log_tenant_id ON public.webhook_events_log(tenant_id);
CREATE INDEX idx_webhook_events_log_instance_id ON public.webhook_events_log(instance_id);
CREATE INDEX idx_webhook_events_log_event_type ON public.webhook_events_log(event_type);
CREATE INDEX idx_webhook_events_log_processed ON public.webhook_events_log(processed) WHERE processed = false;

CREATE INDEX idx_whatsapp_instances_wasender_session ON public.whatsapp_instances(wasender_session_id) WHERE wasender_session_id IS NOT NULL;

-- Enable RLS on new tables
ALTER TABLE public.onboarding_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_events_log ENABLE ROW LEVEL SECURITY;

-- RLS policies for onboarding_jobs
CREATE POLICY "Members can view onboarding jobs"
ON public.onboarding_jobs FOR SELECT
USING (is_system_admin() OR is_tenant_member(tenant_id));

CREATE POLICY "System admins can manage onboarding jobs"
ON public.onboarding_jobs FOR ALL
USING (is_system_admin());

-- RLS policies for notifications
CREATE POLICY "Members can view notifications"
ON public.notifications FOR SELECT
USING (is_system_admin() OR is_tenant_member(tenant_id));

CREATE POLICY "System admins can manage notifications"
ON public.notifications FOR ALL
USING (is_system_admin());

-- RLS policies for webhook_events_log
CREATE POLICY "Members can view webhook events"
ON public.webhook_events_log FOR SELECT
USING (is_system_admin() OR is_tenant_member(tenant_id));

CREATE POLICY "System admins can manage webhook events"
ON public.webhook_events_log FOR ALL
USING (is_system_admin());

-- Add trigger for updated_at on onboarding_jobs
CREATE TRIGGER update_onboarding_jobs_updated_at
BEFORE UPDATE ON public.onboarding_jobs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();