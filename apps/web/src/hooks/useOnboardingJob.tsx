import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/useTenant';

export type OnboardingStatus = 
  | 'pending' 
  | 'creating_session' 
  | 'connecting' 
  | 'awaiting_scan' 
  | 'connected' 
  | 'failed' 
  | 'cancelled';

export interface OnboardingJob {
  id: string;
  tenant_id: string;
  instance_id: string | null;
  status: OnboardingStatus;
  step: string | null;
  error_message: string | null;
  retry_count: number;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export function useOnboardingJob() {
  const { currentTenant } = useTenant();
  const [job, setJob] = useState<OnboardingJob | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchJob = useCallback(async () => {
    if (!currentTenant?.id) {
      setJob(null);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('onboarding_jobs')
        .select('*')
        .eq('tenant_id', currentTenant.id)
        .in('status', ['pending', 'creating_session', 'connecting', 'awaiting_scan'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      setJob(data as OnboardingJob | null);
    } catch (err) {
      console.error('Error fetching onboarding job:', err);
    } finally {
      setLoading(false);
    }
  }, [currentTenant?.id]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!currentTenant?.id) return;

    fetchJob();

    const channel = supabase
      .channel(`onboarding-job-${currentTenant.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'onboarding_jobs',
          filter: `tenant_id=eq.${currentTenant.id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            setJob(payload.new as OnboardingJob);
          } else if (payload.eventType === 'DELETE') {
            setJob(null);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentTenant?.id, fetchJob]);

  const cancelJob = useCallback(async () => {
    if (!job?.id) return;

    try {
      await supabase
        .from('onboarding_jobs')
        .update({ status: 'cancelled' })
        .eq('id', job.id);

      setJob(null);
    } catch (err) {
      console.error('Error cancelling job:', err);
    }
  }, [job?.id]);

  const isInProgress = job && ['pending', 'creating_session', 'connecting', 'awaiting_scan'].includes(job.status);

  return {
    job,
    loading,
    isInProgress,
    cancelJob,
    refetch: fetchJob,
  };
}
