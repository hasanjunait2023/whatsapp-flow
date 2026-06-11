-- Add notification tracking columns to external_sales_orders
ALTER TABLE external_sales_orders 
  ADD COLUMN IF NOT EXISTS whatsapp_sent BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS whatsapp_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS email_sent BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS email_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS notification_errors TEXT[];

-- Create index for filtering by notification status
CREATE INDEX IF NOT EXISTS idx_external_sales_notification_status 
  ON external_sales_orders (whatsapp_sent, email_sent);