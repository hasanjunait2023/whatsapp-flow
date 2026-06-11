import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { useToast } from '@/hooks/use-toast';

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  product_sku: string | null;
  quantity: number;
  unit_price: number;
  discount_amount: number;
  total: number;
  notes: string | null;
}

export type OrderSource = 'manual' | 'woocommerce' | 'whatsapp' | 'call' | 'facebook' | 'instagram' | 'other';

export interface Order {
  id: string;
  tenant_id: string;
  contact_id: string | null;
  order_number: string;
  status: string;
  payment_status: string;
  subtotal: number;
  discount_amount: number;
  shipping_amount: number;
  tax_amount: number;
  total: number;
  currency: string;
  customer_name: string | null;
  customer_phone: string | null;
  customer_email: string | null;
  shipping_address: any | null;
  billing_address: any | null;
  notes: string | null;
  internal_notes: string | null;
  tracking_number: string | null;
  courier: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
  source: OrderSource | null;
  woo_order_id: number | null;
  created_by: string | null;
  items?: OrderItem[];
  contact?: {
    id: string;
    name: string | null;
    phone_number: string;
  };
}

export interface OrderFormData {
  contact_id?: string;
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  shipping_address?: any;
  notes?: string;
  source?: OrderSource;
  items: {
    product_id?: string;
    product_name: string;
    product_sku?: string;
    quantity: number;
    unit_price: number;
    discount_amount?: number;
  }[];
  discount_amount?: number;
  shipping_amount?: number;
  tax_amount?: number;
}

export const ORDER_STATUSES = [
  { value: 'pending', label: 'Pending', color: 'bg-amber-500' },
  { value: 'confirmed', label: 'Confirmed', color: 'bg-blue-500' },
  { value: 'processing', label: 'Processing', color: 'bg-purple-500' },
  { value: 'shipped', label: 'Shipped', color: 'bg-cyan-500' },
  { value: 'delivered', label: 'Delivered', color: 'bg-green-500' },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-destructive' },
];

export const PAYMENT_STATUSES = [
  { value: 'unpaid', label: 'Unpaid', color: 'bg-amber-500' },
  { value: 'partial', label: 'Partial', color: 'bg-blue-500' },
  { value: 'paid', label: 'Paid', color: 'bg-green-500' },
  { value: 'refunded', label: 'Refunded', color: 'bg-destructive' },
];

export function useOrders() {
  const { currentTenant } = useTenantContext();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const tenantId = currentTenant?.id;

  const { data: orders = [], isLoading, error } = useQuery({
    queryKey: ['orders', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          contact:contacts(id, name, phone_number),
          items:order_items(*)
        `)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as unknown as Order[];
    },
    enabled: !!tenantId,
  });

  // Fetch purchase behavior for all customer phones
  const customerPhones = orders
    .map(o => o.customer_phone || o.contact?.phone_number)
    .filter((phone): phone is string => !!phone);

  const { data: purchaseBehavior = {} } = useQuery({
    queryKey: ['orders-purchase-behavior', tenantId, customerPhones],
    queryFn: async () => {
      if (customerPhones.length === 0) return {};
      
      // Normalize phones for query
      const normalizedPhones = customerPhones.map(phone => {
        let cleaned = phone.replace(/\D/g, '');
        if (cleaned.startsWith('880')) {
          cleaned = '0' + cleaned.substring(3);
        }
        return cleaned;
      });

      const { data, error } = await supabase
        .from('purchase_behavior_checks')
        .select('phone_number, risk_level, total_deliveries, successful_deliveries, cancelled_deliveries, returned_deliveries, checked_at')
        .in('phone_number', normalizedPhones);

      if (error) throw error;

      // Create a map of phone -> behavior data
      const behaviorMap: Record<string, {
        risk_level: string | null;
        total_deliveries: number | null;
        successful_deliveries: number | null;
        cancelled_deliveries: number | null;
        returned_deliveries: number | null;
        checked_at: string | null;
      }> = {};
      
      // Map back to original phone formats
      data?.forEach((check) => {
        // Find matching original phone
        const originalPhone = customerPhones.find(p => {
          let cleaned = p.replace(/\D/g, '');
          if (cleaned.startsWith('880')) {
            cleaned = '0' + cleaned.substring(3);
          }
          return cleaned === check.phone_number;
        });
        
        if (originalPhone) {
          behaviorMap[originalPhone] = {
            risk_level: check.risk_level,
            total_deliveries: check.total_deliveries,
            successful_deliveries: check.successful_deliveries,
            cancelled_deliveries: check.cancelled_deliveries,
            returned_deliveries: check.returned_deliveries,
            checked_at: check.checked_at,
          };
        }
      });

      return behaviorMap;
    },
    enabled: !!tenantId && customerPhones.length > 0,
  });

  const getOrderWithItems = async (orderId: string): Promise<Order | null> => {
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        *,
        contact:contacts(id, name, phone_number)
      `)
      .eq('id', orderId)
      .single();

    if (orderError) throw orderError;

    const { data: items, error: itemsError } = await supabase
      .from('order_items')
      .select('*')
      .eq('order_id', orderId);

    if (itemsError) throw itemsError;

    return { ...order, items } as Order;
  };

  const createOrder = useMutation({
    mutationFn: async (orderData: OrderFormData) => {
      if (!tenantId) throw new Error('No tenant selected');

      // Generate order number
      const { data: orderNumberData, error: orderNumberError } = await supabase
        .rpc('generate_order_number', { p_tenant_id: tenantId });

      if (orderNumberError) throw orderNumberError;

      // Calculate totals
      const itemsTotal = orderData.items.reduce((sum, item) => {
        const itemTotal = (item.quantity * item.unit_price) - (item.discount_amount || 0);
        return sum + itemTotal;
      }, 0);

      const subtotal = itemsTotal;
      const total = subtotal - (orderData.discount_amount || 0) + (orderData.shipping_amount || 0) + (orderData.tax_amount || 0);

      // Create order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          tenant_id: tenantId,
          order_number: orderNumberData,
          contact_id: orderData.contact_id || null,
          customer_name: orderData.customer_name || null,
          customer_phone: orderData.customer_phone || null,
          customer_email: orderData.customer_email || null,
          shipping_address: orderData.shipping_address || null,
          notes: orderData.notes || null,
          source: orderData.source || 'manual',
          subtotal,
          discount_amount: orderData.discount_amount || 0,
          shipping_amount: orderData.shipping_amount || 0,
          tax_amount: orderData.tax_amount || 0,
          total,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const orderItems = orderData.items.map(item => ({
        order_id: order.id,
        product_id: item.product_id || null,
        product_name: item.product_name,
        product_sku: item.product_sku || null,
        quantity: item.quantity,
        unit_price: item.unit_price,
        discount_amount: item.discount_amount || 0,
        total: (item.quantity * item.unit_price) - (item.discount_amount || 0),
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // Deduct stock for each product with inventory tracking
      const userId = (await supabase.auth.getUser()).data.user?.id || null;
      for (const item of orderData.items) {
        if (item.product_id) {
          try {
            await supabase.rpc('deduct_product_stock', {
              p_product_id: item.product_id,
              p_quantity: item.quantity,
              p_order_id: order.id,
              p_tenant_id: tenantId,
              p_user_id: userId,
            });
          } catch (stockError) {
            // Don't fail order creation if stock deduction fails
            console.warn('Failed to deduct stock:', stockError);
          }
        }
      }

      // Add status history
      await supabase
        .from('order_status_history')
        .insert({
          order_id: order.id,
          status: 'pending',
          notes: 'Order created',
        });

      // Automatically check purchase behavior if customer has phone number
      const customerPhone = orderData.customer_phone;
      if (customerPhone) {
        try {
          await supabase.functions.invoke('bdcourier-check', {
            body: {
              phone_number: customerPhone,
              tenant_id: tenantId,
              contactId: orderData.contact_id || null,
            },
          });
        } catch (checkError) {
          // Don't fail the order creation if behavior check fails
          console.warn('Failed to check purchase behavior:', checkError);
        }
      }

      return order;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['orders-purchase-behavior', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['stock-summary', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['stock-movements', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['products', tenantId] });
      toast({ title: 'Order created successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to create order', description: error.message, variant: 'destructive' });
    },
  });

  const updateOrderStatus = useMutation({
    mutationFn: async ({ orderId, status, notes }: { orderId: string; status: string; notes?: string }) => {
      if (!tenantId) throw new Error('No tenant selected');
      
      const updates: any = { status };
      
      if (status === 'shipped') {
        updates.shipped_at = new Date().toISOString();
      } else if (status === 'delivered') {
        updates.delivered_at = new Date().toISOString();
      } else if (status === 'cancelled') {
        updates.cancelled_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('orders')
        .update(updates)
        .eq('id', orderId)
        .select()
        .single();

      if (error) throw error;

      // Restore stock if order is cancelled
      if (status === 'cancelled') {
        try {
          const userId = (await supabase.auth.getUser()).data.user?.id || null;
          await supabase.rpc('restore_stock_for_order', {
            p_order_id: orderId,
            p_tenant_id: tenantId,
            p_reason: 'return',
            p_user_id: userId,
          });
        } catch (stockError) {
          console.warn('Failed to restore stock:', stockError);
        }
      }

      // Add status history
      await supabase
        .from('order_status_history')
        .insert({
          order_id: orderId,
          status,
          notes: notes || `Status changed to ${status}`,
        });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['stock-summary', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['stock-movements', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['products', tenantId] });
      toast({ title: 'Order status updated' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to update order', description: error.message, variant: 'destructive' });
    },
  });

  const updatePaymentStatus = useMutation({
    mutationFn: async ({ orderId, paymentStatus }: { orderId: string; paymentStatus: string }) => {
      if (!tenantId) throw new Error('No tenant selected');
      
      const { data, error } = await supabase
        .from('orders')
        .update({ payment_status: paymentStatus })
        .eq('id', orderId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders', tenantId] });
      toast({ title: 'Payment status updated' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to update payment status', description: error.message, variant: 'destructive' });
    },
  });

  const updateTracking = useMutation({
    mutationFn: async ({ orderId, trackingNumber, courier }: { orderId: string; trackingNumber: string; courier?: string }) => {
      const { data, error } = await supabase
        .from('orders')
        .update({ 
          tracking_number: trackingNumber,
          courier: courier || null,
        })
        .eq('id', orderId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders', tenantId] });
      toast({ title: 'Tracking info updated' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to update tracking', description: error.message, variant: 'destructive' });
    },
  });

  const deleteOrder = useMutation({
    mutationFn: async (orderId: string) => {
      const { error } = await supabase
        .from('orders')
        .delete()
        .eq('id', orderId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders', tenantId] });
      toast({ title: 'Order deleted' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to delete order', description: error.message, variant: 'destructive' });
    },
  });

  return {
    orders,
    isLoading,
    error,
    purchaseBehavior,
    getOrderWithItems,
    createOrder,
    updateOrderStatus,
    updatePaymentStatus,
    updateTracking,
    deleteOrder,
  };
}
