import { useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/useTenant';

export interface Contact {
  id: string;
  tenant_id: string;
  instance_id: string;
  wa_id: string;
  phone_number: string;
  name: string | null;
  profile_pic_url: string | null;
  is_blocked: boolean;
  is_archived: boolean;
  assigned_to: string | null;
  last_message_at: string | null;
  unread_count: number;
  needs_handoff: boolean;
  handoff_reason: string | null;
  handoff_at: string | null;
  created_at: string;
  updated_at: string;
  last_message?: string;
  device_typing_at?: string | null;
}

async function fetchContactsData(tenantId: string): Promise<Contact[]> {
  // Fetch contacts
  const { data: contactsData, error: fetchError } = await supabase
    .from('contacts')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('is_archived', false)
    .order('last_message_at', { ascending: false, nullsFirst: false });

  if (fetchError) throw fetchError;

  const contactIds = (contactsData || []).map(c => c.id);
  
  if (contactIds.length === 0) return [];

  // Get the last message for each contact using optimized RPC (DISTINCT ON)
  const { data: messagesData } = await supabase
    .rpc('get_last_messages_for_contacts', { p_contact_ids: contactIds });

  // Create a map of contact_id to last message
  const lastMessageMap: Record<string, string> = {};
  if (messagesData) {
    for (const msg of messagesData) {
      let preview = '';
      if (msg.content_type === 'image') {
        preview = '📷 Photo';
      } else if (msg.content_type === 'video') {
        preview = '🎥 Video';
      } else if (msg.content_type === 'audio' || msg.content_type === 'ptt') {
        preview = '🎵 Voice message';
      } else if (msg.content_type === 'document') {
        preview = '📄 Document';
      } else if (msg.content_type === 'sticker') {
        preview = '🏷️ Sticker';
      } else if (msg.content_type === 'location') {
        preview = '📍 Location';
      } else {
        preview = msg.content || '';
      }
      
      if (msg.direction === 'outbound') {
        preview = `You: ${preview}`;
      }
      
      lastMessageMap[msg.contact_id] = preview;
    }
  }

  return (contactsData || []).map(contact => ({
    ...contact,
    last_message: lastMessageMap[contact.id] || null
  }));
}

export function useContacts() {
  const { currentTenant } = useTenant();
  const queryClient = useQueryClient();

  const queryKey = useMemo(() => ['contacts', currentTenant?.id], [currentTenant?.id]);

  const { data: contacts = [], isLoading: loading, error } = useQuery({
    queryKey,
    queryFn: () => fetchContactsData(currentTenant!.id),
    enabled: !!currentTenant?.id,
    staleTime: 1000 * 60 * 2, // 2 minutes - invalidated via global realtime subscription
  });

  const invalidateContacts = useCallback(() => {
    queryClient.invalidateQueries({ queryKey });
  }, [queryClient, queryKey]);

  // Note: Real-time subscriptions are now handled by useGlobalRealtimeSubscriptions
  // to avoid redundant connections and reduce CPU usage

  const updateContactMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Contact> }) => {
      const { error } = await supabase
        .from('contacts')
        .update(updates)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateContacts();
    },
  });

  const deleteContactMutation = useMutation({
    mutationFn: async (id: string) => {
      // Delete all related data in correct order (child tables first)
      await supabase.from('contact_labels').delete().eq('contact_id', id);
      await supabase.from('customer_journey_events').delete().eq('contact_id', id);
      
      const { error: messagesError } = await supabase
        .from('messages')
        .delete()
        .eq('contact_id', id);
      
      if (messagesError) {
        console.error('Error deleting messages:', messagesError);
      }

      const { error: contactError } = await supabase
        .from('contacts')
        .delete()
        .eq('id', id);
      
      if (contactError) throw contactError;
    },
    onSuccess: () => {
      invalidateContacts();
    },
  });

  const updateContact = useCallback(async (id: string, updates: Partial<Contact>) => {
    return updateContactMutation.mutateAsync({ id, updates });
  }, [updateContactMutation]);

  const markAsRead = useCallback(async (id: string) => {
    // Optimistic update first
    queryClient.setQueryData<Contact[]>(queryKey, (old) =>
      old?.map((c) => (c.id === id ? { ...c, unread_count: 0 } : c))
    );
    await updateContact(id, { unread_count: 0 });
  }, [updateContact, queryClient, queryKey]);

  const requestHandoff = useCallback(async (id: string, reason: string) => {
    const updates = {
      needs_handoff: true,
      handoff_reason: reason,
      handoff_at: new Date().toISOString(),
    };
    await updateContact(id, updates);
  }, [updateContact]);

  const resolveHandoff = useCallback(async (id: string) => {
    const updates = {
      needs_handoff: false,
      handoff_reason: null,
      handoff_at: null,
    };
    await updateContact(id, updates);
  }, [updateContact]);

  const deleteContact = useCallback(async (id: string) => {
    return deleteContactMutation.mutateAsync(id);
  }, [deleteContactMutation]);

  return {
    contacts,
    loading,
    error: error as Error | null,
    refetch: invalidateContacts,
    updateContact,
    markAsRead,
    requestHandoff,
    resolveHandoff,
    deleteContact,
  };
}
