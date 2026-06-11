-- Create tenant expense categories table
CREATE TABLE public.tenant_expense_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT 'MoreHorizontal',
  color TEXT DEFAULT 'gray',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, name)
);

-- Create tenant expenses table
CREATE TABLE public.tenant_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.tenant_expense_categories(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL,
  currency TEXT DEFAULT 'BDT',
  description TEXT NOT NULL,
  expense_date DATE NOT NULL,
  payment_method TEXT,
  reference_number TEXT,
  vendor_name TEXT,
  notes TEXT,
  attachment_url TEXT,
  recorded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create tenant recurring expenses table
CREATE TABLE public.tenant_recurring_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.tenant_expense_categories(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL,
  currency TEXT DEFAULT 'BDT',
  description TEXT NOT NULL,
  vendor_name TEXT,
  payment_method TEXT,
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly', 'yearly')),
  day_of_month INTEGER,
  is_active BOOLEAN DEFAULT true,
  last_generated_at TIMESTAMPTZ,
  next_due_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.tenant_expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_recurring_expenses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tenant_expense_categories
CREATE POLICY "Members can view their tenant expense categories"
  ON public.tenant_expense_categories FOR SELECT
  USING (is_tenant_member(tenant_id));

CREATE POLICY "Owners/Managers can create expense categories"
  ON public.tenant_expense_categories FOR INSERT
  WITH CHECK (is_tenant_owner_or_manager(tenant_id));

CREATE POLICY "Owners/Managers can update expense categories"
  ON public.tenant_expense_categories FOR UPDATE
  USING (is_tenant_owner_or_manager(tenant_id));

CREATE POLICY "Owners/Managers can delete expense categories"
  ON public.tenant_expense_categories FOR DELETE
  USING (is_tenant_owner_or_manager(tenant_id));

-- RLS Policies for tenant_expenses
CREATE POLICY "Members can view their tenant expenses"
  ON public.tenant_expenses FOR SELECT
  USING (is_tenant_member(tenant_id));

CREATE POLICY "Members can create expenses"
  ON public.tenant_expenses FOR INSERT
  WITH CHECK (is_tenant_member(tenant_id));

CREATE POLICY "Owners/Managers can update expenses"
  ON public.tenant_expenses FOR UPDATE
  USING (is_tenant_owner_or_manager(tenant_id));

CREATE POLICY "Owners/Managers can delete expenses"
  ON public.tenant_expenses FOR DELETE
  USING (is_tenant_owner_or_manager(tenant_id));

-- RLS Policies for tenant_recurring_expenses
CREATE POLICY "Members can view their tenant recurring expenses"
  ON public.tenant_recurring_expenses FOR SELECT
  USING (is_tenant_member(tenant_id));

CREATE POLICY "Owners/Managers can create recurring expenses"
  ON public.tenant_recurring_expenses FOR INSERT
  WITH CHECK (is_tenant_owner_or_manager(tenant_id));

CREATE POLICY "Owners/Managers can update recurring expenses"
  ON public.tenant_recurring_expenses FOR UPDATE
  USING (is_tenant_owner_or_manager(tenant_id));

CREATE POLICY "Owners/Managers can delete recurring expenses"
  ON public.tenant_recurring_expenses FOR DELETE
  USING (is_tenant_owner_or_manager(tenant_id));

-- Create indexes for better query performance
CREATE INDEX idx_tenant_expenses_tenant_id ON public.tenant_expenses(tenant_id);
CREATE INDEX idx_tenant_expenses_date ON public.tenant_expenses(expense_date);
CREATE INDEX idx_tenant_expenses_category ON public.tenant_expenses(category_id);
CREATE INDEX idx_tenant_recurring_expenses_tenant_id ON public.tenant_recurring_expenses(tenant_id);
CREATE INDEX idx_tenant_expense_categories_tenant_id ON public.tenant_expense_categories(tenant_id);

-- Create updated_at trigger function if not exists
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_tenant_expense_categories_updated_at
  BEFORE UPDATE ON public.tenant_expense_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tenant_expenses_updated_at
  BEFORE UPDATE ON public.tenant_expenses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tenant_recurring_expenses_updated_at
  BEFORE UPDATE ON public.tenant_recurring_expenses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();