import { useState, useCallback, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// System tenant ID for admin business
const SYSTEM_TENANT_ID = '5a0ad1d5-588a-473a-af82-724e69890074';

export interface AdminGroupMessage {
  id: string;
  tenant_id: string;
  instance_id: string;
  wa_group_id: string | null;
  contact_id: string | null;
  wa_message_id: string | null;
  direction: 'inbound' | 'outbound';
  status: string;
  content_type: string;
  content: string | null;
  media_url: string | null;
  sender_phone: string | null;
  sent_at: string | null;
  created_at: string;
}

export function useAdminGroupMessages(groupId: string | null) {
  const queryClient = useQueryClient();
  const [sending, setSending] = useState(false);

  // First get the group to find wa_group_id
  const { data: group } = useQuery({
    queryKey: ['admin-group-detail', groupId],
    queryFn: async () => {
      if (!groupId) return null;
      const { data, error } = await supabase
        .from('whatsapp_groups')
        .select('*, instance:whatsapp_instances(id, name, phone_number)')
        .eq('id', groupId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!groupId,
  });

  const { data: messages = [], isLoading, error, refetch } = useQuery({
    queryKey: ['admin-group-messages', group?.wa_group_id],
    queryFn: async () => {
      if (!group?.wa_group_id) return [];
      
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('wa_group_id', group.wa_group_id)
        .order('sent_at', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return (data || []) as unknown as AdminGroupMessage[];
    },
    enabled: !!group?.wa_group_id,
  });

  // Real-time subscription for new messages
  useEffect(() => {
    if (!group?.wa_group_id) return;

    const channel = supabase
      .channel(`admin-group-messages-${group.wa_group_id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `wa_group_id=eq.${group.wa_group_id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['admin-group-messages', group.wa_group_id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [group?.wa_group_id, queryClient]);

  const sendMessage = useCallback(async (
    message: string,
    options?: {
      imageUrl?: string;
      videoUrl?: string;
      documentUrl?: string;
      mentions?: string[];
    }
  ) => {
    if (!groupId) throw new Error('No group selected');
    
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('group-send-message', {
        body: {
          group_id: groupId,
          message,
          image_url: options?.imageUrl,
          video_url: options?.videoUrl,
          document_url: options?.documentUrl,
          mentions: options?.mentions,
        },
      });

      if (error) throw error;
      
      // Refresh messages
      queryClient.invalidateQueries({ queryKey: ['admin-group-messages', group?.wa_group_id] });
      
      return data;
    } finally {
      setSending(false);
    }
  }, [groupId, group?.wa_group_id, queryClient]);

  return {
    group,
    messages,
    loading: isLoading,
    sending,
    error,
    refetch,
    sendMessage,
    systemTenantId: SYSTEM_TENANT_ID,
  };
}
