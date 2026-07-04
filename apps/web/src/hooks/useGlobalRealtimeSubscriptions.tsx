import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/useTenant';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Global realtime subscription manager for tenant-level updates.
 * Consolidates multiple subscriptions into a single channel per tenant.
 * This prevents redundant subscriptions across components.
 */
export function useGlobalRealtimeSubscriptions() {
  const { currentTenant } = useTenant();
  const queryClient = useQueryClient();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const pendingInvalidationsRef = useRef<Set<string>>(new Set());
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced invalidation to batch rapid real-time events
  const debouncedInvalidate = useCallback((queryKeys: string[][]) => {
    queryKeys.forEach(key => pendingInvalidationsRef.current.add(JSON.stringify(key)));
    
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    debounceTimerRef.current = setTimeout(() => {
      pendingInvalidationsRef.current.forEach(keyStr => {
        const key = JSON.parse(keyStr);
        queryClient.invalidateQueries({ queryKey: key });
      });
      pendingInvalidationsRef.current.clear();
    }, 300);
  }, [queryClient]);

  useEffect(() => {
    if (!currentTenant?.id) return;

    // Cleanup existing channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel(`global-tenant-${currentTenant.id}`)
      // Thread state updates - invalidate inbox and sidebar counts (optimized approach)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'contact_thread_state',
        filter: `tenant_id=eq.${currentTenant.id}`,
      }, () => {
        debouncedInvalidate([
          ['inbox', currentTenant.id],
          ['contacts', currentTenant.id],
          ['fb-contacts', currentTenant.id],
          ['sidebar-unread', currentTenant.id]
        ]);
      })
      // Orders updates - invalidate dashboard stats
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'orders',
        filter: `tenant_id=eq.${currentTenant.id}`,
      }, () => {
        debouncedInvalidate([
          ['orders', currentTenant.id],
          ['dashboard', currentTenant.id]
        ]);
      })
      // Internal chat room updates
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'internal_chat_rooms',
        filter: `tenant_id=eq.${currentTenant.id}`,
      }, () => {
        debouncedInvalidate([['internal-chat-rooms', currentTenant.id]]);
      })
      // WhatsApp instances - invalidate instances and dashboard
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'whatsapp_instances',
        filter: `tenant_id=eq.${currentTenant.id}`,
      }, () => {
        debouncedInvalidate([
          ['instances', currentTenant.id],
          ['disconnected-instances', currentTenant.id]
        ]);
      })
      // Team member updates
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'user_roles',
        filter: `tenant_id=eq.${currentTenant.id}`,
      }, () => {
        debouncedInvalidate([['team', currentTenant.id]]);
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [currentTenant?.id, queryClient, debouncedInvalidate]);
}
