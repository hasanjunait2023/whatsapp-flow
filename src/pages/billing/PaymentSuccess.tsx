import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Loader2, XCircle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useUddoktaPay } from '@/hooks/useUddoktaPay';
import { AppLogo } from '@/components/AppLogo';
import { useTenant } from '@/hooks/useTenant';
import confetti from 'canvas-confetti';

export default function PaymentSuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { verifyPayment, loading } = useUddoktaPay();
  const { refetch: refetchTenant } = useTenant();
  
  const [status, setStatus] = useState<'verifying' | 'success' | 'pending' | 'error'>('verifying');
  const [paymentDetails, setPaymentDetails] = useState<{
    amount?: number;
    transactionId?: string;
  }>({});
  const [errorMessage, setErrorMessage] = useState<string>('');

  const invoiceId = searchParams.get('invoice_id');
  const orderId = searchParams.get('order_id');

  useEffect(() => {
    const verify = async () => {
      if (!invoiceId) {
        // No invoice ID means redirect from gateway, try to get from URL
        setStatus('success');
        triggerConfetti();
        refetchTenant();
        return;
      }

      const result = await verifyPayment(invoiceId);
      
      if (result.success) {
        if (result.status === 'verified') {
          setStatus('success');
          setPaymentDetails({
            amount: result.amount,
            transactionId: result.transactionId,
          });
          triggerConfetti();
          refetchTenant();
        } else {
          setStatus('pending');
        }
      } else {
        setStatus('error');
        setErrorMessage(result.error || 'Verification failed');
      }
    };

    verify();
  }, [invoiceId]);

  const triggerConfetti = () => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#10b981', '#22c55e', '#4ade80'],
    });
  };

  const handleGoToDashboard = () => {
    navigate('/dashboard');
  };

  const handleGoToBilling = () => {
    navigate('/billing');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 p-4">
      <Card className="w-full max-w-md shadow-xl border-border/50">
        <CardHeader className="text-center pb-2 space-y-4">
          <div className="flex justify-center">
            <AppLogo className="h-12 w-auto" />
          </div>
          
          {status === 'verifying' && (
            <>
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
              </div>
              <CardTitle className="text-2xl">Verifying Payment...</CardTitle>
              <CardDescription>Please wait while we confirm your payment</CardDescription>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="h-16 w-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              </div>
              <CardTitle className="text-2xl text-green-600 dark:text-green-400">
                Payment Successful! 🎉
              </CardTitle>
              <CardDescription>
                Your payment has been verified and your account is now active
              </CardDescription>
            </>
          )}

          {status === 'pending' && (
            <>
              <div className="h-16 w-16 rounded-full bg-yellow-500/10 flex items-center justify-center mx-auto">
                <Loader2 className="h-8 w-8 text-yellow-500" />
              </div>
              <CardTitle className="text-2xl text-yellow-600 dark:text-yellow-400">
                Payment Processing
              </CardTitle>
              <CardDescription>
                Your payment is being processed. This may take a few moments.
              </CardDescription>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
                <XCircle className="h-8 w-8 text-destructive" />
              </div>
              <CardTitle className="text-2xl text-destructive">
                Verification Failed
              </CardTitle>
              <CardDescription>
                {errorMessage || 'There was an issue verifying your payment'}
              </CardDescription>
            </>
          )}
        </CardHeader>

        <CardContent className="space-y-6">
          {paymentDetails.amount && (
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Amount Paid</span>
                <span className="font-semibold">৳{paymentDetails.amount.toLocaleString()}</span>
              </div>
              {paymentDetails.transactionId && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Transaction ID</span>
                  <span className="font-mono text-xs">{paymentDetails.transactionId}</span>
                </div>
              )}
              {orderId && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Order ID</span>
                  <span className="font-mono text-xs">{orderId}</span>
                </div>
              )}
            </div>
          )}

          <div className="flex flex-col gap-3">
            {status === 'success' && (
              <Button onClick={handleGoToDashboard} className="w-full gap-2">
                Go to Dashboard
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}
            
            {status === 'pending' && (
              <>
                <Button onClick={handleGoToBilling} className="w-full">
                  Check Payment Status
                </Button>
                <p className="text-xs text-center text-muted-foreground">
                  Your account will be activated once payment is confirmed
                </p>
              </>
            )}

            {status === 'error' && (
              <>
                <Button onClick={handleGoToBilling} className="w-full">
                  Back to Billing
                </Button>
                <Button variant="outline" onClick={() => navigate('/billing')} className="w-full">
                  Try Again
                </Button>
              </>
            )}

            {status === 'verifying' && (
              <p className="text-xs text-center text-muted-foreground">
                This usually takes just a few seconds...
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
