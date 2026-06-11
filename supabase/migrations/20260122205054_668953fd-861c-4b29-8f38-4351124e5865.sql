-- Add sample categories directly
INSERT INTO public.categories (id, tenant_id, name, description, is_active)
VALUES 
  (gen_random_uuid(), '73101d4f-465a-4f57-a85d-4f33b4e5f3a3'::uuid, 'Electronics', 'Electronic devices and accessories', true),
  (gen_random_uuid(), '73101d4f-465a-4f57-a85d-4f33b4e5f3a3'::uuid, 'Clothing', 'Fashion and apparel', true),
  (gen_random_uuid(), '73101d4f-465a-4f57-a85d-4f33b4e5f3a3'::uuid, 'Home & Garden', 'Home improvement and garden supplies', true),
  (gen_random_uuid(), '73101d4f-465a-4f57-a85d-4f33b4e5f3a3'::uuid, 'Sports', 'Sports equipment and gear', true);

-- Add sample products  
INSERT INTO public.products (id, tenant_id, name, description, sku, price, compare_at_price, stock_quantity, images, is_active, category_id)
SELECT 
  gen_random_uuid(),
  '73101d4f-465a-4f57-a85d-4f33b4e5f3a3'::uuid,
  p.name,
  p.description,
  p.sku,
  p.price,
  p.compare_price,
  floor(random() * 100 + 10)::int,
  '[]'::jsonb,
  true,
  c.id
FROM (VALUES 
  ('Wireless Bluetooth Headphones', 'High-quality wireless headphones with noise cancellation', 'WBH-001', 2500.00, 3000.00, 'Electronics'),
  ('Smart Watch Pro', 'Feature-rich smartwatch with health monitoring', 'SWP-002', 4500.00, 5500.00, 'Electronics'),
  ('USB-C Fast Charger', '65W fast charging adapter for all devices', 'UFC-003', 850.00, 1000.00, 'Electronics'),
  ('Cotton T-Shirt', 'Premium cotton t-shirt, comfortable fit', 'CTS-001', 450.00, 600.00, 'Clothing'),
  ('Denim Jeans', 'Classic fit denim jeans', 'DNJ-002', 1200.00, 1500.00, 'Clothing'),
  ('Running Shoes', 'Lightweight running shoes with cushioning', 'RNS-001', 2800.00, 3500.00, 'Sports'),
  ('Yoga Mat', 'Non-slip yoga mat, 6mm thickness', 'YGM-002', 650.00, 800.00, 'Sports'),
  ('Garden Tool Set', '5-piece stainless steel garden tools', 'GTS-001', 1100.00, 1400.00, 'Home & Garden'),
  ('LED Desk Lamp', 'Adjustable LED lamp with touch control', 'LDL-001', 750.00, 950.00, 'Home & Garden'),
  ('Portable Speaker', 'Waterproof Bluetooth speaker', 'PSK-001', 1800.00, 2200.00, 'Electronics')
) AS p(name, description, sku, price, compare_price, category_name)
LEFT JOIN public.categories c ON c.tenant_id = '73101d4f-465a-4f57-a85d-4f33b4e5f3a3'::uuid AND c.name = p.category_name;

-- Add order items to existing orders
INSERT INTO public.order_items (order_id, product_id, product_name, product_sku, quantity, unit_price, discount_amount, total)
SELECT 
  o.id,
  p.id,
  p.name,
  p.sku,
  2,
  p.price,
  0,
  p.price * 2
FROM public.orders o
CROSS JOIN (
  SELECT id, name, sku, price, row_number() OVER () as rn 
  FROM public.products 
  WHERE tenant_id = '73101d4f-465a-4f57-a85d-4f33b4e5f3a3'
  LIMIT 3
) p
WHERE o.tenant_id = '73101d4f-465a-4f57-a85d-4f33b4e5f3a3'
AND NOT EXISTS (SELECT 1 FROM public.order_items WHERE order_id = o.id);

-- Update order totals
UPDATE public.orders o
SET 
  subtotal = (SELECT COALESCE(SUM(total), 0) FROM public.order_items WHERE order_id = o.id),
  total = (SELECT COALESCE(SUM(total), 0) FROM public.order_items WHERE order_id = o.id) + 50
WHERE tenant_id = '73101d4f-465a-4f57-a85d-4f33b4e5f3a3';