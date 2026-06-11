-- Update discount constraint to allow up to 15%
ALTER TABLE admin_marketing_sequences DROP CONSTRAINT admin_marketing_sequences_discount_percent_check;
ALTER TABLE admin_marketing_sequences ADD CONSTRAINT admin_marketing_sequences_discount_percent_check CHECK (discount_percent >= 0 AND discount_percent <= 15);