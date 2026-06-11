import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RefreshCw, Clock, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface QRCodeDisplayProps {
  qrCode: string | null;
  status: 'loading' | 'awaiting_scan' | 'connected' | 'error' | 'expired';
  countdown: number;
  error?: string | null;
  onRefresh: () => void;
  isRefreshing?: boolean;
  className?: string;
}

export default function QRCodeDisplay({
  qrCode,
  status,
  countdown,
  error,
  onRefresh,
  isRefreshing = false,
  className,
}: QRCodeDisplayProps) {
  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (status === 'connected') {
    return (
      <Card className={cn('border-success/30 bg-success/5', className)}>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="h-16 w-16 rounded-full bg-success/20 flex items-center justify-center mb-4">
            <CheckCircle2 className="h-8 w-8 text-success" />
          </div>
          <CardTitle className="text-xl mb-2 text-success">Connected!</CardTitle>
          <CardDescription className="text-center">
            Your WhatsApp instance is now connected and ready to use.
          </CardDescription>
        </CardContent>
      </Card>
    );
  }

  if (status === 'loading') {
    return (
      <Card className={className}>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-12 w-12 animate-spin text-muted-foreground mb-4" />
          <CardDescription>Loading QR code...</CardDescription>
        </CardContent>
      </Card>
    );
  }

  if (status === 'error') {
    return (
      <Card className={cn('border-destructive/30 bg-destructive/5', className)}>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="h-16 w-16 rounded-full bg-destructive/20 flex items-center justify-center mb-4">
            <XCircle className="h-8 w-8 text-destructive" />
          </div>
          <CardTitle className="text-xl mb-2 text-destructive">Error</CardTitle>
          <CardDescription className="text-center mb-4">
            {error || 'Failed to load QR code'}
          </CardDescription>
          <Button onClick={onRefresh} disabled={isRefreshing}>
            {isRefreshing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (status === 'expired') {
    return (
      <Card className={cn('border-warning/30 bg-warning/5', className)}>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="h-16 w-16 rounded-full bg-warning/20 flex items-center justify-center mb-4">
            <Clock className="h-8 w-8 text-warning" />
          </div>
          <CardTitle className="text-xl mb-2 text-warning">QR Code Expired</CardTitle>
          <CardDescription className="text-center mb-4">
            The QR code has expired. Click below to generate a new one.
          </CardDescription>
          <Button onClick={onRefresh} disabled={isRefreshing}>
            {isRefreshing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Refresh QR Code
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="text-center pb-2">
        <CardTitle>Scan QR Code</CardTitle>
        <CardDescription>
          Open WhatsApp on your phone and scan this code to connect
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center">
        <div className="relative">
          {qrCode && (
            <div className="bg-white p-4 rounded-lg">
              <QRCodeSVG
                value={qrCode}
                size={256}
                level="M"
                includeMargin
                bgColor="#ffffff"
                fgColor="#000000"
              />
            </div>
          )}

          {/* Countdown overlay when time is low */}
          {countdown > 0 && countdown <= 15 && (
            <div className="absolute inset-0 bg-background/80 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <Clock className="h-8 w-8 text-warning mx-auto mb-2" />
                <p className="text-lg font-bold text-warning">{formatCountdown(countdown)}</p>
                <p className="text-sm text-muted-foreground">Expiring soon</p>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 mt-4 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>Expires in {formatCountdown(countdown)}</span>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={isRefreshing}
          className="mt-4"
        >
          {isRefreshing ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Refresh QR Code
        </Button>

        <div className="mt-6 text-center text-sm text-muted-foreground max-w-xs">
          <p className="font-medium mb-1">How to scan:</p>
          <ol className="text-left space-y-1">
            <li>1. Open WhatsApp on your phone</li>
            <li>2. Tap Menu or Settings</li>
            <li>3. Select "Linked Devices"</li>
            <li>4. Tap "Link a Device"</li>
            <li>5. Point your camera at this QR code</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}
