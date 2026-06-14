import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/useTenant';
import { format, startOfMonth, endOfMonth, eachMonthOfInterval, parseISO } from 'date-fns';
import { toast } from 'sonner';

export interface TenantExpenseCategory {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TenantExpense {
  id: string;
  tenant_id: string;
  category_id: string | null;
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
  category?: TenantExpenseCategory;
}

export interface TenantRecurringExpense {
  id: string;
  tenant_id: string;
  category_id: string | null;
  amount: number;
  currency: string;
  description: string;
  vendor_name: string | null;
  payment_method: string | null;
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  day_of_month: number | null;
  is_active: boolean;
  last_generated_at: string | null;
  next_due_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  category?: TenantExpenseCategory;
}

export interface TenantAccountsData {
  // Revenue metrics (from orders)
  totalSales: number;
  totalOrders: number;
  averageOrderValue: number;
  salesByMonth: { month: string; amount: number; count: number }[];
  salesByPaymentStatus: { status: string; amount: number; count: number }[];
  
  // Cost metrics
  costOfGoodsSold: number;
  grossProfit: number;
  grossMargin: number;
  
  // Expense metrics
  totalExpenses: number;
  expensesByCategory: { categoryId: string; category: string; amount: number; color: string | null }[];
  expensesByMonth: { month: string; amount: number }[];
  
  // Profitability
  netProfit: number;
  netProfitMargin: number;
  
  // Cash flow
  cashFlow: { month: string; inflow: number; outflow: number; net: number }[];
  
  // Pending/Outstanding
  unpaidOrdersAmount: number;
  unpaidOrdersCount: number;
  
  // Top performers
  topProducts: { productName: string; revenue: number; quantity: number }[];
  topCustomers: { customerName: string; totalSpent: number; orderCount: number }[];
}

export function useTenantAccounts(startDate: Date, endDate: Date) {
  const { currentTenant } = useTenant();
  const queryClient = useQueryClient();
  const tenantId = currentTenant?.id;

  // Fetch expense categories
  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ['tenant-expense-categories', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from('tenant_expense_categories')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('name');
      
      if (error) throw error;
      return data as TenantExpenseCategory[];
    },
    enabled: !!tenantId,
  });

  // Fetch expenses
  const { data: expenses = [], isLoading: expensesLoading } = useQuery({
    queryKey: ['tenant-expenses', tenantId, format(startDate, 'yyyy-MM-dd'), format(endDate, 'yyyy-MM-dd')],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from('tenant_expenses')
        .select('*, category:tenant_expense_categories(*)')
        .eq('tenant_id', tenantId)
        .gte('expense_date', format(startDate, 'yyyy-MM-dd'))
        .lte('expense_date', format(endDate, 'yyyy-MM-dd'))
        .order('expense_date', { ascending: false });
      
      if (error) throw error;
      return data as TenantExpense[];
    },
    enabled: !!tenantId,
  });

  // Fetch recurring expenses
  const { data: recurringExpenses = [], isLoading: recurringLoading } = useQuery({
    queryKey: ['tenant-recurring-expenses', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from('tenant_recurring_expenses')
        .select('*, category:tenant_expense_categories(*)')
        .eq('tenant_id', tenantId)
        .order('description');
      
      if (error) throw error;
      return data as TenantRecurringExpense[];
    },
    enabled: !!tenantId,
  });

  // Fetch orders data for sales metrics
  const { data: ordersData, isLoading: ordersLoading } = useQuery({
    queryKey: ['tenant-orders-accounts', tenantId, format(startDate, 'yyyy-MM-dd'), format(endDate, 'yyyy-MM-dd')],
    queryFn: async () => {
      if (!tenantId) return { orders: [], orderItems: [] };
      
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .eq('tenant_id', tenantId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());
      
      if (ordersError) throw ordersError;

      // Get order items with product cost info
      const orderIds = orders?.map(o => o.id) || [];
      let orderItems: any[] = [];
      
      if (orderIds.length > 0) {
        const { data: items, error: itemsError } = await supabase
          .from('order_items')
          .select('*, product:products(cost_price)')
          .in('order_id', orderIds);
        
        if (itemsError) throw itemsError;
        orderItems = items || [];
      }

      return { orders: orders || [], orderItems };
    },
    enabled: !!tenantId,
  });

  // Calculate accounts data
  const accountsData: TenantAccountsData | null = (() => {
    if (!ordersData) return null;

    const { orders, orderItems } = ordersData;
    const months = eachMonthOfInterval({ start: startDate, end: endDate });

    // Sales metrics
    const paidOrders = orders.filter(o => o.payment_status === 'paid');
    const totalSales = paidOrders.reduce((sum, o) => sum + Number(o.total), 0);
    const totalOrders = orders.length;
    const averageOrderValue = totalOrders > 0 ? totalSales / paidOrders.length : 0;

    // Sales by month
    const salesByMonth = months.map(month => {
      const monthStr = format(month, 'yyyy-MM');
      const monthOrders = paidOrders.filter(o => 
        format(parseISO(o.created_at), 'yyyy-MM') === monthStr
      );
      return {
        month: format(month, 'MMM yyyy'),
        amount: monthOrders.reduce((sum, o) => sum + Number(o.total), 0),
        count: monthOrders.length,
      };
    });

    // Sales by payment status
    const statusGroups = orders.reduce((acc, o) => {
      const status = o.payment_status;
      if (!acc[status]) acc[status] = { amount: 0, count: 0 };
      acc[status].amount += Number(o.total);
      acc[status].count += 1;
      return acc;
    }, {} as Record<string, { amount: number; count: number }>);

    const salesByPaymentStatus = Object.entries(statusGroups).map(([status, data]: [string, { amount: number; count: number }]) => ({
      status,
      ...data,
    }));

    // COGS calculation
    const costOfGoodsSold = orderItems.reduce((sum, item) => {
      const costPrice = item.product?.cost_price || 0;
      return sum + (Number(costPrice) * item.quantity);
    }, 0);

    const grossProfit = totalSales - costOfGoodsSold;
    const grossMargin = totalSales > 0 ? (grossProfit / totalSales) * 100 : 0;

    // Expense metrics
    const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

    const expensesByCategoryMap = expenses.reduce((acc, e) => {
      const catId = e.category_id || 'uncategorized';
      const catName = e.category?.name || 'Uncategorized';
      const catColor = e.category?.color || 'gray';
      if (!acc[catId]) acc[catId] = { category: catName, amount: 0, color: catColor };
      acc[catId].amount += Number(e.amount);
      return acc;
    }, {} as Record<string, { category: string; amount: number; color: string | null }>);

    const expensesByCategory = Object.entries(expensesByCategoryMap).map(([categoryId, data]) => ({
      categoryId,
      ...data,
    }));

    const expensesByMonth = months.map(month => {
      const monthStr = format(month, 'yyyy-MM');
      const monthExpenses = expenses.filter(e => 
        format(parseISO(e.expense_date), 'yyyy-MM') === monthStr
      );
      return {
        month: format(month, 'MMM yyyy'),
        amount: monthExpenses.reduce((sum, e) => sum + Number(e.amount), 0),
      };
    });

    // Profitability
    const netProfit = grossProfit - totalExpenses;
    const netProfitMargin = totalSales > 0 ? (netProfit / totalSales) * 100 : 0;

    // Cash flow
    const cashFlow = months.map(month => {
      const monthStr = format(month, 'yyyy-MM');
      const monthSales = salesByMonth.find(s => s.month === format(month, 'MMM yyyy'))?.amount || 0;
      const monthExpense = expensesByMonth.find(e => e.month === format(month, 'MMM yyyy'))?.amount || 0;
      return {
        month: format(month, 'MMM yyyy'),
        inflow: monthSales,
        outflow: monthExpense,
        net: monthSales - monthExpense,
      };
    });

    // Unpaid orders
    const unpaidOrders = orders.filter(o => o.payment_status !== 'paid');
    const unpaidOrdersAmount = unpaidOrders.reduce((sum, o) => sum + Number(o.total), 0);
    const unpaidOrdersCount = unpaidOrders.length;

    // Top products
    const productSales = orderItems.reduce((acc, item) => {
      const name = item.product_name;
      if (!acc[name]) acc[name] = { revenue: 0, quantity: 0 };
      acc[name].revenue += Number(item.total);
      acc[name].quantity += item.quantity;
      return acc;
    }, {} as Record<string, { revenue: number; quantity: number }>);

    const topProducts = Object.entries(productSales)
      .map(([productName, stats]) => {
        const typedStats = stats as { revenue: number; quantity: number };
        return { productName, revenue: typedStats.revenue, quantity: typedStats.quantity };
      })
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // Top customers
    const customerSpending = orders
      .filter(o => o.payment_status === 'paid')
      .reduce((acc, o) => {
        const name = o.customer_name || 'Unknown';
        if (!acc[name]) acc[name] = { totalSpent: 0, orderCount: 0 };
        acc[name].totalSpent += Number(o.total);
        acc[name].orderCount += 1;
        return acc;
      }, {} as Record<string, { totalSpent: number; orderCount: number }>);

    const topCustomers = Object.entries(customerSpending)
      .map(([customerName, stats]) => {
        const typedStats = stats as { totalSpent: number; orderCount: number };
        return { customerName, totalSpent: typedStats.totalSpent, orderCount: typedStats.orderCount };
      })
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 10);

    return {
      totalSales,
      totalOrders,
      averageOrderValue,
      salesByMonth,
      salesByPaymentStatus,
      costOfGoodsSold,
      grossProfit,
      grossMargin,
      totalExpenses,
      expensesByCategory,
      expensesByMonth,
      netProfit,
      netProfitMargin,
      cashFlow,
      unpaidOrdersAmount,
      unpaidOrdersCount,
      topProducts,
      topCustomers,
    };
  })();

  // Mutations
  const addExpense = useMutation({
    mutationFn: async (expense: Record<string, unknown>) => {
      if (!tenantId) throw new Error('No tenant selected');
      const insertData = {
        tenant_id: tenantId,
        description: expense.description as string,
        amount: expense.amount as number,
        expense_date: expense.expense_date as string,
        category_id: expense.category_id as string | null,
        currency: expense.currency as string | undefined,
        payment_method: expense.payment_method as string | undefined,
        vendor_name: expense.vendor_name as string | undefined,
        reference_number: expense.reference_number as string | undefined,
        notes: expense.notes as string | undefined,
      };
      const { data, error } = await supabase
        .from('tenant_expenses')
        .insert(insertData)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-expenses'] });
      toast.success('Expense added successfully');
    },
    onError: (error) => {
      toast.error('Failed to add expense: ' + error.message);
    },
  });

  const updateExpense = useMutation({
    mutationFn: async ({ id, ...expense }: Partial<TenantExpense> & { id: string }) => {
      const { data, error } = await supabase
        .from('tenant_expenses')
        .update(expense)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-expenses'] });
      toast.success('Expense updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update expense: ' + error.message);
    },
  });

  const deleteExpense = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('tenant_expenses')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-expenses'] });
      toast.success('Expense deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete expense: ' + error.message);
    },
  });

  const addCategory = useMutation({
    mutationFn: async (category: { name: string; description?: string; icon?: string; color?: string }) => {
      if (!tenantId) throw new Error('No tenant selected');
      const { data, error } = await supabase
        .from('tenant_expense_categories')
        .insert({ ...category, tenant_id: tenantId })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-expense-categories'] });
      toast.success('Category added successfully');
    },
    onError: (error) => {
      toast.error('Failed to add category: ' + error.message);
    },
  });

  const updateCategory = useMutation({
    mutationFn: async ({ id, ...category }: Partial<TenantExpenseCategory> & { id: string }) => {
      const { data, error } = await supabase
        .from('tenant_expense_categories')
        .update(category)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-expense-categories'] });
      toast.success('Category updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update category: ' + error.message);
    },
  });

  const addRecurringExpense = useMutation({
    mutationFn: async (expense: Omit<TenantRecurringExpense, 'id' | 'tenant_id' | 'created_at' | 'updated_at' | 'category'>) => {
      if (!tenantId) throw new Error('No tenant selected');
      const { data, error } = await supabase
        .from('tenant_recurring_expenses')
        .insert({ ...expense, tenant_id: tenantId })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-recurring-expenses'] });
      toast.success('Recurring expense added successfully');
    },
    onError: (error) => {
      toast.error('Failed to add recurring expense: ' + error.message);
    },
  });

  const updateRecurringExpense = useMutation({
    mutationFn: async ({ id, ...expense }: Partial<TenantRecurringExpense> & { id: string }) => {
      const { data, error } = await supabase
        .from('tenant_recurring_expenses')
        .update(expense)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-recurring-expenses'] });
      toast.success('Recurring expense updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update recurring expense: ' + error.message);
    },
  });

  const deleteRecurringExpense = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('tenant_recurring_expenses')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-recurring-expenses'] });
      toast.success('Recurring expense deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete recurring expense: ' + error.message);
    },
  });

  const generateExpenseFromTemplate = useMutation({
    mutationFn: async (template: TenantRecurringExpense) => {
      if (!tenantId) throw new Error('No tenant selected');
      const { data, error } = await supabase
        .from('tenant_expenses')
        .insert({
          tenant_id: tenantId,
          category_id: template.category_id,
          amount: template.amount,
          currency: template.currency,
          description: template.description,
          expense_date: format(new Date(), 'yyyy-MM-dd'),
          payment_method: template.payment_method,
          vendor_name: template.vendor_name,
          notes: `Generated from recurring template: ${template.description}`,
        })
        .select()
        .single();
      if (error) throw error;

      // Update last generated date
      await supabase
        .from('tenant_recurring_expenses')
        .update({ last_generated_at: new Date().toISOString() })
        .eq('id', template.id);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-expenses'] });
      queryClient.invalidateQueries({ queryKey: ['tenant-recurring-expenses'] });
      toast.success('Expense generated from template');
    },
    onError: (error) => {
      toast.error('Failed to generate expense: ' + error.message);
    },
  });

  const refetch = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['tenant-expenses'] });
    queryClient.invalidateQueries({ queryKey: ['tenant-expense-categories'] });
    queryClient.invalidateQueries({ queryKey: ['tenant-recurring-expenses'] });
    queryClient.invalidateQueries({ queryKey: ['tenant-orders-accounts'] });
  }, [queryClient]);

  return {
    loading: categoriesLoading || expensesLoading || recurringLoading || ordersLoading,
    categories,
    expenses,
    recurringExpenses,
    accountsData,
    addExpense: addExpense.mutateAsync,
    updateExpense: updateExpense.mutateAsync,
    deleteExpense: deleteExpense.mutateAsync,
    addCategory: addCategory.mutateAsync,
    updateCategory: updateCategory.mutateAsync,
    addRecurringExpense: addRecurringExpense.mutateAsync,
    updateRecurringExpense: updateRecurringExpense.mutateAsync,
    deleteRecurringExpense: deleteRecurringExpense.mutateAsync,
    generateExpenseFromTemplate: generateExpenseFromTemplate.mutateAsync,
    refetch,
  };
}
