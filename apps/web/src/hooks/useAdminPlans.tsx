import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface AdminPlan {
  id: string;
  name: string;
  description: string | null;
  price_monthly: number;
  price_yearly: number | null;
  max_instances: number;
  max_agents: number;
  max_messages_per_month: number;
  ai_enabled: boolean;
  is_active: boolean;
  created_at: string;
  subscriber_count: number;
  business_type_id: string | null;
  tier: 'starter' | 'growth' | 'pro' | null;
  tier_order: number | null;
}

export interface PlanInput {
  name: string;
  description?: string;
  price_monthly: number;
  price_yearly?: number;
  max_instances: number;
  max_agents: number;
  max_messages_per_month: number;
  ai_enabled: boolean;
  is_active: boolean;
  business_type_id?: string;
  tier?: 'starter' | 'growth' | 'pro';
  tier_order?: number;
}

export function useAdminPlans() {
  const [plans, setPlans] = useState<AdminPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchPlans = useCallback(async () => {
    setLoading(true);
    try {
      const { data: plansData, error: plansError } = await supabase
        .from('plans')
        .select('*')
        .order('price_monthly', { ascending: true });

      if (plansError) throw plansError;

      // Get subscriber count for each plan
      const enrichedPlans = await Promise.all(
        (plansData || []).map(async (plan) => {
          const { count } = await supabase
            .from('subscriptions')
            .select('id', { count: 'exact', head: true })
            .eq('plan_id', plan.id);

          return {
            ...plan,
            tier: plan.tier as 'starter' | 'growth' | 'pro' | null,
            subscriber_count: count || 0,
          };
        })
      );

      setPlans(enrichedPlans as AdminPlan[]);
    } catch (err) {
      setError(err as Error);
      console.error('Error fetching plans:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const createPlan = async (input: PlanInput) => {
    const { error } = await supabase.from('plans').insert(input);
    if (error) throw error;
    await fetchPlans();
  };

  const updatePlan = async (planId: string, input: Partial<PlanInput>) => {
    const { error } = await supabase
      .from('plans')
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq('id', planId);

    if (error) throw error;
    await fetchPlans();
  };

  const togglePlanActive = async (planId: string, isActive: boolean) => {
    const { error } = await supabase
      .from('plans')
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq('id', planId);

    if (error) throw error;
    await fetchPlans();
  };

  return {
    plans,
    loading,
    error,
    refetch: fetchPlans,
    createPlan,
    updatePlan,
    togglePlanActive,
  };
}
