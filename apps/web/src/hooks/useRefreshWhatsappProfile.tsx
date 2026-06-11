import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

interface UseRefreshWhatsappProfileOptions {
  contactId: string;
  onSuccess?: () => void;
}

export function useRefreshWhatsappProfile({ contactId, onSuccess }: UseRefreshWhatsappProfileOptions) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const queryClient = useQueryClient();

  const refreshProfile = async () => {
    setIsRefreshing(true);
    try {
      // Reset profile_pic_synced_at to force re-fetch
      await supabase
        .from('contacts')
        .update({ profile_pic_synced_at: null })
        .eq('id', contactId);

      // Call the refresh edge function
      const { data, error } = await supabase.functions.invoke('whatsapp-refresh-profile', {
        body: { contact_id: contactId }
      });

      if (error) throw error;

      if (data?.success) {
        toast.success('Profile picture refreshed');
        queryClient.invalidateQueries({ queryKey: ['contacts'] });
        onSuccess?.();
      } else if (data?.message) {
        toast.info(data.message);
      } else {
        toast.info('Profile unavailable - WhatsApp privacy settings may prevent access');
      }
    } catch (error) {
      console.error('Failed to refresh WhatsApp profile:', error);
      toast.error('Failed to refresh profile');
    } finally {
      setIsRefreshing(false);
    }
  };

  return {
    refreshProfile,
    isRefreshing,
  };
}
