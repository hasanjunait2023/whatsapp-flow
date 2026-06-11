-- Create expense categories table
CREATE TABLE public.expense_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  color TEXT DEFAULT 'gray',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;

-- RLS policies for expense_categories
CREATE POLICY "System admins can manage expense categories"
  ON public.expense_categories FOR ALL
  USING (public.is_system_admin())
  WITH CHECK (public.is_system_admin());

CREATE POLICY "System admins can view expense categories"
  ON public.expense_categories FOR SELECT
  USING (public.is_system_admin());

-- Seed default categories
INSERT INTO public.expense_categories (name, description, icon, color) VALUES
  ('Hosting & Infrastructure', 'Server, cloud services, domain costs', 'Server', 'blue'),
  ('Salaries & Wages', 'Employee and contractor payments', 'Users', 'green'),
  ('Marketing', 'Advertising, promotions, social media', 'Megaphone', 'purple'),
  ('Software & Tools', 'SaaS subscriptions, licenses', 'Package', 'orange'),
  ('Office & Utilities', 'Rent, electricity, internet', 'Building2', 'yellow'),
  ('Payment Processing', 'Gateway fees, transaction charges', 'CreditCard', 'red'),
  ('Miscellaneous', 'Other business expenses', 'MoreHorizontal', 'gray');

-- Create expenses table
CREATE TABLE public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES public.expense_categories(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL,
  currency TEXT DEFAULT 'BDT',
  description TEXT NOT NULL,
  expense_date DATE NOT NULL,
  payment_method TEXT,
  reference_number TEXT,
  vendor_name TEXT,
  notes TEXT,
  attachment_url TEXT,
  recorded_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- RLS policies for expenses
CREATE POLICY "System admins can manage expenses"
  ON public.expenses FOR ALL
  USING (public.is_system_admin())
  WITH CHECK (public.is_system_admin());

-- Create financial periods table
CREATE TABLE public.financial_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  status TEXT DEFAULT 'open',
  total_revenue NUMERIC,
  total_expenses NUMERIC,
  net_income NUMERIC,
  closed_at TIMESTAMPTZ,
  closed_by UUID,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.financial_periods ENABLE ROW LEVEL SECURITY;

-- RLS policies for financial_periods
CREATE POLICY "System admins can manage financial periods"
  ON public.financial_periods FOR ALL
  USING (public.is_system_admin())
  WITH CHECK (public.is_system_admin());

-- Create updated_at trigger for expenses
CREATE TRIGGER update_expenses_updated_at
  BEFORE UPDATE ON public.expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create updated_at trigger for expense_categories
CREATE TRIGGER update_expense_categories_updated_at
  BEFORE UPDATE ON public.expense_categories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();