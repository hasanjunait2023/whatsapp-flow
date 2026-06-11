import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/useTenant';
import { useAuth } from '@/hooks/useAuth';

interface CheckoutParams {
  planId: string;
  amount: number;
  billingCycle: 'monthly' | 'yearly';
  orderType: 'subscription' | 'renewal';
}

interface CheckoutResult {
  success: boolean;
  paymentUrl?: string;
  orderId?: string;
  invoiceId?: string;
  error?: string;
}

interface VerifyResult {
  success: boolean;
  status?: 'verified' | 'pending';
  paymentStatus?: string;
  amount?: number;
  transactionId?: string;
  error?: string;
}

export function useUddoktaPay() {
  const { currentTenant } = useTenant();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initiateCheckout = async (params: CheckoutParams): Promise<CheckoutResult> => {
    if (!currentTenant?.id || !user) {
      return { success: false, error: 'Not authenticated' };
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('uddoktapay-checkout', {
        body: {
          tenant_id: currentTenant.id,
          plan_id: params.planId,
          amount: params.amount,
          billing_cycle: params.billingCycle,
          order_type: params.orderType,
          customer_name: currentTenant.name || user.email?.split('@')[0] || 'Customer',
          customer_email: user.email,
        },
      });

      if (fnError) {
        throw new Error(fnError.message);
      }

      if (!data.success) {
        throw new Error(data.error || 'Checkout failed');
      }

      return {
        success: true,
        paymentUrl: data.payment_url,
        orderId: data.order_id,
        invoiceId: data.invoice_id,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Checkout failed';
      setError(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  const verifyPayment = async (invoiceId: string): Promise<VerifyResult> => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('uddoktapay-verify', {
        body: { invoice_id: invoiceId },
      });

      if (fnError) {
        throw new Error(fnError.message);
      }

      if (!data.success) {
        throw new Error(data.error || 'Verification failed');
      }

      return {
        success: true,
        status: data.status,
        paymentStatus: data.payment_status,
        amount: data.amount,
        transactionId: data.transaction_id,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Verification failed';
      setError(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  const redirectToPayment = (paymentUrl: string) => {
    window.location.href = paymentUrl;
  };

  return {
    initiateCheckout,
    verifyPayment,
    redirectToPayment,
    loading,
    error,
  };
}
