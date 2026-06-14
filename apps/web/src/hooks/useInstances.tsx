import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/useTenant';
import { useToast } from '@/hooks/use-toast';
import { useMyResourceAccess } from '@/hooks/useTeamMemberAccess';

export interface WhatsAppInstance {
  id: string;
  tenant_id: string;
  name: string;
  phone_number: string | null;
  status: 'active' | 'disconnected' | 'banned';
  is_default: boolean;
  last_connected_at: string | null;
  created_at: string;
  updated_at: string;
}

interface CreateInstanceData {
  name: string;
  phone_number?: string;
  api_key: string;
  session_id?: string;
}

interface UpdateInstanceData {
  name?: string;
  phone_number?: string;
  api_key?: string;
  session_id?: string;
  is_default?: boolean;
}

export function useInstances() {
  const { currentTenant } = useTenant();
  const { toast } = useToast();
  const { allowedInstances, isOwnerOrManager, accessLoaded } = useMyResourceAccess();
  const queryClient = useQueryClient();

  const queryKey = ['instances', currentTenant?.id, allowedInstances, isOwnerOrManager];

  const { data: instances = [], isLoading: loading, error } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!currentTenant) return [];

      const { data, error: fetchError } = await supabase
        .from('whatsapp_instances')
        .select('id, tenant_id, name, phone_number, status, is_default, last_connected_at, created_at, updated_at')
        .eq('tenant_id', currentTenant.id)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      let filteredData = (data || []) as WhatsAppInstance[];

      // Filter based on user's resource access (unless owner/manager or no restrictions)
      if (!isOwnerOrManager && allowedInstances.length > 0) {
        filteredData = filteredData.filter(inst => allowedInstances.includes(inst.id));
      }

      return filteredData;
    },
    enabled: !!currentTenant && accessLoaded,
    // Connection status (disconnected -> active) changes out-of-band when a user
    // links WhatsApp via QR — the WAHA webhook flips the DB row. With no realtime
    // push reaching this query, a long staleTime left the dashboard showing a
    // stale "disconnected" after a successful scan. Poll so status converges.
    staleTime: 1000 * 5,
    refetchInterval: 1000 * 10,
    refetchOnWindowFocus: true,
  });

  const createMutation = useMutation({
    mutationFn: async (data: CreateInstanceData) => {
      if (!currentTenant) throw new Error('No tenant selected');

      const { data: instance, error: createError } = await supabase
        .from('whatsapp_instances')
        .insert({
          tenant_id: currentTenant.id,
          name: data.name,
          phone_number: data.phone_number || null,
          api_key_encrypted: data.api_key,
          session_id: data.session_id || null,
          is_default: instances.length === 0,
        })
        .select('id, tenant_id, name, phone_number, status, is_default, last_connected_at, created_at, updated_at')
        .single();

      if (createError) {
        const errorMessage = createError.message?.toLowerCase() || '';
        if (errorMessage.includes('limit') || errorMessage.includes('instance_limit_reached')) {
          throw new Error('Instance limit reached. Please upgrade your plan to add more instances.');
        }
        throw createError;
      }

      return instance as WhatsAppInstance;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instances'] });
    },
    onError: (err: Error) => {
      toast({
        title: 'Failed to create instance',
        description: err.message,
        variant: 'destructive',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateInstanceData }) => {
      const updateData: any = {};
      if (data.name !== undefined) updateData.name = data.name;
      if (data.phone_number !== undefined) updateData.phone_number = data.phone_number;
      if (data.api_key !== undefined) updateData.api_key_encrypted = data.api_key;
      if (data.session_id !== undefined) updateData.session_id = data.session_id;
      if (data.is_default !== undefined) updateData.is_default = data.is_default;

      // If setting as default, unset other defaults first
      if (data.is_default && currentTenant) {
        await supabase
          .from('whatsapp_instances')
          .update({ is_default: false })
          .eq('tenant_id', currentTenant.id)
          .neq('id', id);
      }

      const { data: instance, error: updateError } = await supabase
        .from('whatsapp_instances')
        .update(updateData)
        .eq('id', id)
        .select('id, tenant_id, name, phone_number, status, is_default, last_connected_at, created_at, updated_at')
        .single();

      if (updateError) throw updateError;
      return instance as WhatsAppInstance;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instances'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      // Get instance details before soft delete for notifications
      const { data: instanceData } = await supabase
        .from('whatsapp_instances')
        .select('name, tenant_id')
        .eq('id', id)
        .single();
      
      // Get tenant name for admin notification
      let tenantName = 'Unknown Tenant';
      if (instanceData?.tenant_id) {
        const { data: tenantData } = await supabase
          .from('tenants')
          .select('name')
          .eq('id', instanceData.tenant_id)
          .single();
        tenantName = tenantData?.name || 'Unknown Tenant';
      }

      // Soft delete - preserve associated data but clear session data
      // This allows the tenant to create a new instance without hitting limits
      // and ensures the wasender session can be properly released
      const { error: deleteError } = await supabase
        .from('whatsapp_instances')
        .update({ 
          is_deleted: true, 
          deleted_at: new Date().toISOString(),
          status: 'disconnected',
          // Clear session identifiers so a new session can be created
          wasender_session_id: null,
          session_id: null,
          api_key_encrypted: null,
          qr_code: null,
          qr_expires_at: null,
        })
        .eq('id', id);

      if (deleteError) throw deleteError;

      // Create tenant notification about deletion
      if (instanceData?.tenant_id) {
        await supabase.from('in_app_notifications').insert({
          tenant_id: instanceData.tenant_id,
          type: 'instance_deleted',
          title: 'WhatsApp Instance Removed',
          message: `"${instanceData.name}" has been removed. Your chat history is preserved.`,
          entity_type: 'instance',
          entity_id: id,
          metadata: {
            instance_name: instanceData.name,
            deleted_at: new Date().toISOString()
          }
        });

        // Create admin notification about deletion
        await supabase.from('admin_notifications').insert({
          type: 'instance_deleted',
          title: `Instance Deleted: ${instanceData.name}`,
          message: `${tenantName} deleted WhatsApp instance "${instanceData.name}"`,
          tenant_id: instanceData.tenant_id,
          entity_type: 'instance',
          entity_id: id,
          metadata: {
            instance_name: instanceData.name,
            tenant_name: tenantName,
            deleted_at: new Date().toISOString()
          }
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instances'] });
    },
  });

  const createInstance = async (data: CreateInstanceData) => {
    return createMutation.mutateAsync(data);
  };

  const updateInstance = async (id: string, data: UpdateInstanceData) => {
    return updateMutation.mutateAsync({ id, data });
  };

  const deleteInstance = async (id: string) => {
    return deleteMutation.mutateAsync(id);
  };

  const setDefaultInstance = async (id: string) => {
    await updateInstance(id, { is_default: true });
  };

  return {
    instances,
    loading,
    error: error as Error | null,
    createInstance,
    updateInstance,
    deleteInstance,
    setDefaultInstance,
    refetch: () => queryClient.invalidateQueries({ queryKey }),
    defaultInstance: instances.find((inst) => inst.is_default),
  };
}
