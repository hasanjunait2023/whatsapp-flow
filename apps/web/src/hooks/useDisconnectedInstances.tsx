import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/useTenant';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface DisconnectedInstance {
  id: string;
  name: string;
  phone_number: string | null;
  status: string;
  connection_error: string | null;
}

interface DisconnectedInstancesState {
  instances: DisconnectedInstance[];
  count: number;
  loading: boolean;
}

export function useDisconnectedInstances() {
  const [state, setState] = useState<DisconnectedInstancesState>({
    instances: [],
    count: 0,
    loading: true,
  });
  const { currentTenant } = useTenant();
  
  const channelRef = useRef<RealtimeChannel | null>(null);
  const tenantIdRef = useRef<string | null>(null);
  const isFetchingRef = useRef(false);

  const fetchDisconnected = useCallback(async () => {
    if (!currentTenant?.id || isFetchingRef.current) {
      if (!currentTenant?.id) {
        setState({ instances: [], count: 0, loading: false });
      }
      return;
    }

    isFetchingRef.current = true;

    try {
      const { data, error } = await supabase
        .from('whatsapp_instances')
        .select('id, name, phone_number, status, connection_error')
        .eq('tenant_id', currentTenant.id)
        .eq('status', 'disconnected');

      if (error) {
        console.error('Error fetching disconnected instances:', error);
        setState(prev => ({ ...prev, loading: false }));
        return;
      }

      setState({
        instances: data || [],
        count: data?.length || 0,
        loading: false,
      });
    } catch (err) {
      console.error('Error fetching disconnected instances:', err);
      setState(prev => ({ ...prev, loading: false }));
    } finally {
      isFetchingRef.current = false;
    }
  }, [currentTenant?.id]);

  // Initial fetch and refetch when tenant changes
  useEffect(() => {
    fetchDisconnected();
  }, [fetchDisconnected]);

  // Setup realtime subscription
  useEffect(() => {
    const tenantId = currentTenant?.id;
    if (!tenantId) return;
    
    if (tenantIdRef.current === tenantId && channelRef.current) {
      return;
    }
    
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    
    tenantIdRef.current = tenantId;
    
    const channel = supabase
      .channel(`disconnected-instances-${tenantId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'whatsapp_instances',
          filter: `tenant_id=eq.${tenantId}`,
        },
        () => {
          fetchDisconnected();
        }
      )
      .subscribe();
    
    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
        tenantIdRef.current = null;
      }
    };
  }, [currentTenant?.id, fetchDisconnected]);

  return {
    disconnectedInstances: state.instances,
    disconnectedCount: state.count,
    hasDisconnected: state.count > 0,
    loading: state.loading,
    refetch: fetchDisconnected,
  };
}
