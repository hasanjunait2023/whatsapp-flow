import { useState } from 'react';
import { useSubscription } from '@/hooks/useSubscription';
import { useUddoktaPay } from '@/hooks/useUddoktaPay';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { CalendarClock, AlertTriangle, CheckCircle2, Clock, CreditCard, Loader2 } from 'lucide-react';
import { differenceInDays } from 'date-fns';
import { safeFormatDate } from '@/lib/date';
import { toast } from 'sonner';

interface RenewalCardProps {
  onRenewClick?: () => void;
}

export function RenewalCard({ onRenewClick }: RenewalCardProps) {
  const { subscription, loading, plan, daysUntilExpiry, trialDaysRemaining, isTrialing } = useSubscription();
  const { initiateCheckout, redirectToPayment, loading: checkoutLoading } = useUddoktaPay();
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePayOnline = async () => {
    if (!plan) return;
    
    setIsProcessing(true);
    const result = await initiateCheckout({
      planId: plan.id,
      amount: plan.price_monthly,
      billingCycle: 'monthly',
      orderType: 'renewal',
    });

    if (result.success && result.paymentUrl) {
      toast.success('Redirecting to payment gateway...');
      redirectToPayment(result.paymentUrl);
    } else {
      toast.error(result.error || 'Failed to initiate payment');
      setIsProcessing(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!subscription) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarClock className="h-4 w-4" />
            Renewal
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No active subscription</p>
        </CardContent>
      </Card>
    );
  }

  const periodStart = new Date(subscription.current_period_start);
  const periodEnd = new Date(subscription.current_period_end);
  const totalDays = differenceInDays(periodEnd, periodStart);
  const elapsedDays = differenceInDays(new Date(), periodStart);
  const periodProgress = Math.min(100, Math.max(0, (elapsedDays / totalDays) * 100));

  const daysRemaining = isTrialing && trialDaysRemaining !== null 
    ? trialDaysRemaining 
    : daysUntilExpiry || 0;

  const getUrgencyConfig = () => {
    if (daysRemaining <= 3) {
      return {
        color: 'text-destructive',
        bgColor: 'bg-destructive/10',
        progressColor: 'bg-destructive',
        icon: <AlertTriangle className="h-5 w-5" />,
        label: 'Critical',
      };
    }
    if (daysRemaining <= 7) {
      return {
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-500/10',
        progressColor: 'bg-yellow-500',
        icon: <Clock className="h-5 w-5" />,
        label: 'Warning',
      };
    }
    return {
      color: 'text-green-600',
      bgColor: 'bg-green-500/10',
      progressColor: 'bg-green-500',
      icon: <CheckCircle2 className="h-5 w-5" />,
      label: 'Good Standing',
    };
  };

  const urgency = getUrgencyConfig();
  const nextAmount = plan?.price_monthly || 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <CalendarClock className="h-4 w-4" />
          {isTrialing ? 'Trial Period' : 'Next Renewal'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Days remaining - prominent display */}
        <div className="text-center py-4">
          <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${urgency.bgColor} ${urgency.color} text-sm font-medium mb-2`}>
            {urgency.icon}
            {urgency.label}
          </div>
          <div className="text-5xl font-bold tracking-tight">
            {daysRemaining}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {daysRemaining === 1 ? 'day' : 'days'} {isTrialing ? 'left in trial' : 'until renewal'}
          </p>
        </div>

        {/* Period progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{safeFormatDate(subscription.current_period_start, 'MMM d')}</span>
            <span>{safeFormatDate(subscription.current_period_end, 'MMM d, yyyy')}</span>
          </div>
          <Progress 
            value={periodProgress} 
            className="h-2"
          />
          <p className="text-xs text-center text-muted-foreground">
            {Math.round(periodProgress)}% of billing period used
          </p>
        </div>

        {/* Amount due */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
          <span className="text-sm text-muted-foreground">Amount Due</span>
          <span className="text-lg font-semibold">৳{nextAmount.toLocaleString()}</span>
        </div>

        {/* Manual payment reminder */}
        <div className="p-3 rounded-lg border border-dashed">
          <p className="text-xs text-muted-foreground text-center">
            💡 Remember: This is a manual payment system. Please submit your payment before the due date to avoid service interruption.
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col gap-2">
          <Button 
            className="w-full gap-2" 
            onClick={handlePayOnline}
            disabled={isProcessing || checkoutLoading}
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <CreditCard className="h-4 w-4" />
                {isTrialing ? 'Subscribe Online' : 'Pay Online'}
              </>
            )}
          </Button>
          <Button variant="outline" className="w-full" onClick={onRenewClick}>
            Manual Payment
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
