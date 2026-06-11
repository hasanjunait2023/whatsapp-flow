import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface UseAdminInstanceQROptions {
  instanceId: string;
  enabled?: boolean;
}

interface QRState {
  qrCode: string | null;
  status: 'loading' | 'awaiting_scan' | 'connected' | 'error' | 'expired';
  error: string | null;
}

export function useAdminInstanceQR({ instanceId, enabled = true }: UseAdminInstanceQROptions) {
  const { toast } = useToast();
  const [state, setState] = useState<QRState>({
    qrCode: null,
    status: 'loading',
    error: null,
  });
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch QR state from admin_whatsapp_instances
  const fetchQR = useCallback(async () => {
    if (!instanceId || !enabled) return;

    try {
      setState((prev) => ({ ...prev, status: 'loading', error: null }));

      const { data: instance, error } = await supabase
        .from('whatsapp_instances')
        .select('qr_code, status')
        .eq('id', instanceId)
        .single();

      if (error) throw error;

      if (instance.status === 'active') {
        setState({
          qrCode: null,
          status: 'connected',
          error: null,
        });
      } else if (instance.qr_code) {
        setState({
          qrCode: instance.qr_code,
          status: 'awaiting_scan',
          error: null,
        });
      } else {
        setState((prev) => ({
          ...prev,
          status: 'loading',
        }));
      }
    } catch (err) {
      console.error('Error fetching admin QR:', err);
      setState((prev) => ({
        ...prev,
        status: 'error',
        error: err instanceof Error ? err.message : 'Failed to fetch QR code',
      }));
    }
  }, [instanceId, enabled]);

  // Request new QR code via admin-specific edge function
  const refreshQR = useCallback(async () => {
    if (!instanceId) return;

    try {
      setIsRefreshing(true);
      setState((prev) => ({ ...prev, status: 'loading', error: null }));

      const { data, error } = await supabase.functions.invoke('admin-wasender-connect-session', {
        body: { instance_id: instanceId },
      });

      if (error) throw error;

      toast({
        title: 'Connection initiated',
        description: 'Scan the QR code to connect.',
      });

      // Wait a moment for QR to be generated
      await new Promise((resolve) => setTimeout(resolve, 2000));
      await fetchQR();
    } catch (err) {
      console.error('Error refreshing admin QR:', err);
      toast({
        title: 'Failed to connect',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
      setState((prev) => ({
        ...prev,
        status: 'error',
        error: err instanceof Error ? err.message : 'Failed to refresh QR code',
      }));
    } finally {
      setIsRefreshing(false);
    }
  }, [instanceId, fetchQR, toast]);

  // Subscribe to realtime updates on admin_whatsapp_instances
  useEffect(() => {
    if (!instanceId || !enabled) return;

    fetchQR();

    const channel = supabase
      .channel(`admin-instance-qr-${instanceId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'whatsapp_instances',
          filter: `id=eq.${instanceId}`,
        },
        (payload) => {
          const instance = payload.new as {
            qr_code: string | null;
            status: string;
          };

          if (instance.status === 'active') {
            setState({
              qrCode: null,
              status: 'connected',
              error: null,
            });
          } else if (instance.qr_code) {
            setState({
              qrCode: instance.qr_code,
              status: 'awaiting_scan',
              error: null,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [instanceId, enabled, fetchQR]);

  return {
    qrCode: state.qrCode,
    status: state.status,
    error: state.error,
    isRefreshing,
    refreshQR,
    refetch: fetchQR,
  };
}
