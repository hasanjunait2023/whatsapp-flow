import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface SystemTenantInstance {
  id: string;
  name: string;
  phone_number: string | null;
  status: string;
  is_default: boolean;
  webhook_secret: string | null;
  created_at: string;
  updated_at: string;
}

export interface SystemTenantInfo {
  id: string;
  name: string;
}

export function useAdminCommunication() {
  const [systemTenant, setSystemTenant] = useState<SystemTenantInfo | null>(null);
  const [instances, setInstances] = useState<SystemTenantInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();

  const fetchSystemTenant = useCallback(async () => {
    try {
      const { data: tenant, error: tenantError } = await supabase
        .from('tenants')
        .select('id, name')
        .eq('settings->>is_system_tenant', 'true')
        .single();

      if (tenantError) {
        console.error('Error fetching system tenant:', tenantError);
        return null;
      }

      setSystemTenant(tenant);
      return tenant;
    } catch (err) {
      console.error('Error fetching system tenant:', err);
      return null;
    }
  }, []);

  const fetchInstances = useCallback(async (tenantId: string) => {
    try {
      const { data, error } = await supabase
        .from('whatsapp_instances')
        .select('id, name, phone_number, status, is_default, webhook_secret, created_at, updated_at')
        .eq('tenant_id', tenantId)
        .or('is_deleted.is.null,is_deleted.eq.false')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInstances(data || []);
    } catch (err) {
      console.error('Error fetching WhatsApp instances:', err);
    }
  }, []);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const tenant = await fetchSystemTenant();
    if (tenant) {
      await fetchInstances(tenant.id);
    }
    setLoading(false);
  }, [fetchSystemTenant, fetchInstances]);

  const getInvokeErrorMessage = (err: unknown): string => {
    // Supabase functions.invoke() errors typically include `context.body`
    const anyErr = err as any;
    const body = anyErr?.context?.body;
    if (typeof body === 'string') {
      try {
        const parsed = JSON.parse(body);
        return parsed?.error || parsed?.message || anyErr?.message || 'Request failed';
      } catch {
        // ignore
      }
    }
    return anyErr?.message || 'Request failed';
  };

  const createInstance = async (name: string, phoneNumber: string): Promise<string | null> => {
    setCreating(true);
    
    // Create a timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Request timed out. Please try again.')), 30000);
    });
    
    try {
      const invokePromise = supabase.functions.invoke('admin-wasender-create-session', {
        body: { name, phone_number: phoneNumber },
      });
      
      const { data, error } = await Promise.race([invokePromise, timeoutPromise]);

      if (error) {
        throw new Error(getInvokeErrorMessage(error));
      }
      
      if (data?.error) {
        throw new Error(data.error);
      }

      // Handle adopted/already connected case
      if (data?.adopted || data?.status === 'active') {
        toast({
          title: data?.status === 'active' ? 'Already Connected' : 'Session Adopted',
          description: data?.status === 'active' 
            ? 'This WhatsApp instance is already active.'
            : 'Existing session found and linked. You may need to scan QR.',
        });
      } else {
        toast({
          title: 'Instance Created',
          description: 'WhatsApp instance created. Scan the QR code to connect.',
        });
      }

      if (systemTenant) {
        await fetchInstances(systemTenant.id);
      }

      return data?.instance_id || null;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create instance';
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
      throw err;
    } finally {
      setCreating(false);
    }
  };

  const deleteInstance = async (id: string): Promise<boolean> => {
    try {
      setDeleting(true);

      const { error } = await supabase
        .from('whatsapp_instances')
        .update({
          is_deleted: true,
          deleted_at: new Date().toISOString(),
          status: 'disconnected'
        })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Instance Removed',
        description: 'WhatsApp instance has been removed.',
      });

      if (systemTenant) {
        await fetchInstances(systemTenant.id);
      }

      return true;
    } catch (err) {
      console.error('Error deleting instance:', err);
      toast({
        title: 'Error',
        description: 'Failed to remove instance',
        variant: 'destructive',
      });
      return false;
    } finally {
      setDeleting(false);
    }
  };

  const updateInstanceStatus = async (id: string, status: 'active' | 'disconnected' | 'banned') => {
    try {
      const { error } = await supabase
        .from('whatsapp_instances')
        .update({ status })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Status Updated',
        description: `Instance status changed to ${status}`,
      });

      if (systemTenant) {
        await fetchInstances(systemTenant.id);
      }
    } catch (err) {
      console.error('Error updating instance status:', err);
      toast({
        title: 'Error',
        description: 'Failed to update instance status',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return {
    systemTenant,
    instances,
    loading,
    creating,
    deleting,
    fetchAll,
    createInstance,
    deleteInstance,
    updateInstanceStatus,
  };
}
