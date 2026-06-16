import { useSubscription } from '@/hooks/useSubscription';
import { useTenant } from '@/hooks/useTenant';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  XCircle,
  Calendar,
  CreditCard,
  Sparkles,
  ArrowUpRight
} from 'lucide-react';
import { safeFormatDate } from '@/lib/date';

interface SubscriptionOverviewProps {
  onUpgradeClick?: () => void;
  onRenewClick?: () => void;
}

export function SubscriptionOverview({ onUpgradeClick, onRenewClick }: SubscriptionOverviewProps) {
  const { subscription, loading, isActive, isTrialing, isPastDue, isSuspended, plan } = useSubscription();
  const { currentTenant } = useTenant();

  const getStatusConfig = () => {
    if (isSuspended) {
      return {
        icon: <XCircle className="h-5 w-5" />,
        badge: <Badge variant="destructive">Suspended</Badge>,
        color: 'text-destructive',
        bgColor: 'bg-destructive/10',
      };
    }
    if (isPastDue) {
      return {
        icon: <AlertCircle className="h-5 w-5" />,
        badge: <Badge variant="destructive">Past Due</Badge>,
        color: 'text-destructive',
        bgColor: 'bg-destructive/10',
      };
    }
    if (isTrialing) {
      return {
        icon: <Clock className="h-5 w-5" />,
        badge: <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 hover:bg-blue-500/20">Trial</Badge>,
        color: 'text-blue-500',
        bgColor: 'bg-blue-500/10',
      };
    }
    if (isActive) {
      return {
        icon: <CheckCircle2 className="h-5 w-5" />,
        badge: <Badge className="bg-green-500 hover:bg-green-600">Active</Badge>,
        color: 'text-green-500',
        bgColor: 'bg-green-500/10',
      };
    }
    return {
      icon: <AlertCircle className="h-5 w-5" />,
      badge: <Badge variant="outline">No Plan</Badge>,
      color: 'text-muted-foreground',
      bgColor: 'bg-muted',
    };
  };

  const statusConfig = getStatusConfig();

  if (loading) {
    return (
      <Card className="border-2">
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  const memberSince = currentTenant?.created_at 
    ? safeFormatDate(currentTenant.created_at, 'MMMM d, yyyy')
    : null;

  const billingCycle = subscription?.current_period_end && subscription?.current_period_start
    ? Math.ceil((new Date(subscription.current_period_end).getTime() - new Date(subscription.current_period_start).getTime()) / (1000 * 60 * 60 * 24)) > 35
      ? 'Yearly'
      : 'Monthly'
    : 'Monthly';

  const nextPaymentDate = subscription?.current_period_end
    ? safeFormatDate(subscription.current_period_end, 'MMMM d, yyyy')
    : null;

  const nextPaymentAmount = billingCycle === 'Yearly' 
    ? plan?.price_yearly || (plan?.price_monthly ? plan.price_monthly * 12 : 0)
    : plan?.price_monthly || 0;

  return (
    <Card className="border-2 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-primary/5 to-transparent rounded-full -translate-y-32 translate-x-32" />
      
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-full ${statusConfig.bgColor} ${statusConfig.color}`}>
            {statusConfig.icon}
          </div>
          <div>
            <CardTitle className="text-lg">Subscription Overview</CardTitle>
            <p className="text-sm text-muted-foreground">Your billing at a glance</p>
          </div>
        </div>
        {statusConfig.badge}
      </CardHeader>
      
      <CardContent className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Current Plan */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Sparkles className="h-4 w-4" />
              Current Plan
            </div>
            <p className="text-xl font-semibold">{plan?.name || 'No Plan'}</p>
          </div>

          {/* Member Since */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              Member Since
            </div>
            <p className="text-xl font-semibold">{memberSince || '—'}</p>
          </div>

          {/* Billing Cycle */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              Billing Cycle
            </div>
            <p className="text-xl font-semibold">{billingCycle}</p>
          </div>

          {/* Next Payment */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CreditCard className="h-4 w-4" />
              Next Payment
            </div>
            <p className="text-xl font-semibold">
              {nextPaymentAmount > 0 ? `৳${nextPaymentAmount.toLocaleString()}` : '—'}
            </p>
            {nextPaymentDate && (
              <p className="text-xs text-muted-foreground">Due {nextPaymentDate}</p>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-3 pt-2">
          <Button onClick={onUpgradeClick} className="gap-2">
            <ArrowUpRight className="h-4 w-4" />
            Upgrade Plan
          </Button>
          {(isPastDue || (subscription && new Date(subscription.current_period_end) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000))) && (
            <Button variant="outline" onClick={onRenewClick}>
              Renew Now
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
