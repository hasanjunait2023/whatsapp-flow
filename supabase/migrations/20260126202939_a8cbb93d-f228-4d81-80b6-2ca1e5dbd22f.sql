-- =============================================
-- COMPREHENSIVE DEMO DATA PACKAGE (FINAL)
-- Demo Tenant ID: 00000000-0000-0000-0000-000000000001
-- =============================================

DO $$
DECLARE
  v_demo_tenant_id UUID := '00000000-0000-0000-0000-000000000001';
  v_demo_user_id UUID;
  v_demo_instance_id UUID;
  v_contact_ids UUID[] := ARRAY[]::UUID[];
  v_order_ids UUID[] := ARRAY[]::UUID[];
  v_product_ids UUID[] := ARRAY[]::UUID[];
  v_category_ids UUID[] := ARRAY[]::UUID[];
  v_new_contact_id UUID;
  v_new_order_id UUID;
  v_i INTEGER;
  v_order_date TIMESTAMP;
  v_order_status TEXT;
  v_payment_status TEXT;
  v_order_source TEXT;
  v_product_id UUID;
  v_product_price NUMERIC;
  v_order_total NUMERIC;
  v_tracking TEXT;
  v_address JSONB;
  v_customer_name TEXT;
  v_customer_phone TEXT;
  v_area TEXT;
  v_msg_direction message_direction;
  v_areas TEXT[] := ARRAY['Gulshan', 'Banani', 'Dhanmondi', 'Uttara', 'Mirpur', 'Mohammadpur', 'Bashundhara', 'Tejgaon', 'Motijheel', 'Farmgate'];
  v_names TEXT[] := ARRAY['Rahim Mia', 'Karim Ahmed', 'Fatema Khatun', 'Nasrin Akter', 'Jamal Uddin', 'Shakil Hossain', 'Ruma Begum', 'Tarek Rahman', 'Shirin Sultana', 'Mizanur Rahman', 'Salma Akter', 'Habibur Rahman', 'Nusrat Jahan', 'Aminul Islam', 'Rashida Begum', 'Kamrul Hasan', 'Ayesha Siddiqua', 'Delwar Hossain', 'Monira Begum', 'Zahirul Islam'];
BEGIN
  -- Get demo user ID
  SELECT user_id INTO v_demo_user_id 
  FROM user_roles 
  WHERE tenant_id = v_demo_tenant_id AND role = 'owner' 
  LIMIT 1;

  -- Get demo instance ID
  SELECT id INTO v_demo_instance_id 
  FROM whatsapp_instances 
  WHERE tenant_id = v_demo_tenant_id 
  LIMIT 1;

  -- Get existing product IDs
  SELECT ARRAY_AGG(id) INTO v_product_ids 
  FROM products 
  WHERE tenant_id = v_demo_tenant_id;

  -- =============================================
  -- 1. UPDATE PRODUCTS WITH COST PRICE
  -- =============================================
  UPDATE products 
  SET cost_price = ROUND((price * (0.4 + random() * 0.2))::NUMERIC, 2)
  WHERE tenant_id = v_demo_tenant_id AND (cost_price IS NULL OR cost_price = 0);

  -- =============================================
  -- 2. ADD NEW CONTACTS (20 new contacts)
  -- =============================================
  FOR v_i IN 1..20 LOOP
    v_new_contact_id := gen_random_uuid();
    v_contact_ids := array_append(v_contact_ids, v_new_contact_id);
    
    INSERT INTO contacts (
      id, tenant_id, instance_id, phone_number, wa_id, name, 
      unread_count, is_archived, last_message_at, created_at
    ) VALUES (
      v_new_contact_id,
      v_demo_tenant_id,
      v_demo_instance_id,
      '8801' || (700000000 + v_i * 1234567)::TEXT,
      '8801' || (700000000 + v_i * 1234567)::TEXT,
      v_names[v_i],
      CASE WHEN random() > 0.7 THEN floor(random() * 5)::INTEGER ELSE 0 END,
      CASE WHEN random() > 0.9 THEN TRUE ELSE FALSE END,
      NOW() - (random() * INTERVAL '30 days'),
      NOW() - (random() * INTERVAL '60 days')
    );
  END LOOP;

  -- =============================================
  -- 3. ADD ORDERS (48 new orders)
  -- =============================================
  FOR v_i IN 1..48 LOOP
    v_new_order_id := gen_random_uuid();
    v_order_ids := array_append(v_order_ids, v_new_order_id);
    
    v_order_date := NOW() - ((v_i * 0.6)::INTEGER || ' days')::INTERVAL - (random() * INTERVAL '12 hours');
    
    IF v_i <= 15 THEN
      v_order_status := 'delivered';
      v_payment_status := 'paid';
      v_tracking := 'DX' || (1000000 + v_i)::TEXT;
    ELSIF v_i <= 25 THEN
      v_order_status := 'shipped';
      v_payment_status := 'paid';
      v_tracking := 'DX' || (2000000 + v_i)::TEXT;
    ELSIF v_i <= 33 THEN
      v_order_status := 'processing';
      v_payment_status := 'paid';
      v_tracking := NULL;
    ELSIF v_i <= 40 THEN
      v_order_status := 'confirmed';
      v_payment_status := CASE WHEN random() > 0.5 THEN 'paid' ELSE 'unpaid' END;
      v_tracking := NULL;
    ELSIF v_i <= 45 THEN
      v_order_status := 'pending';
      v_payment_status := 'unpaid';
      v_tracking := NULL;
    ELSE
      v_order_status := 'cancelled';
      v_payment_status := 'refunded';
      v_tracking := NULL;
    END IF;

    v_order_source := (ARRAY['whatsapp', 'whatsapp', 'whatsapp', 'manual', 'woocommerce', 'facebook'])[1 + floor(random() * 6)::INTEGER];
    v_product_id := v_product_ids[1 + floor(random() * array_length(v_product_ids, 1))::INTEGER];
    SELECT price INTO v_product_price FROM products WHERE id = v_product_id;
    v_product_price := COALESCE(v_product_price, 500 + random() * 2000);
    v_order_total := v_product_price * (1 + floor(random() * 3)::INTEGER);
    v_customer_name := v_names[1 + floor(random() * 20)::INTEGER];
    v_customer_phone := '8801' || (700000000 + floor(random() * 99999999)::INTEGER)::TEXT;
    v_area := v_areas[1 + floor(random() * 10)::INTEGER];
    
    v_address := jsonb_build_object(
      'address', 'House ' || (1 + floor(random() * 50)::INTEGER)::TEXT || ', Road ' || (1 + floor(random() * 20)::INTEGER)::TEXT,
      'area', v_area,
      'city', 'Dhaka',
      'postal_code', (1200 + floor(random() * 100)::INTEGER)::TEXT
    );

    INSERT INTO orders (
      id, tenant_id, order_number, status, payment_status, source,
      customer_name, customer_phone, shipping_address,
      subtotal, discount_amount, shipping_amount, tax_amount, total,
      tracking_number, courier, created_by, created_at, updated_at,
      shipped_at, delivered_at, cancelled_at, contact_id
    ) VALUES (
      v_new_order_id, v_demo_tenant_id,
      'ORD-' || LPAD((1000 + v_i)::TEXT, 6, '0'),
      v_order_status, v_payment_status, v_order_source,
      v_customer_name, v_customer_phone, v_address,
      v_order_total,
      CASE WHEN random() > 0.8 THEN floor(random() * 100)::NUMERIC ELSE 0 END,
      CASE WHEN random() > 0.5 THEN 60 + floor(random() * 60)::NUMERIC ELSE 0 END,
      0, v_order_total, v_tracking,
      CASE WHEN v_tracking IS NOT NULL THEN 'Pathao' ELSE NULL END,
      v_demo_user_id, v_order_date, v_order_date,
      CASE WHEN v_order_status IN ('shipped', 'delivered') THEN v_order_date + INTERVAL '1 day' ELSE NULL END,
      CASE WHEN v_order_status = 'delivered' THEN v_order_date + INTERVAL '3 days' ELSE NULL END,
      CASE WHEN v_order_status = 'cancelled' THEN v_order_date + INTERVAL '1 day' ELSE NULL END,
      CASE WHEN array_length(v_contact_ids, 1) > 0 THEN v_contact_ids[1 + floor(random() * array_length(v_contact_ids, 1))::INTEGER] ELSE NULL END
    );

    INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, discount_amount, total)
    SELECT v_new_order_id, v_product_id, p.name, 1 + floor(random() * 2)::INTEGER, p.price, 0, p.price * (1 + floor(random() * 2)::INTEGER)
    FROM products p WHERE p.id = v_product_id;
  END LOOP;

  -- =============================================
  -- 4. ADD EXPENSE CATEGORIES
  -- =============================================
  INSERT INTO tenant_expense_categories (id, tenant_id, name, color, icon, is_active)
  VALUES 
    (gen_random_uuid(), v_demo_tenant_id, 'Marketing', '#3B82F6', 'megaphone', true),
    (gen_random_uuid(), v_demo_tenant_id, 'Shipping', '#10B981', 'truck', true),
    (gen_random_uuid(), v_demo_tenant_id, 'Office', '#8B5CF6', 'building', true),
    (gen_random_uuid(), v_demo_tenant_id, 'Salary', '#F59E0B', 'users', true),
    (gen_random_uuid(), v_demo_tenant_id, 'Inventory', '#EF4444', 'package', true),
    (gen_random_uuid(), v_demo_tenant_id, 'Utilities', '#06B6D4', 'zap', true)
  ON CONFLICT DO NOTHING;

  SELECT ARRAY_AGG(id) INTO v_category_ids FROM tenant_expense_categories WHERE tenant_id = v_demo_tenant_id;

  -- =============================================
  -- 5. ADD EXPENSES (30 entries)
  -- =============================================
  FOR v_i IN 1..30 LOOP
    INSERT INTO tenant_expenses (tenant_id, category_id, description, amount, expense_date, payment_method, recorded_by)
    VALUES (
      v_demo_tenant_id,
      v_category_ids[1 + floor(random() * array_length(v_category_ids, 1))::INTEGER],
      (ARRAY['Facebook Ads', 'Google Ads', 'Courier Payment', 'Internet Bill', 'Electricity', 'Office Supplies', 'Product Restock', 'Staff Bonus', 'Packaging Materials', 'Phone Bill'])[1 + floor(random() * 10)::INTEGER],
      500 + floor(random() * 5000)::NUMERIC,
      (NOW() - (v_i || ' days')::INTERVAL)::DATE,
      (ARRAY['bkash', 'nagad', 'bank', 'cash'])[1 + floor(random() * 4)::INTEGER],
      v_demo_user_id
    );
  END LOOP;

  -- =============================================
  -- 6. ADD MESSAGES (100 messages)
  -- =============================================
  FOR v_i IN 1..100 LOOP
    IF random() > 0.4 THEN
      v_msg_direction := 'inbound'::message_direction;
    ELSE
      v_msg_direction := 'outbound'::message_direction;
    END IF;
    
    INSERT INTO messages (
      tenant_id, instance_id, contact_id, direction, content, content_type,
      status, sent_at, is_from_ai, sent_by_user_id
    ) VALUES (
      v_demo_tenant_id,
      v_demo_instance_id,
      v_contact_ids[1 + floor(random() * array_length(v_contact_ids, 1))::INTEGER],
      v_msg_direction,
      (ARRAY[
        'আসসালামু আলাইকুম, প্রোডাক্ট এভেইলেবল আছে?',
        'জি ভাই, আছে। কোনটা লাগবে?',
        'প্রাইস কত?',
        '৳1500 ভাই',
        'অর্ডার করতে চাই',
        'ঠিক আছে, ঠিকানা দিন',
        'ধন্যবাদ, অর্ডার কনফার্ম',
        'ডেলিভারি কতদিনে হবে?',
        '2-3 দিনের মধ্যে',
        'অর্ডার shipped হয়ে গেছে',
        'ট্র্যাকিং নম্বর পাঠান',
        'পেমেন্ট করতে চাই',
        'বিকাশ নম্বর দিন',
        'পেমেন্ট কনফার্ম হয়েছে',
        'ধন্যবাদ ভাই'
      ])[1 + floor(random() * 15)::INTEGER],
      'text',
      'delivered'::message_status,
      NOW() - (floor(random() * 30) || ' days')::INTERVAL - (floor(random() * 24) || ' hours')::INTERVAL,
      CASE WHEN random() > 0.8 THEN TRUE ELSE FALSE END,
      CASE WHEN v_msg_direction = 'outbound'::message_direction THEN v_demo_user_id ELSE NULL END
    );
  END LOOP;

  -- =============================================
  -- 7. ADD TEAM ACTIVITY LOGS (50 entries)
  -- =============================================
  FOR v_i IN 1..50 LOOP
    INSERT INTO team_activity_logs (tenant_id, user_id, activity_type, entity_type, entity_id, metadata, created_at)
    VALUES (
      v_demo_tenant_id, v_demo_user_id,
      (ARRAY['message_sent', 'order_created', 'order_updated', 'customer_assigned', 'status_changed'])[1 + floor(random() * 5)::INTEGER],
      (ARRAY['message', 'order', 'contact'])[1 + floor(random() * 3)::INTEGER],
      gen_random_uuid(),
      jsonb_build_object('action', 'Demo activity ' || v_i),
      NOW() - (floor(random() * 7) || ' days')::INTERVAL
    );
  END LOOP;

  -- =============================================
  -- 8. ADD KPI TARGETS
  -- =============================================
  INSERT INTO team_kpi_targets (tenant_id, user_id, metric, target_value, period)
  VALUES 
    (v_demo_tenant_id, NULL, 'messages_sent', 50, 'daily'),
    (v_demo_tenant_id, NULL, 'orders_created', 30, 'weekly'),
    (v_demo_tenant_id, NULL, 'revenue', 200000, 'monthly'),
    (v_demo_tenant_id, v_demo_user_id, 'messages_sent', 100, 'weekly'),
    (v_demo_tenant_id, v_demo_user_id, 'orders_created', 15, 'weekly');

  -- =============================================
  -- 9. ADD COMPLAINTS (8 complaints) - Using correct enum values
  -- category: product_issue, delivery, refund, other
  -- priority: low, medium, high, critical
  -- status: open, in_progress, resolved, closed
  -- =============================================
  FOR v_i IN 1..8 LOOP
    INSERT INTO complaints (tenant_id, title, description, category, priority, status, reported_by, contact_id, resolved_at, resolved_by, resolution_notes)
    VALUES (
      v_demo_tenant_id,
      (ARRAY['পণ্য ক্ষতিগ্রস্ত', 'দেরিতে ডেলিভারি', 'ভুল পণ্য পাঠানো', 'পেমেন্ট সমস্যা', 'রিফান্ড চাই', 'পণ্যের মান ভালো না', 'প্যাকেজিং সমস্যা', 'যোগাযোগে সমস্যা'])[v_i],
      'গ্রাহকের অভিযোগ - বিস্তারিত বর্ণনা ' || v_i,
      (ARRAY['product_issue', 'delivery', 'refund', 'other'])[1 + floor(random() * 4)::INTEGER]::complaint_category,
      (ARRAY['low', 'medium', 'high', 'critical'])[1 + floor(random() * 4)::INTEGER]::complaint_priority,
      CASE WHEN v_i <= 5 THEN 'resolved'::complaint_status WHEN v_i <= 7 THEN 'in_progress'::complaint_status ELSE 'open'::complaint_status END,
      v_demo_user_id,
      v_contact_ids[1 + floor(random() * array_length(v_contact_ids, 1))::INTEGER],
      CASE WHEN v_i <= 5 THEN NOW() - (v_i || ' days')::INTERVAL ELSE NULL END,
      CASE WHEN v_i <= 5 THEN v_demo_user_id ELSE NULL END,
      CASE WHEN v_i <= 5 THEN 'সমস্যার সমাধান করা হয়েছে' ELSE NULL END
    );
  END LOOP;

END $$;