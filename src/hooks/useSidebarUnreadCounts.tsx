import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/useTenant';

interface UnreadCounts {
  wa_unread: number;
  fb_unread: number;
  total_unread: number;
}

/**
 * Optimized sidebar unread counts using the new RPC function.
 * Reads from contact_thread_state table (denormalized) instead of
 * scanning contacts + fb_contacts tables separately.
 */
export function useSidebarUnreadCounts() {
  const { currentTenant } = useTenant();

  const { data: counts, isLoading: loading, refetch } = useQuery({
    queryKey: ['sidebar-unread', currentTenant?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_sidebar_unread_counts', {
        p_tenant_id: currentTenant!.id,
      });

      if (error) {
        console.error('Error fetching unread counts:', error);
        return { wa_unread: 0, fb_unread: 0, total_unread: 0 };
      }

      // RPC returns an array with one row
      const result = Array.isArray(data) ? data[0] : data;
      return result as UnreadCounts;
    },
    enabled: !!currentTenant?.id,
    staleTime: 1000 * 60 * 2, // 2 minutes - invalidated via inbox realtime
    gcTime: 1000 * 60 * 5, // 5 minutes
  });

  // Note: Real-time subscriptions are now handled by useInboxRealtime
  // to avoid redundant connections and reduce CPU usage

  return {
    waUnreadCount: counts?.wa_unread || 0,
    fbUnreadCount: counts?.fb_unread || 0,
    totalUnreadCount: counts?.total_unread || 0,
    loading,
    refetch,
  };
}
