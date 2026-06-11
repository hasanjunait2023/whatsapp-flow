-- Add pending_plan_id column to tenants table
ALTER TABLE public.tenants ADD COLUMN pending_plan_id UUID REFERENCES public.plans(id);

-- Add index for faster lookups
CREATE INDEX idx_tenants_pending_plan_id ON public.tenants(pending_plan_id);