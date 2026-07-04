import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/useTenant';
import { startOfMonth, endOfMonth, format, parseISO, startOfDay, endOfDay, subDays, differenceInDays } from 'date-fns';

export interface ReportSummary {
  totalRevenue: number;
  revenueChange: number;
  totalOrders: number;
  ordersChange: number;
  averageOrderValue: number;
  aovChange: number;
  grossProfit: number;
  grossProfitMargin: number;
  newCustomers: number;
  customersChange: number;
  messagesSent: number;
  messagesChange: number;
  activeConversations: number;
  conversationsChange: number;
  openComplaints: number;
  collectionRate: number;
}

export interface OrdersByStatus {
  status: string;
  count: number;
  value: number;
}

export interface PaymentStatus {
  status: string;
  count: number;
  value: number;
}

export interface RevenueBySource {
  source: string;
  value: number;
  count: number;
}

export interface DailySales {
  date: string;
  revenue: number;
  orders: number;
}

export interface ExpenseByCategory {
  category: string;
  amount: number;
  percentage: number;
}

export interface MonthlyCashFlow {
  month: string;
  inflow: number;
  outflow: number;
  netFlow: number;
  runningBalance: number;
}

export interface TopCustomer {
  id: string;
  name: string;
  phone: string;
  totalOrders: number;
  totalSpent: number;
  lastOrder: string;
}

export interface CustomerRisk {
  level: string;
  count: number;
  percentage: number;
}

export interface CustomerGrowth {
  date: string;
  newCustomers: number;
  totalCustomers: number;
}

export interface TopProduct {
  id: string;
  name: string;
  sku: string;
  quantitySold: number;
  revenue: number;
  profit: number;
}

export interface CategoryPerformance {
  category: string;
  revenue: number;
  unitsSold: number;
  products: number;
}

export interface ComplaintAnalysis {
  category: string;
  count: number;
  avgResolutionHours: number;
}

export interface DeliveryPerformance {
  courier: string;
  shipped: number;
  delivered: number;
  onTimeRate: number;
}

export interface PreviousPeriodData {
  revenue: number;
  orders: number;
  aov: number;
  customers: number;
  messages: number;
  grossProfit: number;
  expenses: number;
}

export interface ReportsData {
  summary: ReportSummary;
  ordersByStatus: OrdersByStatus[];
  paymentStatus: PaymentStatus[];
  revenueBySource: RevenueBySource[];
  dailySales: DailySales[];
  expensesByCategory: ExpenseByCategory[];
  monthlyCashFlow: MonthlyCashFlow[];
  topCustomers: TopCustomer[];
  customerRisk: CustomerRisk[];
  customerGrowth: CustomerGrowth[];
  topProducts: TopProduct[];
  categoryPerformance: CategoryPerformance[];
  complaintAnalysis: ComplaintAnalysis[];
  deliveryPerformance: DeliveryPerformance[];
  profitLoss: {
    revenue: number;
    cogs: number;
    grossProfit: number;
    operatingExpenses: number;
    netProfit: number;
    profitMargin: number;
  };
  previousPeriod: PreviousPeriodData | null;
}

const defaultSummary: ReportSummary = {
  totalRevenue: 0,
  revenueChange: 0,
  totalOrders: 0,
  ordersChange: 0,
  averageOrderValue: 0,
  aovChange: 0,
  grossProfit: 0,
  grossProfitMargin: 0,
  newCustomers: 0,
  customersChange: 0,
  messagesSent: 0,
  messagesChange: 0,
  activeConversations: 0,
  conversationsChange: 0,
  openComplaints: 0,
  collectionRate: 0,
};

function calculatePercentageChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

export function useReports(startDate: Date, endDate: Date) {
  const { currentTenant } = useTenant();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ReportsData | null>(null);

  const fetchReports = useCallback(async () => {
    if (!currentTenant?.id) return;

    setLoading(true);
    setError(null);

    try {
      const startStr = format(startOfDay(startDate), 'yyyy-MM-dd');
      const endStr = format(endOfDay(endDate), 'yyyy-MM-dd');

      // Calculate previous period dates (same duration, immediately before)
      const periodDuration = differenceInDays(endDate, startDate) + 1;
      const prevEndDate = subDays(startDate, 1);
      const prevStartDate = subDays(prevEndDate, periodDuration - 1);
      const prevStartStr = format(startOfDay(prevStartDate), 'yyyy-MM-dd');
      const prevEndStr = format(endOfDay(prevEndDate), 'yyyy-MM-dd');

      // Fetch all data in parallel (current + previous period)
      const [
        ordersRes,
        contactsRes,
        messagesRes,
        expensesRes,
        complaintsRes,
        productsRes,
        orderItemsRes,
        purchaseBehaviorRes,
        // Previous period data
        prevOrdersRes,
        prevContactsRes,
        prevMessagesRes,
        prevExpensesRes,
      ] = await Promise.all([
        // Current period
        supabase
          .from('orders')
          .select('*, contact:contacts(id, name, phone_number)')
          .eq('tenant_id', currentTenant.id)
          .gte('created_at', startStr)
          .lte('created_at', endStr + 'T23:59:59'),
        supabase
          .from('contacts')
          .select('*')
          .eq('tenant_id', currentTenant.id)
          .gte('created_at', startStr)
          .lte('created_at', endStr + 'T23:59:59'),
        supabase
          .from('messages')
          .select('*')
          .eq('tenant_id', currentTenant.id)
          .gte('created_at', startStr)
          .lte('created_at', endStr + 'T23:59:59'),
        supabase
          .from('tenant_expenses')
          .select('*, category:tenant_expense_categories(name)')
          .eq('tenant_id', currentTenant.id)
          .gte('expense_date', startStr)
          .lte('expense_date', endStr),
        supabase
          .from('complaints')
          .select('*')
          .eq('tenant_id', currentTenant.id),
        supabase
          .from('products')
          .select('*')
          .eq('tenant_id', currentTenant.id),
        supabase
          .from('order_items')
          .select('*, order:orders!inner(tenant_id, created_at, status)')
          .eq('order.tenant_id', currentTenant.id)
          .gte('order.created_at', startStr)
          .lte('order.created_at', endStr + 'T23:59:59'),
        supabase
          .from('purchase_behavior_checks')
          .select('*')
          .eq('tenant_id', currentTenant.id),
        // Previous period
        supabase
          .from('orders')
          .select('*, contact:contacts(id, name, phone_number)')
          .eq('tenant_id', currentTenant.id)
          .gte('created_at', prevStartStr)
          .lte('created_at', prevEndStr + 'T23:59:59'),
        supabase
          .from('contacts')
          .select('*')
          .eq('tenant_id', currentTenant.id)
          .gte('created_at', prevStartStr)
          .lte('created_at', prevEndStr + 'T23:59:59'),
        supabase
          .from('messages')
          .select('*')
          .eq('tenant_id', currentTenant.id)
          .gte('created_at', prevStartStr)
          .lte('created_at', prevEndStr + 'T23:59:59'),
        supabase
          .from('tenant_expenses')
          .select('*, category:tenant_expense_categories(name)')
          .eq('tenant_id', currentTenant.id)
          .gte('expense_date', prevStartStr)
          .lte('expense_date', prevEndStr),
      ]);

      const orders = ordersRes.data || [];
      const contacts = contactsRes.data || [];
      const messages = messagesRes.data || [];
      const expenses = expensesRes.data || [];
      const complaints = complaintsRes.data || [];
      const products = productsRes.data || [];
      const orderItems = orderItemsRes.data || [];
      const purchaseBehavior = purchaseBehaviorRes.data || [];

      // Previous period data
      const prevOrders = prevOrdersRes.data || [];
      const prevContacts = prevContactsRes.data || [];
      const prevMessages = prevMessagesRes.data || [];
      const prevExpenses = prevExpensesRes.data || [];

      // Calculate Previous Period Summary
      const prevRevenue = prevOrders.reduce((sum, o) => sum + (o.total || 0), 0);
      const prevOrdersCount = prevOrders.length;
      const prevAov = prevOrdersCount > 0 ? prevRevenue / prevOrdersCount : 0;
      const prevCustomers = prevContacts.length;
      const prevMessagesSent = prevMessages.filter(m => m.direction === 'outbound').length;
      const prevExpensesTotal = prevExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
      
      // Calculate prev COGS (simplified - using same products data)
      const prevCogs = prevOrders.reduce((sum, order) => {
        // Estimate based on average cost ratio
        return sum + (order.total || 0) * 0.3; // Fallback estimation
      }, 0);
      const prevGrossProfit = prevRevenue - prevCogs;

      const previousPeriod: PreviousPeriodData = {
        revenue: prevRevenue,
        orders: prevOrdersCount,
        aov: prevAov,
        customers: prevCustomers,
        messages: prevMessagesSent,
        grossProfit: prevGrossProfit,
        expenses: prevExpensesTotal,
      };

      // Calculate Summary
      const totalRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);
      const paidOrders = orders.filter(o => o.payment_status === 'paid');
      const paidRevenue = paidOrders.reduce((sum, o) => sum + (o.total || 0), 0);
      const collectionRate = totalRevenue > 0 ? (paidRevenue / totalRevenue) * 100 : 0;
      const averageOrderValue = orders.length > 0 ? totalRevenue / orders.length : 0;

      // Calculate COGS from order items
      const cogs = orderItems.reduce((sum, item) => {
        const product = products.find(p => p.id === item.product_id);
        const costPrice = product?.cost_price || 0;
        return sum + (costPrice * (item.quantity || 0));
      }, 0);

      const grossProfit = totalRevenue - cogs;
      const operatingExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
      const netProfit = grossProfit - operatingExpenses;
      const grossProfitMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

      const sentMessages = messages.filter(m => m.direction === 'outbound').length;
      const openComplaintsCount = complaints.filter(c => c.status !== 'resolved' && c.status !== 'closed').length;

      // Fetch active conversations (unique contacts with activity in period) - WhatsApp + Facebook
      const { count: waConvCount } = await supabase
        .from('contacts')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', currentTenant.id)
        .gte('last_message_at', startStr)
        .lte('last_message_at', endStr + 'T23:59:59');

      const { count: fbConvCount } = await supabase
        .from('fb_contacts')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', currentTenant.id)
        .gte('last_message_at', startStr)
        .lte('last_message_at', endStr + 'T23:59:59');

      const activeConversations = (waConvCount || 0) + (fbConvCount || 0);

      // Previous period conversations
      const { count: prevWaConvCount } = await supabase
        .from('contacts')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', currentTenant.id)
        .gte('last_message_at', prevStartStr)
        .lte('last_message_at', prevEndStr + 'T23:59:59');

      const { count: prevFbConvCount } = await supabase
        .from('fb_contacts')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', currentTenant.id)
        .gte('last_message_at', prevStartStr)
        .lte('last_message_at', prevEndStr + 'T23:59:59');

      const prevConversations = (prevWaConvCount || 0) + (prevFbConvCount || 0);

      // Calculate percentage changes
      const revenueChange = calculatePercentageChange(totalRevenue, prevRevenue);
      const ordersChange = calculatePercentageChange(orders.length, prevOrdersCount);
      const aovChange = calculatePercentageChange(averageOrderValue, prevAov);
      const customersChange = calculatePercentageChange(contacts.length, prevCustomers);
      const messagesChange = calculatePercentageChange(sentMessages, prevMessagesSent);
      const conversationsChange = calculatePercentageChange(activeConversations, prevConversations);

      const summary: ReportSummary = {
        totalRevenue,
        revenueChange,
        totalOrders: orders.length,
        ordersChange,
        averageOrderValue,
        aovChange,
        grossProfit,
        grossProfitMargin,
        newCustomers: contacts.length,
        customersChange,
        messagesSent: sentMessages,
        messagesChange,
        activeConversations,
        conversationsChange,
        openComplaints: openComplaintsCount,
        collectionRate,
      };

      // Orders by Status
      const statusCounts: Record<string, { count: number; value: number }> = {};
      orders.forEach(order => {
        const status = order.status || 'pending';
        if (!statusCounts[status]) statusCounts[status] = { count: 0, value: 0 };
        statusCounts[status].count++;
        statusCounts[status].value += order.total || 0;
      });
      const ordersByStatus = Object.entries(statusCounts).map(([status, data]) => ({
        status,
        count: data.count,
        value: data.value,
      }));

      // Payment Status
      const paymentCounts: Record<string, { count: number; value: number }> = {};
      orders.forEach(order => {
        const status = order.payment_status || 'pending';
        if (!paymentCounts[status]) paymentCounts[status] = { count: 0, value: 0 };
        paymentCounts[status].count++;
        paymentCounts[status].value += order.total || 0;
      });
      const paymentStatus = Object.entries(paymentCounts).map(([status, data]) => ({
        status,
        count: data.count,
        value: data.value,
      }));

      // Revenue by Source
      const sourceCounts: Record<string, { value: number; count: number }> = {};
      orders.forEach(order => {
        const source = order.source || 'manual';
        if (!sourceCounts[source]) sourceCounts[source] = { value: 0, count: 0 };
        sourceCounts[source].value += order.total || 0;
        sourceCounts[source].count++;
      });
      const revenueBySource = Object.entries(sourceCounts).map(([source, data]) => ({
        source,
        value: data.value,
        count: data.count,
      }));

      // Daily Sales
      const dailySalesMap: Record<string, { revenue: number; orders: number }> = {};
      orders.forEach(order => {
        const date = format(parseISO(order.created_at), 'yyyy-MM-dd');
        if (!dailySalesMap[date]) dailySalesMap[date] = { revenue: 0, orders: 0 };
        dailySalesMap[date].revenue += order.total || 0;
        dailySalesMap[date].orders++;
      });
      const dailySales = Object.entries(dailySalesMap)
        .map(([date, data]) => ({ date, ...data }))
        .sort((a, b) => a.date.localeCompare(b.date));

      // Expenses by Category
      const categoryExpenses: Record<string, number> = {};
      expenses.forEach(expense => {
        const category = (expense.category as any)?.name || 'Uncategorized';
        categoryExpenses[category] = (categoryExpenses[category] || 0) + (expense.amount || 0);
      });
      const totalExpenses = Object.values(categoryExpenses).reduce((sum, v) => sum + v, 0);
      const expensesByCategory = Object.entries(categoryExpenses).map(([category, amount]) => ({
        category,
        amount,
        percentage: totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0,
      }));

      // Monthly Cash Flow
      const monthlyFlowMap: Record<string, { inflow: number; outflow: number }> = {};
      orders.forEach(order => {
        if (order.payment_status === 'paid') {
          const month = format(parseISO(order.created_at), 'yyyy-MM');
          if (!monthlyFlowMap[month]) monthlyFlowMap[month] = { inflow: 0, outflow: 0 };
          monthlyFlowMap[month].inflow += order.total || 0;
        }
      });
      expenses.forEach(expense => {
        const month = format(parseISO(expense.expense_date), 'yyyy-MM');
        if (!monthlyFlowMap[month]) monthlyFlowMap[month] = { inflow: 0, outflow: 0 };
        monthlyFlowMap[month].outflow += expense.amount || 0;
      });
      let runningBalance = 0;
      const monthlyCashFlow = Object.entries(monthlyFlowMap)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([month, data]) => {
          const netFlow = data.inflow - data.outflow;
          runningBalance += netFlow;
          return { month, ...data, netFlow, runningBalance };
        });

      // Top Customers
      const customerOrders: Record<string, { name: string; phone: string; orders: number; spent: number; lastOrder: string }> = {};
      orders.forEach(order => {
        const contact = order.contact as any;
        if (!contact) return;
        const key = contact.id;
        if (!customerOrders[key]) {
          customerOrders[key] = {
            name: contact.name || 'Unknown',
            phone: contact.phone_number || '',
            orders: 0,
            spent: 0,
            lastOrder: order.created_at,
          };
        }
        customerOrders[key].orders++;
        customerOrders[key].spent += order.total || 0;
        if (order.created_at > customerOrders[key].lastOrder) {
          customerOrders[key].lastOrder = order.created_at;
        }
      });
      const topCustomers = Object.entries(customerOrders)
        .map(([id, data]) => ({
          id,
          name: data.name,
          phone: data.phone,
          totalOrders: data.orders,
          totalSpent: data.spent,
          lastOrder: data.lastOrder,
        }))
        .sort((a, b) => b.totalSpent - a.totalSpent)
        .slice(0, 10);

      // Customer Risk
      const riskLevels: Record<string, number> = { low: 0, medium: 0, high: 0, critical: 0 };
      purchaseBehavior.forEach(pb => {
        const level = pb.risk_level || 'low';
        if (riskLevels[level] !== undefined) riskLevels[level]++;
      });
      const totalRiskChecks = Object.values(riskLevels).reduce((sum, v) => sum + v, 0);
      const customerRisk = Object.entries(riskLevels).map(([level, count]) => ({
        level,
        count,
        percentage: totalRiskChecks > 0 ? (count / totalRiskChecks) * 100 : 0,
      }));

      // Customer Growth
      const growthMap: Record<string, number> = {};
      contacts.forEach(contact => {
        const date = format(parseISO(contact.created_at), 'yyyy-MM-dd');
        growthMap[date] = (growthMap[date] || 0) + 1;
      });
      let cumulativeCustomers = 0;
      const customerGrowth = Object.entries(growthMap)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([date, newCustomers]) => {
          cumulativeCustomers += newCustomers;
          return { date, newCustomers, totalCustomers: cumulativeCustomers };
        });

      // Top Products
      const productSales: Record<string, { name: string; sku: string; quantity: number; revenue: number; costPrice: number }> = {};
      orderItems.forEach(item => {
        const product = products.find(p => p.id === item.product_id);
        if (!product) return;
        if (!productSales[product.id]) {
          productSales[product.id] = {
            name: product.name || 'Unknown',
            sku: product.sku || '',
            quantity: 0,
            revenue: 0,
            costPrice: product.cost_price || 0,
          };
        }
        productSales[product.id].quantity += item.quantity || 0;
        productSales[product.id].revenue += (item.quantity || 0) * (item.unit_price || 0);
      });
      const topProducts = Object.entries(productSales)
        .map(([id, data]) => ({
          id,
          name: data.name,
          sku: data.sku,
          quantitySold: data.quantity,
          revenue: data.revenue,
          profit: data.revenue - (data.quantity * data.costPrice),
        }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);

      // Category Performance
      const categoryStats: Record<string, { revenue: number; unitsSold: number; products: Set<string> }> = {};
      orderItems.forEach(item => {
        const product = products.find(p => p.id === item.product_id);
        if (!product) return;
        const category = (product as any).category || 'Uncategorized';
        if (!categoryStats[category]) {
          categoryStats[category] = { revenue: 0, unitsSold: 0, products: new Set() };
        }
        categoryStats[category].revenue += (item.quantity || 0) * (item.unit_price || 0);
        categoryStats[category].unitsSold += item.quantity || 0;
        categoryStats[category].products.add(product.id);
      });
      const categoryPerformance = Object.entries(categoryStats).map(([category, data]) => ({
        category,
        revenue: data.revenue,
        unitsSold: data.unitsSold,
        products: data.products.size,
      }));

      // Complaint Analysis
      const complaintCategories: Record<string, { count: number; totalHours: number }> = {};
      complaints.forEach(complaint => {
        const category = complaint.category || 'General';
        if (!complaintCategories[category]) {
          complaintCategories[category] = { count: 0, totalHours: 0 };
        }
        complaintCategories[category].count++;
        if (complaint.resolved_at && complaint.created_at) {
          const hours = (new Date(complaint.resolved_at).getTime() - new Date(complaint.created_at).getTime()) / (1000 * 60 * 60);
          complaintCategories[category].totalHours += hours;
        }
      });
      const complaintAnalysis = Object.entries(complaintCategories).map(([category, data]) => ({
        category,
        count: data.count,
        avgResolutionHours: data.count > 0 ? data.totalHours / data.count : 0,
      }));

      // Delivery Performance
      const courierStats: Record<string, { shipped: number; delivered: number }> = {};
      orders.forEach(order => {
        const courier = order.courier || 'Unknown';
        if (!courierStats[courier]) courierStats[courier] = { shipped: 0, delivered: 0 };
        if (order.status === 'shipped' || order.status === 'delivered') courierStats[courier].shipped++;
        if (order.status === 'delivered') courierStats[courier].delivered++;
      });
      const deliveryPerformance = Object.entries(courierStats).map(([courier, data]) => ({
        courier,
        shipped: data.shipped,
        delivered: data.delivered,
        onTimeRate: data.shipped > 0 ? (data.delivered / data.shipped) * 100 : 0,
      }));

      // Profit & Loss
      const profitLoss = {
        revenue: totalRevenue,
        cogs,
        grossProfit,
        operatingExpenses,
        netProfit,
        profitMargin: totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0,
      };

      setData({
        summary,
        ordersByStatus,
        paymentStatus,
        revenueBySource,
        dailySales,
        expensesByCategory,
        monthlyCashFlow,
        topCustomers,
        customerRisk,
        customerGrowth,
        topProducts,
        categoryPerformance,
        complaintAnalysis,
        deliveryPerformance,
        profitLoss,
        previousPeriod,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch reports');
    } finally {
      setLoading(false);
    }
  }, [currentTenant?.id, startDate, endDate]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  return {
    loading,
    error,
    data,
    refetch: fetchReports,
  };
}
