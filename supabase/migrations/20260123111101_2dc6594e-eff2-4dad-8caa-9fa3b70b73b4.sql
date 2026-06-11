-- Add WooCommerce order tracking columns to orders table
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS woo_order_id INTEGER,
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';

-- Add index for WooCommerce order ID lookups
CREATE INDEX IF NOT EXISTS idx_orders_woo_order_id ON orders(woo_order_id) WHERE woo_order_id IS NOT NULL;

-- Add webhook configuration to WooCommerce integrations
ALTER TABLE woocommerce_integrations 
ADD COLUMN IF NOT EXISTS webhook_secret TEXT,
ADD COLUMN IF NOT EXISTS sync_orders_enabled BOOLEAN DEFAULT false;

-- Create purchase behavior checks table for caching FraudBD/BDCourier API responses
CREATE TABLE IF NOT EXISTS purchase_behavior_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  phone_number TEXT NOT NULL,
  
  -- Risk assessment
  risk_level TEXT CHECK (risk_level IN ('low', 'medium', 'high')),
  customer_rating NUMERIC,
  
  -- Delivery statistics
  total_deliveries INTEGER DEFAULT 0,
  successful_deliveries INTEGER DEFAULT 0,
  cancelled_deliveries INTEGER DEFAULT 0,
  returned_deliveries INTEGER DEFAULT 0,
  
  -- Courier-specific stats
  courier_stats JSONB DEFAULT '{}',
  
  -- API response
  raw_response JSONB,
  
  -- Audit
  checked_by UUID,
  checked_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_behavior_phone ON purchase_behavior_checks(phone_number);
CREATE INDEX IF NOT EXISTS idx_behavior_tenant_contact ON purchase_behavior_checks(tenant_id, contact_id);
CREATE INDEX IF NOT EXISTS idx_behavior_tenant_phone ON purchase_behavior_checks(tenant_id, phone_number);

-- Enable RLS
ALTER TABLE purchase_behavior_checks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for purchase_behavior_checks
CREATE POLICY "Tenant members can view behavior checks"
ON purchase_behavior_checks
FOR SELECT
USING (is_tenant_member(tenant_id));

CREATE POLICY "Tenant members can create behavior checks"
ON purchase_behavior_checks
FOR INSERT
WITH CHECK (is_tenant_member(tenant_id));

CREATE POLICY "Tenant members can update behavior checks"
ON purchase_behavior_checks
FOR UPDATE
USING (is_tenant_member(tenant_id));

-- Create trigger for updated_at
CREATE TRIGGER update_purchase_behavior_checks_updated_at
BEFORE UPDATE ON purchase_behavior_checks
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();