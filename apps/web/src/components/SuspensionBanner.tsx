import { useSubscription } from '@/hooks/useSubscription';
import { useTenant } from '@/hooks/useTenant';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CreditCard, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState } from 'react';

export default function SuspensionBanner() {
  const { isSuspended, isPastDue, trialDaysRemaining, isTrialing } = useSubscription();
  const { currentTenant } = useTenant();
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;
  if (!currentTenant) return null;

  if (isSuspended) {
    return (
      <div className="bg-destructive text-destructive-foreground px-4 py-3">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5" />
            <div>
              <span className="font-medium">Your subscription is suspended.</span>
              <span className="ml-2 text-destructive-foreground/90">
                Incoming messages are being stored, but you cannot send messages or use AI features.
              </span>
            </div>
          </div>
          <Button asChild variant="secondary" size="sm">
            <Link to="/billing">
              <CreditCard className="h-4 w-4 mr-2" />
              Pay Now
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  if (isPastDue) {
    return (
      <div className="bg-warning text-warning-foreground px-4 py-3">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5" />
            <div>
              <span className="font-medium">Payment overdue.</span>
              <span className="ml-2 text-warning-foreground/90">
                Please update your payment to avoid service interruption.
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="secondary" size="sm">
              <Link to="/billing">
                <CreditCard className="h-4 w-4 mr-2" />
                Update Payment
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDismissed(true)}
              className="text-warning-foreground/70 hover:text-warning-foreground"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (isTrialing && trialDaysRemaining !== null && trialDaysRemaining <= 3) {
    return (
      <div className="bg-info text-info-foreground px-4 py-3">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5" />
            <span>
              Your trial ends in <strong>{trialDaysRemaining} day{trialDaysRemaining !== 1 ? 's' : ''}</strong>.
              Choose a plan to continue using WhatsCRM.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="secondary" size="sm">
              <Link to="/billing">Choose Plan</Link>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDismissed(true)}
              className="text-info-foreground/70 hover:text-info-foreground"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
