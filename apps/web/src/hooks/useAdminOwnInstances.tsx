import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// System tenant ID for admin business
const SYSTEM_TENANT_ID = '5a0ad1d5-588a-473a-af82-724e69890074';

export interface AdminWhatsAppInstance {
  id: string;
  tenant_id: string;
  name: string;
  phone_number: string | null;
  status: 'active' | 'disconnected' | 'banned' | 'connecting';
  is_default: boolean;
  webhook_secret: string | null;
  created_at: string;
  updated_at: string;
}

export function useAdminOwnInstances() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const queryKey = ['admin-own-instances', SYSTEM_TENANT_ID];

  const { data: instances = [], isLoading: loading, error } = useQuery({
    queryKey,
    queryFn: async () => {
      const { data, error: fetchError } = await supabase
        .from('whatsapp_instances')
        .select('id, tenant_id, name, phone_number, status, is_default, webhook_secret, created_at, updated_at')
        .eq('tenant_id', SYSTEM_TENANT_ID)
        .or('is_deleted.is.null,is_deleted.eq.false')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      return (data || []) as AdminWhatsAppInstance[];
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      // Soft delete
      const { error: deleteError } = await supabase
        .from('whatsapp_instances')
        .update({
          is_deleted: true,
          deleted_at: new Date().toISOString(),
          status: 'disconnected',
          wasender_session_id: null,
          session_id: null,
          api_key_encrypted: null,
          qr_code: null,
          qr_expires_at: null,
        })
        .eq('id', id);

      if (deleteError) throw deleteError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast({
        title: 'Instance deleted',
        description: 'The WhatsApp instance has been removed.',
      });
    },
    onError: (err: Error) => {
      toast({
        title: 'Failed to delete instance',
        description: err.message,
        variant: 'destructive',
      });
    },
  });

  const setDefaultMutation = useMutation({
    mutationFn: async (id: string) => {
      // Unset other defaults
      await supabase
        .from('whatsapp_instances')
        .update({ is_default: false })
        .eq('tenant_id', SYSTEM_TENANT_ID)
        .neq('id', id);

      // Set this one as default
      const { error } = await supabase
        .from('whatsapp_instances')
        .update({ is_default: true })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast({
        title: 'Default instance updated',
        description: 'This instance is now the default.',
      });
    },
  });

  return {
    instances,
    loading,
    error: error as Error | null,
    deleteInstance: (id: string) => deleteMutation.mutateAsync(id),
    setDefaultInstance: (id: string) => setDefaultMutation.mutateAsync(id),
    refetch: () => queryClient.invalidateQueries({ queryKey }),
    defaultInstance: instances.find((inst) => inst.is_default),
    systemTenantId: SYSTEM_TENANT_ID,
  };
}
