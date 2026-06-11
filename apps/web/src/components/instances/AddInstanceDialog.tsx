import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { useInstances } from '@/hooks/useInstances';
import { useTenant } from '@/hooks/useTenant';
import { 
  Loader2, 
  Eye, 
  EyeOff, 
  Smartphone, 
  Key, 
  Hash, 
  Zap, 
  QrCode,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { QRCodeSVG } from 'qrcode.react';
import { cn } from '@/lib/utils';

interface AddInstanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type AutoProvisionStep = 'idle' | 'creating' | 'connecting' | 'awaiting_qr' | 'scanning' | 'connected' | 'error';

// Parse invoke error to get message
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

// Get friendly error message
function getFriendlyError(error: any): string {
  const message = getInvokeErrorMessage(error);
  const code = error?.code || '';
  
  if (code === 'PHONE_TAKEN_NOT_IN_ACCOUNT' || message.includes('not under your account')) {
    return 'This phone number is registered in Wasender but not under your account. Please contact support or use a different number.';
  }
  if (code === 'INSTANCE_LIMIT_REACHED' || message.includes('limit reached')) {
    return 'You have reached your instance limit. Please upgrade your plan or delete an existing instance.';
  }
  if (code === 'SUBSCRIPTION_INACTIVE' || message.includes('Payment required')) {
    return 'Your subscription is inactive. Please update your payment method.';
  }
  if (message.includes('session limit')) {
    return 'You have reached your WhatsApp session limit. Please delete an existing session on your Wasender dashboard or upgrade your plan.';
  }
  if (message.includes('phone number')) {
    return 'Invalid phone number format. Please use international format (e.g., +8801842243163).';
  }
  
  return message || 'Failed to create session';
}

export default function AddInstanceDialog({ open, onOpenChange }: AddInstanceDialogProps) {
  // BYOK form state
  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  
  // Auto-provision state
  const [autoStep, setAutoStep] = useState<AutoProvisionStep>('idle');
  const [autoName, setAutoName] = useState('');
  const [autoPhoneNumber, setAutoPhoneNumber] = useState('');
  const [autoInstanceId, setAutoInstanceId] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  
  // Timeout ref for cleanup
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const { refetch } = useInstances();
  const { currentTenant } = useTenant();
  const { toast } = useToast();

  const applyQrState = useCallback((nextQrCode: string, nextExpiresAt?: string | null) => {
    setQrCode(nextQrCode);
    setAutoStep('scanning');

    if (nextExpiresAt) {
      const expiresAt = new Date(nextExpiresAt);
      const remaining = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000));
      setCountdown(remaining);
    } else {
      setCountdown(60);
    }
  }, []);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setAutoStep('idle');
      setAutoName('');
      setAutoPhoneNumber('');
      setAutoInstanceId(null);
      setQrCode(null);
      setCountdown(0);
      setErrorMessage('');
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    }
  }, [open]);

  // Subscribe to realtime updates when we have an instance
  useEffect(() => {
    if (!autoInstanceId || !open) return;

    const channel = supabase
      .channel(`instance-qr-${autoInstanceId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'whatsapp_instances',
          filter: `id=eq.${autoInstanceId}`,
        },
        (payload) => {
          const instance = payload.new as {
            qr_code: string | null;
            qr_expires_at: string | null;
            status: string;
          };

          console.log('Instance updated:', instance);

          if (instance.status === 'active') {
            setAutoStep('connected');
            setQrCode(null);
            toast({
              title: 'Connected!',
              description: 'Your WhatsApp instance is now active.',
            });
            
            setTimeout(() => {
              onOpenChange(false);
              refetch();
            }, 2000);
          } else if (instance.qr_code && autoStep !== 'connected') {
            applyQrState(instance.qr_code, instance.qr_expires_at);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [autoInstanceId, open, onOpenChange, refetch, toast, autoStep, applyQrState]);

  // Poll DB for QR/status during awaiting_qr or connecting
  useEffect(() => {
    if (!open || !autoInstanceId) return;
    if (!['awaiting_qr', 'connecting'].includes(autoStep)) return;

    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 30; // ~30s

    const poll = async () => {
      try {
        attempts += 1;
        const { data, error } = await supabase
          .from('whatsapp_instances')
          .select('qr_code, qr_expires_at, status')
          .eq('id', autoInstanceId)
          .single();

        if (cancelled) return;
        if (error) return;

        if (data?.status === 'active') {
          setAutoStep('connected');
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
        
        // Timeout after max attempts
        if (attempts >= maxAttempts && autoStep === 'awaiting_qr') {
          setAutoStep('error');
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
  }, [open, autoInstanceId, autoStep, applyQrState, toast, onOpenChange, refetch]);

  // Poll Wasender status during scanning
  useEffect(() => {
    if (!open || !autoInstanceId) return;
    if (autoStep !== 'scanning') return;

    let cancelled = false;
    const pollInterval = 3000;

    const checkStatus = async () => {
      if (cancelled) return;
      
      try {
        const { data, error } = await supabase.functions.invoke('wasender-check-status', {
          body: { instance_id: autoInstanceId }
        });

        if (cancelled) return;
        if (error) return;

        if (data?.status === 'active') {
          setAutoStep('connected');
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
    const id = setInterval(checkStatus, pollInterval);

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [open, autoInstanceId, autoStep, onOpenChange, refetch, toast]);

  // Countdown timer
  useEffect(() => {
    if (countdown <= 0 || autoStep !== 'scanning') return;
    
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [countdown, autoStep]);

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Auto-provision handler - 2 step flow
  const handleAutoProvision = async () => {
    if (!currentTenant) {
      toast({
        title: 'No workspace selected',
        description: 'Please select a workspace first.',
        variant: 'destructive',
      });
      return;
    }

    if (!autoPhoneNumber.trim()) {
      toast({
        title: 'Phone number required',
        description: 'Please enter the WhatsApp phone number you want to connect.',
        variant: 'destructive',
      });
      return;
    }

    setAutoStep('creating');
    setErrorMessage('');

    // Set client-side timeout
    timeoutRef.current = setTimeout(() => {
      if (autoStep === 'creating' || autoStep === 'connecting') {
        setAutoStep('error');
        setErrorMessage('Request timed out. Please try again.');
      }
    }, 30000);

    try {
      // Step 1: Create session
      const { data, error } = await supabase.functions.invoke('wasender-create-session', {
        body: {
          tenant_id: currentTenant.id,
          phone_number: autoPhoneNumber.trim(),
        },
      });

      if (error) throw error;
      
      if (data?.error) {
        throw { message: data.error, code: data.code };
      }

      console.log('Create session response:', data);
      const instanceId = data.instance_id;
      setAutoInstanceId(instanceId);

      // Update instance name if provided
      if (autoName.trim()) {
        await supabase
          .from('whatsapp_instances')
          .update({ name: autoName.trim() })
          .eq('id', instanceId);
      }

      // Check if already active
      if (data.status === 'active') {
        setAutoStep('connected');
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

      // Step 2: Connect session (if needs_connect)
      if (data.needs_connect) {
        setAutoStep('connecting');
        
        const { data: connectData, error: connectError } = await supabase.functions.invoke('wasender-connect-session', {
          body: { instance_id: instanceId },
        });

        if (connectError) {
          console.error('Connect error:', connectError);
          // Don't throw - continue to await QR
        }

        // Check if already connected
        if (connectData?.status === 'active') {
          setAutoStep('connected');
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

      // Move to awaiting QR
      setAutoStep('awaiting_qr');

      // Clear timeout since we're now waiting for QR
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

    } catch (error: any) {
      console.error('Auto-provision error:', error);
      setAutoStep('error');
      setErrorMessage(getFriendlyError(error));
      toast({
        title: 'Failed to create session',
        description: getFriendlyError(error),
        variant: 'destructive',
      });
    } finally {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    }
  };

  // Refresh QR code
  const handleRefreshQR = async () => {
    if (!autoInstanceId) return;

    setAutoStep('awaiting_qr');
    setQrCode(null);

    try {
      const { data, error } = await supabase.functions.invoke('wasender-connect-session', {
        body: { instance_id: autoInstanceId },
      });

      if (error) throw error;

      if (data?.status === 'active') {
        setAutoStep('connected');
        return;
      }

      toast({
        title: 'QR code refreshed',
        description: 'Scan the new QR code to connect.',
      });
    } catch (error: any) {
      console.error('Refresh QR error:', error);
      toast({
        title: 'Failed to refresh QR',
        description: getInvokeErrorMessage(error),
        variant: 'destructive',
      });
    }
  };

  // BYOK submit handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast({
        title: 'Name required',
        description: 'Please enter a name for this instance.',
        variant: 'destructive',
      });
      return;
    }

    if (!apiKey.trim()) {
      toast({
        title: 'API Key required',
        description: 'Please enter your WhatsApp API key.',
        variant: 'destructive',
      });
      return;
    }

    if (!sessionId.trim()) {
      toast({
        title: 'Session ID required',
        description: 'Please enter your Session ID to connect.',
        variant: 'destructive',
      });
      return;
    }

    if (!currentTenant) {
      toast({
        title: 'No workspace selected',
        description: 'Please select a workspace first.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    setLoadingMessage('Verifying session...');

    try {
      setLoadingMessage('Configuring webhook...');
      const { data, error } = await supabase.functions.invoke('setup-byok-instance', {
        body: {
          tenant_id: currentTenant.id,
          name: name.trim(),
          phone_number: phoneNumber.trim() || undefined,
          api_key: apiKey.trim(),
          session_id: sessionId.trim(),
        },
      });

      if (error) throw error;
      
      if (data?.error) {
        throw new Error(data.error);
      }

      toast({
        title: 'Instance connected!',
        description: `"${name}" has been linked successfully. Status: ${data.session_status}`,
      });

      await refetch();

      setName('');
      setPhoneNumber('');
      setApiKey('');
      setSessionId('');
      onOpenChange(false);
    } catch (error: any) {
      console.error('BYOK setup error:', error);
      toast({
        title: 'Failed to connect instance',
        description: error.message || 'Unknown error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-whatsapp" />
            Add WhatsApp Instance
          </DialogTitle>
          <DialogDescription>
            Connect a new WhatsApp number to your workspace
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="auto" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="auto" className="gap-2">
              <Zap className="h-4 w-4" />
              Quick Setup
            </TabsTrigger>
            <TabsTrigger value="byok" className="gap-2">
              <Key className="h-4 w-4" />
              Use API Key
            </TabsTrigger>
          </TabsList>

          {/* Auto-Provision Tab */}
          <TabsContent value="auto" className="mt-4">
            {autoStep === 'idle' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="autoName">Instance Name (optional)</Label>
                  <Input
                    id="autoName"
                    placeholder="e.g., Sales Team, Support"
                    value={autoName}
                    onChange={(e) => setAutoName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="autoPhoneNumber">Phone Number <span className="text-destructive">*</span></Label>
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="autoPhoneNumber"
                      placeholder="01842243163"
                      value={autoPhoneNumber}
                      onChange={(e) => setAutoPhoneNumber(e.target.value)}
                      className="pl-9"
                      required
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Enter the WhatsApp number you'll connect (country code will be added automatically)
                  </p>
                </div>

                <Button 
                  onClick={handleAutoProvision} 
                  className="w-full bg-whatsapp hover:bg-whatsapp/90"
                >
                  <QrCode className="mr-2 h-4 w-4" />
                  Create & Show QR Code
                </Button>
              </div>
            )}

            {(autoStep === 'creating' || autoStep === 'connecting') && (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-12 w-12 animate-spin text-whatsapp mb-4" />
                <p className="text-muted-foreground">
                  {autoStep === 'creating' ? 'Creating WhatsApp session...' : 'Connecting to WhatsApp...'}
                </p>
              </div>
            )}

            {autoStep === 'awaiting_qr' && (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground">Generating QR code...</p>
                <p className="text-xs text-muted-foreground mt-2">This may take a few seconds</p>
              </div>
            )}

            {autoStep === 'scanning' && (
              <div className="flex flex-col items-center">
                <div className={cn(
                  'bg-white p-3 rounded-xl shadow-lg border-4 border-whatsapp/20',
                  countdown <= 10 && 'border-warning/50'
                )}>
                  {qrCode ? (
                    <QRCodeSVG
                      value={qrCode}
                      size={200}
                      level="M"
                      bgColor="#ffffff"
                      fgColor="#000000"
                    />
                  ) : (
                    <div className="w-[200px] h-[200px] flex items-center justify-center bg-muted rounded">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  )}
                </div>

                {countdown > 0 && (
                  <div className="mt-4 w-full max-w-[200px]">
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Expires in
                      </span>
                      <span className={cn(
                        'font-mono font-medium',
                        countdown <= 15 && 'text-warning'
                      )}>
                        {formatCountdown(countdown)}
                      </span>
                    </div>
                    <Progress 
                      value={(countdown / 60) * 100} 
                      className={cn(
                        'h-1.5',
                        countdown <= 15 && '[&>div]:bg-warning'
                      )}
                    />
                  </div>
                )}

                {countdown <= 10 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRefreshQR}
                    className="mt-3"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh QR Code
                  </Button>
                )}

                <div className="mt-6 bg-muted/30 rounded-lg p-4 w-full">
                  <p className="text-sm font-medium mb-2 flex items-center gap-2">
                    <Smartphone className="h-4 w-4 text-whatsapp" />
                    How to scan
                  </p>
                  <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                    <li>Open WhatsApp on your phone</li>
                    <li>Go to <strong>Settings → Linked Devices</strong></li>
                    <li>Tap <strong>Link a Device</strong></li>
                    <li>Point your camera at this QR code</li>
                  </ol>
                </div>
              </div>
            )}

            {autoStep === 'connected' && (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="h-20 w-20 rounded-full bg-success/10 flex items-center justify-center mb-4 animate-pulse">
                  <CheckCircle2 className="h-10 w-10 text-success" />
                </div>
                <p className="text-xl font-semibold text-success mb-1">Connected!</p>
                <p className="text-sm text-muted-foreground">
                  Your WhatsApp is now linked
                </p>
              </div>
            )}

            {autoStep === 'error' && (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                  <XCircle className="h-8 w-8 text-destructive" />
                </div>
                <p className="font-medium text-destructive mb-1">Failed</p>
                <p className="text-sm text-muted-foreground text-center mb-4 max-w-[280px]">
                  {errorMessage || 'Unable to create session'}
                </p>
                <Button onClick={() => setAutoStep('idle')}>
                  Try Again
                </Button>
              </div>
            )}
          </TabsContent>

          {/* BYOK Tab */}
          <TabsContent value="byok" className="mt-4">
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Instance Name</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Sales Team, Support"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phoneNumber">Phone Number (optional)</Label>
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="phoneNumber"
                      placeholder="+880 1712-345678"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      disabled={isLoading}
                      className="pl-9"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="apiKey">API Key</Label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="apiKey"
                      type={showApiKey ? 'text' : 'password'}
                      placeholder="Enter your API key"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      disabled={isLoading}
                      className="pl-9 pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                      onClick={() => setShowApiKey(!showApiKey)}
                    >
                      {showApiKey ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Your WhatsApp API key for authentication
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sessionId">Session ID <span className="text-destructive">*</span></Label>
                  <Input
                    id="sessionId"
                    placeholder="Enter your session ID"
                    value={sessionId}
                    onChange={(e) => setSessionId(e.target.value)}
                    disabled={isLoading}
                  />
                  <p className="text-xs text-muted-foreground">
                    Find this in your API dashboard under "Sessions".
                  </p>
                </div>
              </div>
              <DialogFooter className="mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {loadingMessage || 'Connecting...'}
                    </>
                  ) : (
                    'Connect Instance'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
