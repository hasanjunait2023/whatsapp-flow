import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

import { useAuth } from './useAuth';

export interface ResourceOverrides {
  max_instances?: number;
  max_agents?: number;
  max_fb_pages?: number;
  max_messages_per_month?: number;
  custom_price_monthly?: number;
}

export interface AdminTenant {
  id: string;
  name: string;
  slug: string | null;
  owner_id: string;
  created_at: string;
  owner_email: string | null;
  owner_name: string | null;
  subscription_status: string | null;
  subscription_id: string | null;
  plan_id: string | null;
  plan_name: string | null;
  plan_features: Record<string, boolean> | null;
  feature_overrides: Record<string, boolean> | null;
  resource_overrides: ResourceOverrides | null;
  plan_defaults: {
    max_instances?: number;
    max_agents?: number;
    max_messages_per_month?: number;
    price_monthly?: number;
  } | null;
  instance_count: number;
  message_count: number;
  is_activated: boolean;
  activated_at: string | null;
}

export function useAdminTenants() {
  const { user } = useAuth();
  const [tenants, setTenants] = useState<AdminTenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchTenants = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch tenants with related data
      const { data: tenantsData, error: tenantsError } = await supabase
        .from('tenants')
        .select(`
          id,
          name,
          slug,
          owner_id,
          created_at,
          is_activated,
          activated_at
        `)
        .order('created_at', { ascending: false });

      if (tenantsError) throw tenantsError;

      // Fetch additional data for each tenant
      const enrichedTenants = await Promise.all(
        (tenantsData || []).map(async (tenant) => {
          // Get owner profile
          const { data: profile } = await supabase
            .from('profiles')
            .select('email, full_name')
            .eq('id', tenant.owner_id)
            .single();

          // Get subscription with plan features and resource overrides
          const { data: subscription } = await supabase
            .from('subscriptions')
            .select('id, status, plan_id, feature_overrides, resource_overrides, plan:plans(name, features, max_instances, max_agents, max_messages_per_month, price_monthly)')
            .eq('tenant_id', tenant.id)
            .single();

          // Get instance count
          const { count: instanceCount } = await supabase
            .from('whatsapp_instances')
            .select('id', { count: 'exact', head: true })
            .eq('tenant_id', tenant.id);

          // Get message count this month
          const startOfMonth = new Date();
          startOfMonth.setDate(1);
          startOfMonth.setHours(0, 0, 0, 0);
          
          const { count: messageCount } = await supabase
            .from('messages')
            .select('id', { count: 'exact', head: true })
            .eq('tenant_id', tenant.id)
            .gte('created_at', startOfMonth.toISOString());

          return {
            ...tenant,
            owner_email: profile?.email || null,
            owner_name: profile?.full_name || null,
            subscription_id: subscription?.id || null,
            subscription_status: subscription?.status || null,
            plan_id: subscription?.plan_id || null,
            plan_name: (subscription?.plan as any)?.name || null,
            plan_features: (subscription?.plan as any)?.features || null,
            feature_overrides: subscription?.feature_overrides as Record<string, boolean> | null,
            resource_overrides: (subscription as any)?.resource_overrides as ResourceOverrides | null,
            plan_defaults: subscription?.plan ? {
              max_instances: (subscription.plan as any).max_instances,
              max_agents: (subscription.plan as any).max_agents,
              max_messages_per_month: (subscription.plan as any).max_messages_per_month,
              price_monthly: (subscription.plan as any).price_monthly,
            } : null,
            instance_count: instanceCount || 0,
            message_count: messageCount || 0,
          };
        })
      );

      setTenants(enrichedTenants);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTenants();
  }, [fetchTenants]);

  const updateSubscriptionStatus = async (tenantId: string, status: 'trialing' | 'active' | 'past_due' | 'suspended' | 'cancelled') => {
    const { error } = await supabase
      .from('subscriptions')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('tenant_id', tenantId);

    if (error) throw error;
    await fetchTenants();
  };

  // Helper to call the admin delete tenant edge function
  const callDeleteTenantEndpoint = async (tenantIds: string[]) => {
    const response = await fetch('/api/fn/admin-delete-tenant', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenant_ids: tenantIds }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to delete tenants');
    }

    // Check if all tenants were deleted successfully
    if (!result.success) {
      const failedTenants = result.results?.filter((r: any) => !r.success) || [];
      if (failedTenants.length > 0) {
        throw new Error(`Failed to delete ${failedTenants.length} tenant(s)`);
      }
    }

    return result;
  };

  const deleteTenant = async (tenantId: string) => {
    await callDeleteTenantEndpoint([tenantId]);
    await fetchTenants();
  };

  const bulkUpdateSubscriptionStatus = async (tenantIds: string[], status: 'trialing' | 'active' | 'past_due' | 'suspended' | 'cancelled') => {
    const { error } = await supabase
      .from('subscriptions')
      .update({ status, updated_at: new Date().toISOString() })
      .in('tenant_id', tenantIds);

    if (error) throw error;
    await fetchTenants();
  };

  const bulkDeleteTenants = async (tenantIds: string[]) => {
    await callDeleteTenantEndpoint(tenantIds);
    await fetchTenants();
  };

  const updateTenantPlan = async (tenantId: string, planId: string) => {
    const { error } = await supabase
      .from('subscriptions')
      .update({ plan_id: planId, updated_at: new Date().toISOString() })
      .eq('tenant_id', tenantId);

    if (error) throw error;
    await fetchTenants();
  };

  const updateFeatureOverrides = async (tenantId: string, overrides: Record<string, boolean> | null) => {
    const { error } = await supabase
      .from('subscriptions')
      .update({ feature_overrides: overrides, updated_at: new Date().toISOString() })
      .eq('tenant_id', tenantId);

    if (error) throw error;
    await fetchTenants();
  };

  const bulkUpdateFeatureOverrides = async (tenantIds: string[], overridesToApply: Record<string, boolean>) => {
    const results = await Promise.allSettled(
      tenantIds.map((tenantId) => {
        const tenant = tenants.find((t) => t.id === tenantId);
        const mergedOverrides = { ...(tenant?.feature_overrides || {}), ...overridesToApply };
        return supabase
          .from('subscriptions')
          .update({ feature_overrides: mergedOverrides, updated_at: new Date().toISOString() })
          .eq('tenant_id', tenantId)
          .then(({ error }) => { if (error) throw error; });
      }),
    );
    await fetchTenants();
    const failed = results.filter((r) => r.status === 'rejected').length;
    if (failed > 0) throw new Error(`${failed} of ${tenantIds.length} feature override updates failed`);
  };

  const bulkResetFeatureOverrides = async (tenantIds: string[]) => {
    const { error } = await supabase
      .from('subscriptions')
      .update({ feature_overrides: null, updated_at: new Date().toISOString() })
      .in('tenant_id', tenantIds);

    if (error) throw error;
    await fetchTenants();
  };

  const updateResourceOverrides = async (tenantId: string, overrides: ResourceOverrides | null) => {
    const updatePayload: Record<string, any> = { updated_at: new Date().toISOString() };
    if (overrides === null) {
      updatePayload.resource_overrides = null;
    } else {
      updatePayload.resource_overrides = overrides;
    }
    
    const { error, count } = await supabase
      .from('subscriptions')
      .update(updatePayload)
      .eq('tenant_id', tenantId);

    if (error) {
      throw error;
    }
    await fetchTenants();
  };

  // Direct tenant activation (emergency activation without order)
  const activateTenant = async (tenantId: string) => {
    if (!user) throw new Error('Not authenticated');

    // Update tenant activation status
    const { error: tenantError } = await supabase
      .from('tenants')
      .update({
        is_activated: true,
        activated_at: new Date().toISOString(),
      })
      .eq('id', tenantId);

    if (tenantError) throw tenantError;

    // Also activate subscription if exists
    const { error: subError } = await supabase
      .from('subscriptions')
      .update({
        status: 'active',
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('tenant_id', tenantId);

    if (subError) throw subError;

    await fetchTenants();
  };

  return {
    tenants,
    loading,
    error,
    refetch: fetchTenants,
    updateSubscriptionStatus,
    deleteTenant,
    bulkUpdateSubscriptionStatus,
    bulkDeleteTenants,
    updateTenantPlan,
    updateFeatureOverrides,
    bulkUpdateFeatureOverrides,
    bulkResetFeatureOverrides,
    activateTenant,
    updateResourceOverrides,
  };
}
