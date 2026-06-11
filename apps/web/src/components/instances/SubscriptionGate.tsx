import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useSubscription } from '@/hooks/useSubscription';

interface SubscriptionGateProps {
  children: ReactNode;
  feature?: string;
}

export default function SubscriptionGate({ children, feature = 'this feature' }: SubscriptionGateProps) {
  const navigate = useNavigate();
  const { subscription, loading, isSuspended, isActive, isTrialing } = useSubscription();

  if (loading) {
    return null;
  }

  // Allow access if active or trialing
  if (isActive || isTrialing) {
    return <>{children}</>;
  }

  // Show payment required for suspended subscriptions
  if (isSuspended) {
    return (
      <Card className="border-destructive/30 bg-destructive/5">
        <CardHeader className="text-center pb-2">
          <div className="h-12 w-12 rounded-full bg-destructive/20 flex items-center justify-center mx-auto mb-2">
            <AlertCircle className="h-6 w-6 text-destructive" />
          </div>
          <CardTitle className="text-destructive">Payment Required</CardTitle>
          <CardDescription>
            Your subscription has been suspended. Please update your payment to continue using {feature}.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <Button onClick={() => navigate('/billing')} className="gap-2">
            <CreditCard className="h-4 w-4" />
            Go to Billing
          </Button>
        </CardContent>
      </Card>
    );
  }

  // No subscription at all
  return (
    <Card className="border-warning/30 bg-warning/5">
      <CardHeader className="text-center pb-2">
        <div className="h-12 w-12 rounded-full bg-warning/20 flex items-center justify-center mx-auto mb-2">
          <CreditCard className="h-6 w-6 text-warning" />
        </div>
        <CardTitle>Subscription Required</CardTitle>
        <CardDescription>
          You need an active subscription to use {feature}.
        </CardDescription>
      </CardHeader>
      <CardContent className="text-center">
        <Button onClick={() => navigate('/billing')} className="gap-2">
          <CreditCard className="h-4 w-4" />
          View Plans
        </Button>
      </CardContent>
    </Card>
  );
}
