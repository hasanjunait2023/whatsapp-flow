import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Plan {
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
  features?: Record<string, boolean>;
}

export function usePlans(businessTypeId?: string | null) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchPlans = useCallback(async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('plans')
        .select('*')
        .eq('is_active', true);

      // Filter by business type if provided
      if (businessTypeId) {
        query = query.eq('business_type_id', businessTypeId);
      }

      const { data, error: fetchError } = await query.order('price_monthly', { ascending: true });

      if (fetchError) throw fetchError;
      setPlans((data || []).map(p => ({
        ...p,
        features: p.features as Record<string, boolean> | undefined,
      })));
      setError(null);
    } catch (err) {
      console.error('Error fetching plans:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch plans'));
    } finally {
      setLoading(false);
    }
  }, [businessTypeId]);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  return {
    plans,
    loading,
    error,
    refetch: fetchPlans,
  };
}
