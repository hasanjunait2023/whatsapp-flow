import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { AdminCustomer } from './useAdminCustomers';

export interface CustomerInstance {
  id: string;
  name: string;
  phone_number: string | null;
  status: string;
  is_default: boolean;
}

export interface CustomerActivity {
  id: string;
  event_type: string;
  event_category: string | null;
  title_bn: string;
  description_bn: string | null;
  channel: string | null;
  created_at: string;
  metadata: Record<string, any> | null;
}

export interface CustomerUsageStat {
  period_start: string;
  messages_sent: number;
  messages_received: number;
}

export interface CustomerPayment {
  id: string;
  order_number: string;
  amount: number;
  currency: string;
  billing_cycle: string;
  status: string;
  payment_method: string | null;
  created_at: string;
}

export interface CustomerTicket {
  id: string;
  ticket_number: string;
  subject: string;
  category: string;
  priority: string;
  status: string;
  created_at: string;
}

export interface CustomerAuditLog {
  id: string;
  admin_id: string | null;
  admin_name: string | null;
  admin_email: string | null;
  action: string;
  details: Record<string, any> | null;
  created_at: string;
}

export interface CustomerSubscription {
  plan_id: string;
  plan_name: string;
  status: string;
  current_period_start: string | null;
  current_period_end: string | null;
}

export interface CustomerFullDetails extends AdminCustomer {
  owner_id: string | null;
  subscription: CustomerSubscription | null;
  instances: CustomerInstance[];
  team_member_count: number;
  contact_count: number;
  activities: CustomerActivity[];
  usage_stats: CustomerUsageStat[];
  payments: CustomerPayment[];
  tickets: CustomerTicket[];
  audit_logs: CustomerAuditLog[];
}

export function useCustomerDetails(tenantId: string | null) {
  const [details, setDetails] = useState<CustomerFullDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDetails = useCallback(async () => {
    if (!tenantId) {
      setDetails(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch tenant
      const { data: tenant, error: tenantError } = await supabase
        .from('tenants')
        .select('id, name, slug, is_activated, activated_at, created_at, owner_id')
        .eq('id', tenantId)
        .single();

      if (tenantError) throw tenantError;

      // Fetch owner profile separately
      let ownerProfile: { email: string | null; full_name: string | null; avatar_url: string | null; phone_number: string | null } | null = null;
      if (tenant.owner_id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('email, full_name, avatar_url, phone_number')
          .eq('id', tenant.owner_id)
          .single();
        ownerProfile = profile;
      }

      // Fetch all related data in parallel
      const [
        subscriptionResult,
        instancesResult,
        teamResult,
        contactsResult,
        activitiesResult,
        usageResult,
        paymentsResult,
        ticketsResult,
        auditResult,
        messagesResult,
        ordersResult
      ] = await Promise.all([
        // Subscription
        supabase
          .from('subscriptions')
          .select(`
            plan_id,
            status,
            current_period_start,
            current_period_end,
            plan:plans(name)
          `)
          .eq('tenant_id', tenantId)
          .single(),
        
        // WhatsApp Instances
        supabase
          .from('whatsapp_instances')
          .select('id, name, phone_number, status, is_default')
          .eq('tenant_id', tenantId),
        
        // Team members count
        supabase
          .from('user_roles')
          .select('id', { count: 'exact', head: true })
          .eq('tenant_id', tenantId),
        
        // Contacts count
        supabase
          .from('contacts')
          .select('id', { count: 'exact', head: true })
          .eq('tenant_id', tenantId),
        
        // Activity log
        supabase
          .from('admin_customer_journey')
          .select('*')
          .eq('entity_type', 'tenant')
          .eq('entity_id', tenantId)
          .order('created_at', { ascending: false })
          .limit(50),
        
        // Usage stats
        supabase
          .from('usage_counters')
          .select('period_start, messages_sent, messages_received')
          .eq('tenant_id', tenantId)
          .order('period_start', { ascending: false })
          .limit(12),
        
        // Payments
        supabase
          .from('subscription_orders')
          .select('id, order_number, amount, currency, billing_cycle, status, payment_method, created_at')
          .eq('tenant_id', tenantId)
          .order('created_at', { ascending: false }),
        
        // Support tickets
        supabase
          .from('support_tickets')
          .select('id, ticket_number, subject, category, priority, status, created_at')
          .eq('tenant_id', tenantId)
          .order('created_at', { ascending: false }),
        
        // Audit logs for this tenant
        supabase
          .from('admin_audit_logs')
          .select(`
            id,
            admin_id,
            action,
            details,
            created_at
          `)
          .eq('entity_type', 'tenant')
          .eq('entity_id', tenantId)
          .order('created_at', { ascending: false })
          .limit(50),
        
        // Messages count
        supabase
          .from('messages')
          .select('id', { count: 'exact', head: true })
          .eq('tenant_id', tenantId),
        
        // Orders count
        supabase
          .from('orders')
          .select('id', { count: 'exact', head: true })
          .eq('tenant_id', tenantId),
      ]);

      // Fetch admin profiles for audit logs
      const adminIds = auditResult.data
        ?.map(a => a.admin_id)
        .filter((id): id is string => !!id) || [];
      
      let adminProfiles: Record<string, { full_name: string | null; email: string | null }> = {};
      if (adminIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', adminIds);
        
        profiles?.forEach(p => {
          adminProfiles[p.id] = { full_name: p.full_name, email: p.email };
        });
      }

      const sub = subscriptionResult.data;
      
      // Calculate payment totals
      const paidPayments = paymentsResult.data?.filter(p => p.status === 'paid') || [];
      const totalPaid = paidPayments.reduce((sum, p) => sum + p.amount, 0);

      const fullDetails: CustomerFullDetails = {
        id: tenant.id,
        user_id: tenant.owner_id!,
        owner_id: tenant.owner_id || null,
        email: ownerProfile?.email || null,
        full_name: ownerProfile?.full_name || null,
        phone_number: ownerProfile?.phone_number || null,
        avatar_url: ownerProfile?.avatar_url || null,
        tenant_name: tenant.name,
        tenant_slug: tenant.slug,
        is_activated: tenant.is_activated,
        activated_at: tenant.activated_at,
        created_at: tenant.created_at,
        plan_name: (sub?.plan as any)?.name || null,
        subscription_status: sub?.status || null,
        message_count: messagesResult.count || 0,
        order_count: ordersResult.count || 0,
        instance_count: instancesResult.data?.length || 0,
        total_paid: totalPaid,
        
        subscription: sub ? {
          plan_id: sub.plan_id,
          plan_name: (sub.plan as any)?.name || 'Unknown',
          status: sub.status,
          current_period_start: sub.current_period_start,
          current_period_end: sub.current_period_end,
        } : null,
        
        instances: (instancesResult.data || []).map(i => ({
          id: i.id,
          name: i.name,
          phone_number: i.phone_number,
          status: i.status,
          is_default: i.is_default,
        })),
        
        team_member_count: teamResult.count || 0,
        contact_count: contactsResult.count || 0,
        
        activities: (activitiesResult.data || []).map(a => ({
          id: a.id,
          event_type: a.event_type,
          event_category: a.event_category,
          title_bn: a.title_bn,
          description_bn: a.description_bn,
          channel: a.channel,
          created_at: a.created_at!,
          metadata: a.metadata as Record<string, any> | null,
        })),
        
        usage_stats: (usageResult.data || []).map(u => ({
          period_start: u.period_start,
          messages_sent: u.messages_sent,
          messages_received: u.messages_received,
        })),
        
        payments: (paymentsResult.data || []).map(p => ({
          id: p.id,
          order_number: p.order_number,
          amount: p.amount,
          currency: p.currency,
          billing_cycle: p.billing_cycle,
          status: p.status,
          payment_method: p.payment_method,
          created_at: p.created_at,
        })),
        
        tickets: (ticketsResult.data || []).map(t => ({
          id: t.id,
          ticket_number: t.ticket_number,
          subject: t.subject,
          category: t.category,
          priority: t.priority,
          status: t.status,
          created_at: t.created_at,
        })),
        
        audit_logs: (auditResult.data || []).map(a => ({
          id: a.id,
          admin_id: a.admin_id,
          admin_name: adminProfiles[a.admin_id || '']?.full_name || null,
          admin_email: adminProfiles[a.admin_id || '']?.email || null,
          action: a.action,
          details: a.details as Record<string, any> | null,
          created_at: a.created_at,
        })),
      };

      setDetails(fullDetails);
    } catch (err) {
      console.error('Error fetching customer details:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch customer details');
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  return {
    details,
    loading,
    error,
    refetch: fetchDetails,
  };
}
