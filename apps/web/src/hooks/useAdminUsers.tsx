import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface AdminUser {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  is_admin: boolean;
  tenant_count: number;
  tenants: Array<{ id: string; name: string; role: string }>;
}

export function useAdminUsers() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch only system admin roles - this page only shows admins, not customers
      const { data: adminRoles, error: adminError } = await supabase
        .from('system_roles')
        .select('user_id')
        .eq('role', 'admin');

      if (adminError) throw adminError;

      const adminUserIds = adminRoles?.map(r => r.user_id) || [];

      // If no admins, return empty
      if (adminUserIds.length === 0) {
        setUsers([]);
        return;
      }

      // Fetch only profiles of admin users
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .in('id', adminUserIds)
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch user roles (tenant memberships) for these admins only
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, tenant_id, role')
        .in('user_id', adminUserIds);

      if (rolesError) throw rolesError;

      // Fetch tenant names
      const tenantIds = [...new Set(userRoles?.map(r => r.tenant_id) || [])];
      let tenantsMap: Record<string, string> = {};
      
      if (tenantIds.length > 0) {
        const { data: tenants } = await supabase
          .from('tenants')
          .select('id, name')
          .in('id', tenantIds);
        
        tenantsMap = (tenants || []).reduce((acc, t) => {
          acc[t.id] = t.name;
          return acc;
        }, {} as Record<string, string>);
      }

      // Build user objects - all are admins
      const enrichedUsers: AdminUser[] = (profiles || []).map(profile => {
        const userTenantRoles = userRoles?.filter(r => r.user_id === profile.id) || [];
        
        return {
          id: profile.id,
          email: profile.email,
          full_name: profile.full_name,
          avatar_url: profile.avatar_url,
          created_at: profile.created_at,
          is_admin: true, // All users in this list are admins
          tenant_count: userTenantRoles.length,
          tenants: userTenantRoles.map(r => ({
            id: r.tenant_id,
            name: tenantsMap[r.tenant_id] || 'Unknown',
            role: r.role,
          })),
        };
      });

      setUsers(enrichedUsers);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  }, []);

  const grantAdminRole = useCallback(async (userId: string) => {
    const { error } = await supabase
      .from('system_roles')
      .insert([{ user_id: userId, role: 'admin' }] as any);

    if (error) throw error;
    await fetchUsers();
  }, [fetchUsers]);

  const revokeAdminRole = useCallback(async (userId: string) => {
    const { error } = await supabase
      .from('system_roles')
      .delete()
      .eq('user_id', userId)
      .eq('role', 'admin');

    if (error) throw error;
    await fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  return {
    users,
    loading,
    error,
    refetch: fetchUsers,
    grantAdminRole,
    revokeAdminRole,
  };
}
