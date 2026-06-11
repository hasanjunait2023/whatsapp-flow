import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface SubscriptionOrder {
  id: string;
  tenant_id: string;
  plan_id: string;
  order_number: string;
  amount: number;
  currency: string;
  billing_cycle: 'monthly' | 'yearly';
  status: 'pending' | 'paid' | 'cancelled';
  payment_method: string | null;
  transaction_id: string | null;
  created_by: string | null;
  verified_by: string | null;
  verified_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  tenant_name?: string;
  plan_name?: string;
}

export function useSubscriptionOrders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<SubscriptionOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error: fetchError } = await supabase
        .from('subscription_orders')
        .select(`
          *,
          tenant:tenants(name),
          plan:plans(name)
        `)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      const enrichedOrders = (data || []).map((order: any) => ({
        ...order,
        tenant_name: order.tenant?.name,
        plan_name: order.plan?.name,
      }));

      setOrders(enrichedOrders);
    } catch (err) {
      setError(err as Error);
      console.error('Error fetching subscription orders:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const markAsPaid = async (orderId: string) => {
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('subscription_orders')
      .update({
        status: 'paid',
        verified_by: user.id,
        verified_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId);

    if (error) throw error;
    await fetchOrders();
  };

  const cancelOrder = async (orderId: string) => {
    const { error } = await supabase
      .from('subscription_orders')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId);

    if (error) throw error;
    await fetchOrders();
  };

  const pendingOrders = orders.filter(o => o.status === 'pending');
  const paidOrders = orders.filter(o => o.status === 'paid');

  return {
    orders,
    pendingOrders,
    paidOrders,
    loading,
    error,
    refetch: fetchOrders,
    markAsPaid,
    cancelOrder,
  };
}
