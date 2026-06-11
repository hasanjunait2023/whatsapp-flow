import { useCallback, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// System tenant ID for admin business
const SYSTEM_TENANT_ID = '5a0ad1d5-588a-473a-af82-724e69890074';

export interface AdminGroupInboxItem {
  id: string;
  tenant_id: string;
  instance_id: string;
  wa_group_id: string;
  name: string;
  description: string | null;
  participant_count: number;
  is_admin: boolean;
  is_created_by_tenant: boolean;
  last_message_at: string | null;
  last_message_preview: string | null;
  unread_count: number;
  synced_at: string;
  created_at: string;
  instance?: {
    id: string;
    name: string;
    phone_number: string | null;
  };
}

export function useAdminGroupInbox(instanceFilter?: string | null) {
  const queryClient = useQueryClient();

  const { data: groups = [], isLoading, error, refetch } = useQuery({
    queryKey: ['admin-group-inbox', instanceFilter],
    queryFn: async () => {
      let query = supabase
        .from('whatsapp_groups')
        .select(`
          *,
          instance:whatsapp_instances(id, name, phone_number)
        `)
        .eq('tenant_id', SYSTEM_TENANT_ID)
        .order('last_message_at', { ascending: false, nullsFirst: false });

      if (instanceFilter) {
        query = query.eq('instance_id', instanceFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as AdminGroupInboxItem[];
    },
  });

  // Real-time subscription for group updates
  useEffect(() => {
    const channel = supabase
      .channel('admin-group-inbox-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'whatsapp_groups',
          filter: `tenant_id=eq.${SYSTEM_TENANT_ID}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['admin-group-inbox'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const markGroupAsRead = useCallback(async (groupId: string) => {
    await supabase
      .from('whatsapp_groups')
      .update({ unread_count: 0 })
      .eq('id', groupId);
    queryClient.invalidateQueries({ queryKey: ['admin-group-inbox'] });
  }, [queryClient]);

  return {
    groups,
    loading: isLoading,
    error,
    refetch,
    markGroupAsRead,
    systemTenantId: SYSTEM_TENANT_ID,
  };
}
