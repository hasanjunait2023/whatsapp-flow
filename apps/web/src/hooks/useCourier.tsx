import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { useToast } from '@/hooks/use-toast';

export interface CourierIntegration {
  id: string;
  tenant_id: string;
  provider: 'steadfast' | 'pathao';
  api_key: string | null;
  api_secret: string | null;
  store_id: string | null;
  is_active: boolean;
  default_pickup_address: {
    name?: string;
    phone?: string;
    address?: string;
    city?: string;
    zone?: string;
    area?: string;
  };
  settings: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface Shipment {
  id: string;
  tenant_id: string;
  order_id: string;
  courier: string;
  consignment_id: string | null;
  tracking_code: string | null;
  status: string;
  delivery_fee: number | null;
  cod_amount: number | null;
  pickup_address: Record<string, any> | null;
  delivery_address: Record<string, any> | null;
  weight_kg: number | null;
  item_description: string | null;
  special_instructions: string | null;
  courier_response: Record<string, any> | null;
  booked_at: string | null;
  delivered_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface BookParcelData {
  order_id: string;
  courier: 'steadfast' | 'pathao';
  recipient_name: string;
  recipient_phone: string;
  recipient_address: string;
  recipient_city?: string;
  recipient_zone?: string;
  recipient_area?: string;
  weight_kg?: number;
  item_description?: string;
  cod_amount?: number;
  special_instructions?: string;
}

export function useCourier() {
  const { currentTenant } = useTenantContext();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const tenantId = currentTenant?.id;

  const { data: integrations = [], isLoading: integrationsLoading } = useQuery({
    queryKey: ['courier-integrations', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      
      const { data, error } = await supabase
        .from('courier_integrations')
        .select('*')
        .eq('tenant_id', tenantId);

      if (error) throw error;
      return data as CourierIntegration[];
    },
    enabled: !!tenantId,
  });

  const { data: shipments = [], isLoading: shipmentsLoading } = useQuery({
    queryKey: ['shipments', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      
      const { data, error } = await supabase
        .from('shipments')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Shipment[];
    },
    enabled: !!tenantId,
  });

  const getShipmentsByOrder = (orderId: string) => {
    return shipments.filter(s => s.order_id === orderId);
  };

  const upsertIntegration = useMutation({
    mutationFn: async (data: Partial<CourierIntegration> & { provider: 'steadfast' | 'pathao' }) => {
      if (!tenantId) throw new Error('No tenant selected');

      const { data: result, error } = await supabase
        .from('courier_integrations')
        .upsert({
          tenant_id: tenantId,
          provider: data.provider,
          api_key: data.api_key,
          api_secret: data.api_secret,
          store_id: data.store_id,
          is_active: data.is_active ?? true,
          default_pickup_address: data.default_pickup_address || {},
          settings: data.settings || {},
        }, { onConflict: 'tenant_id,provider' })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courier-integrations', tenantId] });
      toast({ title: 'Courier integration saved' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to save integration', description: error.message, variant: 'destructive' });
    },
  });

  const bookParcel = useMutation({
    mutationFn: async (data: BookParcelData) => {
      const response = await supabase.functions.invoke('courier-book-parcel', {
        body: data,
      });

      if (response.error) throw new Error(response.error.message);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipments', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['orders', tenantId] });
      toast({ title: 'Parcel booked successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to book parcel', description: error.message, variant: 'destructive' });
    },
  });

  const trackParcel = useMutation({
    mutationFn: async (shipmentId: string) => {
      const response = await supabase.functions.invoke('courier-track-parcel', {
        body: { shipment_id: shipmentId },
      });

      if (response.error) throw new Error(response.error.message);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipments', tenantId] });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to track parcel', description: error.message, variant: 'destructive' });
    },
  });

  const bulkBookParcels = useMutation({
    mutationFn: async (parcels: BookParcelData[]) => {
      const response = await supabase.functions.invoke('courier-book-parcel', {
        body: { parcels },
      });

      if (response.error) throw new Error(response.error.message);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['shipments', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['orders', tenantId] });
      const successCount = data?.results?.filter((r: any) => r.success).length || 0;
      toast({ title: `${successCount} parcels booked successfully` });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to book parcels', description: error.message, variant: 'destructive' });
    },
  });

  const steadfastIntegration = integrations.find(i => i.provider === 'steadfast');
  const pathaoIntegration = integrations.find(i => i.provider === 'pathao');

  return {
    integrations,
    shipments,
    integrationsLoading,
    shipmentsLoading,
    steadfastIntegration,
    pathaoIntegration,
    getShipmentsByOrder,
    upsertIntegration,
    bookParcel,
    trackParcel,
    bulkBookParcels,
  };
}
