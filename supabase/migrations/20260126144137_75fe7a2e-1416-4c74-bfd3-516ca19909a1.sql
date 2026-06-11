-- Create table to track external sales orders
CREATE TABLE public.external_sales_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_order_id TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'main_website',
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  plan_id UUID REFERENCES public.plans(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'BDT',
  billing_cycle TEXT NOT NULL DEFAULT 'monthly',
  payment_method TEXT,
  transaction_id TEXT,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT,
  business_name TEXT NOT NULL,
  business_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  raw_payload JSONB,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(external_order_id, source)
);

-- Enable RLS
ALTER TABLE public.external_sales_orders ENABLE ROW LEVEL SECURITY;

-- Only system admins can view external sales orders
CREATE POLICY "System admins can view external sales orders"
  ON public.external_sales_orders
  FOR SELECT
  TO authenticated
  USING (public.is_system_admin());

-- Only system admins can update external sales orders
CREATE POLICY "System admins can update external sales orders"
  ON public.external_sales_orders
  FOR UPDATE
  TO authenticated
  USING (public.is_system_admin());

-- Create index for faster lookups
CREATE INDEX idx_external_sales_orders_external_id ON public.external_sales_orders(external_order_id, source);
CREATE INDEX idx_external_sales_orders_status ON public.external_sales_orders(status);
CREATE INDEX idx_external_sales_orders_created ON public.external_sales_orders(created_at DESC);

-- Add trigger for updated_at
CREATE TRIGGER update_external_sales_orders_updated_at
  BEFORE UPDATE ON public.external_sales_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();