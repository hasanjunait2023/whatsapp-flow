-- Create recurring expenses table
CREATE TABLE public.recurring_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES public.expense_categories(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL,
  currency TEXT DEFAULT 'BDT',
  description TEXT NOT NULL,
  vendor_name TEXT,
  payment_method TEXT,
  frequency TEXT NOT NULL DEFAULT 'monthly', -- monthly, weekly, yearly
  day_of_month INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  last_generated_at DATE,
  next_due_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.recurring_expenses ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "System admins can manage recurring expenses"
  ON public.recurring_expenses FOR ALL
  USING (public.is_system_admin())
  WITH CHECK (public.is_system_admin());

-- Create updated_at trigger
CREATE TRIGGER update_recurring_expenses_updated_at
  BEFORE UPDATE ON public.recurring_expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();