-- Create business_types table
CREATE TABLE public.business_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  name_bn TEXT,
  description TEXT,
  icon TEXT,
  color TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.business_types ENABLE ROW LEVEL SECURITY;

-- Allow read access to all authenticated users
CREATE POLICY "Business types are viewable by authenticated users"
ON public.business_types FOR SELECT
TO authenticated
USING (true);

-- System admins can manage using existing function
CREATE POLICY "System admins can manage business types"
ON public.business_types FOR ALL
TO authenticated
USING (public.is_system_admin())
WITH CHECK (public.is_system_admin());

-- Seed default business types
INSERT INTO public.business_types (slug, name, name_bn, description, icon, color, display_order) VALUES
  ('wholesale', 'Wholesale', 'পাইকারি', 'For wholesale distributors and B2B businesses', 'warehouse', '#3B82F6', 1),
  ('retail_ecom', 'Retail E-commerce', 'রিটেইল ইকমার্স', 'For online shops and D2C businesses', 'shopping-bag', '#10B981', 2),
  ('service', 'Service Business', 'সার্ভিস বিজনেস', 'For service providers and consultants', 'briefcase', '#8B5CF6', 3);

-- Add business_type reference to plans
ALTER TABLE public.plans
ADD COLUMN business_type_id UUID REFERENCES public.business_types(id),
ADD COLUMN tier TEXT CHECK (tier IN ('starter', 'growth', 'pro')),
ADD COLUMN tier_order INTEGER DEFAULT 1;

-- Add business type to tenants
ALTER TABLE public.tenants
ADD COLUMN business_type_id UUID REFERENCES public.business_types(id);

-- Create business_type_features table for feature templates
CREATE TABLE public.business_type_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_type_id UUID REFERENCES public.business_types(id) ON DELETE CASCADE,
  feature_key TEXT NOT NULL,
  feature_label TEXT NOT NULL,
  feature_label_bn TEXT,
  feature_description TEXT,
  icon TEXT,
  is_core BOOLEAN DEFAULT TRUE,
  min_tier TEXT DEFAULT 'starter' CHECK (min_tier IN ('starter', 'growth', 'pro')),
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(business_type_id, feature_key)
);

-- Enable RLS
ALTER TABLE public.business_type_features ENABLE ROW LEVEL SECURITY;

-- Allow read access to authenticated users
CREATE POLICY "Business type features are viewable by authenticated users"
ON public.business_type_features FOR SELECT
TO authenticated
USING (true);

-- System admins can manage
CREATE POLICY "System admins can manage business type features"
ON public.business_type_features FOR ALL
TO authenticated
USING (public.is_system_admin())
WITH CHECK (public.is_system_admin());

-- Create updated_at trigger for business_types
CREATE TRIGGER update_business_types_updated_at
BEFORE UPDATE ON public.business_types
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();