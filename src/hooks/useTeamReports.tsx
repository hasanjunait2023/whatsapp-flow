import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { useToast } from '@/hooks/use-toast';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, differenceInMinutes } from 'date-fns';

export type ReportPeriod = 'today' | 'week' | 'month' | 'last7days' | 'last30days' | 'custom';

export interface TeamMemberStats {
  userId: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  role: 'owner' | 'manager' | 'agent';
  
  // Messaging metrics
  messagesSent: number;
  avgResponseTimeMinutes: number;
  
  // Customer handling
  customersAssigned: number;
  activeConversations: number;
  
  // Sales metrics
  ordersCreated: number;
  totalSalesAmount: number;
  avgOrderValue: number;
  
  // Parcel metrics
  parcelsBooked: number;
  
  // Complaints
  complaintsResolved: number;
  
  // Calculated KPIs
  conversionRate: number;
  kpiScore: number;
}

export interface TeamReportsSummary {
  totalTeamMembers: number;
  totalMessagesSent: number;
  totalOrdersCreated: number;
  totalSalesAmount: number;
  avgTeamResponseTime: number;
  topPerformer: TeamMemberStats | null;
}

export interface KPITarget {
  id: string;
  userId: string | null;
  metric: string;
  targetValue: number;
  period: string;
  isActive: boolean;
}

export interface ActivityLog {
  id: string;
  userId: string;
  userName: string;
  activityType: string;
  entityType: string | null;
  entityId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

function getDateRange(period: ReportPeriod, customStart?: Date, customEnd?: Date): { start: Date; end: Date } {
  const now = new Date();
  
  switch (period) {
    case 'today':
      return { start: startOfDay(now), end: endOfDay(now) };
    case 'week':
      return { start: startOfWeek(now), end: endOfWeek(now) };
    case 'month':
      return { start: startOfMonth(now), end: endOfMonth(now) };
    case 'last7days':
      return { start: startOfDay(subDays(now, 7)), end: endOfDay(now) };
    case 'last30days':
      return { start: startOfDay(subDays(now, 30)), end: endOfDay(now) };
    case 'custom':
      return { 
        start: customStart || startOfDay(subDays(now, 7)), 
        end: customEnd || endOfDay(now) 
      };
    default:
      return { start: startOfDay(now), end: endOfDay(now) };
  }
}

export function useTeamReports(period: ReportPeriod = 'today', customStart?: Date, customEnd?: Date) {
  const { currentTenant } = useTenantContext();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const tenantId = currentTenant?.id;

  const { start, end } = getDateRange(period, customStart, customEnd);
  const startISO = start.toISOString();
  const endISO = end.toISOString();

  // Fetch team members with their stats
  const { data: teamStats = [], isLoading: statsLoading } = useQuery({
    queryKey: ['team-reports', tenantId, period, startISO, endISO],
    queryFn: async () => {
      if (!tenantId) return [];

      // 1. Get all team members
      const { data: members, error: membersError } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .eq('tenant_id', tenantId);

      if (membersError) throw membersError;
      if (!members || members.length === 0) return [];

      const userIds = members.map(m => m.user_id);

      // 2. Get profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .in('id', userIds);

      const profilesMap = new Map(profiles?.map(p => [p.id, p]) || []);

      // 3. Get messages sent by each user in period
      const { data: messages } = await supabase
        .from('messages')
        .select('sent_by_user_id, sent_at, contact_id, direction')
        .eq('tenant_id', tenantId)
        .in('sent_by_user_id', userIds)
        .eq('direction', 'outbound')
        .gte('sent_at', startISO)
        .lte('sent_at', endISO);

      // Count messages per user
      const messageCountMap = new Map<string, number>();
      (messages || []).forEach(msg => {
        if (msg.sent_by_user_id) {
          messageCountMap.set(msg.sent_by_user_id, (messageCountMap.get(msg.sent_by_user_id) || 0) + 1);
        }
      });

      // 4. Get contacts assigned to each user
      const { data: contacts } = await supabase
        .from('contacts')
        .select('id, assigned_to, last_message_at')
        .eq('tenant_id', tenantId)
        .in('assigned_to', userIds);

      const assignedCountMap = new Map<string, number>();
      const activeConversationsMap = new Map<string, number>();
      const activeThreshold = subDays(new Date(), 1).toISOString();

      (contacts || []).forEach(contact => {
        if (contact.assigned_to) {
          assignedCountMap.set(contact.assigned_to, (assignedCountMap.get(contact.assigned_to) || 0) + 1);
          if (contact.last_message_at && contact.last_message_at > activeThreshold) {
            activeConversationsMap.set(contact.assigned_to, (activeConversationsMap.get(contact.assigned_to) || 0) + 1);
          }
        }
      });

      // 5. Get orders created by each user in period
      const { data: orders } = await supabase
        .from('orders')
        .select('id, created_by, total, payment_status, tracking_number')
        .eq('tenant_id', tenantId)
        .in('created_by', userIds)
        .gte('created_at', startISO)
        .lte('created_at', endISO);

      const ordersMap = new Map<string, { count: number; total: number; parcels: number }>();
      (orders || []).forEach(order => {
        if (order.created_by) {
          const current = ordersMap.get(order.created_by) || { count: 0, total: 0, parcels: 0 };
          current.count += 1;
          if (order.payment_status === 'paid') {
            current.total += order.total || 0;
          }
          if (order.tracking_number) {
            current.parcels += 1;
          }
          ordersMap.set(order.created_by, current);
        }
      });

      // 6. Get complaints resolved by each user in period
      const { data: complaints } = await supabase
        .from('complaints')
        .select('resolved_by')
        .eq('tenant_id', tenantId)
        .eq('status', 'resolved')
        .in('resolved_by', userIds)
        .gte('resolved_at', startISO)
        .lte('resolved_at', endISO);

      const complaintsMap = new Map<string, number>();
      (complaints || []).forEach(c => {
        if (c.resolved_by) {
          complaintsMap.set(c.resolved_by, (complaintsMap.get(c.resolved_by) || 0) + 1);
        }
      });

      // 7. Calculate response times (simplified - average time to first response)
      // This would need a more complex query in production
      const responseTimeMap = new Map<string, number>();
      // Default to 5 minutes for now - would be calculated from message pairs
      userIds.forEach(id => responseTimeMap.set(id, 5));

      // Build stats for each member
      const stats: TeamMemberStats[] = members.map(member => {
        const profile = profilesMap.get(member.user_id);
        const orderData = ordersMap.get(member.user_id) || { count: 0, total: 0, parcels: 0 };
        const messageCount = messageCountMap.get(member.user_id) || 0;
        const customersAssigned = assignedCountMap.get(member.user_id) || 0;

        const conversionRate = customersAssigned > 0 
          ? (orderData.count / customersAssigned) * 100 
          : 0;

        // Calculate KPI score (simplified)
        const kpiScore = Math.min(100, (
          (messageCount > 0 ? 25 : 0) +
          (orderData.count > 0 ? 25 : 0) +
          (conversionRate > 10 ? 25 : conversionRate * 2.5) +
          (responseTimeMap.get(member.user_id)! < 10 ? 25 : 15)
        ));

        return {
          userId: member.user_id,
          name: profile?.full_name || 'Unknown',
          email: profile?.email || '',
          avatarUrl: profile?.avatar_url || null,
          role: member.role as 'owner' | 'manager' | 'agent',
          messagesSent: messageCount,
          avgResponseTimeMinutes: responseTimeMap.get(member.user_id) || 0,
          customersAssigned,
          activeConversations: activeConversationsMap.get(member.user_id) || 0,
          ordersCreated: orderData.count,
          totalSalesAmount: orderData.total,
          avgOrderValue: orderData.count > 0 ? orderData.total / orderData.count : 0,
          parcelsBooked: orderData.parcels,
          complaintsResolved: complaintsMap.get(member.user_id) || 0,
          conversionRate,
          kpiScore,
        };
      });

      return stats.sort((a, b) => b.kpiScore - a.kpiScore);
    },
    enabled: !!tenantId,
  });

  // Calculate summary
  const summary: TeamReportsSummary = {
    totalTeamMembers: teamStats.length,
    totalMessagesSent: teamStats.reduce((sum, m) => sum + m.messagesSent, 0),
    totalOrdersCreated: teamStats.reduce((sum, m) => sum + m.ordersCreated, 0),
    totalSalesAmount: teamStats.reduce((sum, m) => sum + m.totalSalesAmount, 0),
    avgTeamResponseTime: teamStats.length > 0 
      ? teamStats.reduce((sum, m) => sum + m.avgResponseTimeMinutes, 0) / teamStats.length 
      : 0,
    topPerformer: teamStats[0] || null,
  };

  // Fetch KPI targets
  const { data: kpiTargets = [], isLoading: targetsLoading } = useQuery({
    queryKey: ['kpi-targets', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      const { data, error } = await supabase
        .from('team_kpi_targets')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('is_active', true);

      if (error) throw error;

      return (data || []).map(t => ({
        id: t.id,
        userId: t.user_id,
        metric: t.metric,
        targetValue: Number(t.target_value),
        period: t.period,
        isActive: t.is_active,
      })) as KPITarget[];
    },
    enabled: !!tenantId,
  });

  // Fetch activity logs
  const { data: activityLogs = [], isLoading: logsLoading } = useQuery({
    queryKey: ['team-activity-logs', tenantId, startISO, endISO],
    queryFn: async () => {
      if (!tenantId) return [];

      const { data, error } = await supabase
        .from('team_activity_logs')
        .select('*')
        .eq('tenant_id', tenantId)
        .gte('created_at', startISO)
        .lte('created_at', endISO)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      // Get user names
      const userIds = [...new Set((data || []).map(l => l.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds);

      const profilesMap = new Map(profiles?.map(p => [p.id, p.full_name || 'Unknown']) || []);

      return (data || []).map(log => ({
        id: log.id,
        userId: log.user_id,
        userName: profilesMap.get(log.user_id) || 'Unknown',
        activityType: log.activity_type,
        entityType: log.entity_type,
        entityId: log.entity_id,
        metadata: (log.metadata as Record<string, unknown>) || {},
        createdAt: log.created_at,
      })) as ActivityLog[];
    },
    enabled: !!tenantId,
  });

  // Set KPI target mutation
  const setKPITarget = useMutation({
    mutationFn: async (target: { metric: string; targetValue: number; period: string; userId?: string }) => {
      if (!tenantId) throw new Error('No tenant selected');

      const { error } = await supabase
        .from('team_kpi_targets')
        .upsert({
          tenant_id: tenantId,
          user_id: target.userId || null,
          metric: target.metric,
          target_value: target.targetValue,
          period: target.period,
          is_active: true,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kpi-targets', tenantId] });
      toast({ title: 'KPI target saved' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to save KPI target', description: error.message, variant: 'destructive' });
    },
  });

  // Delete KPI target
  const deleteKPITarget = useMutation({
    mutationFn: async (targetId: string) => {
      const { error } = await supabase
        .from('team_kpi_targets')
        .delete()
        .eq('id', targetId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kpi-targets', tenantId] });
      toast({ title: 'KPI target deleted' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to delete KPI target', description: error.message, variant: 'destructive' });
    },
  });

  // Log activity helper
  const logActivity = async (
    activityType: string,
    entityType?: string,
    entityId?: string,
    metadata?: Record<string, unknown>
  ) => {
    if (!tenantId) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const insertData = {
      tenant_id: tenantId as string,
      user_id: user.id,
      activity_type: activityType,
      entity_type: entityType || null,
      entity_id: entityId || null,
      metadata: (metadata || {}) as Record<string, unknown> | null,
    };

    await supabase.from('team_activity_logs').insert(insertData as any);
  };

  return {
    teamStats,
    summary,
    kpiTargets,
    activityLogs,
    isLoading: statsLoading || targetsLoading || logsLoading,
    setKPITarget,
    deleteKPITarget,
    logActivity,
  };
}
