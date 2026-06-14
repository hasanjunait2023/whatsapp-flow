import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface UseInstanceQROptions {
  instanceId: string;
  enabled?: boolean;
}

interface QRState {
  qrCode: string | null;
  expiresAt: Date | null;
  status: 'loading' | 'awaiting_scan' | 'connected' | 'error' | 'expired';
  error: string | null;
}

export function useInstanceQR({ instanceId, enabled = true }: UseInstanceQROptions) {
  const { toast } = useToast();
  const [state, setState] = useState<QRState>({
    qrCode: null,
    expiresAt: null,
    status: 'loading',
    error: null,
  });
  const [countdown, setCountdown] = useState<number>(0);

  // Fetch initial QR state
  const fetchQR = useCallback(async () => {
    if (!instanceId || !enabled) return;

    try {
      setState((prev) => ({ ...prev, status: 'loading', error: null }));

      const { data: instance, error } = await supabase
        .from('whatsapp_instances')
        .select('qr_code, qr_expires_at, status')
        .eq('id', instanceId)
        .single();

      if (error) throw error;

      if (instance.status === 'active') {
        setState({
          qrCode: null,
          expiresAt: null,
          status: 'connected',
          error: null,
        });
      } else if (instance.qr_code) {
        const expiresAt = instance.qr_expires_at
          ? new Date(instance.qr_expires_at)
          : new Date(Date.now() + 60000);

        setState({
          qrCode: instance.qr_code,
          expiresAt,
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
      console.error('Error fetching QR:', err);
      setState((prev) => ({
        ...prev,
        status: 'error',
        error: err instanceof Error ? err.message : 'Failed to fetch QR code',
      }));
    }
  }, [instanceId, enabled]);

  // Request new QR code. `silent` is used by the auto-refresh loop: it swaps in
  // the fresh QR without flashing a loading spinner or toasting, and never wipes
  // a working QR to an error state on a transient failure.
  const refreshQR = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!instanceId) return;
      const silent = opts?.silent ?? false;

      try {
        if (!silent) setState((prev) => ({ ...prev, status: 'loading', error: null }));

        const { data, error } = await supabase.functions.invoke('wasender-connect-session', {
          body: { instance_id: instanceId },
        });

        if (error) throw error;

        // connect-session returns the inner fn payload: { qr_code, expires_at }
        // when a code is available, or { status: 'active' } once linked.
        const payload = (data ?? {}) as {
          qr_code?: string;
          expires_at?: string;
          status?: string;
        };

        if (payload.status === 'active') {
          setState({ qrCode: null, expiresAt: null, status: 'connected', error: null });
        } else if (payload.qr_code) {
          setState({
            qrCode: payload.qr_code,
            expiresAt: payload.expires_at
              ? new Date(payload.expires_at)
              : new Date(Date.now() + 20000),
            status: 'awaiting_scan',
            error: null,
          });
        } else {
          await fetchQR();
        }

        if (!silent) {
          toast({
            title: 'QR code refreshed',
            description: 'Scan the new QR code to connect.',
          });
        }
      } catch (err) {
        console.error('Error refreshing QR:', err);
        if (silent) return; // keep the current QR; the next tick will retry
        toast({
          title: 'Failed to refresh QR',
          description: err instanceof Error ? err.message : 'Unknown error',
          variant: 'destructive',
        });
        setState((prev) => ({
          ...prev,
          status: 'error',
          error: err instanceof Error ? err.message : 'Failed to refresh QR code',
        }));
      }
    },
    [instanceId, fetchQR, toast],
  );

  // Subscribe to realtime updates
  useEffect(() => {
    if (!instanceId || !enabled) return;

    fetchQR();

    const channel = supabase
      .channel(`instance-qr-${instanceId}`)
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
            qr_expires_at: string | null;
            status: string;
          };

          if (instance.status === 'active') {
            setState({
              qrCode: null,
              expiresAt: null,
              status: 'connected',
              error: null,
            });
          } else if (instance.qr_code) {
            const expiresAt = instance.qr_expires_at
              ? new Date(instance.qr_expires_at)
              : new Date(Date.now() + 60000);

            setState({
              qrCode: instance.qr_code,
              expiresAt,
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

  // Countdown timer for QR expiry
  useEffect(() => {
    if (!state.expiresAt || state.status !== 'awaiting_scan') {
      setCountdown(0);
      return;
    }

    const updateCountdown = () => {
      const remaining = Math.max(0, Math.floor((state.expiresAt!.getTime() - Date.now()) / 1000));
      setCountdown(remaining);

      if (remaining <= 0) {
        setState((prev) => ({ ...prev, status: 'expired' }));
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [state.expiresAt, state.status]);

  // Auto-refresh the QR before WhatsApp rotates it (~20s). Without this the
  // displayed code goes stale and scanning it fails with "invalid". Runs only
  // while the dialog is open and the instance is still awaiting a scan.
  useEffect(() => {
    if (!instanceId || !enabled) return;
    if (state.status === 'connected' || state.status === 'error') return;

    const interval = setInterval(() => {
      void refreshQR({ silent: true });
    }, 18000);

    return () => clearInterval(interval);
  }, [instanceId, enabled, state.status, refreshQR]);

  return {
    qrCode: state.qrCode,
    expiresAt: state.expiresAt,
    status: state.status,
    error: state.error,
    countdown,
    refreshQR,
    refetch: fetchQR,
  };
}
