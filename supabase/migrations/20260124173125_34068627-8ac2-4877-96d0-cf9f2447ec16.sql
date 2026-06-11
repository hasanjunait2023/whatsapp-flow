-- Update existing orders to use BDT currency
UPDATE public.orders SET currency = 'BDT' WHERE currency = 'USD';