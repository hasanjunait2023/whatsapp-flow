import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/useTenant';

export interface QueueItem {
  id: string;
  tenant_id: string;
  group_id: string;
  phone_numbers: string[];
  batch_size: number;
  interval_minutes: number;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'paused';
  scheduled_for: string;
  processed_count: number;
  failed_count: number;
  error_log: any[];
  created_by: string | null;
  created_at: string;
  completed_at: string | null;
  group?: {
    id: string;
    name: string;
  };
}

export function useGroupQueue() {
  const { currentTenant: tenant } = useTenant();
  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchQueue = useCallback(async () => {
    if (!tenant?.id) return;

    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('group_add_queue')
        .select(`
          *,
          group:whatsapp_groups(id, name)
        `)
        .eq('tenant_id', tenant.id)
        .order('scheduled_for', { ascending: true })
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      
      // Cast the data to handle the JSON array type
      const typedData = (data || []).map(item => ({
        ...item,
        status: item.status as QueueItem['status'],
        phone_numbers: item.phone_numbers as string[],
        error_log: (item.error_log as any[]) || [],
      }));
      
      setQueueItems(typedData);
    } catch (err) {
      console.error('Error fetching queue:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch queue'));
    } finally {
      setLoading(false);
    }
  }, [tenant?.id]);

  useEffect(() => {
    if (tenant?.id) {
      fetchQueue();
    }
  }, [tenant?.id, fetchQueue]);

  const pauseQueue = async (queueId: string) => {
    const { error } = await supabase
      .from('group_add_queue')
      .update({ status: 'paused' })
      .eq('id', queueId);

    if (error) throw error;
    await fetchQueue();
  };

  const resumeQueue = async (queueId: string) => {
    const { error } = await supabase
      .from('group_add_queue')
      .update({ status: 'pending' })
      .eq('id', queueId);

    if (error) throw error;
    await fetchQueue();
  };

  const cancelQueue = async (queueId: string) => {
    const { error } = await supabase
      .from('group_add_queue')
      .delete()
      .eq('id', queueId);

    if (error) throw error;
    await fetchQueue();
  };

  const getPendingCount = () => {
    return queueItems.filter(q => q.status === 'pending' || q.status === 'processing').length;
  };

  const getTotalPendingNumbers = () => {
    return queueItems
      .filter(q => q.status === 'pending' || q.status === 'processing')
      .reduce((sum, q) => sum + (q.phone_numbers.length - q.processed_count), 0);
  };

  return {
    queueItems,
    loading,
    error,
    refetch: fetchQueue,
    pauseQueue,
    resumeQueue,
    cancelQueue,
    getPendingCount,
    getTotalPendingNumbers,
  };
}
