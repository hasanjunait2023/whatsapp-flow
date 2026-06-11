-- Add sample invoice settings
INSERT INTO public.invoice_settings (tenant_id, company_name, company_address, company_phone, company_email, tax_id, invoice_prefix, footer_text, next_invoice_number)
VALUES (
  '73101d4f-465a-4f57-a85d-4f33b4e5f3a3'::uuid,
  'TechMart Bangladesh',
  '123 Gulshan Avenue, Dhaka 1212, Bangladesh',
  '+880 1700-123456',
  'billing@techmart.bd',
  'BIN-123456789',
  'INV-',
  'Thank you for your business! Payment is due within 15 days.',
  1
)
ON CONFLICT (tenant_id) DO NOTHING;