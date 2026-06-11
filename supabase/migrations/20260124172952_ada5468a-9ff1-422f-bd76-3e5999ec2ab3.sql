-- Change default currency for orders from USD to BDT (Bangladeshi Taka)
ALTER TABLE public.orders ALTER COLUMN currency SET DEFAULT 'BDT';