-- Update demo products with public folder image URLs
UPDATE public.products 
SET images = '["/demo-products/wireless-earbuds.jpg"]'::jsonb
WHERE id = '00000000-0000-0000-0002-000000000001';

UPDATE public.products 
SET images = '["/demo-products/smartwatch.jpg"]'::jsonb
WHERE id = '00000000-0000-0000-0002-000000000002';

UPDATE public.products 
SET images = '["/demo-products/power-bank.jpg"]'::jsonb
WHERE id = '00000000-0000-0000-0002-000000000003';

UPDATE public.products 
SET images = '["/demo-products/polo-shirt.jpg"]'::jsonb
WHERE id = '00000000-0000-0000-0002-000000000004';

UPDATE public.products 
SET images = '["/demo-products/denim-jeans.jpg"]'::jsonb
WHERE id = '00000000-0000-0000-0002-000000000005';

UPDATE public.products 
SET images = '["/demo-products/led-lamp.jpg"]'::jsonb
WHERE id = '00000000-0000-0000-0002-000000000006';

UPDATE public.products 
SET images = '["/demo-products/face-serum.jpg"]'::jsonb
WHERE id = '00000000-0000-0000-0002-000000000007';

UPDATE public.products 
SET images = '["/demo-products/green-tea.jpg"]'::jsonb
WHERE id = '00000000-0000-0000-0002-000000000008';