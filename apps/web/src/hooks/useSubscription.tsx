import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/useTenant';

interface Subscription {
  id: string;
  tenant_id: string;
  plan_id: string;
  status: 'trialing' | 'active' | 'past_due' | 'suspended' | 'cancelled';
  current_period_start: string;
  current_period_end: string;
  trial_ends_at: string | null;
  grace_period_ends_at: string | null;
  cancelled_at: string | null;
  plan?: {
    id: string;
    name: string;
    price_monthly: number;
    price_yearly: number | null;
    max_instances: number;
    max_agents: number;
    max_messages_per_month: number;
    ai_enabled: boolean;
  };
}

interface UsageCounter {
  messages_sent: number;
  messages_received: number;
  ai_messages: number;
}

interface PendingPlan {
  id: string;
  name: string;
  price_monthly: number;
  price_yearly: number | null;
  max_instances: number;
  max_agents: number;
  max_messages_per_month: number;
  ai_enabled: boolean;
}

export function useSubscription() {
  const { currentTenant } = useTenant();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [usage, setUsage] = useState<UsageCounter | null>(null);
  const [pendingPlan, setPendingPlan] = useState<PendingPlan | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentTenant) {
      fetchSubscription();
    } else {
      setSubscription(null);
      setPendingPlan(null);
      setLoading(false);
    }
  }, [currentTenant?.id]);

  const fetchSubscription = async () => {
    if (!currentTenant) return;

    try {
      setLoading(true);

      // Fetch subscription with plan details
      const { data: sub, error: subError } = await supabase
        .from('subscriptions')
        .select(`
          *,
          resource_overrides,
          plan:plans (
            id,
            name,
            price_monthly,
            price_yearly,
            max_instances,
            max_agents,
            max_messages_per_month,
            ai_enabled
          )
        `)
        .eq('tenant_id', currentTenant.id)
        .maybeSingle();

      if (subError && subError.code !== 'PGRST116') {
        console.error('Error fetching subscription:', subError);
      }

      setSubscription(sub as Subscription | null);

      // If no subscription but tenant has pending_plan_id, fetch that plan
      if (!sub && currentTenant?.pending_plan_id) {
        const { data: planData } = await supabase
          .from('plans')
          .select('id, name, price_monthly, price_yearly, max_instances, max_agents, max_messages_per_month, ai_enabled')
          .eq('id', currentTenant.pending_plan_id)
          .single();
        
        setPendingPlan(planData as PendingPlan | null);
      } else {
        setPendingPlan(null);
      }

      // Fetch current month usage
      const today = new Date();
      const periodStart = new Date(today.getFullYear(), today.getMonth(), 1)
        .toISOString()
        .split('T')[0];

      const { data: usageData } = await supabase
        .from('usage_counters')
        .select('messages_sent, messages_received, ai_messages')
        .eq('tenant_id', currentTenant.id)
        .eq('period_start', periodStart)
        .maybeSingle();

      setUsage(usageData || { messages_sent: 0, messages_received: 0, ai_messages: 0 });
    } catch (error) {
      console.error('Subscription fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const isSuspended = subscription?.status === 'suspended';
  const isPastDue = subscription?.status === 'past_due';
  const isTrialing = subscription?.status === 'trialing';
  const isActive = subscription?.status === 'active';

  const canSendMessages = !isSuspended;
  const canUseAI = !isSuspended && subscription?.plan?.ai_enabled;

  const daysUntilExpiry = subscription?.current_period_end
    ? Math.ceil(
        (new Date(subscription.current_period_end).getTime() - Date.now()) /
          (1000 * 60 * 60 * 24)
      )
    : null;

  const trialDaysRemaining = subscription?.trial_ends_at
    ? Math.max(
        0,
        Math.ceil(
          (new Date(subscription.trial_ends_at).getTime() - Date.now()) /
            (1000 * 60 * 60 * 24)
        )
      )
    : null;

  // Apply resource overrides on top of the plan defaults
  const basePlan = subscription?.plan || pendingPlan;
  const overrides = (subscription as any)?.resource_overrides as Record<string, number> | null;
  
  const effectivePlan = basePlan ? {
    ...basePlan,
    max_instances: overrides?.max_instances ?? basePlan.max_instances,
    max_agents: overrides?.max_agents ?? basePlan.max_agents,
    max_messages_per_month: overrides?.max_messages_per_month ?? basePlan.max_messages_per_month,
    price_monthly: overrides?.custom_price_monthly ?? basePlan.price_monthly,
  } : null;

  return {
    subscription,
    usage,
    loading,
    isSuspended,
    isPastDue,
    isTrialing,
    isActive,
    canSendMessages,
    canUseAI,
    daysUntilExpiry,
    trialDaysRemaining,
    plan: effectivePlan,
    pendingPlan,
    refetch: fetchSubscription,
  };
}
