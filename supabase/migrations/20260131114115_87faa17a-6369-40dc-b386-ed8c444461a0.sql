-- Update admin_marketing_campaigns discount constraint to allow up to 15%
ALTER TABLE admin_marketing_campaigns DROP CONSTRAINT IF EXISTS admin_marketing_campaigns_max_discount_percent_check;
ALTER TABLE admin_marketing_campaigns ADD CONSTRAINT admin_marketing_campaigns_max_discount_percent_check CHECK (max_discount_percent >= 0 AND max_discount_percent <= 15);