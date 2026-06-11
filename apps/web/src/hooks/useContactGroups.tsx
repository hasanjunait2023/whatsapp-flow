 import { useQuery } from '@tanstack/react-query';
 import { supabase } from '@/integrations/supabase/client';
 
 export interface ContactGroup {
   id: string;
   group_id: string;
   contact_id: string | null;
   phone_number: string;
   is_admin: boolean;
   added_at: string;
   group: {
     id: string;
     name: string;
     wa_group_id: string;
     participant_count: number;
     is_admin: boolean;
     last_message_at: string | null;
   } | null;
 }
 
 export function useContactGroups(contactId: string | null) {
   const { data: groups = [], isLoading, error } = useQuery({
     queryKey: ['contact-groups', contactId],
     queryFn: async () => {
       if (!contactId) return [];
       
       const { data, error } = await supabase
         .from('whatsapp_group_participants')
         .select(`
           *,
           group:whatsapp_groups(id, name, wa_group_id, participant_count, is_admin, last_message_at)
         `)
         .eq('contact_id', contactId)
         .order('added_at', { ascending: false });
       
       if (error) throw error;
       return (data || []) as ContactGroup[];
     },
     enabled: !!contactId,
   });
 
   return {
     groups,
     loading: isLoading,
     error,
   };
 }