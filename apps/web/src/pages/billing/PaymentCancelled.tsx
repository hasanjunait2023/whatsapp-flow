import { useNavigate, useSearchParams } from 'react-router-dom';
import { XCircle, ArrowLeft, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AppLogo } from '@/components/AppLogo';

export default function PaymentCancelled() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('order_id');

  const handleRetry = () => {
    navigate('/billing');
  };

  const handleGoBack = () => {
    navigate('/billing');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 p-4">
      <Card className="w-full max-w-md shadow-xl border-border/50">
        <CardHeader className="text-center pb-2 space-y-4">
          <div className="flex justify-center">
            <AppLogo className="h-12 w-auto" />
          </div>
          
          <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
            <XCircle className="h-8 w-8 text-destructive" />
          </div>
          
          <CardTitle className="text-2xl">Payment Cancelled</CardTitle>
          <CardDescription>
            Your payment was not completed. No charges have been made.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {orderId && (
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Order Reference</span>
                <span className="font-mono text-xs">{orderId}</span>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <p className="text-sm text-muted-foreground text-center">
              If you experienced any issues during payment, please try again or contact our support team.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <Button onClick={handleRetry} className="w-full gap-2">
              <RefreshCw className="h-4 w-4" />
              Try Again
            </Button>
            <Button variant="outline" onClick={handleGoBack} className="w-full gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Billing
            </Button>
          </div>

          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              Need help? Contact us at{' '}
              <a href="mailto:support@ecomex.com" className="text-primary hover:underline">
                support@ecomex.com
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
