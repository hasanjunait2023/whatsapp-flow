import { useMemo } from 'react';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/useTenant';

export interface ThreadContact {
  contact_id: string;
  contact_type: 'whatsapp' | 'facebook';
  instance_id: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  contact_avatar_url: string | null;
  last_message_at: string;
  last_message_preview: string | null;
  last_message_direction: 'inbound' | 'outbound' | null;
  last_message_type: string | null;
  unread_count: number;
  total_messages: number;
  assigned_to: string | null;
  is_archived: boolean;
  is_blocked: boolean;
  needs_handoff: boolean;
  handoff_reason: string | null;
  label_ids: string[];
  created_at: string;
}

interface UseInboxContactsOptions {
  contactType?: 'whatsapp' | 'facebook' | null;
  assignedTo?: string | null;
  isArchived?: boolean;
  unreadOnly?: boolean;
  limit?: number;
}

export function useInboxContacts(options: UseInboxContactsOptions = {}) {
  const { currentTenant } = useTenant();
  const queryClient = useQueryClient();
  
  const {
    contactType = null,
    assignedTo = null,
    isArchived = false,
    unreadOnly = false,
    limit = 50,
  } = options;

  const queryKey = [
    'inbox',
    currentTenant?.id,
    contactType,
    assignedTo,
    isArchived,
    unreadOnly,
  ];

  const {
    data,
    isLoading,
    isFetching,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
    error,
    refetch,
  } = useInfiniteQuery({
    queryKey,
    queryFn: async ({ pageParam }) => {
      const { data, error } = await supabase.rpc('get_inbox_contacts', {
        p_tenant_id: currentTenant!.id,
        p_contact_type: contactType,
        p_assigned_to: assignedTo,
        p_is_archived: isArchived,
        p_unread_only: unreadOnly,
        p_cursor_timestamp: pageParam?.timestamp || null,
        p_cursor_id: pageParam?.id || null,
        p_limit: limit,
      });

      if (error) throw error;
      return (data || []) as ThreadContact[];
    },
    getNextPageParam: (lastPage) => {
      if (!lastPage || lastPage.length < limit) return undefined;
      const last = lastPage[lastPage.length - 1];
      return { timestamp: last.last_message_at, id: last.contact_id };
    },
    initialPageParam: null as { timestamp: string; id: string } | null,
    enabled: !!currentTenant?.id,
    staleTime: 1000 * 30, // 30 seconds - realtime handles updates
    gcTime: 1000 * 60 * 5, // 5 minutes
  });

  const contacts = useMemo(() => {
    return data?.pages.flat() || [];
  }, [data]);

  // Stats derived from loaded contacts
  const unreadCount = useMemo(() => {
    return contacts.reduce((sum, c) => sum + c.unread_count, 0);
  }, [contacts]);

  const handoffCount = useMemo(() => {
    return contacts.filter((c) => c.needs_handoff).length;
  }, [contacts]);

  // Optimistic update for marking as read
  const markAsRead = async (contactId: string) => {
    // Optimistic update
    queryClient.setQueryData(queryKey, (oldData: any) => {
      if (!oldData?.pages) return oldData;
      return {
        ...oldData,
        pages: oldData.pages.map((page: ThreadContact[]) =>
          page.map((c) =>
            c.contact_id === contactId ? { ...c, unread_count: 0 } : c
          )
        ),
      };
    });

    // Call the RPC function
    const { error } = await supabase.rpc('mark_thread_as_read', {
      p_contact_id: contactId,
    });

    if (error) {
      // Revert on error
      queryClient.invalidateQueries({ queryKey });
      throw error;
    }
  };

  return {
    contacts,
    loading: isLoading,
    fetching: isFetching,
    hasMore: hasNextPage,
    loadMore: fetchNextPage,
    loadingMore: isFetchingNextPage,
    error: error as Error | null,
    refetch,
    markAsRead,
    unreadCount,
    handoffCount,
  };
}
