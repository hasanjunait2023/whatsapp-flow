-- Create complaint category enum
CREATE TYPE complaint_category AS ENUM ('product_issue', 'delivery', 'refund', 'other');

-- Create complaint priority enum
CREATE TYPE complaint_priority AS ENUM ('low', 'medium', 'high', 'critical');

-- Create complaint status enum
CREATE TYPE complaint_status AS ENUM ('open', 'in_progress', 'resolved', 'closed');

-- Create complaints table
CREATE TABLE public.complaints (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  reported_by UUID NOT NULL REFERENCES auth.users(id),
  assigned_to UUID REFERENCES auth.users(id),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category complaint_category NOT NULL DEFAULT 'other',
  priority complaint_priority NOT NULL DEFAULT 'medium',
  status complaint_status NOT NULL DEFAULT 'open',
  resolution_notes TEXT,
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;

-- Create indexes for performance
CREATE INDEX idx_complaints_tenant_id ON public.complaints(tenant_id);
CREATE INDEX idx_complaints_status ON public.complaints(status);
CREATE INDEX idx_complaints_priority ON public.complaints(priority);
CREATE INDEX idx_complaints_contact_id ON public.complaints(contact_id);
CREATE INDEX idx_complaints_reported_by ON public.complaints(reported_by);

-- RLS Policies: All tenant members can view complaints
CREATE POLICY "Members can view complaints"
ON public.complaints
FOR SELECT
USING (is_tenant_member(tenant_id));

-- All tenant members can create complaints
CREATE POLICY "Members can create complaints"
ON public.complaints
FOR INSERT
WITH CHECK (is_tenant_member(tenant_id));

-- Reporters can update their own open complaints, managers can update any
CREATE POLICY "Members can update complaints"
ON public.complaints
FOR UPDATE
USING (
  is_tenant_member(tenant_id) AND (
    reported_by = auth.uid() OR
    is_tenant_owner_or_manager(tenant_id)
  )
);

-- Only owners/managers can delete complaints
CREATE POLICY "Owners/Managers can delete complaints"
ON public.complaints
FOR DELETE
USING (is_tenant_owner_or_manager(tenant_id));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_complaints_updated_at
BEFORE UPDATE ON public.complaints
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();