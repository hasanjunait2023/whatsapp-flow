import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { startOfMonth, endOfMonth, format, subMonths } from 'date-fns';

export interface ExpenseCategory {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Expense {
  id: string;
  category_id: string | null;
  category?: ExpenseCategory;
  amount: number;
  currency: string;
  description: string;
  expense_date: string;
  payment_method: string | null;
  reference_number: string | null;
  vendor_name: string | null;
  notes: string | null;
  attachment_url: string | null;
  recorded_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateExpenseInput {
  category_id?: string;
  amount: number;
  currency?: string;
  description: string;
  expense_date: string;
  payment_method?: string;
  reference_number?: string;
  vendor_name?: string;
  notes?: string;
  attachment_url?: string;
}

export interface RecurringExpense {
  id: string;
  category_id: string | null;
  category?: ExpenseCategory;
  amount: number;
  currency: string;
  description: string;
  vendor_name: string | null;
  payment_method: string | null;
  frequency: string;
  day_of_month: number | null;
  is_active: boolean;
  last_generated_at: string | null;
  next_due_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateRecurringExpenseInput {
  category_id?: string;
  amount: number;
  currency?: string;
  description: string;
  vendor_name?: string;
  payment_method?: string;
  frequency: string;
  day_of_month?: number;
  next_due_date: string;
  notes?: string;
}

export interface RevenueByMonth {
  month: string;
  amount: number;
}

export interface RevenueByPaymentMethod {
  method: string;
  amount: number;
  count: number;
}

export interface ExpenseByCategory {
  category: string;
  categoryId: string;
  amount: number;
  color: string;
  icon: string;
}

export interface ExpenseByMonth {
  month: string;
  amount: number;
}

export interface CashFlowData {
  month: string;
  inflow: number;
  outflow: number;
  net: number;
}

export interface AccountsData {
  totalRevenue: number;
  revenueByMonth: RevenueByMonth[];
  revenueByPaymentMethod: RevenueByPaymentMethod[];
  totalExpenses: number;
  expensesByCategory: ExpenseByCategory[];
  expensesByMonth: ExpenseByMonth[];
  netIncome: number;
  profitMargin: number;
  pendingPayments: number;
  cashFlow: CashFlowData[];
}

export function useAccounts(startDate?: Date, endDate?: Date) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [recurringExpenses, setRecurringExpenses] = useState<RecurringExpense[]>([]);
  const [accountsData, setAccountsData] = useState<AccountsData | null>(null);

  const defaultStartDate = startDate || subMonths(startOfMonth(new Date()), 11);
  const defaultEndDate = endDate || endOfMonth(new Date());

  const fetchCategories = useCallback(async () => {
    const { data, error } = await supabase
      .from('expense_categories')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (error) throw error;
    return (data || []) as ExpenseCategory[];
  }, []);

  const fetchExpenses = useCallback(async (start: Date, end: Date) => {
    const { data, error } = await supabase
      .from('expenses')
      .select('*, category:expense_categories(*)')
      .gte('expense_date', format(start, 'yyyy-MM-dd'))
      .lte('expense_date', format(end, 'yyyy-MM-dd'))
      .order('expense_date', { ascending: false });

    if (error) throw error;
    return (data || []).map(e => ({
      ...e,
      category: e.category as ExpenseCategory | undefined
    })) as Expense[];
  }, []);

  const fetchRevenue = useCallback(async (start: Date, end: Date) => {
    // Fetch from payments table (traditional/manual payments)
    const { data: paymentsData, error: paymentsError } = await supabase
      .from('payments')
      .select('amount, payment_method, created_at')
      .eq('status', 'verified')
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString());

    if (paymentsError) throw paymentsError;

    // Fetch from subscription_orders (external sales, webhook orders)
    const { data: subOrdersData, error: subOrdersError } = await supabase
      .from('subscription_orders')
      .select('amount, payment_method, created_at, verified_at')
      .eq('status', 'paid')
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString());

    if (subOrdersError) throw subOrdersError;

    // Combine both sources with normalized structure
    const payments = (paymentsData || []).map(p => ({
      amount: p.amount,
      payment_method: p.payment_method,
      created_at: p.created_at,
    }));

    const subscriptionPayments = (subOrdersData || []).map(so => ({
      amount: so.amount,
      payment_method: so.payment_method || 'online',
      created_at: so.verified_at || so.created_at,
    }));

    return [...payments, ...subscriptionPayments];
  }, []);

  const fetchPendingPayments = useCallback(async () => {
    // Pending from payments table
    const { data: pendingPayments, error: paymentsError } = await supabase
      .from('payments')
      .select('amount')
      .eq('status', 'pending');

    if (paymentsError) throw paymentsError;

    // Pending from subscription_orders
    const { data: pendingOrders, error: ordersError } = await supabase
      .from('subscription_orders')
      .select('amount')
      .eq('status', 'pending');

    if (ordersError) throw ordersError;

    const paymentsTotal = (pendingPayments || []).reduce((sum, p) => sum + Number(p.amount), 0);
    const ordersTotal = (pendingOrders || []).reduce((sum, o) => sum + Number(o.amount), 0);

    return paymentsTotal + ordersTotal;
  }, []);

  const fetchRecurringExpenses = useCallback(async () => {
    const { data, error } = await supabase
      .from('recurring_expenses')
      .select('*, category:expense_categories(*)')
      .order('next_due_date', { ascending: true });

    if (error) throw error;
    return (data || []).map(e => ({
      ...e,
      category: e.category as ExpenseCategory | undefined
    })) as RecurringExpense[];
  }, []);
  const fetchAccountsData = useCallback(async () => {
    try {
      setLoading(true);
      
      const [categoriesData, expensesData, revenueData, pendingAmount, recurringData] = await Promise.all([
        fetchCategories(),
        fetchExpenses(defaultStartDate, defaultEndDate),
        fetchRevenue(defaultStartDate, defaultEndDate),
        fetchPendingPayments(),
        fetchRecurringExpenses()
      ]);

      setCategories(categoriesData);
      setExpenses(expensesData);
      setRecurringExpenses(recurringData);

      // Calculate revenue metrics
      const totalRevenue = revenueData.reduce((sum, p) => sum + Number(p.amount), 0);
      
      // Revenue by month
      const revenueByMonthMap = new Map<string, number>();
      revenueData.forEach(p => {
        const month = format(new Date(p.created_at), 'MMM yyyy');
        revenueByMonthMap.set(month, (revenueByMonthMap.get(month) || 0) + Number(p.amount));
      });
      const revenueByMonth = Array.from(revenueByMonthMap.entries())
        .map(([month, amount]) => ({ month, amount }))
        .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());

      // Revenue by payment method
      const revenueByMethodMap = new Map<string, { amount: number; count: number }>();
      revenueData.forEach(p => {
        const method = p.payment_method || 'Unknown';
        const current = revenueByMethodMap.get(method) || { amount: 0, count: 0 };
        revenueByMethodMap.set(method, {
          amount: current.amount + Number(p.amount),
          count: current.count + 1
        });
      });
      const revenueByPaymentMethod = Array.from(revenueByMethodMap.entries())
        .map(([method, data]) => ({ method, ...data }));

      // Calculate expense metrics
      const totalExpenses = expensesData.reduce((sum, e) => sum + Number(e.amount), 0);

      // Expenses by category
      const expensesByCatMap = new Map<string, { amount: number; color: string; icon: string; categoryId: string }>();
      expensesData.forEach(e => {
        const catName = e.category?.name || 'Uncategorized';
        const catId = e.category_id || 'uncategorized';
        const current = expensesByCatMap.get(catName) || { 
          amount: 0, 
          color: e.category?.color || 'gray',
          icon: e.category?.icon || 'MoreHorizontal',
          categoryId: catId
        };
        expensesByCatMap.set(catName, {
          ...current,
          amount: current.amount + Number(e.amount)
        });
      });
      const expensesByCategory = Array.from(expensesByCatMap.entries())
        .map(([category, data]) => ({ category, ...data }))
        .sort((a, b) => b.amount - a.amount);

      // Expenses by month
      const expensesByMonthMap = new Map<string, number>();
      expensesData.forEach(e => {
        const month = format(new Date(e.expense_date), 'MMM yyyy');
        expensesByMonthMap.set(month, (expensesByMonthMap.get(month) || 0) + Number(e.amount));
      });
      const expensesByMonth = Array.from(expensesByMonthMap.entries())
        .map(([month, amount]) => ({ month, amount }))
        .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());

      // Cash flow calculation
      const cashFlowMap = new Map<string, { inflow: number; outflow: number }>();
      
      // Add revenue as inflows
      revenueData.forEach(p => {
        const month = format(new Date(p.created_at), 'MMM yyyy');
        const current = cashFlowMap.get(month) || { inflow: 0, outflow: 0 };
        cashFlowMap.set(month, { ...current, inflow: current.inflow + Number(p.amount) });
      });
      
      // Add expenses as outflows
      expensesData.forEach(e => {
        const month = format(new Date(e.expense_date), 'MMM yyyy');
        const current = cashFlowMap.get(month) || { inflow: 0, outflow: 0 };
        cashFlowMap.set(month, { ...current, outflow: current.outflow + Number(e.amount) });
      });

      const cashFlow = Array.from(cashFlowMap.entries())
        .map(([month, data]) => ({
          month,
          inflow: data.inflow,
          outflow: data.outflow,
          net: data.inflow - data.outflow
        }))
        .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());

      // Calculate net income and profit margin
      const netIncome = totalRevenue - totalExpenses;
      const profitMargin = totalRevenue > 0 ? (netIncome / totalRevenue) * 100 : 0;

      setAccountsData({
        totalRevenue,
        revenueByMonth,
        revenueByPaymentMethod,
        totalExpenses,
        expensesByCategory,
        expensesByMonth,
        netIncome,
        profitMargin,
        pendingPayments: pendingAmount,
        cashFlow
      });

      setError(null);
    } catch (err) {
      console.error('Error fetching accounts data:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch accounts data'));
    } finally {
      setLoading(false);
    }
  }, [defaultStartDate, defaultEndDate, fetchCategories, fetchExpenses, fetchRevenue, fetchPendingPayments]);

  useEffect(() => {
    fetchAccountsData();
  }, [fetchAccountsData]);

  const addExpense = async (input: CreateExpenseInput): Promise<Expense | null> => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('expenses')
        .insert({
          ...input,
          recorded_by: user.id
        })
        .select('*, category:expense_categories(*)')
        .single();

      if (error) throw error;
      
      const newExpense = {
        ...data,
        category: data.category as ExpenseCategory | undefined
      } as Expense;
      
      setExpenses(prev => [newExpense, ...prev]);
      await fetchAccountsData();
      return newExpense;
    } catch (err) {
      console.error('Error adding expense:', err);
      throw err;
    }
  };

  const updateExpense = async (id: string, input: Partial<CreateExpenseInput>): Promise<Expense | null> => {
    try {
      const { data, error } = await supabase
        .from('expenses')
        .update(input)
        .eq('id', id)
        .select('*, category:expense_categories(*)')
        .single();

      if (error) throw error;
      
      const updatedExpense = {
        ...data,
        category: data.category as ExpenseCategory | undefined
      } as Expense;
      
      setExpenses(prev => prev.map(e => e.id === id ? updatedExpense : e));
      await fetchAccountsData();
      return updatedExpense;
    } catch (err) {
      console.error('Error updating expense:', err);
      throw err;
    }
  };

  const deleteExpense = async (id: string): Promise<void> => {
    try {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setExpenses(prev => prev.filter(e => e.id !== id));
      await fetchAccountsData();
    } catch (err) {
      console.error('Error deleting expense:', err);
      throw err;
    }
  };

  const addCategory = async (input: { name: string; description?: string; icon?: string; color?: string }): Promise<ExpenseCategory | null> => {
    try {
      const { data, error } = await supabase
        .from('expense_categories')
        .insert(input)
        .select()
        .single();

      if (error) throw error;
      
      const newCategory = data as ExpenseCategory;
      setCategories(prev => [...prev, newCategory].sort((a, b) => a.name.localeCompare(b.name)));
      return newCategory;
    } catch (err) {
      console.error('Error adding category:', err);
      throw err;
    }
  };

  const updateCategory = async (id: string, input: Partial<{ name: string; description: string; icon: string; color: string; is_active: boolean }>): Promise<ExpenseCategory | null> => {
    try {
      const { data, error } = await supabase
        .from('expense_categories')
        .update(input)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      const updatedCategory = data as ExpenseCategory;
      setCategories(prev => prev.map(c => c.id === id ? updatedCategory : c));
      return updatedCategory;
    } catch (err) {
      console.error('Error updating category:', err);
      throw err;
    }
  };

  // Recurring expense functions
  const addRecurringExpense = async (input: CreateRecurringExpenseInput): Promise<RecurringExpense | null> => {
    try {
      const { data, error } = await supabase
        .from('recurring_expenses')
        .insert(input)
        .select('*, category:expense_categories(*)')
        .single();

      if (error) throw error;
      
      const newExpense = {
        ...data,
        category: data.category as ExpenseCategory | undefined
      } as RecurringExpense;
      
      setRecurringExpenses(prev => [...prev, newExpense]);
      return newExpense;
    } catch (err) {
      console.error('Error adding recurring expense:', err);
      throw err;
    }
  };

  const updateRecurringExpense = async (id: string, input: Partial<CreateRecurringExpenseInput & { is_active: boolean }>): Promise<RecurringExpense | null> => {
    try {
      const { data, error } = await supabase
        .from('recurring_expenses')
        .update(input)
        .eq('id', id)
        .select('*, category:expense_categories(*)')
        .single();

      if (error) throw error;
      
      const updatedExpense = {
        ...data,
        category: data.category as ExpenseCategory | undefined
      } as RecurringExpense;
      
      setRecurringExpenses(prev => prev.map(e => e.id === id ? updatedExpense : e));
      return updatedExpense;
    } catch (err) {
      console.error('Error updating recurring expense:', err);
      throw err;
    }
  };

  const deleteRecurringExpense = async (id: string): Promise<void> => {
    try {
      const { error } = await supabase
        .from('recurring_expenses')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setRecurringExpenses(prev => prev.filter(e => e.id !== id));
    } catch (err) {
      console.error('Error deleting recurring expense:', err);
      throw err;
    }
  };

  const generateExpenseFromTemplate = async (recurringId: string): Promise<Expense | null> => {
    const template = recurringExpenses.find(r => r.id === recurringId);
    if (!template || !user) return null;

    try {
      // Create a new expense from the template
      const today = format(new Date(), 'yyyy-MM-dd');
      const newExpense = await addExpense({
        category_id: template.category_id || undefined,
        amount: template.amount,
        currency: template.currency,
        description: template.description,
        expense_date: today,
        payment_method: template.payment_method || undefined,
        vendor_name: template.vendor_name || undefined,
        notes: `Generated from recurring template: ${template.description}`,
      });

      // Update the template with next due date
      const nextDate = calculateNextDueDate(template.next_due_date || today, template.frequency);
      await updateRecurringExpense(recurringId, {
        last_generated_at: today,
        next_due_date: nextDate,
      } as any);

      return newExpense;
    } catch (err) {
      console.error('Error generating expense from template:', err);
      throw err;
    }
  };

  return {
    loading,
    error,
    expenses,
    categories,
    recurringExpenses,
    accountsData,
    addExpense,
    updateExpense,
    deleteExpense,
    addCategory,
    updateCategory,
    addRecurringExpense,
    updateRecurringExpense,
    deleteRecurringExpense,
    generateExpenseFromTemplate,
    refetch: fetchAccountsData
  };
}

// Helper function to calculate next due date
function calculateNextDueDate(currentDate: string, frequency: string): string {
  const date = new Date(currentDate);
  switch (frequency) {
    case 'weekly':
      date.setDate(date.getDate() + 7);
      break;
    case 'monthly':
      date.setMonth(date.getMonth() + 1);
      break;
    case 'yearly':
      date.setFullYear(date.getFullYear() + 1);
      break;
  }
  return format(date, 'yyyy-MM-dd');
}
