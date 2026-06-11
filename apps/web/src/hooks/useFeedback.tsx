import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { useToast } from '@/hooks/use-toast';
import { startOfWeek, startOfMonth, isAfter } from 'date-fns';

export interface FeedbackEvent {
  id: string;
  contact_id: string;
  title: string;
  description: string | null;
  metadata: Record<string, any> | null;
  created_at: string;
  created_by: string | null;
  contact: {
    id: string;
    name: string | null;
    phone_number: string;
  } | null;
  creator: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

export function useFeedback() {
  const { currentTenant } = useTenantContext();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const tenantId = currentTenant?.id;

  const { data: feedbackEvents = [], isLoading, error } = useQuery({
    queryKey: ['feedback-events', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      const { data, error } = await supabase
        .from('customer_journey_events')
        .select(`
          id,
          contact_id,
          title,
          description,
          metadata,
          created_at,
          created_by,
          contact:contacts!customer_journey_events_contact_id_fkey(id, name, phone_number),
          creator:profiles!customer_journey_events_created_by_fkey(id, full_name, avatar_url)
        `)
        .eq('tenant_id', tenantId)
        .eq('event_type', 'feedback_given')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as FeedbackEvent[];
    },
    enabled: !!tenantId,
  });

  const deleteFeedback = useMutation({
    mutationFn: async (feedbackId: string) => {
      const { error } = await supabase
        .from('customer_journey_events')
        .delete()
        .eq('id', feedbackId)
        .eq('tenant_id', tenantId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feedback-events', tenantId] });
      toast({ title: 'Feedback deleted successfully' });
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Failed to delete feedback', 
        description: error.message, 
        variant: 'destructive' 
      });
    },
  });

  // Calculate stats
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 0 });
  const monthStart = startOfMonth(now);

  const stats = {
    total: feedbackEvents.length,
    thisWeek: feedbackEvents.filter(f => isAfter(new Date(f.created_at), weekStart)).length,
    thisMonth: feedbackEvents.filter(f => isAfter(new Date(f.created_at), monthStart)).length,
  };

  return {
    feedbackEvents,
    isLoading,
    error,
    stats,
    deleteFeedback,
  };
}
