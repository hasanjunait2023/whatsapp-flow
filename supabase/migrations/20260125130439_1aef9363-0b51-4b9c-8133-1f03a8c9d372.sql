-- Seed features for Wholesale business type
INSERT INTO public.business_type_features (business_type_id, feature_key, feature_label, feature_label_bn, icon, is_core, min_tier, display_order)
SELECT 
  bt.id,
  f.feature_key,
  f.feature_label,
  f.feature_label_bn,
  f.icon,
  f.is_core,
  f.min_tier,
  f.display_order
FROM public.business_types bt
CROSS JOIN (VALUES
  ('orders', 'Orders & Invoicing', 'অর্ডার এবং চালান', 'shopping-cart', true, 'starter', 1),
  ('products', 'Product Catalog', 'পণ্য ক্যাটালগ', 'package', true, 'starter', 2),
  ('bulk_orders', 'Bulk Order Management', 'বাল্ক অর্ডার ব্যবস্থাপনা', 'layers', true, 'starter', 3),
  ('inventory', 'Inventory Tracking', 'ইনভেন্টরি ট্র্যাকিং', 'warehouse', true, 'starter', 4),
  ('courier', 'Courier Integration', 'কুরিয়ার ইন্টিগ্রেশন', 'truck', true, 'starter', 5),
  ('crm', 'Customer CRM', 'কাস্টমার সিআরএম', 'users', true, 'starter', 6),
  ('analytics', 'Analytics Dashboard', 'অ্যানালিটিক্স ড্যাশবোর্ড', 'bar-chart-2', true, 'starter', 7),
  ('automation', 'Automation Rules', 'অটোমেশন রুলস', 'zap', false, 'growth', 8),
  ('ai_agent', 'AI Agent', 'এআই এজেন্ট', 'bot', false, 'growth', 9),
  ('fb_messenger', 'FB Messenger', 'ফেসবুক মেসেঞ্জার', 'message-circle', false, 'growth', 10),
  ('team', 'Team Management', 'টিম ম্যানেজমেন্ট', 'users-2', true, 'starter', 11),
  ('reports', 'Advanced Reports', 'অ্যাডভান্সড রিপোর্ট', 'file-text', false, 'pro', 12)
) AS f(feature_key, feature_label, feature_label_bn, icon, is_core, min_tier, display_order)
WHERE bt.slug = 'wholesale';

-- Seed features for Retail E-commerce business type
INSERT INTO public.business_type_features (business_type_id, feature_key, feature_label, feature_label_bn, icon, is_core, min_tier, display_order)
SELECT 
  bt.id,
  f.feature_key,
  f.feature_label,
  f.feature_label_bn,
  f.icon,
  f.is_core,
  f.min_tier,
  f.display_order
FROM public.business_types bt
CROSS JOIN (VALUES
  ('orders', 'Orders & Invoicing', 'অর্ডার এবং চালান', 'shopping-cart', true, 'starter', 1),
  ('products', 'Product Catalog', 'পণ্য ক্যাটালগ', 'package', true, 'starter', 2),
  ('inventory', 'Inventory Tracking', 'ইনভেন্টরি ট্র্যাকিং', 'warehouse', true, 'starter', 3),
  ('woocommerce', 'WooCommerce Sync', 'উকমার্স সিঙ্ক', 'refresh-cw', false, 'growth', 4),
  ('courier', 'Courier Integration', 'কুরিয়ার ইন্টিগ্রেশন', 'truck', true, 'starter', 5),
  ('crm', 'Customer CRM', 'কাস্টমার সিআরএম', 'users', true, 'starter', 6),
  ('analytics', 'Analytics Dashboard', 'অ্যানালিটিক্স ড্যাশবোর্ড', 'bar-chart-2', true, 'starter', 7),
  ('automation', 'Automation Rules', 'অটোমেশন রুলস', 'zap', false, 'growth', 8),
  ('ai_agent', 'AI Agent', 'এআই এজেন্ট', 'bot', false, 'growth', 9),
  ('fb_messenger', 'FB Messenger', 'ফেসবুক মেসেঞ্জার', 'message-circle', true, 'starter', 10),
  ('team', 'Team Management', 'টিম ম্যানেজমেন্ট', 'users-2', true, 'starter', 11),
  ('reports', 'Advanced Reports', 'অ্যাডভান্সড রিপোর্ট', 'file-text', false, 'pro', 12)
) AS f(feature_key, feature_label, feature_label_bn, icon, is_core, min_tier, display_order)
WHERE bt.slug = 'retail_ecom';

-- Seed features for Service Business type
INSERT INTO public.business_type_features (business_type_id, feature_key, feature_label, feature_label_bn, icon, is_core, min_tier, display_order)
SELECT 
  bt.id,
  f.feature_key,
  f.feature_label,
  f.feature_label_bn,
  f.icon,
  f.is_core,
  f.min_tier,
  f.display_order
FROM public.business_types bt
CROSS JOIN (VALUES
  ('orders', 'Orders & Invoicing', 'অর্ডার এবং চালান', 'shopping-cart', true, 'starter', 1),
  ('appointments', 'Appointment Booking', 'অ্যাপয়েন্টমেন্ট বুকিং', 'calendar', true, 'starter', 2),
  ('services', 'Service Catalog', 'সার্ভিস ক্যাটালগ', 'briefcase', true, 'starter', 3),
  ('crm', 'Customer CRM', 'কাস্টমার সিআরএম', 'users', true, 'starter', 4),
  ('analytics', 'Analytics Dashboard', 'অ্যানালিটিক্স ড্যাশবোর্ড', 'bar-chart-2', true, 'starter', 5),
  ('automation', 'Automation Rules', 'অটোমেশন রুলস', 'zap', false, 'growth', 6),
  ('ai_agent', 'AI Agent', 'এআই এজেন্ট', 'bot', false, 'growth', 7),
  ('fb_messenger', 'FB Messenger', 'ফেসবুক মেসেঞ্জার', 'message-circle', false, 'growth', 8),
  ('team', 'Team Management', 'টিম ম্যানেজমেন্ট', 'users-2', true, 'starter', 9),
  ('reports', 'Advanced Reports', 'অ্যাডভান্সড রিপোর্ট', 'file-text', false, 'pro', 10)
) AS f(feature_key, feature_label, feature_label_bn, icon, is_core, min_tier, display_order)
WHERE bt.slug = 'service';