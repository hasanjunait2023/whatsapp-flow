import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { useAdminOwnInstances } from '@/hooks/useAdminOwnInstances';
import {
  Loader2,
  Smartphone,
  QrCode,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { QRCodeSVG } from 'qrcode.react';
import { cn } from '@/lib/utils';

interface AdminAddInstanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ProvisionStep = 'form' | 'creating' | 'connecting' | 'awaiting_qr' | 'scanning' | 'connected' | 'error';

function getInvokeErrorMessage(err: unknown): string {
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
}

export default function AdminAddInstanceDialog({ open, onOpenChange }: AdminAddInstanceDialogProps) {
  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [step, setStep] = useState<ProvisionStep>('form');
  const [instanceId, setInstanceId] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
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
      setStep('form');
      setName('');
      setPhoneNumber('');
      setInstanceId(null);
      setQrCode(null);
      setCountdown(0);
      setErrorMessage('');
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    }
  }, [open]);

  // Subscribe to instance updates
  useEffect(() => {
    if (!instanceId || !open) return;

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
            qr_expires_at: string | null;
            status: string;
          };

          if (instance.status === 'active') {
            setStep('connected');
            setQrCode(null);
            toast({
              title: 'Connected!',
              description: 'Your WhatsApp instance is now active.',
            });
            setTimeout(() => {
              onOpenChange(false);
              refetch();
            }, 2000);
          } else if (instance.qr_code && step !== 'connected') {
            applyQrState(instance.qr_code, instance.qr_expires_at);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [instanceId, open, onOpenChange, refetch, toast, step, applyQrState]);

  // Poll for QR during awaiting_qr
  useEffect(() => {
    if (!open || !instanceId) return;
    if (!['awaiting_qr', 'connecting'].includes(step)) return;

    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 30;

    const poll = async () => {
      attempts++;
      try {
        const { data, error } = await supabase
          .from('whatsapp_instances')
          .select('qr_code, qr_expires_at, status')
          .eq('id', instanceId)
          .single();

        if (cancelled) return;
        if (error) return;

        if (data?.status === 'active') {
          setStep('connected');
          setQrCode(null);
          toast({
            title: 'Connected!',
            description: 'Your WhatsApp instance is now active.',
          });
          setTimeout(() => {
            onOpenChange(false);
            refetch();
          }, 2000);
          return;
        }

        if (data?.qr_code) {
          applyQrState(data.qr_code, data.qr_expires_at);
          return;
        }

        if (attempts >= maxAttempts && step === 'awaiting_qr') {
          setStep('error');
          setErrorMessage('Timeout waiting for QR code. Please try again.');
        }
      } catch {
        // ignore
      }
    };

    poll();
    const id = setInterval(poll, 1000);

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [open, instanceId, step, applyQrState, toast, onOpenChange, refetch]);

  // Poll status during scanning
  useEffect(() => {
    if (!open || !instanceId || step !== 'scanning') return;

    let cancelled = false;

    const checkStatus = async () => {
      if (cancelled) return;
      try {
        const { data, error } = await supabase.functions.invoke('wasender-check-status', {
          body: { instance_id: instanceId }
        });

        if (cancelled) return;
        if (error) return;

        if (data?.status === 'active') {
          setStep('connected');
          setQrCode(null);
          toast({
            title: 'Connected!',
            description: 'Your WhatsApp instance is now active.',
          });
          setTimeout(() => {
            onOpenChange(false);
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
  }, [open, instanceId, step, onOpenChange, refetch, toast]);

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

  const handleCreate = async () => {
    if (!name.trim() || !phoneNumber.trim()) {
      toast({
        title: 'Missing fields',
        description: 'Please enter both name and phone number.',
        variant: 'destructive',
      });
      return;
    }

    setStep('creating');
    setErrorMessage('');

    timeoutRef.current = setTimeout(() => {
      if (['creating', 'connecting'].includes(step)) {
        setStep('error');
        setErrorMessage('Request timed out. Please try again.');
      }
    }, 30000);

    try {
      // Step 1: Create session
      const { data, error } = await supabase.functions.invoke('admin-wasender-create-session', {
        body: {
          name: name.trim(),
          phone_number: phoneNumber.trim(),
        },
      });

      if (error) throw error;
      if (data?.error) throw { message: data.error, code: data.code };

      const newInstanceId = data.instance_id;
      setInstanceId(newInstanceId);

      // Check if already active
      if (data.status === 'active') {
        setStep('connected');
        toast({
          title: 'Connected!',
          description: 'Your WhatsApp instance is now active.',
        });
        setTimeout(() => {
          onOpenChange(false);
          refetch();
        }, 2000);
        return;
      }

      // Step 2: Connect session
      if (data.needs_connect || !data.status) {
        setStep('connecting');

        const { data: connectData, error: connectError } = await supabase.functions.invoke('admin-wasender-connect-session', {
          body: { instance_id: newInstanceId },
        });

        if (connectError) {
          console.error('Connect error:', connectError);
        }

        if (connectData?.status === 'active') {
          setStep('connected');
          toast({
            title: 'Connected!',
            description: 'Your WhatsApp instance is now active.',
          });
          setTimeout(() => {
            onOpenChange(false);
            refetch();
          }, 2000);
          return;
        }

        // Check for immediate QR
        const immediateQr =
          connectData?.qr_result?.qr_code ||
          connectData?.qr_result?.qrCode ||
          connectData?.qr_result?.data?.qrCode;

        if (immediateQr) {
          applyQrState(immediateQr, connectData?.qr_result?.expires_at);
          return;
        }
      }

      setStep('awaiting_qr');
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    } catch (error: any) {
      console.error('Create instance error:', error);
      setStep('error');
      setErrorMessage(getInvokeErrorMessage(error));
      toast({
        title: 'Failed to create instance',
        description: getInvokeErrorMessage(error),
        variant: 'destructive',
      });
    } finally {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    }
  };

  const handleRefreshQR = async () => {
    if (!instanceId) return;

    setStep('awaiting_qr');
    setQrCode(null);

    try {
      const { data, error } = await supabase.functions.invoke('admin-wasender-connect-session', {
        body: { instance_id: instanceId },
      });

      if (error) throw error;

      if (data?.status === 'active') {
        setStep('connected');
        return;
      }

      toast({
        title: 'QR code refreshed',
        description: 'Scan the new QR code to connect.',
      });
    } catch (error: any) {
      toast({
        title: 'Failed to refresh QR',
        description: getInvokeErrorMessage(error),
        variant: 'destructive',
      });
    }
  };

  const handleRetry = () => {
    setStep('form');
    setErrorMessage('');
    setInstanceId(null);
    setQrCode(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Smartphone className="h-4 w-4 text-primary" />
            </div>
            Add WhatsApp Instance
          </DialogTitle>
          <DialogDescription>
            Connect a new WhatsApp number to the admin panel
          </DialogDescription>
        </DialogHeader>

        {/* Form Step */}
        {step === 'form' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Instance Name</Label>
              <Input
                id="name"
                placeholder="e.g., Admin Support"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                placeholder="e.g., 01712345678"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Enter the WhatsApp phone number you want to connect
              </p>
            </div>
            <Button onClick={handleCreate} className="w-full">
              Create & Connect
            </Button>
          </div>
        )}

        {/* Creating/Connecting Step */}
        {(step === 'creating' || step === 'connecting' || step === 'awaiting_qr') && (
          <div className="flex flex-col items-center py-8">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">
              {step === 'creating' && 'Creating session...'}
              {step === 'connecting' && 'Connecting...'}
              {step === 'awaiting_qr' && 'Waiting for QR code...'}
            </p>
          </div>
        )}

        {/* Scanning Step */}
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
              <Button onClick={handleRefreshQR} variant="outline" className="mt-4">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh QR
              </Button>
            )}

            <div className="bg-muted/30 rounded-lg p-4 mt-4 w-full">
              <p className="text-sm font-medium mb-2 flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-green-600" />
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

        {/* Connected Step */}
        {step === 'connected' && (
          <div className="flex flex-col items-center py-8">
            <div className="h-20 w-20 rounded-full bg-green-500/10 flex items-center justify-center mb-4 animate-pulse">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            </div>
            <p className="text-xl font-semibold text-green-600 mb-1">Connected!</p>
            <p className="text-sm text-muted-foreground">
              Your WhatsApp is now linked
            </p>
          </div>
        )}

        {/* Error Step */}
        {step === 'error' && (
          <div className="flex flex-col items-center py-8">
            <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
              <XCircle className="h-8 w-8 text-destructive" />
            </div>
            <p className="font-medium text-destructive mb-1">Failed</p>
            <p className="text-sm text-muted-foreground mb-4 text-center max-w-[250px]">
              {errorMessage || 'Unable to create instance. Please try again.'}
            </p>
            <Button onClick={handleRetry}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
