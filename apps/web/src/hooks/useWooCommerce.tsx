import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { useToast } from '@/hooks/use-toast';

export interface WooCommerceIntegration {
  id: string;
  tenant_id: string;
  store_url: string;
  is_active: boolean;
  last_sync_at: string | null;
  sync_status: string;
  sync_error: string | null;
  settings: any;
  created_at: string;
}

export interface WooCommerceSyncLog {
  id: string;
  integration_id: string;
  sync_type: string;
  status: string;
  products_synced: number;
  categories_synced: number;
  errors: any[];
  started_at: string;
  completed_at: string | null;
}

export function useWooCommerce() {
  const { currentTenant } = useTenantContext();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const tenantId = currentTenant?.id;

  const { data: integration, isLoading } = useQuery({
    queryKey: ['woocommerce-integration', tenantId],
    queryFn: async () => {
      if (!tenantId) return null;
      
      const { data, error } = await supabase
        .from('woocommerce_integrations')
        .select('*')
        .eq('tenant_id', tenantId)
        .maybeSingle();

      if (error) throw error;
      return data as WooCommerceIntegration | null;
    },
    enabled: !!tenantId,
  });

  const { data: syncLogs = [] } = useQuery({
    queryKey: ['woocommerce-sync-logs', integration?.id],
    queryFn: async () => {
      if (!integration?.id) return [];
      
      const { data, error } = await supabase
        .from('woocommerce_sync_logs')
        .select('*')
        .eq('integration_id', integration.id)
        .order('started_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data as WooCommerceSyncLog[];
    },
    enabled: !!integration?.id,
  });

  const testConnection = useMutation({
    mutationFn: async ({ storeUrl, consumerKey, consumerSecret }: {
      storeUrl: string;
      consumerKey: string;
      consumerSecret: string;
    }) => {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await supabase.functions.invoke('woocommerce-sync', {
        body: {
          action: 'test',
          tenantId,
          storeUrl,
          consumerKey,
          consumerSecret,
        },
      });

      if (response.error) throw new Error(response.error.message);
      return response.data;
    },
    onSuccess: () => {
      toast({ title: 'Connection successful', description: 'WooCommerce store connected' });
    },
    onError: (error: Error) => {
      toast({ title: 'Connection failed', description: error.message, variant: 'destructive' });
    },
  });

  const saveIntegration = useMutation({
    mutationFn: async ({ storeUrl, consumerKey, consumerSecret, autoSyncEnabled, syncIntervalHours, syncOrdersEnabled }: {
      storeUrl: string;
      consumerKey: string;
      consumerSecret: string;
      autoSyncEnabled?: boolean;
      syncIntervalHours?: number;
      syncOrdersEnabled?: boolean;
    }) => {
      if (!tenantId) throw new Error('No tenant selected');

      // Credentials are encrypted + verified server-side (the table is read-only
      // + secret-redacted via the generic API). Extra sync prefs go in settings.
      const settings = {
        auto_sync_enabled: autoSyncEnabled,
        sync_interval_hours: syncIntervalHours,
        sync_orders_enabled: syncOrdersEnabled,
      };
      const { data, error } = await supabase.functions.invoke('woocommerce-save-integration', {
        body: {
          store_url: storeUrl.replace(/\/$/, ''),
          consumer_key: consumerKey,
          consumer_secret: consumerSecret,
          is_active: true,
          settings,
        },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['woocommerce-integration', tenantId] });
      toast({ title: 'Integration saved' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to save', description: error.message, variant: 'destructive' });
    },
  });

  const syncProducts = useMutation({
    mutationFn: async () => {
      if (!integration) throw new Error('No integration configured');

      const response = await supabase.functions.invoke('woocommerce-sync', {
        body: {
          action: 'sync',
          tenantId,
          integrationId: integration.id,
        },
      });

      if (response.error) throw new Error(response.error.message);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['woocommerce-integration', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['woocommerce-sync-logs'] });
      queryClient.invalidateQueries({ queryKey: ['products', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['categories', tenantId] });
      toast({ 
        title: 'Sync completed', 
        description: `${data.productsSynced} products and ${data.categoriesSynced} categories synced` 
      });
    },
    onError: (error: Error) => {
      toast({ title: 'Sync failed', description: error.message, variant: 'destructive' });
    },
  });

  const deleteIntegration = useMutation({
    mutationFn: async () => {
      if (!integration) throw new Error('No integration to delete');

      const { error } = await supabase
        .from('woocommerce_integrations')
        .delete()
        .eq('id', integration.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['woocommerce-integration', tenantId] });
      toast({ title: 'Integration removed' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to remove', description: error.message, variant: 'destructive' });
    },
  });

  return {
    integration,
    syncLogs,
    isLoading,
    testConnection,
    saveIntegration,
    syncProducts,
    deleteIntegration,
  };
}
