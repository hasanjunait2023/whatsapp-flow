import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/useTenant';
import { startOfDay, startOfWeek, startOfMonth, subDays, subWeeks, format } from 'date-fns';

interface OrderStats {
  ordersToday: number;
  ordersTodayChange: number;
  pendingOrders: number;
  confirmedOrders: number;
  shippedOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  revenueToday: number;
  revenueTodayChange: number;
  monthlyRevenue: number;
  monthlyRevenueChange: number;
  collectionRate: number;
}

interface MessageStats {
  messagesToday: number;
  messagesTodayChange: number;
  conversationsToday: number;
  conversationsTodayChange: number;
  unreadMessages: number;
  avgResponseTime: number;
}

interface TeamStats {
  activeAgents: number;
  totalAgents: number;
  topPerformers: Array<{
    id: string;
    name: string;
    ordersToday: number;
    messagesToday: number;
  }>;
}

interface CustomerStats {
  totalContacts: number;
  newCustomersThisWeek: number;
  newCustomersLastWeek: number;
}

interface ComplaintStats {
  openComplaints: number;
  resolvedToday: number;
  avgResolutionTime: number;
}

interface AttentionItem {
  type: 'order' | 'complaint' | 'instance' | 'message';
  message: string;
  count: number;
  severity: 'warning' | 'error' | 'info';
}

interface DailyRevenue {
  date: string;
  revenue: number;
  orders: number;
}

export interface DashboardAnalytics {
  orders: OrderStats;
  messages: MessageStats;
  team: TeamStats;
  customers: CustomerStats;
  complaints: ComplaintStats;
  attentionItems: AttentionItem[];
  revenueHistory: DailyRevenue[];
  loading: boolean;
}

const defaultOrderStats: OrderStats = {
  ordersToday: 0,
  ordersTodayChange: 0,
  pendingOrders: 0,
  confirmedOrders: 0,
  shippedOrders: 0,
  deliveredOrders: 0,
  cancelledOrders: 0,
  revenueToday: 0,
  revenueTodayChange: 0,
  monthlyRevenue: 0,
  monthlyRevenueChange: 0,
  collectionRate: 0,
};

const defaultMessageStats: MessageStats = {
  messagesToday: 0,
  messagesTodayChange: 0,
  conversationsToday: 0,
  conversationsTodayChange: 0,
  unreadMessages: 0,
  avgResponseTime: 0,
};

const defaultTeamStats: TeamStats = {
  activeAgents: 0,
  totalAgents: 0,
  topPerformers: [],
};

const defaultCustomerStats: CustomerStats = {
  totalContacts: 0,
  newCustomersThisWeek: 0,
  newCustomersLastWeek: 0,
};

const defaultComplaintStats: ComplaintStats = {
  openComplaints: 0,
  resolvedToday: 0,
  avgResolutionTime: 0,
};

// Helper functions for fetching data
async function fetchOrderStats(tenantId: string): Promise<OrderStats> {
  const today = startOfDay(new Date());
  const yesterday = startOfDay(subDays(new Date(), 1));
  const monthStart = startOfMonth(new Date());
  const lastMonthStart = startOfMonth(subDays(monthStart, 1));

  const [
    { count: ordersTodayCount },
    { count: ordersYesterdayCount },
    { count: pendingCount },
    { count: confirmedCount },
    { count: shippedCount },
    { count: deliveredCount },
    { count: cancelledCount },
    { count: paidCount },
    { count: totalCount },
    { data: revenueTodayData },
    { data: revenueYesterdayData },
    { data: revenueThisMonthData },
    { data: revenueLastMonthData },
  ] = await Promise.all([
    supabase.from('orders').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).gte('created_at', today.toISOString()),
    supabase.from('orders').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).gte('created_at', yesterday.toISOString()).lt('created_at', today.toISOString()),
    supabase.from('orders').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('status', 'pending'),
    supabase.from('orders').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('status', 'confirmed'),
    supabase.from('orders').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('status', 'shipped'),
    supabase.from('orders').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('status', 'delivered'),
    supabase.from('orders').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('status', 'cancelled'),
    supabase.from('orders').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('payment_status', 'paid'),
    supabase.from('orders').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId),
    supabase.from('orders').select('total').eq('tenant_id', tenantId).gte('created_at', today.toISOString()),
    supabase.from('orders').select('total').eq('tenant_id', tenantId).gte('created_at', yesterday.toISOString()).lt('created_at', today.toISOString()),
    supabase.from('orders').select('total').eq('tenant_id', tenantId).gte('created_at', monthStart.toISOString()),
    supabase.from('orders').select('total').eq('tenant_id', tenantId).gte('created_at', lastMonthStart.toISOString()).lt('created_at', monthStart.toISOString()),
  ]);

  const revenueToday = (revenueTodayData || []).reduce((sum, o) => sum + (o.total || 0), 0);
  const revenueYesterday = (revenueYesterdayData || []).reduce((sum, o) => sum + (o.total || 0), 0);
  const monthlyRevenue = (revenueThisMonthData || []).reduce((sum, o) => sum + (o.total || 0), 0);
  const lastMonthRevenue = (revenueLastMonthData || []).reduce((sum, o) => sum + (o.total || 0), 0);

  const collectionRate = (totalCount || 0) > 0 
    ? Math.round(((paidCount || 0) / (totalCount || 1)) * 100) 
    : 0;

  return {
    ordersToday: ordersTodayCount || 0,
    ordersTodayChange: (ordersYesterdayCount || 0) > 0 
      ? Math.round((((ordersTodayCount || 0) - (ordersYesterdayCount || 0)) / (ordersYesterdayCount || 1)) * 100)
      : 0,
    pendingOrders: pendingCount || 0,
    confirmedOrders: confirmedCount || 0,
    shippedOrders: shippedCount || 0,
    deliveredOrders: deliveredCount || 0,
    cancelledOrders: cancelledCount || 0,
    revenueToday,
    revenueTodayChange: revenueYesterday > 0
      ? Math.round(((revenueToday - revenueYesterday) / revenueYesterday) * 100)
      : 0,
    monthlyRevenue,
    monthlyRevenueChange: lastMonthRevenue > 0
      ? Math.round(((monthlyRevenue - lastMonthRevenue) / lastMonthRevenue) * 100)
      : 0,
    collectionRate,
  };
}

async function fetchMessageStats(tenantId: string): Promise<MessageStats> {
  const today = startOfDay(new Date());
  const yesterday = startOfDay(subDays(new Date(), 1));

  const [
    { count: waTodayCount },
    { count: waYesterdayCount },
    { count: fbTodayCount },
    { count: fbYesterdayCount },
    { count: waConversationsToday },
    { count: waConversationsYesterday },
    { count: fbConversationsToday },
    { count: fbConversationsYesterday },
    { data: waContacts },
    { data: fbContacts },
  ] = await Promise.all([
    supabase.from('messages').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).gte('sent_at', today.toISOString()),
    supabase.from('messages').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).gte('sent_at', yesterday.toISOString()).lt('sent_at', today.toISOString()),
    supabase.from('fb_messages').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).gte('sent_at', today.toISOString()),
    supabase.from('fb_messages').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).gte('sent_at', yesterday.toISOString()).lt('sent_at', today.toISOString()),
    supabase.from('contacts').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).gte('last_message_at', today.toISOString()),
    supabase.from('contacts').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).gte('last_message_at', yesterday.toISOString()).lt('last_message_at', today.toISOString()),
    supabase.from('fb_contacts').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).gte('last_message_at', today.toISOString()),
    supabase.from('fb_contacts').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).gte('last_message_at', yesterday.toISOString()).lt('last_message_at', today.toISOString()),
    supabase.from('contacts').select('unread_count').eq('tenant_id', tenantId).gt('unread_count', 0),
    supabase.from('fb_contacts').select('unread_count').eq('tenant_id', tenantId).gt('unread_count', 0),
  ]);

  const todayCount = (waTodayCount || 0) + (fbTodayCount || 0);
  const yesterdayCount = (waYesterdayCount || 0) + (fbYesterdayCount || 0);
  const conversationsToday = (waConversationsToday || 0) + (fbConversationsToday || 0);
  const conversationsYesterday = (waConversationsYesterday || 0) + (fbConversationsYesterday || 0);

  const waUnread = (waContacts || []).reduce((sum, c) => sum + (c.unread_count || 0), 0);
  const fbUnread = (fbContacts || []).reduce((sum, c) => sum + (c.unread_count || 0), 0);

  return {
    messagesToday: todayCount,
    messagesTodayChange: yesterdayCount > 0
      ? Math.round(((todayCount - yesterdayCount) / yesterdayCount) * 100)
      : 0,
    conversationsToday,
    conversationsTodayChange: conversationsYesterday > 0
      ? Math.round(((conversationsToday - conversationsYesterday) / conversationsYesterday) * 100)
      : 0,
    unreadMessages: waUnread + fbUnread,
    avgResponseTime: 5,
  };
}

async function fetchTeamStats(tenantId: string): Promise<TeamStats> {
  const today = startOfDay(new Date());

  const { data: teamRoles } = await supabase
    .from('user_roles')
    .select('user_id, role')
    .eq('tenant_id', tenantId);

  const userIds = teamRoles?.map(r => r.user_id) || [];
  const { data: profilesData } = userIds.length > 0 
    ? await supabase.from('profiles').select('id, full_name').in('id', userIds)
    : { data: [] };

  const profilesMap = new Map((profilesData || []).map(p => [p.id, p]));
  const teamMembers = (teamRoles || []).map(tm => ({
    ...tm,
    profiles: profilesMap.get(tm.user_id) || null,
  }));

  const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
  const { data: presenceData } = await supabase
    .from('user_presence')
    .select('user_id, status, last_seen_at')
    .eq('tenant_id', tenantId)
    .gte('last_seen_at', twoMinutesAgo);

  const activeAgentIds = new Set(
    (presenceData || [])
      .filter(p => p.status === 'online' || p.status === 'away')
      .map(p => p.user_id)
  );

  const [{ data: todayOrders }, { data: todayMessages }] = await Promise.all([
    supabase.from('orders').select('created_by').eq('tenant_id', tenantId).gte('created_at', today.toISOString()),
    supabase.from('messages').select('sent_by_user_id').eq('tenant_id', tenantId).eq('direction', 'outbound').gte('sent_at', today.toISOString()),
  ]);

  const ordersByUser: Record<string, number> = {};
  const messagesByUser: Record<string, number> = {};

  todayOrders?.forEach(o => {
    if (o.created_by) ordersByUser[o.created_by] = (ordersByUser[o.created_by] || 0) + 1;
  });

  todayMessages?.forEach(m => {
    if (m.sent_by_user_id) messagesByUser[m.sent_by_user_id] = (messagesByUser[m.sent_by_user_id] || 0) + 1;
  });

  const topPerformers = teamMembers
    .map(tm => ({
      id: tm.user_id,
      name: (tm.profiles as any)?.full_name || 'Unknown',
      ordersToday: ordersByUser[tm.user_id] || 0,
      messagesToday: messagesByUser[tm.user_id] || 0,
    }))
    .sort((a, b) => (b.ordersToday + b.messagesToday) - (a.ordersToday + a.messagesToday))
    .slice(0, 5);

  return {
    activeAgents: activeAgentIds.size,
    totalAgents: teamMembers.length,
    topPerformers,
  };
}

async function fetchCustomerStats(tenantId: string): Promise<CustomerStats> {
  const weekStart = startOfWeek(new Date());
  const lastWeekStart = startOfWeek(subWeeks(new Date(), 1));

  const [{ count: totalCount }, { count: thisWeekCount }, { count: lastWeekCount }] = await Promise.all([
    supabase.from('contacts').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId),
    supabase.from('contacts').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).gte('created_at', weekStart.toISOString()),
    supabase.from('contacts').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).gte('created_at', lastWeekStart.toISOString()).lt('created_at', weekStart.toISOString()),
  ]);

  return {
    totalContacts: totalCount || 0,
    newCustomersThisWeek: thisWeekCount || 0,
    newCustomersLastWeek: lastWeekCount || 0,
  };
}

async function fetchComplaintStats(tenantId: string): Promise<ComplaintStats> {
  const today = startOfDay(new Date());

  const { data: allComplaints } = await supabase
    .from('complaints')
    .select('id, status, resolved_at, created_at')
    .eq('tenant_id', tenantId);

  const openComplaints = allComplaints?.filter(c => 
    c.status === 'open' || c.status === 'in_progress'
  ).length || 0;

  const resolvedToday = allComplaints?.filter(c => 
    c.resolved_at && new Date(c.resolved_at) >= today
  ).length || 0;

  return { openComplaints, resolvedToday, avgResolutionTime: 24 };
}

async function fetchRevenueHistory(tenantId: string): Promise<DailyRevenue[]> {
  const days = 7;
  const sevenDaysAgo = startOfDay(subDays(new Date(), days - 1));

  const { data: orders } = await supabase
    .from('orders')
    .select('id, total, created_at')
    .eq('tenant_id', tenantId)
    .gte('created_at', sevenDaysAgo.toISOString())
    .order('created_at', { ascending: true });

  const revenueByDay: Record<string, { revenue: number; orders: number }> = {};
  for (let i = days - 1; i >= 0; i--) {
    const dateKey = format(subDays(new Date(), i), 'EEE');
    revenueByDay[dateKey] = { revenue: 0, orders: 0 };
  }

  (orders || []).forEach(order => {
    const dateKey = format(new Date(order.created_at), 'EEE');
    if (revenueByDay[dateKey]) {
      revenueByDay[dateKey].revenue += order.total || 0;
      revenueByDay[dateKey].orders += 1;
    }
  });

  const history: DailyRevenue[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = subDays(new Date(), i);
    const dateKey = format(date, 'EEE');
    history.push({
      date: dateKey,
      revenue: revenueByDay[dateKey]?.revenue || 0,
      orders: revenueByDay[dateKey]?.orders || 0,
    });
  }

  return history;
}

async function fetchAttentionItems(tenantId: string): Promise<AttentionItem[]> {
  const items: AttentionItem[] = [];
  const yesterday = subDays(new Date(), 1);

  const [
    { count: oldPendingOrders },
    { count: openComplaints },
    { count: disconnectedInstances },
    { data: waContacts },
    { data: fbContacts },
  ] = await Promise.all([
    supabase.from('orders').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('status', 'pending').lt('created_at', yesterday.toISOString()),
    supabase.from('complaints').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).in('status', ['open', 'in_progress']),
    supabase.from('whatsapp_instances').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('status', 'disconnected').eq('is_deleted', false),
    supabase.from('contacts').select('unread_count').eq('tenant_id', tenantId).gt('unread_count', 0),
    supabase.from('fb_contacts').select('unread_count').eq('tenant_id', tenantId).gt('unread_count', 0),
  ]);

  if (oldPendingOrders && oldPendingOrders > 0) {
    items.push({
      type: 'order',
      message: `${oldPendingOrders} pending order${oldPendingOrders > 1 ? 's' : ''} older than 24 hours`,
      count: oldPendingOrders,
      severity: 'warning',
    });
  }

  if (openComplaints && openComplaints > 0) {
    items.push({
      type: 'complaint',
      message: `${openComplaints} unresolved complaint${openComplaints > 1 ? 's' : ''}`,
      count: openComplaints,
      severity: openComplaints > 5 ? 'error' : 'warning',
    });
  }

  if (disconnectedInstances && disconnectedInstances > 0) {
    items.push({
      type: 'instance',
      message: `${disconnectedInstances} WhatsApp instance${disconnectedInstances > 1 ? 's' : ''} disconnected`,
      count: disconnectedInstances,
      severity: 'error',
    });
  }

  const totalUnread = (waContacts || []).reduce((sum, c) => sum + (c.unread_count || 0), 0) +
                      (fbContacts || []).reduce((sum, c) => sum + (c.unread_count || 0), 0);

  if (totalUnread > 10) {
    items.push({
      type: 'message',
      message: `${totalUnread} unread messages waiting for response`,
      count: totalUnread,
      severity: 'info',
    });
  }

  return items;
}

export function useDashboardAnalytics() {
  const { currentTenant } = useTenant();
  const queryClient = useQueryClient();

  const queryKey = ['dashboard-analytics', currentTenant?.id];

  const { data, isLoading: loading, error } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!currentTenant?.id) {
        return {
          orders: defaultOrderStats,
          messages: defaultMessageStats,
          team: defaultTeamStats,
          customers: defaultCustomerStats,
          complaints: defaultComplaintStats,
          attentionItems: [],
          revenueHistory: [],
        };
      }

      const [orders, messages, team, customers, complaints, revenueHistory, attentionItems] = await Promise.all([
        fetchOrderStats(currentTenant.id),
        fetchMessageStats(currentTenant.id),
        fetchTeamStats(currentTenant.id),
        fetchCustomerStats(currentTenant.id),
        fetchComplaintStats(currentTenant.id),
        fetchRevenueHistory(currentTenant.id),
        fetchAttentionItems(currentTenant.id),
      ]);

      return { orders, messages, team, customers, complaints, attentionItems, revenueHistory };
    },
    enabled: !!currentTenant?.id,
    staleTime: 1000 * 60 * 2, // 2 minutes - dashboard data can be slightly stale
  });

  return {
    orders: data?.orders ?? defaultOrderStats,
    messages: data?.messages ?? defaultMessageStats,
    team: data?.team ?? defaultTeamStats,
    customers: data?.customers ?? defaultCustomerStats,
    complaints: data?.complaints ?? defaultComplaintStats,
    attentionItems: data?.attentionItems ?? [],
    revenueHistory: data?.revenueHistory ?? [],
    loading,
    error: error as Error | null,
    refetch: () => queryClient.invalidateQueries({ queryKey }),
  };
}
