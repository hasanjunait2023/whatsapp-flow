 import { useState, useEffect, useCallback } from 'react';
 import { useQuery, useQueryClient } from '@tanstack/react-query';
 import { supabase } from '@/integrations/supabase/client';
 import { useTenant } from '@/hooks/useTenant';
 
 export interface GroupInboxItem {
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
 
 export function useGroupInbox(instanceFilter?: string | null) {
   const { currentTenant: tenant } = useTenant();
   const queryClient = useQueryClient();
 
   const { data: groups = [], isLoading, error, refetch } = useQuery({
     queryKey: ['group-inbox', tenant?.id, instanceFilter],
     queryFn: async () => {
       if (!tenant?.id) return [];
 
       let query = supabase
         .from('whatsapp_groups')
         .select(`
           *,
           instance:whatsapp_instances(id, name, phone_number)
         `)
         .eq('tenant_id', tenant.id)
         .order('last_message_at', { ascending: false, nullsFirst: false });
 
       if (instanceFilter) {
         query = query.eq('instance_id', instanceFilter);
       }
 
       const { data, error } = await query;
       if (error) throw error;
       return (data || []) as GroupInboxItem[];
     },
     enabled: !!tenant?.id,
   });
 
   // Real-time subscription for group updates
   useEffect(() => {
     if (!tenant?.id) return;
 
     const channel = supabase
       .channel('group-inbox-updates')
       .on(
         'postgres_changes',
         {
           event: '*',
           schema: 'public',
           table: 'whatsapp_groups',
           filter: `tenant_id=eq.${tenant.id}`,
         },
         () => {
           queryClient.invalidateQueries({ queryKey: ['group-inbox'] });
         }
       )
       .subscribe();
 
     return () => {
       supabase.removeChannel(channel);
     };
   }, [tenant?.id, queryClient]);
 
   const markGroupAsRead = useCallback(async (groupId: string) => {
     await supabase
       .from('whatsapp_groups')
       .update({ unread_count: 0 })
       .eq('id', groupId);
     queryClient.invalidateQueries({ queryKey: ['group-inbox'] });
   }, [queryClient]);
 
   return {
     groups,
     loading: isLoading,
     error,
     refetch,
     markGroupAsRead,
   };
 }