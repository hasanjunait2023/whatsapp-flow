-- =====================================================
-- Customer Segmentation System
-- =====================================================

-- Customer segments for grouping customers by behavior/attributes
CREATE TABLE IF NOT EXISTS customer_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#3B82F6',
  icon TEXT DEFAULT 'users',
  
  -- Auto-assignment rules (JSONB for flexibility)
  rules JSONB DEFAULT '[]',
  -- e.g., [{ "field": "total_orders", "operator": ">=", "value": 5 }, { "field": "total_spent", "operator": ">=", "value": 10000 }]
  
  is_auto BOOLEAN DEFAULT false, -- Auto-assign based on rules
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(tenant_id, name)
);

-- Contact-segment junction table
CREATE TABLE IF NOT EXISTS contact_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  segment_id UUID NOT NULL REFERENCES customer_segments(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT now(),
  assigned_by UUID REFERENCES auth.users(id),
  assignment_reason TEXT, -- 'manual', 'auto_rule', 'import'
  
  UNIQUE(contact_id, segment_id)
);

-- Customer scoring rules
CREATE TABLE IF NOT EXISTS customer_scoring_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  
  -- Scoring criteria
  criteria_type TEXT NOT NULL, -- 'order_count', 'total_spent', 'avg_order_value', 'days_since_last_order', 'message_count'
  operator TEXT NOT NULL, -- '>=', '<=', '=', '>', '<', 'between'
  value_min DECIMAL,
  value_max DECIMAL,
  
  -- Points to add/subtract
  points INTEGER NOT NULL DEFAULT 0,
  
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(tenant_id, name)
);

-- Customer scores (computed values)
CREATE TABLE IF NOT EXISTS customer_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE UNIQUE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Computed metrics
  total_orders INTEGER DEFAULT 0,
  total_spent DECIMAL(12,2) DEFAULT 0,
  avg_order_value DECIMAL(12,2) DEFAULT 0,
  last_order_date TIMESTAMPTZ,
  first_order_date TIMESTAMPTZ,
  message_count INTEGER DEFAULT 0,
  
  -- Calculated score
  score INTEGER DEFAULT 0,
  score_tier TEXT DEFAULT 'new', -- 'new', 'bronze', 'silver', 'gold', 'platinum', 'vip'
  
  last_calculated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- Enhance notifications for in-app real-time alerts
-- =====================================================

-- In-app notifications table (distinct from system notifications)
CREATE TABLE IF NOT EXISTS in_app_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- NULL = all users in tenant
  
  type TEXT NOT NULL, -- 'new_order', 'new_message', 'new_complaint', 'order_status', 'system'
  title TEXT NOT NULL,
  message TEXT,
  
  -- Related entity
  entity_type TEXT, -- 'order', 'message', 'complaint', 'contact'
  entity_id UUID,
  
  -- Status
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  
  -- Metadata for extra context
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE customer_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_scoring_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE in_app_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for customer_segments
CREATE POLICY "Tenant members can view segments"
ON customer_segments FOR SELECT
USING (is_tenant_member(tenant_id));

CREATE POLICY "Owners/managers can manage segments"
ON customer_segments FOR ALL
USING (is_tenant_owner_or_manager(tenant_id));

-- RLS Policies for contact_segments
CREATE POLICY "Tenant members can view contact segments"
ON contact_segments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM contacts c 
    WHERE c.id = contact_id 
    AND is_tenant_member(c.tenant_id)
  )
);

CREATE POLICY "Tenant members can manage contact segments"
ON contact_segments FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM contacts c 
    WHERE c.id = contact_id 
    AND is_tenant_member(c.tenant_id)
  )
);

-- RLS Policies for customer_scoring_rules
CREATE POLICY "Tenant members can view scoring rules"
ON customer_scoring_rules FOR SELECT
USING (is_tenant_member(tenant_id));

CREATE POLICY "Owners/managers can manage scoring rules"
ON customer_scoring_rules FOR ALL
USING (is_tenant_owner_or_manager(tenant_id));

-- RLS Policies for customer_scores
CREATE POLICY "Tenant members can view scores"
ON customer_scores FOR SELECT
USING (is_tenant_member(tenant_id));

CREATE POLICY "Tenant members can update scores"
ON customer_scores FOR ALL
USING (is_tenant_member(tenant_id));

-- RLS Policies for in_app_notifications
CREATE POLICY "Users can view own notifications"
ON in_app_notifications FOR SELECT
USING (
  is_tenant_member(tenant_id) AND 
  (user_id IS NULL OR user_id = auth.uid())
);

CREATE POLICY "Users can update own notifications"
ON in_app_notifications FOR UPDATE
USING (
  is_tenant_member(tenant_id) AND 
  (user_id IS NULL OR user_id = auth.uid())
);

CREATE POLICY "System can insert notifications"
ON in_app_notifications FOR INSERT
WITH CHECK (is_tenant_member(tenant_id));

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE in_app_notifications;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_customer_segments_tenant ON customer_segments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_contact_segments_contact ON contact_segments(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_segments_segment ON contact_segments(segment_id);
CREATE INDEX IF NOT EXISTS idx_customer_scores_tenant ON customer_scores(tenant_id);
CREATE INDEX IF NOT EXISTS idx_customer_scores_score ON customer_scores(score DESC);
CREATE INDEX IF NOT EXISTS idx_in_app_notifications_user ON in_app_notifications(tenant_id, user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_in_app_notifications_created ON in_app_notifications(created_at DESC);

-- Trigger for automatic notification creation on new orders
CREATE OR REPLACE FUNCTION create_order_notification()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO in_app_notifications (tenant_id, type, title, message, entity_type, entity_id, metadata)
  VALUES (
    NEW.tenant_id,
    'new_order',
    'New Order Received',
    format('Order %s - %s %s from %s', NEW.order_number, NEW.currency, NEW.total, COALESCE(NEW.customer_name, 'Customer')),
    'order',
    NEW.id,
    jsonb_build_object('order_number', NEW.order_number, 'total', NEW.total, 'customer_name', NEW.customer_name)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_order_notification
AFTER INSERT ON orders
FOR EACH ROW
EXECUTE FUNCTION create_order_notification();

-- Trigger for automatic notification creation on new complaints
CREATE OR REPLACE FUNCTION create_complaint_notification()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO in_app_notifications (tenant_id, type, title, message, entity_type, entity_id, metadata)
  VALUES (
    NEW.tenant_id,
    'new_complaint',
    'New Complaint Filed',
    format('%s - Priority: %s', NEW.title, NEW.priority),
    'complaint',
    NEW.id,
    jsonb_build_object('title', NEW.title, 'priority', NEW.priority, 'category', NEW.category)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_complaint_notification
AFTER INSERT ON complaints
FOR EACH ROW
EXECUTE FUNCTION create_complaint_notification();