import { ArrowRight, ArrowLeft, CheckCircle, Loader2, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { usePhoneOtp } from '@/hooks/usePhoneOtp';

interface PhoneOtpStepProps {
  onVerified: (phone: string) => void;
  onSkip: () => void;
  onBack: () => void;
}

export function PhoneOtpStep({ onVerified, onSkip, onBack }: PhoneOtpStepProps) {
  const {
    state,
    phase,
    phone,
    setPhone,
    otp,
    setOtp,
    error,
    resendCountdown,
    canResend,
    sendOtp,
    verifyOtp,
    verifiedPhone,
  } = usePhoneOtp();

  if (state === 'verified' && verifiedPhone) {
    onVerified(verifiedPhone);
    return null;
  }

  const isSending = state === 'sending';
  const isVerifying = state === 'verifying';

  return (
    <Card className="border-border/50 shadow-lg animate-fade-in max-w-lg mx-auto">
      <CardHeader className="text-center pb-2">
        <div className="mx-auto mb-4 h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
          <MessageSquare className="h-8 w-8 text-primary" />
        </div>
        <CardTitle className="text-2xl">Verify Your WhatsApp</CardTitle>
        <CardDescription className="text-base">
          We'll send a 6-digit code to confirm your WhatsApp number.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pt-6">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {phase === 'phone' ? (
          <>
            <div className="space-y-2">
              <Label htmlFor="phone">WhatsApp number</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+8801XXXXXXXXX"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="h-12 text-base"
                autoFocus
                disabled={isSending}
              />
              <p className="text-xs text-muted-foreground">
                Include country code (e.g. +880 for Bangladesh)
              </p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={onBack}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button className="flex-1" onClick={sendOtp} disabled={!phone.trim() || isSending}>
                {isSending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    Send Code
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground text-center">
              Code sent to <span className="font-medium text-foreground">{phone}</span>
            </p>
            <div className="space-y-2">
              <Label htmlFor="otp">6-digit code</Label>
              <Input
                id="otp"
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="123456"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                className="h-12 text-base text-center tracking-widest font-mono"
                autoFocus
                disabled={isVerifying}
              />
            </div>
            <Button
              className="w-full"
              onClick={verifyOtp}
              disabled={otp.length !== 6 || isVerifying}
            >
              {isVerifying ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Verify
                </>
              )}
            </Button>
            <div className="text-center">
              {resendCountdown > 0 ? (
                <span className="text-xs text-muted-foreground">Resend in {resendCountdown}s</span>
              ) : canResend ? (
                <Button variant="link" size="sm" onClick={sendOtp} className="text-xs h-auto p-0">
                  Resend code
                </Button>
              ) : null}
            </div>
          </>
        )}

        <Button variant="ghost" className="w-full text-muted-foreground text-sm" onClick={onSkip}>
          Skip for now
        </Button>
      </CardContent>
    </Card>
  );
}
