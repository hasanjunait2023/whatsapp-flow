import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/useTenant';

export interface Payment {
  id: string;
  tenant_id: string;
  subscription_id: string | null;
  amount: number;
  currency: string;
  payment_method: string;
  transaction_id: string | null;
  status: 'pending' | 'verified' | 'rejected';
  notes: string | null;
  created_at: string;
  verified_at: string | null;
  verified_by: string | null;
}

export interface CreatePaymentInput {
  subscription_id?: string;
  amount: number;
  payment_method: 'bkash' | 'nagad' | 'bank_transfer';
  transaction_id: string;
  notes?: string;
}

export function usePayments() {
  const { currentTenant } = useTenant();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchPayments = useCallback(async () => {
    if (!currentTenant?.id) {
      setPayments([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('payments')
        .select('*')
        .eq('tenant_id', currentTenant.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setPayments((data || []) as Payment[]);
      setError(null);
    } catch (err) {
      console.error('Error fetching payments:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch payments'));
    } finally {
      setLoading(false);
    }
  }, [currentTenant?.id]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const submitPayment = async (input: CreatePaymentInput): Promise<Payment | null> => {
    if (!currentTenant?.id) return null;

    try {
      const { data, error: createError } = await supabase
        .from('payments')
        .insert({
          tenant_id: currentTenant.id,
          ...input,
          status: 'pending',
        })
        .select()
        .single();

      if (createError) throw createError;
      const newPayment = data as Payment;
      setPayments(prev => [newPayment, ...prev]);
      return newPayment;
    } catch (err) {
      console.error('Error submitting payment:', err);
      throw err;
    }
  };

  return {
    payments,
    loading,
    error,
    submitPayment,
    refetch: fetchPayments,
  };
}
