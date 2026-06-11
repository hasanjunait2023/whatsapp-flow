import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/useTenant';

export interface TenantSubscriptionOrder {
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
  notes: string | null;
  created_at: string;
  verified_at: string | null;
  plan_name?: string;
}

export function useTenantSubscriptionOrders() {
  const { currentTenant } = useTenant();
  const [orders, setOrders] = useState<TenantSubscriptionOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchOrders = useCallback(async () => {
    if (!currentTenant?.id) {
      setOrders([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error: fetchError } = await supabase
        .from('subscription_orders')
        .select(`
          *,
          plan:plans(name)
        `)
        .eq('tenant_id', currentTenant.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      const enrichedOrders = (data || []).map((order: any) => ({
        ...order,
        plan_name: order.plan?.name,
      }));

      setOrders(enrichedOrders);
      setError(null);
    } catch (err) {
      setError(err as Error);
      console.error('Error fetching tenant subscription orders:', err);
    } finally {
      setLoading(false);
    }
  }, [currentTenant?.id]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const pendingOrders = orders.filter(o => o.status === 'pending');
  const paidOrders = orders.filter(o => o.status === 'paid');

  return {
    orders,
    pendingOrders,
    paidOrders,
    loading,
    error,
    refetch: fetchOrders,
  };
}
