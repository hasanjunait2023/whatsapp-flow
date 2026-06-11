import { useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from './useTenant';

export interface FBContact {
  id: string;
  tenant_id: string;
  page_id: string;
  psid: string;
  name: string | null;
  profile_pic_url: string | null;
  locale: string | null;
  assigned_to: string | null;
  is_blocked: boolean;
  is_archived: boolean;
  last_message_at: string | null;
  unread_count: number;
  tags: string[];
  needs_handoff: boolean;
  handoff_reason: string | null;
  handoff_at: string | null;
  typing_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  facebook_pages?: {
    page_name: string;
    profile_picture_url: string | null;
    page_id?: string;
  };
  last_message?: {
    content: string;
    content_type: string;
    direction: string;
  };
  fb_messages?: Array<{
    content: string | null;
    content_type: string;
    direction: string;
    media_url: string | null;
  }>;
}

async function fetchFBContactsData(tenantId: string, pageId?: string | null): Promise<FBContact[]> {
  let query = supabase
    .from('fb_contacts')
    .select(`
      *,
      facebook_pages (
        page_name,
        profile_picture_url,
        page_id
      )
    `)
    .eq('tenant_id', tenantId)
    .eq('is_archived', false)
    .order('last_message_at', { ascending: false, nullsFirst: false });

  if (pageId) {
    query = query.eq('page_id', pageId);
  }

  const { data: contactsData, error: fetchError } = await query;

  if (fetchError) throw fetchError;

  // Fetch last message for each contact
  const contactIds = (contactsData || []).map(c => c.id);
  let lastMessagesMap: Record<string, { content: string | null; content_type: string; direction: string; media_url: string | null }> = {};
  
  if (contactIds.length > 0) {
    const { data: messagesData } = await supabase
      .from('fb_messages')
      .select('contact_id, content, content_type, direction, media_url, sent_at')
      .in('contact_id', contactIds)
      .order('sent_at', { ascending: false });
    
    // Keep only the first (most recent) message per contact
    if (messagesData) {
      for (const msg of messagesData) {
        if (!lastMessagesMap[msg.contact_id]) {
          lastMessagesMap[msg.contact_id] = {
            content: msg.content,
            content_type: msg.content_type,
            direction: msg.direction,
            media_url: msg.media_url,
          };
        }
      }
    }
  }

  // Merge contacts with their last messages
  return (contactsData || []).map(contact => ({
    ...contact,
    fb_messages: lastMessagesMap[contact.id] ? [lastMessagesMap[contact.id]] : [],
  })) as FBContact[];
}

export function useFBContacts(pageId?: string | null) {
  const { currentTenant } = useTenant();
  const queryClient = useQueryClient();

  const queryKey = useMemo(() => ['fb-contacts', currentTenant?.id, pageId], [currentTenant?.id, pageId]);

  const { data: contacts = [], isLoading: loading, error, refetch } = useQuery({
    queryKey,
    queryFn: () => fetchFBContactsData(currentTenant!.id, pageId),
    enabled: !!currentTenant?.id,
    staleTime: 1000 * 60 * 2, // 2 minutes - invalidated via global realtime subscription
  });

  // Note: Real-time subscriptions are now handled by useGlobalRealtimeSubscriptions
  // to avoid redundant connections and reduce CPU usage

  const markAsReadMutation = useMutation({
    mutationFn: async (contactId: string) => {
      const { error } = await supabase
        .from('fb_contacts')
        .update({ unread_count: 0 })
        .eq('id', contactId);
      if (error) throw error;
    },
    onMutate: async (contactId) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey });
      queryClient.setQueryData<FBContact[]>(queryKey, (old) =>
        old?.map(c => c.id === contactId ? { ...c, unread_count: 0 } : c)
      );
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const updateContactMutation = useMutation({
    mutationFn: async ({ contactId, updates }: { contactId: string; updates: Partial<FBContact> }) => {
      const { error } = await supabase
        .from('fb_contacts')
        .update(updates)
        .eq('id', contactId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const markAsRead = useCallback(async (contactId: string) => {
    return markAsReadMutation.mutateAsync(contactId);
  }, [markAsReadMutation]);

  const updateContact = useCallback(async (contactId: string, updates: Partial<FBContact>) => {
    return updateContactMutation.mutateAsync({ contactId, updates });
  }, [updateContactMutation]);

  const archiveContact = useCallback(async (contactId: string) => {
    await updateContact(contactId, { is_archived: true });
  }, [updateContact]);

  const blockContact = useCallback(async (contactId: string, blocked: boolean) => {
    await updateContact(contactId, { is_blocked: blocked });
  }, [updateContact]);

  // Stats
  const unreadCount = contacts.reduce((sum, c) => sum + c.unread_count, 0);
  const handoffCount = contacts.filter(c => c.needs_handoff).length;

  return {
    contacts,
    loading,
    error: error as Error | null,
    refetch,
    markAsRead,
    updateContact,
    archiveContact,
    blockContact,
    unreadCount,
    handoffCount,
  };
}
