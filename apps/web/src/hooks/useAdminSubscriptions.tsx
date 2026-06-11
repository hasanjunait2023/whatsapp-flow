import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';

type SubscriptionStatus = Database['public']['Enums']['subscription_status'];

export interface AdminSubscription {
  id: string;
  tenant_id: string;
  tenant_name: string;
  plan_id: string;
  plan_name: string;
  status: SubscriptionStatus;
  current_period_start: string;
  current_period_end: string;
  trial_ends_at: string | null;
  created_at: string;
}

export function useAdminSubscriptions() {
  const [subscriptions, setSubscriptions] = useState<AdminSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchSubscriptions = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error: subscriptionsError } = await supabase
        .from('subscriptions')
        .select(`
          id,
          tenant_id,
          plan_id,
          status,
          current_period_start,
          current_period_end,
          trial_ends_at,
          created_at,
          tenant:tenants(name),
          plan:plans(name)
        `)
        .order('created_at', { ascending: false });

      if (subscriptionsError) throw subscriptionsError;

      const enriched = (data || []).map((sub) => ({
        ...sub,
        tenant_name: (sub.tenant as any)?.name || 'Unknown',
        plan_name: (sub.plan as any)?.name || 'Unknown',
      }));

      setSubscriptions(enriched);
    } catch (err) {
      setError(err as Error);
      console.error('Error fetching subscriptions:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubscriptions();
  }, [fetchSubscriptions]);

  const updateStatus = async (subscriptionId: string, status: SubscriptionStatus) => {
    const { error } = await supabase
      .from('subscriptions')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', subscriptionId);

    if (error) throw error;
    await fetchSubscriptions();
  };

  const updatePlan = async (subscriptionId: string, planId: string) => {
    const { error } = await supabase
      .from('subscriptions')
      .update({ plan_id: planId, updated_at: new Date().toISOString() })
      .eq('id', subscriptionId);

    if (error) throw error;
    await fetchSubscriptions();
  };

  const extendSubscription = async (subscriptionId: string, days: number) => {
    const subscription = subscriptions.find((s) => s.id === subscriptionId);
    if (!subscription) throw new Error('Subscription not found');

    const currentEnd = new Date(subscription.current_period_end);
    currentEnd.setDate(currentEnd.getDate() + days);

    const { error } = await supabase
      .from('subscriptions')
      .update({
        current_period_end: currentEnd.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', subscriptionId);

    if (error) throw error;
    await fetchSubscriptions();
  };

  const bulkUpdateStatus = async (subscriptionIds: string[], status: SubscriptionStatus) => {
    const { error } = await supabase
      .from('subscriptions')
      .update({ status, updated_at: new Date().toISOString() })
      .in('id', subscriptionIds);

    if (error) throw error;
    await fetchSubscriptions();
  };

  const bulkChangePlan = async (subscriptionIds: string[], planId: string) => {
    const { error } = await supabase
      .from('subscriptions')
      .update({ plan_id: planId, updated_at: new Date().toISOString() })
      .in('id', subscriptionIds);

    if (error) throw error;
    await fetchSubscriptions();
  };

  const bulkExtendSubscriptions = async (subscriptionIds: string[], days: number) => {
    // Fetch all subscriptions to extend and update them one by one
    // because each has a different current_period_end
    const toExtend = subscriptions.filter((s) => subscriptionIds.includes(s.id));
    
    for (const sub of toExtend) {
      const currentEnd = new Date(sub.current_period_end);
      currentEnd.setDate(currentEnd.getDate() + days);

      await supabase
        .from('subscriptions')
        .update({
          current_period_end: currentEnd.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', sub.id);
    }

    await fetchSubscriptions();
  };

  return {
    subscriptions,
    loading,
    error,
    refetch: fetchSubscriptions,
    updateStatus,
    updatePlan,
    extendSubscription,
    bulkUpdateStatus,
    bulkChangePlan,
    bulkExtendSubscriptions,
  };
}
