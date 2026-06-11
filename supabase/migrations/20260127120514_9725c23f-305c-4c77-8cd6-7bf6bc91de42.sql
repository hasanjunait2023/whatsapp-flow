-- Add UddoktaPay columns to payments table
ALTER TABLE public.payments 
ADD COLUMN IF NOT EXISTS uddoktapay_invoice_id TEXT,
ADD COLUMN IF NOT EXISTS payment_gateway TEXT DEFAULT 'manual',
ADD COLUMN IF NOT EXISTS gateway_response JSONB;

-- Create index for faster invoice lookups
CREATE INDEX IF NOT EXISTS idx_payments_uddoktapay_invoice 
ON public.payments(uddoktapay_invoice_id) 
WHERE uddoktapay_invoice_id IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.payments.payment_gateway IS 'Payment method: manual, uddoktapay';
COMMENT ON COLUMN public.payments.uddoktapay_invoice_id IS 'Invoice ID from UddoktaPay gateway';
COMMENT ON COLUMN public.payments.gateway_response IS 'Full response from payment gateway';