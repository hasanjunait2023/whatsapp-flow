import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface AdminPayment {
  id: string;
  tenant_id: string;
  tenant_name: string;
  amount: number;
  currency: string;
  payment_method: string;
  transaction_id: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  verified_at: string | null;
  verified_by: string | null;
}

export function useAdminPayments() {
  const { user } = useAuth();
  const [payments, setPayments] = useState<AdminPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    try {
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select(`
          id,
          tenant_id,
          amount,
          currency,
          payment_method,
          transaction_id,
          status,
          notes,
          created_at,
          verified_at,
          verified_by,
          tenant:tenants(name)
        `)
        .order('created_at', { ascending: false });

      if (paymentsError) throw paymentsError;

      const enrichedPayments = (paymentsData || []).map((payment) => ({
        ...payment,
        tenant_name: (payment.tenant as any)?.name || 'Unknown',
      }));

      setPayments(enrichedPayments);
    } catch (err) {
      setError(err as Error);
      console.error('Error fetching payments:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const verifyPayment = async (paymentId: string) => {
    if (!user) throw new Error('Not authenticated');

    // Update payment status
    const { error: paymentError } = await supabase
      .from('payments')
      .update({
        status: 'verified',
        verified_at: new Date().toISOString(),
        verified_by: user.id,
      })
      .eq('id', paymentId);

    if (paymentError) throw paymentError;

    // Get the payment to find the tenant
    const payment = payments.find((p) => p.id === paymentId);
    if (payment) {
      // Activate the subscription
      await supabase
        .from('subscriptions')
        .update({
          status: 'active',
          updated_at: new Date().toISOString(),
        })
        .eq('tenant_id', payment.tenant_id);

      // Trigger WhatsApp session automation
      try {
        await supabase.functions.invoke('payment-confirmed', {
          body: { tenant_id: payment.tenant_id, payment_id: paymentId }
        });
      } catch (automationError) {
        console.error('Failed to trigger WhatsApp automation:', automationError);
        // Don't throw - payment verification succeeded
      }
    }

    await fetchPayments();
  };

  const rejectPayment = async (paymentId: string, reason: string) => {
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('payments')
      .update({
        status: 'rejected',
        notes: reason,
        verified_at: new Date().toISOString(),
        verified_by: user.id,
      })
      .eq('id', paymentId);

    if (error) throw error;
    await fetchPayments();
  };

  const pendingPayments = payments.filter((p) => p.status === 'pending');

  return {
    payments,
    pendingPayments,
    loading,
    error,
    refetch: fetchPayments,
    verifyPayment,
    rejectPayment,
  };
}
