-- Create WooCommerce integrations table
CREATE TABLE public.woocommerce_integrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  store_url TEXT NOT NULL,
  consumer_key_encrypted TEXT NOT NULL,
  consumer_secret_encrypted TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  sync_status TEXT DEFAULT 'idle',
  sync_error TEXT,
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(tenant_id)
);

-- Create sync logs table
CREATE TABLE public.woocommerce_sync_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  integration_id UUID NOT NULL REFERENCES public.woocommerce_integrations(id) ON DELETE CASCADE,
  sync_type TEXT NOT NULL,
  status TEXT NOT NULL,
  products_synced INTEGER DEFAULT 0,
  categories_synced INTEGER DEFAULT 0,
  errors JSONB DEFAULT '[]'::jsonb,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.woocommerce_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.woocommerce_sync_logs ENABLE ROW LEVEL SECURITY;

-- Policies for woocommerce_integrations
CREATE POLICY "Tenant members can view integrations" ON public.woocommerce_integrations
  FOR SELECT USING (public.is_tenant_member(tenant_id));

CREATE POLICY "Owners and managers can manage integrations" ON public.woocommerce_integrations
  FOR ALL USING (public.is_tenant_owner_or_manager(tenant_id));

-- Policies for sync logs
CREATE POLICY "Users can view sync logs" ON public.woocommerce_sync_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.woocommerce_integrations i WHERE i.id = integration_id AND public.is_tenant_member(i.tenant_id))
  );

CREATE POLICY "System can create sync logs" ON public.woocommerce_sync_logs
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.woocommerce_integrations i WHERE i.id = integration_id AND public.is_tenant_member(i.tenant_id))
  );

-- Add woo_product_id to products table for tracking synced products
ALTER TABLE public.products ADD COLUMN woo_product_id BIGINT;
ALTER TABLE public.products ADD COLUMN woo_last_synced_at TIMESTAMP WITH TIME ZONE;

-- Add woo_category_id to categories table
ALTER TABLE public.categories ADD COLUMN woo_category_id BIGINT;

-- Update trigger
CREATE TRIGGER update_woocommerce_integrations_updated_at
  BEFORE UPDATE ON public.woocommerce_integrations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();