import { useMemo, useCallback } from 'react';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ThreadMessage {
  id: string;
  wa_message_id?: string | null;
  mid?: string | null;
  direction: 'inbound' | 'outbound';
  status: string;
  content_type: string;
  content: string | null;
  text_preview: string | null;
  media_url: string | null;
  media_mime_type: string | null;
  media_filename: string | null;
  location_lat?: number | null;
  location_lng?: number | null;
  reply_to_id: string | null;
  is_from_ai: boolean;
  error_message: string | null;
  sent_at: string;
  delivered_at: string | null;
  read_at: string | null;
  sent_by_user_id: string | null;
}

interface UseThreadMessagesOptions {
  contactType?: 'whatsapp' | 'facebook';
  limit?: number;
}

export function useThreadMessages(
  contactId: string | null,
  options: UseThreadMessagesOptions = {}
) {
  const queryClient = useQueryClient();
  const { contactType = 'whatsapp', limit = 50 } = options;

  const queryKey = ['thread-messages', contactId, contactType];

  const {
    data,
    isLoading,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
    error,
    refetch,
  } = useInfiniteQuery({
    queryKey,
    queryFn: async ({ pageParam }) => {
      const rpcName =
        contactType === 'facebook' ? 'get_fb_thread_messages' : 'get_thread_messages';

      const { data, error } = await supabase.rpc(rpcName, {
        p_contact_id: contactId!,
        p_cursor_timestamp: pageParam?.timestamp || null,
        p_cursor_id: pageParam?.id || null,
        p_limit: limit,
        p_direction: 'older',
      });

      if (error) throw error;
      return (data || []) as ThreadMessage[];
    },
    getNextPageParam: (lastPage) => {
      if (!lastPage || lastPage.length < limit) return undefined;
      const last = lastPage[lastPage.length - 1];
      return { timestamp: last.sent_at, id: last.id };
    },
    initialPageParam: null as { timestamp: string; id: string } | null,
    enabled: !!contactId,
    staleTime: 1000 * 60, // 1 minute
    gcTime: 1000 * 60 * 10, // 10 minutes
  });

  // Flatten pages and reverse for correct display order (oldest first)
  const messages = useMemo(() => {
    if (!data?.pages) return [];
    // Pages are ordered newest-first from API, flatten and reverse
    const all = data.pages.flat();
    return all.reverse();
  }, [data]);

  // Add optimistic message (for sending)
  const addOptimisticMessage = useCallback(
    (message: ThreadMessage) => {
      queryClient.setQueryData(queryKey, (oldData: any) => {
        if (!oldData?.pages) {
          return { pages: [[message]], pageParams: [null] };
        }
        // Add to the first page (most recent)
        const newPages = [...oldData.pages];
        newPages[0] = [message, ...newPages[0]];
        return { ...oldData, pages: newPages };
      });
    },
    [queryClient, queryKey]
  );

  // Update optimistic message with real data
  const updateOptimisticMessage = useCallback(
    (
      optimisticId: string,
      realId: string,
      status: 'sent' | 'failed',
      errorMessage?: string
    ) => {
      queryClient.setQueryData(queryKey, (oldData: any) => {
        if (!oldData?.pages) return oldData;
        return {
          ...oldData,
          pages: oldData.pages.map((page: ThreadMessage[]) =>
            page.map((m) =>
              m.id === optimisticId
                ? { ...m, id: realId, status, error_message: errorMessage || null }
                : m
            )
          ),
        };
      });
    },
    [queryClient, queryKey]
  );

  // Update message in cache (for status updates from realtime)
  const updateMessage = useCallback(
    (messageId: string, updates: Partial<ThreadMessage>) => {
      queryClient.setQueryData(queryKey, (oldData: any) => {
        if (!oldData?.pages) return oldData;
        return {
          ...oldData,
          pages: oldData.pages.map((page: ThreadMessage[]) =>
            page.map((m) => (m.id === messageId ? { ...m, ...updates } : m))
          ),
        };
      });
    },
    [queryClient, queryKey]
  );

  return {
    messages,
    loading: isLoading,
    hasOlderMessages: hasNextPage,
    loadOlder: fetchNextPage,
    loadingOlder: isFetchingNextPage,
    error: error as Error | null,
    refetch,
    addOptimisticMessage,
    updateOptimisticMessage,
    updateMessage,
  };
}
