-- Add new columns to invoice_settings for payment terms and VAT
ALTER TABLE public.invoice_settings 
ADD COLUMN IF NOT EXISTS payment_terms text DEFAULT 'Due upon receipt',
ADD COLUMN IF NOT EXISTS vat_rate numeric DEFAULT 0;