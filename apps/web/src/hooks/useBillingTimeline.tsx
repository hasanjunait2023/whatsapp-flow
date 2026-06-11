import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/useTenant';
import { usePayments } from '@/hooks/usePayments';

export interface TimelineEvent {
  id: string;
  date: string;
  type: 'account_created' | 'payment' | 'plan_change' | 'subscription_started' | 'upcoming_renewal';
  title: string;
  description: string;
  status: 'completed' | 'pending' | 'upcoming' | 'rejected';
  metadata?: {
    amount?: number;
    planName?: string;
    paymentMethod?: string;
    transactionId?: string;
  };
}

export function useBillingTimeline() {
  const { currentTenant } = useTenant();
  const { payments } = usePayments();
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentTenant) {
      buildTimeline();
    } else {
      setTimeline([]);
      setLoading(false);
    }
  }, [currentTenant?.id, payments]);

  const buildTimeline = async () => {
    if (!currentTenant) return;

    setLoading(true);
    const events: TimelineEvent[] = [];

    try {
      // 1. Account creation event
      if (currentTenant.created_at) {
        events.push({
          id: 'account_created',
          date: currentTenant.created_at,
          type: 'account_created',
          title: 'Account Created',
          description: `Welcome to ${currentTenant.name || 'the platform'}!`,
          status: 'completed',
        });
      }

      // 2. Subscription events
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select(`
          *,
          plan:plans (name)
        `)
        .eq('tenant_id', currentTenant.id)
        .maybeSingle();

      if (subscription) {
        // Subscription started
        events.push({
          id: 'subscription_started',
          date: subscription.created_at,
          type: 'subscription_started',
          title: 'Subscription Started',
          description: `Started with ${subscription.plan?.name || 'a'} plan`,
          status: 'completed',
          metadata: {
            planName: subscription.plan?.name,
          },
        });

        // Upcoming renewal
        if (subscription.current_period_end) {
          const renewalDate = new Date(subscription.current_period_end);
          if (renewalDate > new Date()) {
            events.push({
              id: 'upcoming_renewal',
              date: subscription.current_period_end,
              type: 'upcoming_renewal',
              title: 'Upcoming Renewal',
              description: 'Payment due for next billing period',
              status: 'upcoming',
              metadata: {
                planName: subscription.plan?.name,
              },
            });
          }
        }
      }

      // 3. Payment events
      if (payments && payments.length > 0) {
        payments.forEach((payment) => {
          let status: TimelineEvent['status'] = 'pending';
          if (payment.status === 'verified') status = 'completed';
          if (payment.status === 'rejected') status = 'rejected';

          events.push({
            id: `payment_${payment.id}`,
            date: payment.created_at,
            type: 'payment',
            title: status === 'completed' 
              ? 'Payment Verified' 
              : status === 'rejected'
              ? 'Payment Rejected'
              : 'Payment Submitted',
            description: `৳${payment.amount} via ${getMethodLabel(payment.payment_method)}`,
            status,
            metadata: {
              amount: payment.amount,
              paymentMethod: payment.payment_method,
              transactionId: payment.transaction_id || undefined,
            },
          });
        });
      }

      // Sort by date descending (most recent first)
      events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setTimeline(events);
    } catch (error) {
      console.error('Error building billing timeline:', error);
    } finally {
      setLoading(false);
    }
  };

  return {
    timeline,
    loading,
    refetch: buildTimeline,
  };
}

function getMethodLabel(method: string): string {
  switch (method) {
    case 'bkash':
      return 'bKash';
    case 'nagad':
      return 'Nagad';
    case 'bank_transfer':
      return 'Bank Transfer';
    default:
      return method;
  }
}
