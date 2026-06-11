-- Create scheduled_report_settings table
CREATE TABLE public.scheduled_report_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  daily_enabled BOOLEAN NOT NULL DEFAULT true,
  weekly_enabled BOOLEAN NOT NULL DEFAULT true,
  monthly_enabled BOOLEAN NOT NULL DEFAULT true,
  send_time TIME NOT NULL DEFAULT '20:00:00',
  timezone TEXT NOT NULL DEFAULT 'Asia/Dhaka',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(tenant_id)
);

-- Create scheduled_report_logs table
CREATE TABLE public.scheduled_report_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  report_type TEXT NOT NULL CHECK (report_type IN ('daily', 'weekly', 'monthly')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('sent', 'failed', 'skipped', 'pending')),
  sent_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  report_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_scheduled_report_settings_tenant ON public.scheduled_report_settings(tenant_id);
CREATE INDEX idx_scheduled_report_logs_tenant ON public.scheduled_report_logs(tenant_id);
CREATE INDEX idx_scheduled_report_logs_created ON public.scheduled_report_logs(created_at DESC);
CREATE INDEX idx_scheduled_report_logs_type ON public.scheduled_report_logs(report_type);

-- Enable RLS
ALTER TABLE public.scheduled_report_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_report_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for scheduled_report_settings
CREATE POLICY "Tenant members can view their report settings"
ON public.scheduled_report_settings FOR SELECT
USING (public.is_tenant_member(tenant_id));

CREATE POLICY "Tenant owners/managers can insert report settings"
ON public.scheduled_report_settings FOR INSERT
WITH CHECK (public.is_tenant_owner_or_manager(tenant_id));

CREATE POLICY "Tenant owners/managers can update report settings"
ON public.scheduled_report_settings FOR UPDATE
USING (public.is_tenant_owner_or_manager(tenant_id));

CREATE POLICY "Tenant owners can delete report settings"
ON public.scheduled_report_settings FOR DELETE
USING (public.is_tenant_owner(tenant_id));

-- RLS Policies for scheduled_report_logs
CREATE POLICY "Tenant members can view their report logs"
ON public.scheduled_report_logs FOR SELECT
USING (public.is_tenant_member(tenant_id));

CREATE POLICY "System can insert report logs"
ON public.scheduled_report_logs FOR INSERT
WITH CHECK (true);

-- Admin access policies
CREATE POLICY "Admins can view all report settings"
ON public.scheduled_report_settings FOR SELECT
USING (public.is_system_admin());

CREATE POLICY "Admins can view all report logs"
ON public.scheduled_report_logs FOR SELECT
USING (public.is_system_admin());

-- Trigger for updated_at
CREATE TRIGGER update_scheduled_report_settings_updated_at
  BEFORE UPDATE ON public.scheduled_report_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();