-- Marketing Automation System Tables

-- 1. Marketing Campaigns Table
CREATE TABLE admin_marketing_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_bn TEXT,
  type TEXT NOT NULL CHECK (type IN ('prospect_nurture', 'subscriber_retention', 'pro_ai_onboard', 'win_back', 'announcement')),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed')),
  target_tier TEXT[] DEFAULT ARRAY['starter', 'growth', 'pro'],
  target_audience JSONB DEFAULT '{}',
  max_discount_percent INT DEFAULT 10 CHECK (max_discount_percent >= 0 AND max_discount_percent <= 10),
  
  -- Frequency settings
  frequency_per_week INT DEFAULT 1 CHECK (frequency_per_week >= 1 AND frequency_per_week <= 7),
  frequency_per_month INT DEFAULT 4 CHECK (frequency_per_month >= 1 AND frequency_per_month <= 30),
  min_days_between_messages INT DEFAULT 2 CHECK (min_days_between_messages >= 1),
  
  -- Channel settings
  use_whatsapp BOOLEAN DEFAULT true,
  use_email BOOLEAN DEFAULT true,
  alternate_channels BOOLEAN DEFAULT true,
  
  -- Blackout hours (JSON: {"start": "22:00", "end": "08:00"})
  blackout_hours JSONB DEFAULT '{"start": "22:00", "end": "08:00"}',
  
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Marketing Sequences Table
CREATE TABLE admin_marketing_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES admin_marketing_campaigns(id) ON DELETE CASCADE,
  week_number INT NOT NULL CHECK (week_number >= 1 AND week_number <= 52),
  day_of_week INT CHECK (day_of_week >= 1 AND day_of_week <= 7),
  step_order INT NOT NULL,
  name TEXT NOT NULL,
  name_bn TEXT,
  theme TEXT CHECK (theme IN ('educational', 'social_proof', 'feature', 'offer', 'engagement', 'welcome', 'checkin')),
  channel TEXT NOT NULL CHECK (channel IN ('whatsapp', 'email', 'both')),
  content_template JSONB NOT NULL DEFAULT '{}',
  ai_personalize BOOLEAN DEFAULT false,
  discount_percent INT DEFAULT 0 CHECK (discount_percent >= 0 AND discount_percent <= 10),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(campaign_id, week_number, step_order)
);

-- 3. Marketing Enrollments Table
CREATE TABLE admin_marketing_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES admin_marketing_campaigns(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('lead', 'tenant')),
  entity_id UUID NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'unsubscribed')),
  current_week INT DEFAULT 1,
  current_step INT DEFAULT 0,
  next_message_at TIMESTAMP WITH TIME ZONE,
  last_message_at TIMESTAMP WITH TIME ZONE,
  total_messages_sent INT DEFAULT 0,
  messages_this_week INT DEFAULT 0,
  messages_this_month INT DEFAULT 0,
  week_reset_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  month_reset_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  unsubscribed_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}',
  
  UNIQUE(campaign_id, entity_type, entity_id)
);

-- 4. Customer Journey Log Table
CREATE TABLE admin_customer_journey (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('lead', 'tenant')),
  entity_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  event_category TEXT CHECK (event_category IN ('marketing', 'engagement', 'conversion', 'support', 'payment')),
  title_bn TEXT NOT NULL,
  description_bn TEXT,
  channel TEXT CHECK (channel IN ('whatsapp', 'email', 'in_app', 'system')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Marketing Message Sends Log
CREATE TABLE admin_marketing_sends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID NOT NULL REFERENCES admin_marketing_enrollments(id) ON DELETE CASCADE,
  sequence_id UUID NOT NULL REFERENCES admin_marketing_sequences(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('whatsapp', 'email')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'opened', 'clicked')),
  content JSONB,
  sent_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  opened_at TIMESTAMP WITH TIME ZONE,
  clicked_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  ai_generated BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_marketing_campaigns_status ON admin_marketing_campaigns(status);
CREATE INDEX idx_marketing_campaigns_type ON admin_marketing_campaigns(type);
CREATE INDEX idx_marketing_sequences_campaign ON admin_marketing_sequences(campaign_id);
CREATE INDEX idx_marketing_sequences_week ON admin_marketing_sequences(week_number);
CREATE INDEX idx_marketing_enrollments_campaign ON admin_marketing_enrollments(campaign_id);
CREATE INDEX idx_marketing_enrollments_entity ON admin_marketing_enrollments(entity_type, entity_id);
CREATE INDEX idx_marketing_enrollments_status ON admin_marketing_enrollments(status);
CREATE INDEX idx_marketing_enrollments_next_message ON admin_marketing_enrollments(next_message_at) WHERE status = 'active';
CREATE INDEX idx_customer_journey_entity ON admin_customer_journey(entity_type, entity_id);
CREATE INDEX idx_customer_journey_created ON admin_customer_journey(created_at DESC);
CREATE INDEX idx_marketing_sends_enrollment ON admin_marketing_sends(enrollment_id);
CREATE INDEX idx_marketing_sends_status ON admin_marketing_sends(status);

-- Enable RLS
ALTER TABLE admin_marketing_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_marketing_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_marketing_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_customer_journey ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_marketing_sends ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Use existing is_super_admin() function
CREATE POLICY "Super admins can manage marketing campaigns"
ON admin_marketing_campaigns
FOR ALL
USING (is_super_admin());

CREATE POLICY "Super admins can manage marketing sequences"
ON admin_marketing_sequences
FOR ALL
USING (is_super_admin());

CREATE POLICY "Super admins can manage marketing enrollments"
ON admin_marketing_enrollments
FOR ALL
USING (is_super_admin());

CREATE POLICY "Super admins can view customer journey"
ON admin_customer_journey
FOR ALL
USING (is_super_admin());

CREATE POLICY "Super admins can manage marketing sends"
ON admin_marketing_sends
FOR ALL
USING (is_super_admin());

-- Trigger for updated_at on campaigns
CREATE TRIGGER update_admin_marketing_campaigns_updated_at
BEFORE UPDATE ON admin_marketing_campaigns
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();