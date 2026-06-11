import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

const DEMO_TENANT_ID = '00000000-0000-0000-0000-000000000001';

export interface AdminCustomer {
  id: string;                    // tenant_id
  user_id: string;               // owner's profile id
  email: string | null;
  full_name: string | null;
  phone_number: string | null;
  avatar_url: string | null;
  
  // Tenant info
  tenant_name: string;
  tenant_slug: string | null;
  is_activated: boolean;
  activated_at: string | null;
  created_at: string;
  
  // Subscription
  plan_name: string | null;
  subscription_status: string | null;
  
  // Quick stats
  message_count: number;
  order_count: number;
  instance_count: number;
  total_paid: number;
}

export function useAdminCustomers() {
  const [customers, setCustomers] = useState<AdminCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCustomers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch admin user IDs to exclude them
      const { data: adminRoles } = await supabase
        .from('system_roles')
        .select('user_id')
        .eq('role', 'admin');
      
      const adminUserIds = new Set(adminRoles?.map(r => r.user_id) || []);

      // Fetch all tenants
      const { data: tenants, error: tenantsError } = await supabase
        .from('tenants')
        .select('id, name, slug, is_activated, activated_at, created_at, owner_id')
        .order('created_at', { ascending: false });

      if (tenantsError) throw tenantsError;

      // Filter out tenants owned by admins and demo tenant
      const nonAdminTenants = (tenants || []).filter(t => 
        t.owner_id && 
        !adminUserIds.has(t.owner_id) && 
        t.id !== DEMO_TENANT_ID
      );

      // Get owner IDs and fetch their profiles separately
      const ownerIds = nonAdminTenants.map(t => t.owner_id).filter((id): id is string => !!id);
      
      let profilesMap: Record<string, { email: string | null; full_name: string | null; avatar_url: string | null; phone_number: string | null }> = {};
      if (ownerIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, email, full_name, avatar_url, phone_number')
          .in('id', ownerIds);
        
        profiles?.forEach(p => {
          profilesMap[p.id] = {
            email: p.email,
            full_name: p.full_name,
            avatar_url: p.avatar_url,
            phone_number: p.phone_number
          };
        });
      }

      // Get tenant IDs for aggregation queries
      const tenantIds = nonAdminTenants.map(t => t.id);

      if (tenantIds.length === 0) {
        setCustomers([]);
        return;
      }

      // Fetch subscriptions with plan info
      const { data: subscriptions } = await supabase
        .from('subscriptions')
        .select(`
          tenant_id,
          status,
          plan:plans(name)
        `)
        .in('tenant_id', tenantIds);

      // Fetch instance counts
      const { data: instanceCounts } = await supabase
        .from('whatsapp_instances')
        .select('tenant_id')
        .in('tenant_id', tenantIds);

      // Fetch payment totals
      const { data: payments } = await supabase
        .from('subscription_orders')
        .select('tenant_id, amount')
        .in('tenant_id', tenantIds)
        .eq('status', 'paid');

      // Aggregate counts
      const instanceCountMap: Record<string, number> = {};
      instanceCounts?.forEach(i => {
        instanceCountMap[i.tenant_id] = (instanceCountMap[i.tenant_id] || 0) + 1;
      });

      const paymentTotalMap: Record<string, number> = {};
      payments?.forEach(p => {
        paymentTotalMap[p.tenant_id] = (paymentTotalMap[p.tenant_id] || 0) + p.amount;
      });

      const subscriptionMap: Record<string, { status: string; plan_name: string | null }> = {};
      subscriptions?.forEach(s => {
        subscriptionMap[s.tenant_id] = {
          status: s.status,
          plan_name: (s.plan as any)?.name || null
        };
      });

      // Build customer objects
      const enrichedCustomers: AdminCustomer[] = nonAdminTenants
        .map(tenant => {
          const owner = profilesMap[tenant.owner_id!];
          const sub = subscriptionMap[tenant.id];

          return {
            id: tenant.id,
            user_id: tenant.owner_id!,
            email: owner?.email || null,
            full_name: owner?.full_name || null,
            phone_number: owner?.phone_number || null,
            avatar_url: owner?.avatar_url || null,
            tenant_name: tenant.name,
            tenant_slug: tenant.slug,
            is_activated: tenant.is_activated || false,
            activated_at: tenant.activated_at,
            created_at: tenant.created_at,
            plan_name: sub?.plan_name || null,
            subscription_status: sub?.status || null,
            message_count: 0, // Will be fetched on detail view
            order_count: 0, // Will be fetched on detail view
            instance_count: instanceCountMap[tenant.id] || 0,
            total_paid: paymentTotalMap[tenant.id] || 0,
          };
        });

      setCustomers(enrichedCustomers);
    } catch (err) {
      console.error('Error fetching customers:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch customers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const activeCustomers = customers.filter(c => c.is_activated);
  const inactiveCustomers = customers.filter(c => !c.is_activated);

  return {
    customers,
    activeCustomers,
    inactiveCustomers,
    loading,
    error,
    refetch: fetchCustomers,
  };
}
