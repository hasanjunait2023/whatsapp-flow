import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { ThreadMessage } from './useThreadMessages';

/**
 * Thread-scoped realtime subscription for message updates.
 * Only subscribes when a specific thread is open.
 * Debounces rapid inserts to avoid excessive re-renders.
 */
export function useThreadRealtime(
  contactId: string | null,
  contactType: 'whatsapp' | 'facebook' = 'whatsapp'
) {
  const queryClient = useQueryClient();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recentInsertIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!contactId) return;

    // Cleanup previous subscription
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const tableName = contactType === 'whatsapp' ? 'messages' : 'fb_messages';
    const queryKey = ['thread-messages', contactId, contactType];

    channelRef.current = supabase
      .channel(`thread-${contactId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: tableName,
          filter: `contact_id=eq.${contactId}`,
        },
        (payload) => {
          const newMessage = payload.new as ThreadMessage;

          // Skip if we recently added this (optimistic update)
          if (recentInsertIds.current.has(newMessage.id)) {
            return;
          }

          // Debounce rapid inserts (batch within 250ms)
          if (debounceRef.current) clearTimeout(debounceRef.current);
          debounceRef.current = setTimeout(() => {
            queryClient.invalidateQueries({ queryKey });
          }, 250);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: tableName,
          filter: `contact_id=eq.${contactId}`,
        },
        (payload) => {
          // Direct update for status changes (no debounce needed)
          const updatedMessage = payload.new as ThreadMessage;
          queryClient.setQueryData(queryKey, (oldData: any) => {
            if (!oldData?.pages) return oldData;
            return {
              ...oldData,
              pages: oldData.pages.map((page: ThreadMessage[]) =>
                page.map((m) =>
                  m.id === updatedMessage.id ? { ...m, ...updatedMessage } : m
                )
              ),
            };
          });
        }
      )
      .subscribe();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [contactId, contactType, queryClient]);

  // Helper to track recently sent message IDs (for deduplication)
  const trackSentMessage = (messageId: string) => {
    recentInsertIds.current.add(messageId);
    setTimeout(() => recentInsertIds.current.delete(messageId), 10000);
  };

  return { trackSentMessage };
}
