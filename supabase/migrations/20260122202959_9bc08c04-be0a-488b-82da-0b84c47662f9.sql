-- Phase 1: Product Variants
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS variant_options JSONB DEFAULT '[]';
-- Example: [{"name": "Color", "values": ["Red", "Blue"]}, {"name": "Size", "values": ["S", "M", "L"]}]

CREATE TABLE IF NOT EXISTS public.product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sku TEXT,
  price NUMERIC(10,2),
  compare_at_price NUMERIC(10,2),
  cost_price NUMERIC(10,2),
  stock_quantity INTEGER DEFAULT 0,
  low_stock_threshold INTEGER DEFAULT 5,
  options JSONB DEFAULT '{}',
  images TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  position INTEGER DEFAULT 0,
  woo_variant_id INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view variants for their tenant" ON public.product_variants
  FOR SELECT USING (public.is_tenant_member(tenant_id));

CREATE POLICY "Users can create variants for their tenant" ON public.product_variants
  FOR INSERT WITH CHECK (public.is_tenant_member(tenant_id));

CREATE POLICY "Users can update variants for their tenant" ON public.product_variants
  FOR UPDATE USING (public.is_tenant_member(tenant_id));

CREATE POLICY "Users can delete variants for their tenant" ON public.product_variants
  FOR DELETE USING (public.is_tenant_member(tenant_id));

CREATE INDEX idx_product_variants_product_id ON public.product_variants(product_id);
CREATE INDEX idx_product_variants_tenant_id ON public.product_variants(tenant_id);

-- Update order_items to support variants
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS variant_id UUID REFERENCES public.product_variants(id);
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS variant_name TEXT;

-- Phase 2: WooCommerce Scheduled Sync
ALTER TABLE public.woocommerce_integrations 
ADD COLUMN IF NOT EXISTS auto_sync_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS sync_interval_hours INTEGER DEFAULT 24,
ADD COLUMN IF NOT EXISTS next_scheduled_sync TIMESTAMPTZ;

-- Phase 3: Invoice System
CREATE TABLE IF NOT EXISTS public.invoice_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE UNIQUE,
  company_name TEXT,
  company_address TEXT,
  company_phone TEXT,
  company_email TEXT,
  logo_url TEXT,
  tax_id TEXT,
  footer_text TEXT,
  invoice_prefix TEXT DEFAULT 'INV-',
  next_invoice_number INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.invoice_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view invoice settings for their tenant" ON public.invoice_settings
  FOR SELECT USING (public.is_tenant_member(tenant_id));

CREATE POLICY "Owners/managers can manage invoice settings" ON public.invoice_settings
  FOR ALL USING (public.is_tenant_owner_or_manager(tenant_id));

CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  invoice_number TEXT NOT NULL,
  pdf_url TEXT,
  total NUMERIC(10,2),
  sent_via_whatsapp BOOLEAN DEFAULT false,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view invoices for their tenant" ON public.invoices
  FOR SELECT USING (public.is_tenant_member(tenant_id));

CREATE POLICY "Users can create invoices for their tenant" ON public.invoices
  FOR INSERT WITH CHECK (public.is_tenant_member(tenant_id));

CREATE INDEX idx_invoices_tenant_id ON public.invoices(tenant_id);
CREATE INDEX idx_invoices_order_id ON public.invoices(order_id);

-- Phase 4: Courier Integration
CREATE TABLE IF NOT EXISTS public.courier_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('steadfast', 'pathao')),
  api_key TEXT,
  api_secret TEXT,
  store_id TEXT,
  is_active BOOLEAN DEFAULT true,
  default_pickup_address JSONB DEFAULT '{}',
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, provider)
);

ALTER TABLE public.courier_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view courier integrations for their tenant" ON public.courier_integrations
  FOR SELECT USING (public.is_tenant_member(tenant_id));

CREATE POLICY "Owners/managers can manage courier integrations" ON public.courier_integrations
  FOR ALL USING (public.is_tenant_owner_or_manager(tenant_id));

CREATE TABLE IF NOT EXISTS public.shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  courier TEXT NOT NULL,
  consignment_id TEXT,
  tracking_code TEXT,
  status TEXT DEFAULT 'pending',
  delivery_fee NUMERIC(10,2),
  cod_amount NUMERIC(10,2),
  pickup_address JSONB,
  delivery_address JSONB,
  weight_kg NUMERIC(5,2),
  item_description TEXT,
  special_instructions TEXT,
  courier_response JSONB,
  booked_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view shipments for their tenant" ON public.shipments
  FOR SELECT USING (public.is_tenant_member(tenant_id));

CREATE POLICY "Users can create shipments for their tenant" ON public.shipments
  FOR INSERT WITH CHECK (public.is_tenant_member(tenant_id));

CREATE POLICY "Users can update shipments for their tenant" ON public.shipments
  FOR UPDATE USING (public.is_tenant_member(tenant_id));

CREATE INDEX idx_shipments_tenant_id ON public.shipments(tenant_id);
CREATE INDEX idx_shipments_order_id ON public.shipments(order_id);
CREATE INDEX idx_shipments_consignment_id ON public.shipments(consignment_id);

-- Create storage bucket for invoices
INSERT INTO storage.buckets (id, name, public) VALUES ('invoices', 'invoices', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can view invoices" ON storage.objects
  FOR SELECT USING (bucket_id = 'invoices');

CREATE POLICY "Authenticated users can upload invoices" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'invoices' AND auth.role() = 'authenticated');

-- Trigger for updated_at on new tables
CREATE TRIGGER update_product_variants_updated_at
  BEFORE UPDATE ON public.product_variants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_invoice_settings_updated_at
  BEFORE UPDATE ON public.invoice_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_courier_integrations_updated_at
  BEFORE UPDATE ON public.courier_integrations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_shipments_updated_at
  BEFORE UPDATE ON public.shipments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();