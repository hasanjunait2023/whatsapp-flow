import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useImpersonation } from '@/contexts/ImpersonationContext';

export interface Tenant {
  id: string;
  name: string;
  slug: string | null;
  owner_id: string;
  logo_url: string | null;
  created_at: string;
  is_activated: boolean;
  activated_at: string | null;
  business_type_id: string | null;
  pending_plan_id: string | null;
}

export interface UserRole {
  id: string;
  tenant_id: string;
  role: 'owner' | 'manager' | 'agent';
  tenant: Tenant;
}

// Timeout utility to prevent hanging
const withTimeout = <T,>(promise: Promise<T>, ms: number): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => 
      setTimeout(() => reject(new Error('Request timeout')), ms)
    )
  ]);
};

/**
 * Single-source-of-truth tenant state.
 * Use via TenantProvider (context). Do not call directly from components.
 */
export function useTenantState() {
  const { user, loading: authLoading } = useAuth();
  const { impersonatedTenant, isImpersonating } = useImpersonation();
  const [tenants, setTenants] = useState<UserRole[]>([]);
  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null);
  const [currentRole, setCurrentRole] = useState<'owner' | 'manager' | 'agent' | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  

  // Track which user we've fetched for to properly reset on user change
  const lastFetchedUserId = useRef<string | null>(null);

  useEffect(() => {
    // Wait for auth to finish loading before deciding
    if (authLoading) return;
    
    if (!user) {
      setTenants([]);
      setCurrentTenant(null);
      setCurrentRole(null);
      setLoading(false);
      lastFetchedUserId.current = null;
      return;
    }

    // Only refetch if user changed or we haven't fetched yet
    if (lastFetchedUserId.current === user.id) return;
    lastFetchedUserId.current = user.id;
    
    setLoading(true);
    fetchUserTenants();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, authLoading]);

  // Handle impersonation changes
  useEffect(() => {
    if (isImpersonating && impersonatedTenant) {
      // When impersonating, fetch the impersonated tenant details
      fetchImpersonatedTenant(impersonatedTenant.id);
    } else if (tenants.length > 0) {
      // When not impersonating, restore normal tenant
      const storedTenantId = localStorage.getItem('currentTenantId');
      const storedTenant = tenants.find((r) => r.tenant_id === storedTenantId);
      
      if (storedTenant) {
        setCurrentTenant(storedTenant.tenant);
        setCurrentRole(storedTenant.role);
      } else if (tenants.length > 0) {
        setCurrentTenant(tenants[0].tenant);
        setCurrentRole(tenants[0].role);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isImpersonating, impersonatedTenant?.id]);

  const fetchImpersonatedTenant = async (tenantId: string) => {
    setLoading(true);
    try {
      const { data, error: fetchError } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', tenantId)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (data) {
        setCurrentTenant(data as Tenant);
        // Admin impersonating gets owner-level access for debugging
        setCurrentRole('owner');
      }
    } catch (err) {
      console.error('Failed to fetch impersonated tenant:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserTenants = async () => {
    if (!user) return;

    try {
      // Use timeout to prevent hanging - 5 second max
      const fetchPromise = (async () => {
        return await supabase
          .from('user_roles')
          .select(
            `
            id,
            tenant_id,
            role,
            tenant:tenants (
              id,
              name,
              slug,
              owner_id,
              logo_url,
              created_at,
              is_activated,
              activated_at,
              business_type_id,
              pending_plan_id
            )
          `
          )
          .eq('user_id', user.id);
      })();

      const result = await withTimeout(fetchPromise, 5000);

      if (result.error) throw result.error;
      const data = result.data;

      const userRoles = (data || []).map((item: any) => ({
        id: item.id,
        tenant_id: item.tenant_id,
        role: item.role,
        tenant: item.tenant,
      })) as UserRole[];

      setTenants(userRoles);

      // Only set current tenant if not impersonating
      if (!isImpersonating) {
        const storedTenantId = localStorage.getItem('currentTenantId');
        const storedTenant = userRoles.find((r) => r.tenant_id === storedTenantId);

        if (storedTenant) {
          setCurrentTenant(storedTenant.tenant);
          setCurrentRole(storedTenant.role);
        } else if (userRoles.length > 0) {
          setCurrentTenant(userRoles[0].tenant);
          setCurrentRole(userRoles[0].role);
          localStorage.setItem('currentTenantId', userRoles[0].tenant_id);
        } else {
          setCurrentTenant(null);
          setCurrentRole(null);
        }
      }
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  const switchTenant = (tenantId: string) => {
    // Don't allow switching while impersonating
    if (isImpersonating) return;
    
    const tenant = tenants.find((t) => t.tenant_id === tenantId);
    if (tenant) {
      setCurrentTenant(tenant.tenant);
      setCurrentRole(tenant.role);
      localStorage.setItem('currentTenantId', tenantId);
    }
  };

  const createTenant = async (name: string, businessTypeId?: string, pendingPlanId?: string) => {
    if (!user) throw new Error('User not authenticated');

    const insertPayload = {
      name,
      slug: name.toLowerCase().replace(/\s+/g, '-'),
      owner_id: user.id,
      ...(businessTypeId ? { business_type_id: businessTypeId } : {}),
      ...(pendingPlanId ? { pending_plan_id: pendingPlanId } : {}),
    };

    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .insert([insertPayload])
      .select()
      .single();

    if (tenantError) throw tenantError;

    const { error: roleError } = await supabase
      .from('user_roles')
      .insert({
        user_id: user.id,
        tenant_id: tenant.id,
        role: 'owner',
      });

    if (roleError) throw roleError;

    // Prefer switching to the newly created tenant.
    localStorage.setItem('currentTenantId', tenant.id);
    await fetchUserTenants();

    return tenant;
  };

  return {
    tenants,
    currentTenant,
    currentRole,
    loading,
    error,
    switchTenant,
    createTenant,
    refetch: fetchUserTenants,
    hasTenants: tenants.length > 0,
    isOwner: currentRole === 'owner',
    isManager: currentRole === 'owner' || currentRole === 'manager',
    isImpersonating,
  };
}
