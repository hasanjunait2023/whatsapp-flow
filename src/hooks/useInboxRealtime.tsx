import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Inbox-level realtime subscription.
 * Subscribes to contact_thread_state changes (NOT messages table).
 * Debounces updates within 500ms window to batch rapid changes.
 */
export function useInboxRealtime(tenantId: string | null) {
  const queryClient = useQueryClient();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const pendingUpdates = useRef<Set<string>>(new Set());
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!tenantId) return;

    // Cleanup previous subscription
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    channelRef.current = supabase
      .channel(`inbox-${tenantId}`)
      // Subscribe to thread state changes ONLY (not messages)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'contact_thread_state',
          filter: `tenant_id=eq.${tenantId}`,
        },
        (payload) => {
          // Batch updates within 500ms window
          const contactId = (payload.new as any)?.contact_id || (payload.old as any)?.contact_id;
          if (contactId) {
            pendingUpdates.current.add(contactId);
          }

          if (debounceRef.current) clearTimeout(debounceRef.current);
          debounceRef.current = setTimeout(() => {
            if (pendingUpdates.current.size > 0) {
              // Invalidate inbox queries (will refetch with new order)
              queryClient.invalidateQueries({ queryKey: ['inbox', tenantId] });
              // Also update sidebar unread counts
              queryClient.invalidateQueries({ queryKey: ['sidebar-unread', tenantId] });
              pendingUpdates.current.clear();
            }
          }, 500);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[InboxRealtime] Subscribed for tenant:', tenantId);
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn('[InboxRealtime] Connection issue, will retry...');
        }
      });

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [tenantId, queryClient]);
}
