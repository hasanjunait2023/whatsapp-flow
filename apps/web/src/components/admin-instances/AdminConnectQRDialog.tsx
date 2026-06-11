import { useState, useEffect, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { useAdminOwnInstances, AdminWhatsAppInstance } from '@/hooks/useAdminOwnInstances';
import { supabase } from '@/integrations/supabase/client';
import {
  Loader2,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  Smartphone,
  QrCode,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AdminConnectQRDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  instance: AdminWhatsAppInstance;
  onConnected?: () => void;
}

type ConnectionStep = 'initiating' | 'scanning' | 'connected' | 'error';

export default function AdminConnectQRDialog({
  open,
  onOpenChange,
  instance,
  onConnected,
}: AdminConnectQRDialogProps) {
  const [step, setStep] = useState<ConnectionStep>('initiating');
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { refetch } = useAdminOwnInstances();
  const { toast } = useToast();

  const applyQrState = useCallback((nextQrCode: string, nextExpiresAt?: string | null) => {
    setQrCode(nextQrCode);
    setStep('scanning');
    if (nextExpiresAt) {
      const expiresAt = new Date(nextExpiresAt);
      const remaining = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000));
      setCountdown(remaining);
    } else {
      setCountdown(60);
    }
  }, []);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setStep('initiating');
      setQrCode(null);
      setCountdown(0);
      setError(null);
    }
  }, [open]);

  // Connect when dialog opens
  useEffect(() => {
    if (open && instance.status !== 'active') {
      refreshQR();
    }
  }, [open]);

  const refreshQR = async () => {
    setStep('initiating');
    setQrCode(null);
    setError(null);
    setIsRefreshing(true);

    try {
      const { data, error: invokeError } = await supabase.functions.invoke('admin-wasender-connect-session', {
        body: { instance_id: instance.id },
      });

      if (invokeError) throw invokeError;

      // Check if already connected
      if (data?.status === 'active') {
        setStep('connected');
        toast({
          title: 'Connected!',
          description: 'Your WhatsApp instance is now active.',
        });
        setTimeout(() => {
          onOpenChange(false);
          onConnected?.();
          refetch();
        }, 2000);
        return;
      }

      // New simplified response format from updated connect-session
      // Response: { status: 'awaiting_scan', qr_code: '...', expires_at: '...' }
      const qr = data?.qr_code;
      const expiresAt = data?.expires_at;

      if (qr) {
        applyQrState(qr, expiresAt);
      } else if (data?.status === 'pending') {
        // QR not available yet, keep polling
        setStep('initiating');
      } else {
        // Start polling for QR from DB
        setStep('initiating');
      }
    } catch (err: any) {
      console.error('Connect error:', err);
      setStep('error');
      setError(err.message || 'Failed to connect');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Subscribe to instance updates
  useEffect(() => {
    if (!open) return;

    const channel = supabase
      .channel(`admin-connect-qr-${instance.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'whatsapp_instances',
          filter: `id=eq.${instance.id}`,
        },
        (payload) => {
          const updated = payload.new as {
            qr_code: string | null;
            qr_expires_at: string | null;
            status: string;
          };

          if (updated.status === 'active') {
            setStep('connected');
            setQrCode(null);
            toast({
              title: 'Connected!',
              description: 'Your WhatsApp instance is now active.',
            });
            setTimeout(() => {
              onOpenChange(false);
              onConnected?.();
              refetch();
            }, 2000);
          } else if (updated.qr_code && step !== 'connected') {
            applyQrState(updated.qr_code, updated.qr_expires_at);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [open, instance.id, onOpenChange, onConnected, refetch, toast, step, applyQrState]);

  // Poll for QR during initiating
  useEffect(() => {
    if (!open || step !== 'initiating') return;

    let cancelled = false;
    let attempts = 0;

    const poll = async () => {
      attempts++;
      try {
        const { data, error } = await supabase
          .from('whatsapp_instances')
          .select('qr_code, qr_expires_at, status')
          .eq('id', instance.id)
          .single();

        if (cancelled) return;
        if (error) return;

        if (data?.status === 'active') {
          setStep('connected');
          return;
        }

        if (data?.qr_code) {
          applyQrState(data.qr_code, data.qr_expires_at);
          return;
        }

        if (attempts >= 30) {
          setStep('error');
          setError('Timeout waiting for QR code');
        }
      } catch {
        // ignore
      }
    };

    const id = setInterval(poll, 1000);
    poll();

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [open, step, instance.id, applyQrState]);

  // Poll status during scanning
  useEffect(() => {
    if (!open || step !== 'scanning') return;

    let cancelled = false;

    const checkStatus = async () => {
      if (cancelled) return;
      try {
        const { data } = await supabase.functions.invoke('wasender-check-status', {
          body: { instance_id: instance.id },
        });

        if (cancelled) return;

        if (data?.status === 'active') {
          setStep('connected');
          toast({
            title: 'Connected!',
            description: 'Your WhatsApp instance is now active.',
          });
          setTimeout(() => {
            onOpenChange(false);
            onConnected?.();
            refetch();
          }, 2000);
        }
      } catch {
        // ignore
      }
    };

    checkStatus();
    const id = setInterval(checkStatus, 3000);

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [open, step, instance.id, onOpenChange, onConnected, refetch, toast]);

  // Countdown timer
  useEffect(() => {
    if (countdown <= 0 || step !== 'scanning') return;

    const timer = setInterval(() => {
      setCountdown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [countdown, step]);

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Smartphone className="h-4 w-4 text-primary" />
            </div>
            Connect {instance.name}
          </DialogTitle>
          <DialogDescription>
            Scan the QR code with WhatsApp to link this device
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-[340px] flex flex-col items-center justify-center">
          {/* Initiating */}
          {step === 'initiating' && (
            <div className="text-center">
              <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
              <p className="text-muted-foreground">Generating QR code...</p>
            </div>
          )}

          {/* Scanning */}
          {step === 'scanning' && qrCode && (
            <div className="flex flex-col items-center">
              <div className="bg-white p-3 rounded-xl shadow-lg border-4 border-primary/20">
                <QRCodeSVG
                  value={qrCode}
                  size={200}
                  level="M"
                  bgColor="#ffffff"
                  fgColor="#000000"
                />
              </div>

              {countdown > 0 && (
                <div className="mt-4 w-full max-w-[200px]">
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Expires in
                    </span>
                    <span className={cn('font-mono font-medium', countdown <= 15 && 'text-warning')}>
                      {formatCountdown(countdown)}
                    </span>
                  </div>
                  <Progress value={(countdown / 60) * 100} className="h-1.5" />
                </div>
              )}

              {countdown <= 10 && (
                <Button onClick={refreshQR} variant="outline" className="mt-4" disabled={isRefreshing}>
                  {isRefreshing ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Refresh QR
                </Button>
              )}

              <div className="bg-muted/30 rounded-lg p-4 mt-4 w-full">
                <p className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Smartphone className="h-4 w-4 text-primary" />
                  How to scan
                </p>
                <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>Open WhatsApp on your phone</li>
                  <li>Go to Settings → Linked Devices</li>
                  <li>Tap Link a Device</li>
                  <li>Point your camera at this QR code</li>
                </ol>
              </div>
            </div>
          )}

          {/* Connected */}
          {step === 'connected' && (
            <div className="text-center">
              <div className="h-20 w-20 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4 animate-pulse">
                <CheckCircle2 className="h-10 w-10 text-success" />
              </div>
              <p className="text-xl font-semibold text-success mb-1">Connected!</p>
              <p className="text-sm text-muted-foreground">
                Your WhatsApp is now linked
              </p>
            </div>
          )}

          {/* Error */}
          {step === 'error' && (
            <div className="text-center">
              <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                <XCircle className="h-8 w-8 text-destructive" />
              </div>
              <p className="font-medium text-destructive mb-1">Connection Failed</p>
              <p className="text-sm text-muted-foreground mb-4 max-w-[250px]">
                {error || 'Unable to generate QR code. Please try again.'}
              </p>
              <Button onClick={refreshQR} disabled={isRefreshing}>
                {isRefreshing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Try Again
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
