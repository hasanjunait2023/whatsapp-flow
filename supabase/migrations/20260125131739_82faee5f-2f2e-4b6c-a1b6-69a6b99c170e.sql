-- Create feature categories table for grouping features
CREATE TABLE public.feature_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_bn TEXT,
  icon TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.feature_categories ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read categories
CREATE POLICY "Anyone can view feature categories"
ON public.feature_categories
FOR SELECT
USING (true);

-- Only system admins can modify (using existing is_system_admin function)
CREATE POLICY "System admins can manage feature categories"
ON public.feature_categories
FOR ALL
USING (public.is_system_admin());

-- Seed feature categories
INSERT INTO public.feature_categories (name, name_bn, icon, display_order) VALUES
  ('Core Features', 'মূল ফিচার', 'layers', 1),
  ('Communication', 'যোগাযোগ', 'message-circle', 2),
  ('Sales & Orders', 'সেলস ও অর্ডার', 'shopping-cart', 3),
  ('Automation', 'অটোমেশন', 'zap', 4),
  ('Integrations', 'ইন্টিগ্রেশন', 'plug', 5),
  ('Advanced', 'অ্যাডভান্সড', 'sparkles', 6);

-- Extend business_type_features table
ALTER TABLE public.business_type_features
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.feature_categories(id),
ADD COLUMN IF NOT EXISTS feature_flag_key TEXT,
ADD COLUMN IF NOT EXISTS is_highlight BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS tooltip TEXT;

-- Update existing features with proper flag mappings
UPDATE public.business_type_features SET feature_flag_key = 'orders_enabled' WHERE feature_key = 'orders';
UPDATE public.business_type_features SET feature_flag_key = 'products_enabled' WHERE feature_key = 'products';
UPDATE public.business_type_features SET feature_flag_key = 'automation_enabled' WHERE feature_key = 'automation';
UPDATE public.business_type_features SET feature_flag_key = 'workflows_enabled' WHERE feature_key = 'workflows';
UPDATE public.business_type_features SET feature_flag_key = 'analytics_enabled' WHERE feature_key = 'analytics';
UPDATE public.business_type_features SET feature_flag_key = 'team_enabled' WHERE feature_key = 'team';
UPDATE public.business_type_features SET feature_flag_key = 'ai_agent_enabled' WHERE feature_key = 'ai_agent';
UPDATE public.business_type_features SET feature_flag_key = 'quick_replies_enabled' WHERE feature_key = 'quick_replies';
UPDATE public.business_type_features SET feature_flag_key = 'invoice_generation' WHERE feature_key = 'invoicing';
UPDATE public.business_type_features SET feature_flag_key = 'woocommerce_sync' WHERE feature_key = 'woocommerce';
UPDATE public.business_type_features SET feature_flag_key = 'contacts_enabled' WHERE feature_key = 'contacts';

-- Set highlights for key features
UPDATE public.business_type_features SET is_highlight = true WHERE feature_key IN ('orders', 'products', 'ai_agent', 'automation');

-- Link features to categories based on feature_key
UPDATE public.business_type_features btf
SET category_id = fc.id
FROM public.feature_categories fc
WHERE 
  (btf.feature_key IN ('orders', 'products', 'contacts') AND fc.name = 'Core Features') OR
  (btf.feature_key IN ('quick_replies', 'ai_agent') AND fc.name = 'Communication') OR
  (btf.feature_key IN ('invoicing', 'analytics') AND fc.name = 'Sales & Orders') OR
  (btf.feature_key IN ('automation', 'workflows') AND fc.name = 'Automation') OR
  (btf.feature_key IN ('woocommerce', 'fb_messenger') AND fc.name = 'Integrations') OR
  (btf.feature_key IN ('team', 'reports') AND fc.name = 'Advanced');