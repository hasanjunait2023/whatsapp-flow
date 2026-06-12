import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/useTenant';

export interface ExpenseCategory {
  id: string;
  tenant_id: string;
  name: string;
  color: string | null;
  icon: string | null;
  is_active: boolean;
}

export interface Expense {
  id: string;
  tenant_id: string;
  amount: number;
  category_id: string | null;
  currency: string | null;
  description: string;
  expense_date: string;
  payment_method: string | null;
  vendor_name: string | null;
  reference_number: string | null;
  notes: string | null;
  created_at: string;
}

export interface AccountingSummary {
  income: number;
  expenses: number;
  net: number;
  currency: string;
}

function monthRange(): { start: string; end: string } {
  // Stable, no Date.now() randomness — first day of the current month to now.
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
  const end = now.toISOString();
  return { start, end };
}

export function useAccounting() {
  const { currentTenant } = useTenant();
  const tenantId = currentTenant?.id;
  const qc = useQueryClient();

  const categories = useQuery({
    queryKey: ['expense-categories', tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenant_expense_categories')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('name', { ascending: true });
      if (error) throw error;
      return (data || []) as ExpenseCategory[];
    },
  });

  const expenses = useQuery({
    queryKey: ['expenses', tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenant_expenses')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('expense_date', { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data || []) as Expense[];
    },
  });

  // Income = sum of order totals this month; expenses = sum of expense rows this month.
  const summary = useQuery({
    queryKey: ['accounting-summary', tenantId],
    enabled: !!tenantId,
    queryFn: async (): Promise<AccountingSummary> => {
      const { start, end } = monthRange();
      const [orders, exp] = await Promise.all([
        supabase.from('orders').select('total').eq('tenant_id', tenantId).gte('created_at', start).lte('created_at', end),
        supabase.from('tenant_expenses').select('amount').eq('tenant_id', tenantId).gte('expense_date', start.slice(0, 10)),
      ]);
      const income = (orders.data || []).reduce((s, o: { total: number | null }) => s + (o.total || 0), 0);
      const expenses = (exp.data || []).reduce((s, e: { amount: number | null }) => s + (e.amount || 0), 0);
      return { income, expenses, net: income - expenses, currency: 'BDT' };
    },
  });

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ['expenses', tenantId] });
    qc.invalidateQueries({ queryKey: ['accounting-summary', tenantId] });
  };

  const createExpense = useMutation({
    mutationFn: async (input: Partial<Expense>) => {
      const { data, error } = await supabase
        .from('tenant_expenses')
        .insert({
          amount: input.amount,
          description: input.description,
          expense_date: input.expense_date,
          category_id: input.category_id || null,
          currency: input.currency || 'BDT',
          payment_method: input.payment_method || null,
          vendor_name: input.vendor_name || null,
          reference_number: input.reference_number || null,
          notes: input.notes || null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: invalidateAll,
  });

  const deleteExpense = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('tenant_expenses').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidateAll,
  });

  const createCategory = useMutation({
    mutationFn: async (input: { name: string; color?: string }) => {
      const { data, error } = await supabase
        .from('tenant_expense_categories')
        .insert({ name: input.name, color: input.color || 'gray', is_active: true })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expense-categories', tenantId] }),
  });

  return {
    categories: categories.data || [],
    expenses: expenses.data || [],
    summary: summary.data,
    loading: categories.isLoading || expenses.isLoading,
    createExpense,
    deleteExpense,
    createCategory,
  };
}
