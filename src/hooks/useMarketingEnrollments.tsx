import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface MarketingEnrollment {
  id: string;
  campaign_id: string;
  entity_type: 'lead' | 'tenant';
  entity_id: string;
  status: 'active' | 'paused' | 'completed' | 'unsubscribed';
  current_week: number;
  current_step: number;
  next_message_at: string | null;
  last_message_at: string | null;
  total_messages_sent: number;
  messages_this_week: number;
  messages_this_month: number;
  week_reset_at: string;
  month_reset_at: string;
  enrolled_at: string;
  completed_at: string | null;
  unsubscribed_at: string | null;
  metadata: Record<string, unknown>;
}

export interface MarketingEnrollmentInput {
  campaign_id: string;
  entity_type: 'lead' | 'tenant';
  entity_id: string;
  metadata?: Record<string, unknown>;
}

export function useMarketingEnrollments(campaignId?: string) {
  const [enrollments, setEnrollments] = useState<MarketingEnrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchEnrollments = useCallback(async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('admin_marketing_enrollments')
        .select('*')
        .order('enrolled_at', { ascending: false });

      if (campaignId) {
        query = query.eq('campaign_id', campaignId);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      setEnrollments(
        (data || []).map((e: any) => ({
          ...e,
          metadata: e.metadata || {},
        }))
      );
      setError(null);
    } catch (err) {
      console.error('Error fetching enrollments:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch enrollments'));
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    fetchEnrollments();
  }, [fetchEnrollments]);

  const enrollEntity = async (input: MarketingEnrollmentInput): Promise<MarketingEnrollment> => {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('admin_marketing_enrollments')
      .insert({
        campaign_id: input.campaign_id,
        entity_type: input.entity_type,
        entity_id: input.entity_id,
        status: 'active',
        current_week: 1,
        current_step: 0,
        messages_this_week: 0,
        messages_this_month: 0,
        week_reset_at: now,
        month_reset_at: now,
        metadata: input.metadata || {},
      } as any)
      .select()
      .single();

    if (error) throw error;
    await fetchEnrollments();
    return data as MarketingEnrollment;
  };

  const updateEnrollment = async (id: string, updates: Partial<MarketingEnrollment>) => {
    const { error } = await supabase
      .from('admin_marketing_enrollments')
      .update(updates as any)
      .eq('id', id);

    if (error) throw error;
    await fetchEnrollments();
  };

  const pauseEnrollment = async (id: string) => {
    await updateEnrollment(id, { status: 'paused' });
  };

  const resumeEnrollment = async (id: string) => {
    await updateEnrollment(id, { status: 'active' });
  };

  const unsubscribeEnrollment = async (id: string) => {
    await updateEnrollment(id, {
      status: 'unsubscribed',
      unsubscribed_at: new Date().toISOString(),
    });
  };

  const completeEnrollment = async (id: string) => {
    await updateEnrollment(id, {
      status: 'completed',
      completed_at: new Date().toISOString(),
    });
  };

  const getActiveEnrollments = () => {
    return enrollments.filter((e) => e.status === 'active');
  };

  const getEnrollmentsByEntity = (entityType: 'lead' | 'tenant', entityId: string) => {
    return enrollments.filter((e) => e.entity_type === entityType && e.entity_id === entityId);
  };

  const getEnrollmentStats = () => {
    const total = enrollments.length;
    const active = enrollments.filter((e) => e.status === 'active').length;
    const completed = enrollments.filter((e) => e.status === 'completed').length;
    const unsubscribed = enrollments.filter((e) => e.status === 'unsubscribed').length;
    const paused = enrollments.filter((e) => e.status === 'paused').length;

    return { total, active, completed, unsubscribed, paused };
  };

  return {
    enrollments,
    loading,
    error,
    refetch: fetchEnrollments,
    enrollEntity,
    updateEnrollment,
    pauseEnrollment,
    resumeEnrollment,
    unsubscribeEnrollment,
    completeEnrollment,
    getActiveEnrollments,
    getEnrollmentsByEntity,
    getEnrollmentStats,
  };
}
