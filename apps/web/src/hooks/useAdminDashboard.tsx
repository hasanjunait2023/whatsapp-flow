import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SystemStats {
  totalTenants: number;
  activeSubscriptions: number;
  trialSubscriptions: number;
  suspendedSubscriptions: number;
  pendingPayments: number;
  totalMessages: number;
  totalConversations: number;
  activeInstances: number;
  totalRevenue: number;
}

interface RevenueData {
  month: string;
  revenue: number;
}

interface SubscriptionTrendData {
  month: string;
  new: number;
  churned: number;
}

interface TopTenant {
  id: string;
  name: string;
  owner_email: string;
  subscription_status: string;
  message_count: number;
  instance_count: number;
}

interface TenantWithOverrides {
  id: string;
  name: string;
  plan_name: string | null;
  override_count: number;
  enabled_overrides: string[];
  disabled_overrides: string[];
}

export function useAdminDashboard() {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
  const [subscriptionTrends, setSubscriptionTrends] = useState<SubscriptionTrendData[]>([]);
  const [topTenants, setTopTenants] = useState<TopTenant[]>([]);
  const [tenantsWithOverrides, setTenantsWithOverrides] = useState<TenantWithOverrides[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);

      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      // BATCH 1: All count queries in parallel (head: true for speed)
      const [
        tenantsCount,
        pendingPaymentsCount,
        waMessagesCount,
        fbMessagesCount,
        waConversationsCount,
        fbConversationsCount,
        activeInstancesCount,
        subscriptionsResult,
        paymentsResult,
        tenantsResult,
      ] = await Promise.all([
        supabase.from('tenants').select('id', { count: 'exact', head: true }),
        supabase.from('payments').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('messages').select('id', { count: 'exact', head: true }).gte('created_at', startOfMonth.toISOString()),
        supabase.from('fb_messages').select('id', { count: 'exact', head: true }).gte('created_at', startOfMonth.toISOString()),
        supabase.from('contacts').select('id', { count: 'exact', head: true }).gte('last_message_at', startOfMonth.toISOString()),
        supabase.from('fb_contacts').select('id', { count: 'exact', head: true }).gte('last_message_at', startOfMonth.toISOString()),
        supabase.from('whatsapp_instances').select('id', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('subscriptions').select('status, created_at, cancelled_at'),
        supabase.from('payments').select('amount, created_at, status').eq('status', 'verified'),
        supabase.from('tenants').select('id, name, owner_id'),
      ]);

      const subscriptions = subscriptionsResult.data || [];
      const payments = paymentsResult.data || [];
      const tenantsData = tenantsResult.data || [];

      const activeSubscriptions = subscriptions.filter(s => s.status === 'active').length;
      const trialSubscriptions = subscriptions.filter(s => s.status === 'trialing').length;
      const suspendedSubscriptions = subscriptions.filter(s => s.status === 'suspended').length;
      const totalRevenue = payments.reduce((sum, p) => sum + Number(p.amount), 0);

      setStats({
        totalTenants: tenantsCount.count || 0,
        activeSubscriptions,
        trialSubscriptions,
        suspendedSubscriptions,
        pendingPayments: pendingPaymentsCount.count || 0,
        totalMessages: (waMessagesCount.count || 0) + (fbMessagesCount.count || 0),
        totalConversations: (waConversationsCount.count || 0) + (fbConversationsCount.count || 0),
        activeInstances: activeInstancesCount.count || 0,
        totalRevenue,
      });

      // Generate revenue data for last 6 months
      const months: string[] = [];
      const revenueByMonth: Record<string, number> = {};
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthKey = date.toLocaleString('default', { month: 'short' });
        months.push(monthKey);
        revenueByMonth[monthKey] = 0;
      }

      payments.forEach(p => {
        const monthKey = new Date(p.created_at).toLocaleString('default', { month: 'short' });
        if (revenueByMonth[monthKey] !== undefined) {
          revenueByMonth[monthKey] += Number(p.amount);
        }
      });

      setRevenueData(months.map(month => ({
        month,
        revenue: revenueByMonth[month] || 0,
      })));

      // Generate subscription trend data
      const subsByMonth: Record<string, { new: number; churned: number }> = {};
      months.forEach(m => {
        subsByMonth[m] = { new: 0, churned: 0 };
      });

      subscriptions.forEach(s => {
        const createdMonth = new Date(s.created_at).toLocaleString('default', { month: 'short' });
        if (subsByMonth[createdMonth]) {
          subsByMonth[createdMonth].new++;
        }
        if (s.cancelled_at) {
          const cancelledMonth = new Date(s.cancelled_at).toLocaleString('default', { month: 'short' });
          if (subsByMonth[cancelledMonth]) {
            subsByMonth[cancelledMonth].churned++;
          }
        }
      });

      setSubscriptionTrends(months.map(month => ({
        month,
        ...subsByMonth[month],
      })));

      // OPTIMIZED: Fetch top tenants using batch queries instead of N+1 loop
      if (tenantsData.length > 0) {
        const tenantIds = tenantsData.map(t => t.id);
        const ownerIds = tenantsData.map(t => t.owner_id).filter(Boolean);

        // Batch fetch all related data in parallel
        const [profilesResult, subscriptionsResult, messagesResult, instancesResult] = await Promise.all([
          ownerIds.length > 0 
            ? supabase.from('profiles').select('id, email').in('id', ownerIds)
            : { data: [] },
          supabase.from('subscriptions').select('tenant_id, status').in('tenant_id', tenantIds),
          supabase.from('messages').select('tenant_id').in('tenant_id', tenantIds).gte('created_at', startOfMonth.toISOString()),
          supabase.from('whatsapp_instances').select('tenant_id').in('tenant_id', tenantIds),
        ]);

        // Build lookup maps
        const profilesMap = new Map(((profilesResult.data || []) as { id: string; email: string }[]).map(p => [p.id, p]));
        const subscriptionsMap = new Map((subscriptionsResult.data || []).map(s => [s.tenant_id, s.status]));
        
        // Count messages and instances per tenant
        const messagesCountMap = new Map<string, number>();
        (messagesResult.data || []).forEach(m => {
          messagesCountMap.set(m.tenant_id, (messagesCountMap.get(m.tenant_id) || 0) + 1);
        });

        const instancesCountMap = new Map<string, number>();
        (instancesResult.data || []).forEach(i => {
          instancesCountMap.set(i.tenant_id, (instancesCountMap.get(i.tenant_id) || 0) + 1);
        });

        // Map tenants with enriched data
        const enrichedTenants: TopTenant[] = tenantsData.map(tenant => ({
          id: tenant.id,
          name: tenant.name,
          owner_email: profilesMap.get(tenant.owner_id)?.email || 'Unknown',
          subscription_status: subscriptionsMap.get(tenant.id) || 'none',
          message_count: messagesCountMap.get(tenant.id) || 0,
          instance_count: instancesCountMap.get(tenant.id) || 0,
        }));

        // Sort by message count and take top 5
        enrichedTenants.sort((a, b) => b.message_count - a.message_count);
        setTopTenants(enrichedTenants.slice(0, 5));
      }

      // Fetch tenants with feature overrides
      const { data: subscriptionsWithOverrides } = await supabase
        .from('subscriptions')
        .select('tenant_id, feature_overrides, plan:plans(name)')
        .not('feature_overrides', 'is', null);

      if (subscriptionsWithOverrides && subscriptionsWithOverrides.length > 0) {
        const tenantIds = subscriptionsWithOverrides.map(s => s.tenant_id);
        const { data: tenantNames } = await supabase
          .from('tenants')
          .select('id, name')
          .in('id', tenantIds);

        const tenantsMap = new Map(tenantNames?.map(t => [t.id, t.name]) || []);

        const overridesList: TenantWithOverrides[] = subscriptionsWithOverrides
          .filter(s => {
            const overrides = s.feature_overrides as Record<string, boolean> | null;
            return overrides && Object.keys(overrides).length > 0;
          })
          .map(s => {
            const overrides = s.feature_overrides as Record<string, boolean>;
            const enabled = Object.entries(overrides)
              .filter(([, v]) => v === true)
              .map(([k]) => k);
            const disabled = Object.entries(overrides)
              .filter(([, v]) => v === false)
              .map(([k]) => k);

            return {
              id: s.tenant_id,
              name: tenantsMap.get(s.tenant_id) || 'Unknown',
              plan_name: (s.plan as any)?.name || null,
              override_count: Object.keys(overrides).length,
              enabled_overrides: enabled,
              disabled_overrides: disabled,
            };
          })
          .sort((a, b) => b.override_count - a.override_count);

        setTenantsWithOverrides(overridesList);
      } else {
        setTenantsWithOverrides([]);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  return {
    stats,
    revenueData,
    subscriptionTrends,
    topTenants,
    tenantsWithOverrides,
    loading,
    refetch: fetchDashboardData,
  };
}
