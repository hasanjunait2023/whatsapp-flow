
-- DEMO DATA PHASE 2 - FIXED VERSION
-- Skipping automation_rules due to constraints, adding all other data

-- 1. Additional Labels
INSERT INTO labels (id, tenant_id, name, color) VALUES
  ('00000000-0000-0000-0004-000000000004', '00000000-0000-0000-0000-000000000001', 'Wholesale Buyer', '#8B5CF6'),
  ('00000000-0000-0000-0004-000000000005', '00000000-0000-0000-0000-000000000001', 'Payment Pending', '#EF4444'),
  ('00000000-0000-0000-0004-000000000006', '00000000-0000-0000-0000-000000000001', 'Returning Customer', '#10B981'),
  ('00000000-0000-0000-0004-000000000007', '00000000-0000-0000-0000-000000000001', 'High Value', '#F59E0B'),
  ('00000000-0000-0000-0004-000000000008', '00000000-0000-0000-0000-000000000001', 'Support Needed', '#6366F1')
ON CONFLICT (id) DO NOTHING;

-- 2. Contact Labels
INSERT INTO contact_labels (contact_id, label_id) VALUES
  ('01049245-5dc3-4a73-900f-82cef4140412', '00000000-0000-0000-0004-000000000001'),
  ('a6b6e43a-d923-4af9-948e-96f1215f9c68', '00000000-0000-0000-0004-000000000001'),
  ('7c2a63e3-7430-4edb-ad9a-36e9345795c8', '00000000-0000-0000-0004-000000000001'),
  ('921444b4-a92c-4425-8af5-43df6a15507f', '00000000-0000-0000-0004-000000000002'),
  ('2d3757d7-a72b-4baf-a8f5-2c36dd66a78c', '00000000-0000-0000-0004-000000000002'),
  ('3bb94221-ae15-4277-aa10-99dbd19ed54d', '00000000-0000-0000-0004-000000000002'),
  ('dc8262de-e62e-49f3-8ac0-150ba4a0e8cf', '00000000-0000-0000-0004-000000000002'),
  ('37a46a88-2aa4-4759-9b15-9d19e699cc5e', '00000000-0000-0000-0004-000000000003'),
  ('9470eda9-f660-40c0-ae9a-577d3986983a', '00000000-0000-0000-0004-000000000003'),
  ('2c5f65ba-14e6-4681-9ab1-d9827bc9ec3a', '00000000-0000-0000-0004-000000000003'),
  ('01049245-5dc3-4a73-900f-82cef4140412', '00000000-0000-0000-0004-000000000007'),
  ('a6b6e43a-d923-4af9-948e-96f1215f9c68', '00000000-0000-0000-0004-000000000007'),
  ('1fc1ed0f-2a11-4519-b08b-c20b13d9f3d5', '00000000-0000-0000-0004-000000000006'),
  ('07a4e2c5-c2f9-46a8-9f55-285ec7b97888', '00000000-0000-0000-0004-000000000006'),
  ('bbc7b6d1-a094-4435-bfba-e2f62674eae0', '00000000-0000-0000-0004-000000000006'),
  ('e74f020f-f37d-4c3f-97b7-9e248de02f6a', '00000000-0000-0000-0004-000000000008'),
  ('c655fbeb-92a2-4fb8-be8e-5de72f62201d', '00000000-0000-0000-0004-000000000008'),
  ('47123817-3bb5-4c9e-8160-1cd8a4a37ac1', '00000000-0000-0000-0004-000000000004'),
  ('c7a3853f-0e8e-442f-a101-b154da407a87', '00000000-0000-0000-0004-000000000004')
ON CONFLICT DO NOTHING;

-- 3. Notes
INSERT INTO notes (tenant_id, contact_id, user_id, content, created_at) VALUES
  ('00000000-0000-0000-0000-000000000001', '01049245-5dc3-4a73-900f-82cef4140412', '00000000-0000-0000-0000-000000000002', 'VIP customer - সবসময় অগ্রাধিকার দিন', NOW() - INTERVAL '25 days'),
  ('00000000-0000-0000-0000-000000000001', 'a6b6e43a-d923-4af9-948e-96f1215f9c68', '00000000-0000-0000-0000-000000000002', 'Bulk order interested', NOW() - INTERVAL '20 days'),
  ('00000000-0000-0000-0000-000000000001', '7c2a63e3-7430-4edb-ad9a-36e9345795c8', '00000000-0000-0000-0000-000000000002', 'Premium customer - Silk items', NOW() - INTERVAL '18 days'),
  ('00000000-0000-0000-0000-000000000001', '921444b4-a92c-4425-8af5-43df6a15507f', '00000000-0000-0000-0000-000000000002', 'New customer - first order', NOW() - INTERVAL '10 days'),
  ('00000000-0000-0000-0000-000000000001', '2d3757d7-a72b-4baf-a8f5-2c36dd66a78c', '00000000-0000-0000-0000-000000000002', 'Wedding collection enquiry', NOW() - INTERVAL '8 days'),
  ('00000000-0000-0000-0000-000000000001', '3bb94221-ae15-4277-aa10-99dbd19ed54d', '00000000-0000-0000-0000-000000000002', 'Price sensitive customer', NOW() - INTERVAL '12 days'),
  ('00000000-0000-0000-0000-000000000001', 'dc8262de-e62e-49f3-8ac0-150ba4a0e8cf', '00000000-0000-0000-0000-000000000002', 'Quality conscious buyer', NOW() - INTERVAL '5 days'),
  ('00000000-0000-0000-0000-000000000001', '37a46a88-2aa4-4759-9b15-9d19e699cc5e', '00000000-0000-0000-0000-000000000002', 'Follow up needed', NOW() - INTERVAL '3 days'),
  ('00000000-0000-0000-0000-000000000001', '1fc1ed0f-2a11-4519-b08b-c20b13d9f3d5', '00000000-0000-0000-0000-000000000002', 'Regular monthly buyer', NOW() - INTERVAL '30 days'),
  ('00000000-0000-0000-0000-000000000001', '47123817-3bb5-4c9e-8160-1cd8a4a37ac1', '00000000-0000-0000-0000-000000000002', 'Wholesale reseller', NOW() - INTERVAL '27 days')
ON CONFLICT DO NOTHING;

-- 4. Order Status History
INSERT INTO order_status_history (order_id, status, notes, created_by, created_at) VALUES
  ('8b340d16-3ef0-4c30-a3f5-75b8f293c551', 'pending', 'Order created', '00000000-0000-0000-0000-000000000002', NOW() - INTERVAL '20 days'),
  ('8b340d16-3ef0-4c30-a3f5-75b8f293c551', 'confirmed', 'Payment confirmed', '00000000-0000-0000-0000-000000000002', NOW() - INTERVAL '19 days'),
  ('8b340d16-3ef0-4c30-a3f5-75b8f293c551', 'shipped', 'Shipped via Pathao', '00000000-0000-0000-0000-000000000002', NOW() - INTERVAL '17 days'),
  ('8b340d16-3ef0-4c30-a3f5-75b8f293c551', 'delivered', 'Delivered', '00000000-0000-0000-0000-000000000002', NOW() - INTERVAL '15 days'),
  ('d278b943-5d26-40ab-aba6-d5fd495dfce7', 'pending', 'New order', '00000000-0000-0000-0000-000000000002', NOW() - INTERVAL '18 days'),
  ('d278b943-5d26-40ab-aba6-d5fd495dfce7', 'confirmed', 'bKash verified', '00000000-0000-0000-0000-000000000002', NOW() - INTERVAL '17 days'),
  ('d278b943-5d26-40ab-aba6-d5fd495dfce7', 'delivered', 'Delivered', '00000000-0000-0000-0000-000000000002', NOW() - INTERVAL '13 days'),
  ('18566272-5101-4a0e-ab30-7ad3f39ccf7c', 'pending', 'Order placed', '00000000-0000-0000-0000-000000000002', NOW() - INTERVAL '5 days'),
  ('18566272-5101-4a0e-ab30-7ad3f39ccf7c', 'shipped', 'Shipped', '00000000-0000-0000-0000-000000000002', NOW() - INTERVAL '2 days'),
  ('5406c4d1-9927-4644-8199-d5c73454f962', 'pending', 'Order received', '00000000-0000-0000-0000-000000000002', NOW() - INTERVAL '10 days'),
  ('5406c4d1-9927-4644-8199-d5c73454f962', 'cancelled', 'Customer cancelled', '00000000-0000-0000-0000-000000000002', NOW() - INTERVAL '9 days')
ON CONFLICT DO NOTHING;

-- 5. Purchase Behavior Checks
INSERT INTO purchase_behavior_checks (tenant_id, contact_id, phone_number, risk_level, total_deliveries, successful_deliveries, cancelled_deliveries, returned_deliveries, checked_at) VALUES
  ('00000000-0000-0000-0000-000000000001', '01049245-5dc3-4a73-900f-82cef4140412', '01712345678', 'low', 15, 14, 1, 0, NOW() - INTERVAL '5 days'),
  ('00000000-0000-0000-0000-000000000001', 'a6b6e43a-d923-4af9-948e-96f1215f9c68', '01798765432', 'low', 12, 11, 1, 0, NOW() - INTERVAL '7 days'),
  ('00000000-0000-0000-0000-000000000001', '3bb94221-ae15-4277-aa10-99dbd19ed54d', '01912345678', 'high', 8, 4, 3, 1, NOW() - INTERVAL '2 days'),
  ('00000000-0000-0000-0000-000000000001', '9470eda9-f660-40c0-ae9a-577d3986983a', '01112345678', 'medium', 10, 6, 3, 1, NOW() - INTERVAL '4 days')
ON CONFLICT DO NOTHING;

-- 6. Customer Scores
INSERT INTO customer_scores (contact_id, tenant_id, total_orders, total_spent, avg_order_value, score, score_tier, last_calculated_at) VALUES
  ('01049245-5dc3-4a73-900f-82cef4140412', '00000000-0000-0000-0000-000000000001', 15, 67500, 4500, 92, 'platinum', NOW()),
  ('a6b6e43a-d923-4af9-948e-96f1215f9c68', '00000000-0000-0000-0000-000000000001', 12, 48000, 4000, 85, 'gold', NOW()),
  ('7c2a63e3-7430-4edb-ad9a-36e9345795c8', '00000000-0000-0000-0000-000000000001', 10, 55000, 5500, 88, 'gold', NOW()),
  ('921444b4-a92c-4425-8af5-43df6a15507f', '00000000-0000-0000-0000-000000000001', 2, 3500, 1750, 35, 'bronze', NOW()),
  ('1fc1ed0f-2a11-4519-b08b-c20b13d9f3d5', '00000000-0000-0000-0000-000000000001', 18, 72000, 4000, 95, 'platinum', NOW()),
  ('47123817-3bb5-4c9e-8160-1cd8a4a37ac1', '00000000-0000-0000-0000-000000000001', 25, 125000, 5000, 98, 'platinum', NOW())
ON CONFLICT (contact_id) DO UPDATE SET score = EXCLUDED.score, score_tier = EXCLUDED.score_tier;

-- 7. Invoice Settings
INSERT INTO invoice_settings (tenant_id, company_name, company_address, company_phone, invoice_prefix, next_invoice_number) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Demo Fashion Store', 'Gulshan 2, Dhaka', '+8801712345678', 'INV-', 17)
ON CONFLICT (tenant_id) DO UPDATE SET company_name = EXCLUDED.company_name;

-- 8. Invoices
INSERT INTO invoices (tenant_id, order_id, invoice_number, total, sent_via_whatsapp, created_at) VALUES
  ('00000000-0000-0000-0000-000000000001', '8b340d16-3ef0-4c30-a3f5-75b8f293c551', 'INV-000001', 1098.00, true, NOW() - INTERVAL '15 days'),
  ('00000000-0000-0000-0000-000000000001', 'd278b943-5d26-40ab-aba6-d5fd495dfce7', 'INV-000002', 2598.00, true, NOW() - INTERVAL '13 days'),
  ('00000000-0000-0000-0000-000000000001', 'e8164a94-9c36-4d38-a83f-8dd882d8a5a3', 'INV-000003', 3897.00, true, NOW() - INTERVAL '17 days'),
  ('00000000-0000-0000-0000-000000000001', '8047b542-b033-49e7-a3a8-6ffd50b88885', 'INV-000004', 4999.00, true, NOW() - INTERVAL '20 days')
ON CONFLICT DO NOTHING;

-- 9. Shipments
INSERT INTO shipments (tenant_id, order_id, courier, consignment_id, tracking_code, status, delivery_fee, cod_amount, created_at) VALUES
  ('00000000-0000-0000-0000-000000000001', '8b340d16-3ef0-4c30-a3f5-75b8f293c551', 'pathao', 'PTH001234', 'TRK001234', 'delivered', 60.00, 0, NOW() - INTERVAL '17 days'),
  ('00000000-0000-0000-0000-000000000001', 'd278b943-5d26-40ab-aba6-d5fd495dfce7', 'steadfast', 'STF005678', 'TRK005678', 'delivered', 70.00, 0, NOW() - INTERVAL '15 days'),
  ('00000000-0000-0000-0000-000000000001', '18566272-5101-4a0e-ab30-7ad3f39ccf7c', 'pathao', 'PTH008901', 'TRK008901', 'in_transit', 60.00, 0, NOW() - INTERVAL '2 days'),
  ('00000000-0000-0000-0000-000000000001', 'a028ca6d-7cd9-4430-87e7-cc5baa6eac85', 'redx', 'RDX001357', 'TRK001357', 'in_transit', 80.00, 1500.00, NOW() - INTERVAL '3 days')
ON CONFLICT DO NOTHING;

-- 10. Automation Rules (with correct constraints)
INSERT INTO automation_rules (tenant_id, name, description, is_active, trigger_type, trigger_config, action_type, action_config, priority) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Welcome Auto Reply', 'নতুন মেসেজে স্বাগত জানান', true, 'new_message', '{}', 'auto_reply', '{"message": "স্বাগতম! কিভাবে সাহায্য করতে পারি?"}', 1),
  ('00000000-0000-0000-0000-000000000001', 'Order Keyword Reply', 'অর্ডার keyword-এ reply', true, 'keyword_match', '{"keywords": ["order", "অর্ডার"]}', 'auto_reply', '{"message": "অর্ডারের জন্য ধন্যবাদ!"}', 2),
  ('00000000-0000-0000-0000-000000000001', 'Support Assignment', 'Support query assign করুন', false, 'keyword_match', '{"keywords": ["help", "সাহায্য"]}', 'assign_agent', '{"agent_id": "demo"}', 3)
ON CONFLICT DO NOTHING;

-- 11. Workflow Nodes & Edges
INSERT INTO workflow_nodes (id, workflow_id, node_type, node_subtype, node_config, position_x, position_y) VALUES
  ('00000000-0000-0000-0007-000000000001', 'c226b254-ae89-4380-9a3e-4fc535fce830', 'trigger', 'message_received', '{}', 100, 150),
  ('00000000-0000-0000-0007-000000000002', 'c226b254-ae89-4380-9a3e-4fc535fce830', 'condition', 'contains_keyword', '{"keywords": ["order"]}', 350, 150),
  ('00000000-0000-0000-0007-000000000003', 'c226b254-ae89-4380-9a3e-4fc535fce830', 'action', 'send_message', '{"message": "ধন্যবাদ!"}', 600, 150)
ON CONFLICT (id) DO NOTHING;

INSERT INTO workflow_edges (id, workflow_id, source_node_id, target_node_id) VALUES
  ('00000000-0000-0000-0008-000000000001', 'c226b254-ae89-4380-9a3e-4fc535fce830', '00000000-0000-0000-0007-000000000001', '00000000-0000-0000-0007-000000000002'),
  ('00000000-0000-0000-0008-000000000002', 'c226b254-ae89-4380-9a3e-4fc535fce830', '00000000-0000-0000-0007-000000000002', '00000000-0000-0000-0007-000000000003')
ON CONFLICT (id) DO NOTHING;

-- 12. Quick Replies
INSERT INTO quick_replies (tenant_id, title, shortcut, content) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Order Confirmation', '/confirm', 'আপনার অর্ডার কনফার্ম হয়েছে!'),
  ('00000000-0000-0000-0000-000000000001', 'Shipping Update', '/shipped', 'আপনার পণ্য পাঠানো হয়েছে!'),
  ('00000000-0000-0000-0000-000000000001', 'Payment Request', '/pay', 'পেমেন্ট করুন: bKash 01712345678'),
  ('00000000-0000-0000-0000-000000000001', 'Size Guide', '/size', 'সাইজ: S(34), M(36), L(38), XL(40)'),
  ('00000000-0000-0000-0000-000000000001', 'Return Policy', '/return', '৩ দিনের মধ্যে রিটার্ন গ্রহণ'),
  ('00000000-0000-0000-0000-000000000001', 'Delivery Info', '/delivery', 'ঢাকা ৬০-৮০ টাকা, বাইরে ১০০-১৫০ টাকা')
ON CONFLICT DO NOTHING;
