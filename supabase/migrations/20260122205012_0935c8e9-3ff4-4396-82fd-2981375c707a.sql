-- Create sample orders with JSONB shipping_address
DO $$
DECLARE
  v_tenant_id uuid := '73101d4f-465a-4f57-a85d-4f33b4e5f3a3';
  v_contact record;
  v_order_id uuid;
  v_product record;
  v_subtotal numeric;
  v_qty int;
  i int := 1;
BEGIN
  -- Check if orders already exist
  IF EXISTS (SELECT 1 FROM public.orders WHERE tenant_id = v_tenant_id LIMIT 1) THEN
    RETURN;
  END IF;
  
  -- Create orders for each contact
  FOR v_contact IN 
    SELECT id, name, phone_number FROM public.contacts WHERE tenant_id = v_tenant_id LIMIT 5
  LOOP
    v_order_id := gen_random_uuid();
    v_subtotal := 0;
    
    -- Create order with JSONB shipping_address
    INSERT INTO public.orders (
      id, tenant_id, contact_id, order_number, status, payment_status,
      subtotal, discount_amount, shipping_amount, tax_amount, total,
      customer_name, customer_phone, shipping_address
    ) VALUES (
      v_order_id,
      v_tenant_id,
      v_contact.id,
      'ORD-' || LPAD(i::text, 6, '0'),
      (ARRAY['pending', 'confirmed', 'processing', 'shipped', 'delivered'])[((i - 1) % 5) + 1],
      (ARRAY['pending', 'paid', 'paid', 'paid', 'paid'])[((i - 1) % 5) + 1],
      0, 0, 50, 0, 0,
      v_contact.name, 
      v_contact.phone_number, 
      jsonb_build_object(
        'street', 'Sample Address ' || i,
        'city', 'Dhaka',
        'postal_code', '1000',
        'country', 'Bangladesh'
      )
    );
    
    -- Add random products as order items
    FOR v_product IN 
      SELECT id, name, sku, price 
      FROM public.products 
      WHERE tenant_id = v_tenant_id 
      ORDER BY random() 
      LIMIT 2 + (i % 2)
    LOOP
      v_qty := 1 + (i % 3);
      INSERT INTO public.order_items (
        order_id, product_id, product_name, product_sku,
        quantity, unit_price, discount_amount, total
      ) VALUES (
        v_order_id, v_product.id, v_product.name, v_product.sku,
        v_qty,
        v_product.price,
        0,
        v_product.price * v_qty
      );
      v_subtotal := v_subtotal + (v_product.price * v_qty);
    END LOOP;
    
    -- Update order totals
    UPDATE public.orders 
    SET subtotal = v_subtotal, total = v_subtotal + 50
    WHERE id = v_order_id;
    
    i := i + 1;
  END LOOP;
END $$;