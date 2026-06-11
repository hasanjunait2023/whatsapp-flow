-- =============================================
-- PHASE 1: Feature Management System
-- =============================================

-- Add features JSONB column to plans table for feature toggles
ALTER TABLE plans ADD COLUMN IF NOT EXISTS features JSONB DEFAULT '{
  "orders_enabled": true,
  "products_enabled": true,
  "automation_enabled": true,
  "workflows_enabled": true,
  "analytics_enabled": true,
  "team_enabled": true,
  "ai_agent_enabled": false,
  "quick_replies_enabled": true,
  "invoice_generation": false,
  "woocommerce_sync": false,
  "contacts_enabled": true
}'::jsonb;

-- Add feature_overrides to subscriptions for per-tenant customization
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS feature_overrides JSONB DEFAULT '{}'::jsonb;

-- =============================================
-- PHASE 2: Message Templates System
-- =============================================

-- Create message_templates table for WhatsApp and email templates
CREATE TABLE IF NOT EXISTS public.message_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL, -- 'subscription_reminder', 'payment_due', 'welcome', etc.
  channel TEXT NOT NULL DEFAULT 'whatsapp', -- 'whatsapp', 'email', 'both'
  content TEXT NOT NULL,
  subject TEXT, -- For email templates
  placeholders JSONB DEFAULT '[]'::jsonb, -- ["tenant_name", "expiry_date", "plan_name"]
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on message_templates (admin only)
ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;

-- Only system admins can manage templates
CREATE POLICY "System admins can manage message templates"
ON public.message_templates
FOR ALL
USING (public.is_system_admin());

-- =============================================
-- PHASE 3: Reminder Settings System
-- =============================================

-- Create reminder_settings table for automated reminders
CREATE TABLE IF NOT EXISTS public.reminder_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reminder_type TEXT NOT NULL, -- 'expiry_warning', 'payment_overdue', 'trial_ending'
  channel TEXT NOT NULL DEFAULT 'both', -- 'email', 'whatsapp', 'both'
  days_offset INTEGER[] NOT NULL DEFAULT '{7, 3, 1}', -- Days before/after to send reminders
  template_id UUID REFERENCES public.message_templates(id) ON DELETE SET NULL,
  email_subject TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(reminder_type)
);

-- Enable RLS on reminder_settings
ALTER TABLE public.reminder_settings ENABLE ROW LEVEL SECURITY;

-- Only system admins can manage reminder settings
CREATE POLICY "System admins can manage reminder settings"
ON public.reminder_settings
FOR ALL
USING (public.is_system_admin());

-- =============================================
-- PHASE 4: Reminder Logs for tracking sent reminders
-- =============================================

-- Create reminder_logs table
CREATE TABLE IF NOT EXISTS public.reminder_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  reminder_type TEXT NOT NULL,
  channel TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'sent', 'failed'
  error_message TEXT,
  sent_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.reminder_logs ENABLE ROW LEVEL SECURITY;

-- System admins can view all logs
CREATE POLICY "System admins can view reminder logs"
ON public.reminder_logs
FOR SELECT
USING (public.is_system_admin());

-- =============================================
-- PHASE 5: Insert default message templates
-- =============================================

INSERT INTO public.message_templates (name, category, channel, content, subject, placeholders)
VALUES
  (
    'Subscription Expiring Soon',
    'expiry_warning',
    'whatsapp',
    'Hi {{tenant_name}}! 👋

Your {{plan_name}} subscription will expire on {{expiry_date}}.

Renew now to keep enjoying uninterrupted service!

Thanks for being with what A app! 💚',
    NULL,
    '["tenant_name", "plan_name", "expiry_date"]'::jsonb
  ),
  (
    'Payment Overdue',
    'payment_overdue',
    'whatsapp',
    'Hi {{tenant_name}},

Your subscription payment of {{amount}} {{currency}} is overdue.

Please complete your payment to avoid service interruption.

Need help? Contact our support team.

- what A app Team',
    NULL,
    '["tenant_name", "amount", "currency"]'::jsonb
  ),
  (
    'Trial Ending Soon',
    'trial_ending',
    'whatsapp',
    'Hi {{tenant_name}}! 🎉

Your free trial ends in {{days_remaining}} days ({{expiry_date}}).

Upgrade now to continue enjoying all features!

- what A app Team',
    NULL,
    '["tenant_name", "days_remaining", "expiry_date"]'::jsonb
  ),
  (
    'Subscription Expiring Email',
    'expiry_warning',
    'email',
    'Dear {{tenant_name}},

Your {{plan_name}} subscription will expire on {{expiry_date}}.

Please renew your subscription to continue using all features.

Best regards,
what A app Team',
    'Your subscription is expiring soon',
    '["tenant_name", "plan_name", "expiry_date"]'::jsonb
  )
ON CONFLICT DO NOTHING;

-- Insert default reminder settings
INSERT INTO public.reminder_settings (reminder_type, channel, days_offset, is_active)
VALUES
  ('expiry_warning', 'both', '{7, 3, 1}', true),
  ('payment_overdue', 'whatsapp', '{1, 3, 7}', true),
  ('trial_ending', 'whatsapp', '{3, 1}', true)
ON CONFLICT (reminder_type) DO NOTHING;

-- Add trigger for updated_at on new tables
CREATE TRIGGER update_message_templates_updated_at
  BEFORE UPDATE ON public.message_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_reminder_settings_updated_at
  BEFORE UPDATE ON public.reminder_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();