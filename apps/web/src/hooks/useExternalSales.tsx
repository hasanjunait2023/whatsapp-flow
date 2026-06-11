import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ExternalSalesOrder {
  id: string;
  external_order_id: string;
  source: string;
  tenant_id: string | null;
  user_id: string | null;
  plan_id: string | null;
  amount: number;
  currency: string;
  billing_cycle: string;
  payment_method: string | null;
  transaction_id: string | null;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  business_name: string;
  business_type: string;
  status: string;
  error_message: string | null;
  processed_at: string | null;
  created_at: string;
  raw_payload: Record<string, unknown> | null;
  // Notification tracking fields
  whatsapp_sent: boolean;
  whatsapp_sent_at: string | null;
  email_sent: boolean;
  email_sent_at: string | null;
  notification_errors: string[] | null;
  tenant?: {
    name: string;
    is_activated: boolean;
  } | null;
  plan?: {
    name: string;
  } | null;
}

export interface CreateOrderInput {
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  businessName: string;
  businessTypeId: string;
  planId: string;
  billingCycle: 'monthly' | 'yearly';
  amount: number;
  paymentMethod?: string;
  transactionId?: string;
  processImmediately: boolean;
}

export function useExternalSales() {
  const queryClient = useQueryClient();

  const { data: orders, isLoading, error, refetch } = useQuery({
    queryKey: ['external-sales-orders'],
    queryFn: async (): Promise<ExternalSalesOrder[]> => {
      const { data, error } = await supabase
        .from('external_sales_orders')
        .select(`
          *,
          tenant:tenants(name, is_activated),
          plan:plans(name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []).map(item => ({
        ...item,
        whatsapp_sent: item.whatsapp_sent ?? false,
        email_sent: item.email_sent ?? false,
      })) as ExternalSalesOrder[];
    },
  });

  const createOrderMutation = useMutation({
    mutationFn: async (input: CreateOrderInput) => {
      // Generate unique order ID
      const orderId = `ADMIN-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

      // Get business type slug
      const { data: businessType, error: btError } = await supabase
        .from('business_types')
        .select('slug')
        .eq('id', input.businessTypeId)
        .single();

      if (btError) throw new Error('Failed to get business type');

      // Get plan name to use as slug (plans table uses name, we'll derive slug)
      const { data: plan, error: planError } = await supabase
        .from('plans')
        .select('name, tier')
        .eq('id', input.planId)
        .single();

      if (planError) throw new Error('Failed to get plan');

      // Derive plan slug from tier or name
      const planSlug = plan.tier || plan.name.toLowerCase().replace(/\s+/g, '-');

      if (input.processImmediately) {
        // Get the webhook secret from system_settings
        const { data: secretData } = await supabase
          .from('system_settings')
          .select('value')
          .eq('key', 'sales_webhook_secret')
          .single();

        // Handle nested value object from system_settings
        const rawValue = secretData?.value;
        const webhookSecret = typeof rawValue === 'object' && rawValue !== null && 'value' in rawValue
          ? (rawValue as { value: string }).value
          : rawValue as string | undefined;
        if (!webhookSecret) {
          throw new Error('Webhook secret not configured. Please set it in Admin Settings.');
        }

        // Call the sales-order-webhook edge function
        // Combine tier with business type slug for the webhook format (e.g., "starter_retail_ecom")
        const combinedPlanSlug = `${planSlug}_${businessType.slug}`;

        const response = await fetch(
          'https://cdkrvztqeuflxilrtnws.supabase.co/functions/v1/sales-order-webhook',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Sales-Webhook-Secret': webhookSecret,
            },
            body: JSON.stringify({
              customer: {
                name: input.customerName,
                email: input.customerEmail,
                phone: input.customerPhone || null,
              },
              order: {
                order_id: orderId,
                plan_slug: combinedPlanSlug,
                billing_cycle: input.billingCycle,
                amount: input.amount,
                payment_method: input.paymentMethod || 'manual',
                transaction_id: input.transactionId || null,
              },
              business: {
                name: input.businessName,
                type: businessType.slug,
              },
              source: 'admin-panel',
            }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to process order');
        }

        return response.json();
      } else {
        // Just save as pending
        const { data, error } = await supabase
          .from('external_sales_orders')
          .insert({
            external_order_id: orderId,
            source: 'admin-panel',
            customer_name: input.customerName,
            customer_email: input.customerEmail,
            customer_phone: input.customerPhone || null,
            business_name: input.businessName,
            business_type: businessType.slug,
            plan_id: input.planId,
            amount: input.amount,
            currency: 'BDT',
            billing_cycle: input.billingCycle,
            payment_method: input.paymentMethod || 'manual',
            transaction_id: input.transactionId || null,
            status: 'pending',
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['external-sales-orders'] });
      toast.success(
        variables.processImmediately
          ? 'Order processed successfully! User and tenant created.'
          : 'Order saved as pending.'
      );
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create order');
    },
  });

  const retryOrderMutation = useMutation({
    mutationFn: async (order: ExternalSalesOrder) => {
      // Get the webhook secret from system_settings
      const { data: secretData } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'sales_webhook_secret')
        .single();

      // Handle nested value object from system_settings
      const rawValue = secretData?.value;
      const webhookSecret = typeof rawValue === 'object' && rawValue !== null && 'value' in rawValue
        ? (rawValue as { value: string }).value
        : rawValue as string | undefined;
      if (!webhookSecret) {
        throw new Error('Webhook secret not configured. Please set it in Admin Settings.');
      }

      // Get plan info to derive slug
      let planSlug = 'starter';
      if (order.plan_id) {
        const { data: plan } = await supabase
          .from('plans')
          .select('name, tier')
          .eq('id', order.plan_id)
          .single();
        
        if (plan) {
          planSlug = plan.tier || plan.name.toLowerCase().replace(/\s+/g, '-');
        }
      }

      // Call the sales-order-webhook edge function
      const response = await fetch(
        'https://cdkrvztqeuflxilrtnws.supabase.co/functions/v1/sales-order-webhook',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Sales-Webhook-Secret': webhookSecret,
          },
          body: JSON.stringify({
            customer: {
              name: order.customer_name,
              email: order.customer_email,
              phone: order.customer_phone || null,
            },
            order: {
              order_id: order.external_order_id,
              plan_slug: `${planSlug}_${order.business_type}`,
              billing_cycle: order.billing_cycle,
              amount: order.amount,
              payment_method: order.payment_method || 'manual',
              transaction_id: order.transaction_id || null,
            },
            business: {
              name: order.business_name,
              type: order.business_type,
            },
            source: order.source,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to process order');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['external-sales-orders'] });
      toast.success('Order retried and processed successfully!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to retry order');
    },
  });

  const deleteOrderMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const { error } = await supabase
        .from('external_sales_orders')
        .delete()
        .eq('id', orderId);

      if (error) throw error;
      return orderId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['external-sales-orders'] });
      toast.success('Order deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete order');
    },
  });

  const resendNotificationMutation = useMutation({
    mutationFn: async ({ orderId, notificationType }: { orderId: string; notificationType: 'whatsapp' | 'email' | 'all' }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(
        'https://cdkrvztqeuflxilrtnws.supabase.co/functions/v1/resend-welcome-notification',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            order_id: orderId,
            notification_type: notificationType,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to resend notification');
      }

      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['external-sales-orders'] });
      const messages: string[] = [];
      if (data.notifications?.whatsapp_sent) messages.push('WhatsApp');
      if (data.notifications?.email_sent) messages.push('Email');
      if (messages.length > 0) {
        toast.success(`${messages.join(' & ')} sent successfully!`);
      } else {
        toast.warning('Notifications could not be sent. Check error details.');
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to resend notification');
    },
  });

  const stats = {
    total: orders?.length || 0,
    completed: orders?.filter(o => o.status === 'completed').length || 0,
    failed: orders?.filter(o => o.status === 'failed').length || 0,
    processing: orders?.filter(o => o.status === 'processing').length || 0,
    totalRevenue: orders?.filter(o => o.status === 'completed').reduce((sum, o) => sum + Number(o.amount), 0) || 0,
  };

  return {
    orders: orders || [],
    stats,
    loading: isLoading,
    error,
    refetch,
    createOrder: createOrderMutation.mutateAsync,
    isCreating: createOrderMutation.isPending,
    retryOrder: retryOrderMutation.mutateAsync,
    isRetrying: retryOrderMutation.isPending,
    retryingOrderId: retryOrderMutation.variables?.id || null,
    deleteOrder: deleteOrderMutation.mutateAsync,
    isDeleting: deleteOrderMutation.isPending,
    deletingOrderId: deleteOrderMutation.variables || null,
    resendNotification: resendNotificationMutation.mutateAsync,
    isResendingNotification: resendNotificationMutation.isPending,
    resendingOrderId: resendNotificationMutation.variables?.orderId || null,
  };
}

export function useRecentExternalSales(limit = 5) {
  const { data: orders, isLoading } = useQuery({
    queryKey: ['recent-external-sales', limit],
    queryFn: async (): Promise<ExternalSalesOrder[]> => {
      const { data, error } = await supabase
        .from('external_sales_orders')
        .select(`
          *,
          tenant:tenants(name, is_activated),
          plan:plans(name)
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as ExternalSalesOrder[];
    },
  });

  return {
    orders: orders || [],
    loading: isLoading,
  };
}
