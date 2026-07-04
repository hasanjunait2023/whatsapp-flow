import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@/components/ui/responsive-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useInstanceQR } from '@/hooks/useInstanceQR';
import { WhatsAppInstance } from '@/hooks/useInstances';
import { 
  Loader2, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  Clock,
  Smartphone,
  QrCode,
  Link,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ConnectQRDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  instance: WhatsAppInstance;
  onConnected?: () => void;
}

type ConnectionStep = 'initiating' | 'scanning' | 'connected';

const steps: { key: ConnectionStep; label: string; icon: React.ElementType }[] = [
  { key: 'initiating', label: 'Initiating', icon: Loader2 },
  { key: 'scanning', label: 'Scan QR', icon: QrCode },
  { key: 'connected', label: 'Connected', icon: CheckCircle2 },
];

export default function ConnectQRDialog({
  open,
  onOpenChange,
  instance,
  onConnected,
}: ConnectQRDialogProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { qrCode, status, countdown, error, refreshQR, refetch } = useInstanceQR({
    instanceId: instance.id,
    enabled: open,
  });

  // Determine current step
  const getCurrentStep = (): ConnectionStep => {
    if (status === 'connected') return 'connected';
    if (status === 'awaiting_scan' || status === 'expired') return 'scanning';
    return 'initiating';
  };

  const currentStep = getCurrentStep();

  // Format countdown timer
  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate progress percentage for countdown
  const maxTime = 20; // WAHA QR validity window
  const progressPercent = countdown > 0 ? (countdown / maxTime) * 100 : 0;

  // Handle QR refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshQR();
    setIsRefreshing(false);
  };

  // Auto-close on successful connection
  useEffect(() => {
    if (status === 'connected') {
      const timer = setTimeout(() => {
        onOpenChange(false);
        onConnected?.();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [status, onOpenChange, onConnected]);

  // Trigger connection when dialog opens
  useEffect(() => {
    if (open && instance.status !== 'active') {
      refreshQR();
    }
  }, [open]);

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="sm:max-w-md">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-whatsapp/10 flex items-center justify-center">
              <Smartphone className="h-4 w-4 text-whatsapp" />
            </div>
            Connect {instance.name}
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            Scan the QR code with WhatsApp to link this device
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        {/* Step Indicator */}
        <div className="flex items-center justify-between px-4 py-3 bg-muted/30 rounded-lg">
          {steps.map((step, index) => {
            const StepIcon = step.icon;
            const isActive = step.key === currentStep;
            const isCompleted = 
              (currentStep === 'scanning' && step.key === 'initiating') ||
              (currentStep === 'connected' && step.key !== 'connected');
            
            return (
              <div key={step.key} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={cn(
                      'h-8 w-8 rounded-full flex items-center justify-center transition-colors',
                      isActive && 'bg-primary text-primary-foreground',
                      isCompleted && 'bg-success text-success-foreground',
                      !isActive && !isCompleted && 'bg-muted text-muted-foreground'
                    )}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <StepIcon className={cn('h-4 w-4', isActive && step.key === 'initiating' && 'animate-spin')} />
                    )}
                  </div>
                  <span className={cn(
                    'text-xs mt-1',
                    isActive ? 'text-foreground font-medium' : 'text-muted-foreground'
                  )}>
                    {step.label}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div className={cn(
                    'w-12 h-0.5 mx-2 mb-5',
                    isCompleted ? 'bg-success' : 'bg-border'
                  )} />
                )}
              </div>
            );
          })}
        </div>

        {/* Content based on status */}
        <div className="min-h-[340px] flex flex-col items-center justify-center">
          {/* Loading State */}
          {status === 'loading' && (
            <div className="text-center">
              <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
              <p className="text-muted-foreground">Generating QR code...</p>
            </div>
          )}

          {/* QR Code Display */}
          {(status === 'awaiting_scan' || status === 'expired') && (
            <div className="flex flex-col items-center">
              <div className="relative">
                <div className={cn(
                  'bg-white p-3 rounded-xl shadow-lg border-4',
                  status === 'expired' ? 'border-warning/50 opacity-50' : 'border-whatsapp/20'
                )}>
                  {qrCode ? (
                    <QRCodeSVG
                      value={qrCode}
                      size={200}
                      level="M"
                      bgColor="#ffffff"
                      fgColor="#000000"
                      imageSettings={{
                        src: '/placeholder.svg',
                        height: 40,
                        width: 40,
                        excavate: true,
                      }}
                    />
                  ) : (
                    <div className="w-[200px] h-[200px] flex items-center justify-center bg-muted rounded">
                      <QrCode className="h-12 w-12 text-muted-foreground" />
                    </div>
                  )}
                </div>

                {/* Expired Overlay */}
                {status === 'expired' && (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-xl">
                    <div className="text-center">
                      <Clock className="h-8 w-8 text-warning mx-auto mb-2" />
                      <p className="font-medium text-warning">Expired</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Countdown Timer */}
              {status === 'awaiting_scan' && countdown > 0 && (
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
                    value={progressPercent} 
                    className={cn(
                      'h-1.5',
                      countdown <= 15 && '[&>div]:bg-warning'
                    )}
                  />
                </div>
              )}

              {/* Refresh Button */}
              {(status === 'expired' || countdown <= 10) && (
                <Button
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="mt-4"
                  variant={status === 'expired' ? 'default' : 'outline'}
                >
                  {isRefreshing ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  {status === 'expired' ? 'Generate New QR' : 'Refresh'}
                </Button>
              )}
            </div>
          )}

          {/* Error State */}
          {status === 'error' && (
            <div className="text-center">
              <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                <XCircle className="h-8 w-8 text-destructive" />
              </div>
              <p className="font-medium text-destructive mb-1">Connection Failed</p>
              <p className="text-sm text-muted-foreground mb-4 max-w-[250px]">
                {error || 'Unable to generate QR code. Please try again.'}
              </p>
              <Button onClick={handleRefresh} disabled={isRefreshing}>
                {isRefreshing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Try Again
              </Button>
            </div>
          )}

          {/* Connected State */}
          {status === 'connected' && (
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
        </div>

        {/* Instructions */}
        {(status === 'awaiting_scan' || status === 'loading') && (
          <div className="bg-muted/30 rounded-lg p-4">
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
        )}
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
