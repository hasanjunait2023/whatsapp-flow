import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/useTenant';

export interface WhatsAppGroup {
  id: string;
  tenant_id: string;
  instance_id: string;
  wa_group_id: string;
  name: string;
  description: string | null;
  invite_link: string | null;
  participant_count: number;
  is_admin: boolean;
  synced_at: string;
  created_at: string;
  updated_at: string;
  instance?: {
    id: string;
    name: string;
    phone_number: string | null;
  };
}

export interface GroupParticipant {
  id: string;
  group_id: string;
  contact_id: string | null;
  phone_number: string;
  is_admin: boolean;
  added_at: string;
  added_by: string | null;
  contact?: {
    id: string;
    name: string | null;
    phone_number: string;
  };
}

export interface DailyLimit {
  members_added: number;
  max_daily_limit: number;
  remaining: number;
}

export function useGroups() {
  const { currentTenant: tenant } = useTenant();
  const [groups, setGroups] = useState<WhatsAppGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [dailyLimit, setDailyLimit] = useState<DailyLimit | null>(null);

  const fetchGroups = useCallback(async () => {
    if (!tenant?.id) return;

    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('whatsapp_groups')
        .select(`
          *,
          instance:whatsapp_instances(id, name, phone_number)
        `)
        .eq('tenant_id', tenant.id)
        .order('synced_at', { ascending: false });

      if (fetchError) throw fetchError;
      setGroups(data || []);
    } catch (err) {
      console.error('Error fetching groups:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch groups'));
    } finally {
      setLoading(false);
    }
  }, [tenant?.id]);

  const fetchDailyLimit = useCallback(async () => {
    if (!tenant?.id) return;

    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from('tenant_daily_group_limits')
      .select('*')
      .eq('tenant_id', tenant.id)
      .eq('date', today)
      .single();

    const membersAdded = data?.members_added || 0;
    const maxLimit = data?.max_daily_limit || 50;

    setDailyLimit({
      members_added: membersAdded,
      max_daily_limit: maxLimit,
      remaining: maxLimit - membersAdded,
    });
  }, [tenant?.id]);

  useEffect(() => {
    if (tenant?.id) {
      fetchGroups();
      fetchDailyLimit();
    }
  }, [tenant?.id, fetchGroups, fetchDailyLimit]);

  const syncGroups = async (instanceId: string) => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('group-sync', {
        body: { instance_id: instanceId },
      });

      if (error) throw error;
      await fetchGroups();
      return data;
    } catch (err) {
      console.error('Error syncing groups:', err);
      throw err;
    } finally {
      setSyncing(false);
    }
  };

  const getGroupMetadata = async (groupId: string) => {
    const { data, error } = await supabase.functions.invoke('group-metadata', {
      body: { group_id: groupId },
    });

    if (error) throw error;
    return data;
  };

  const getGroupParticipants = async (groupId: string): Promise<GroupParticipant[]> => {
    const { data, error } = await supabase
      .from('whatsapp_group_participants')
      .select(`
        *,
        contact:contacts(id, name, phone_number)
      `)
      .eq('group_id', groupId)
      .order('added_at', { ascending: false });

    if (error) throw error;
    return data || [];
  };

  const sendGroupMessage = async (groupId: string, message: string, mediaUrl?: string) => {
    const { data, error } = await supabase.functions.invoke('group-send-message', {
      body: {
        group_id: groupId,
        message,
        image_url: mediaUrl,
      },
    });

    if (error) throw error;
    return data;
  };

  const addParticipants = async (groupId: string, phoneNumbers: string[]) => {
    const { data, error } = await supabase.functions.invoke('group-add-participants', {
      body: {
        group_id: groupId,
        phone_numbers: phoneNumbers,
      },
    });

    if (error) throw error;
    // Edge function returns { success: boolean, errors?: string[] }
    // Treat success:false as an error so UI doesn't show "0 added" as success.
    if (!(data as any)?.success) {
      const firstError = (data as any)?.errors?.[0] || (data as any)?.error || 'সদস্য যোগ করা যায়নি';
      throw new Error(firstError);
    }
    await fetchDailyLimit();
    return data;
  };

  const removeParticipants = async (groupId: string, phoneNumbers: string[]) => {
    const { data, error } = await supabase.functions.invoke('group-remove-participants', {
      body: {
        group_id: groupId,
        phone_numbers: phoneNumbers,
      },
    });

    if (error) throw error;
    return data;
  };

  const sendInvites = async (groupId: string, contactIds: string[], customTemplate?: string) => {
    const { data, error } = await supabase.functions.invoke('group-send-invite', {
      body: {
        group_id: groupId,
        contact_ids: contactIds,
        custom_template: customTemplate,
      },
    });

    if (error) throw error;
    return data;
  };

  const queueBatchAdd = async (
    groupId: string,
    phoneNumbers: string[],
    batchSize = 5,
    intervalMinutes = 30
  ) => {
    const { data, error } = await supabase.functions.invoke('group-queue-batch', {
      body: {
        group_id: groupId,
        phone_numbers: phoneNumbers,
        batch_size: batchSize,
        interval_minutes: intervalMinutes,
      },
    });

    if (error) throw error;
    return data;
  };

   const createGroup = async (instanceId: string, groupName: string, phoneNumbers: string[]) => {
     const { data, error } = await supabase.functions.invoke('group-create', {
       body: {
         instance_id: instanceId,
         group_name: groupName,
         participant_phone_numbers: phoneNumbers,
       },
     });
 
     if (error) throw error;
     await fetchGroups();
     return data;
   };
 
  return {
    groups,
    loading,
    syncing,
    error,
    dailyLimit,
    refetch: fetchGroups,
    syncGroups,
     createGroup,
    getGroupMetadata,
    getGroupParticipants,
    sendGroupMessage,
    addParticipants,
    removeParticipants,
    sendInvites,
    queueBatchAdd,
    refreshDailyLimit: fetchDailyLimit,
  };
}
