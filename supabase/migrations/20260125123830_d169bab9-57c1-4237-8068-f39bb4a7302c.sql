-- Add activation fields to tenants table
ALTER TABLE public.tenants 
ADD COLUMN IF NOT EXISTS is_activated BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS activated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS activated_by UUID REFERENCES auth.users(id);

-- Update existing tenants (mark them as activated to not break existing accounts)
UPDATE public.tenants SET is_activated = TRUE WHERE is_activated IS NULL OR is_activated = FALSE;

-- Create subscription_orders table for admin-created orders
CREATE TABLE IF NOT EXISTS public.subscription_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  plan_id UUID REFERENCES public.plans(id) NOT NULL,
  
  -- Order details
  order_number TEXT UNIQUE NOT NULL,
  amount NUMERIC NOT NULL,
  currency TEXT DEFAULT 'BDT',
  billing_cycle TEXT DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'yearly')),
  
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
  payment_method TEXT,
  transaction_id TEXT,
  
  -- Admin tracking
  created_by UUID REFERENCES auth.users(id),
  verified_by UUID REFERENCES auth.users(id),
  verified_at TIMESTAMPTZ,
  
  -- Notes
  notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on subscription_orders
ALTER TABLE public.subscription_orders ENABLE ROW LEVEL SECURITY;

-- RLS Policies for subscription_orders
CREATE POLICY "System admins can manage subscription orders"
ON public.subscription_orders
FOR ALL TO authenticated
USING (public.is_system_admin())
WITH CHECK (public.is_system_admin());

CREATE POLICY "Tenants can view their own orders"
ON public.subscription_orders
FOR SELECT TO authenticated
USING (tenant_id IN (SELECT tenant_id FROM public.user_roles WHERE user_id = auth.uid()));

-- Function to activate tenant when payment is verified
CREATE OR REPLACE FUNCTION public.activate_tenant_on_payment_verified()
RETURNS TRIGGER AS $$
BEGIN
  -- Only act when status changes to 'verified'
  IF NEW.status = 'verified' AND (OLD.status IS NULL OR OLD.status != 'verified') THEN
    -- Activate the tenant
    UPDATE public.tenants
    SET is_activated = TRUE,
        activated_at = NOW(),
        activated_by = NEW.verified_by
    WHERE id = NEW.tenant_id AND is_activated = FALSE;
    
    -- If subscription exists, set to active
    UPDATE public.subscriptions
    SET status = 'active',
        current_period_start = NOW(),
        current_period_end = NOW() + INTERVAL '30 days',
        updated_at = NOW()
    WHERE tenant_id = NEW.tenant_id AND status != 'active';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to activate tenant when subscription order is paid
CREATE OR REPLACE FUNCTION public.activate_tenant_on_order_paid()
RETURNS TRIGGER AS $$
BEGIN
  -- Only act when status changes to 'paid'
  IF NEW.status = 'paid' AND (OLD.status IS NULL OR OLD.status != 'paid') THEN
    -- Activate the tenant
    UPDATE public.tenants
    SET is_activated = TRUE,
        activated_at = NOW(),
        activated_by = NEW.verified_by
    WHERE id = NEW.tenant_id AND is_activated = FALSE;
    
    -- If subscription exists, update it; otherwise create one
    UPDATE public.subscriptions
    SET status = 'active',
        plan_id = NEW.plan_id,
        current_period_start = NOW(),
        current_period_end = CASE 
          WHEN NEW.billing_cycle = 'yearly' THEN NOW() + INTERVAL '365 days'
          ELSE NOW() + INTERVAL '30 days'
        END,
        updated_at = NOW()
    WHERE tenant_id = NEW.tenant_id;
    
    -- If no subscription was updated, create one
    IF NOT FOUND THEN
      INSERT INTO public.subscriptions (tenant_id, plan_id, status, current_period_start, current_period_end)
      VALUES (
        NEW.tenant_id, 
        NEW.plan_id, 
        'active',
        NOW(),
        CASE 
          WHEN NEW.billing_cycle = 'yearly' THEN NOW() + INTERVAL '365 days'
          ELSE NOW() + INTERVAL '30 days'
        END
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create triggers
DROP TRIGGER IF EXISTS on_payment_verified_activate_tenant ON public.payments;
CREATE TRIGGER on_payment_verified_activate_tenant
  AFTER UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.activate_tenant_on_payment_verified();

DROP TRIGGER IF EXISTS on_subscription_order_paid_activate_tenant ON public.subscription_orders;
CREATE TRIGGER on_subscription_order_paid_activate_tenant
  AFTER UPDATE ON public.subscription_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.activate_tenant_on_order_paid();

-- Also trigger on INSERT for subscription_orders (when created as paid)
DROP TRIGGER IF EXISTS on_subscription_order_created_paid ON public.subscription_orders;
CREATE TRIGGER on_subscription_order_created_paid
  AFTER INSERT ON public.subscription_orders
  FOR EACH ROW
  WHEN (NEW.status = 'paid')
  EXECUTE FUNCTION public.activate_tenant_on_order_paid();

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_tenants_is_activated ON public.tenants(is_activated);
CREATE INDEX IF NOT EXISTS idx_subscription_orders_tenant_id ON public.subscription_orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_subscription_orders_status ON public.subscription_orders(status);