import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface AdminPermissions {
  dashboard: boolean;
  tenants: boolean;
  users: boolean;
  instances: boolean;
  leads: boolean;
  accounts: boolean;
  payments: boolean;
  subscriptions: boolean;
  plans: boolean;
  audit_logs: boolean;
  settings: boolean;
  admin_management: boolean;
  communication: boolean;
  support: boolean;
  team: boolean;
  reports: boolean;
}

export const DEFAULT_PERMISSIONS: AdminPermissions = {
  dashboard: true,
  tenants: true,
  users: true,
  instances: true,
  leads: true,
  accounts: false,
  payments: false,
  subscriptions: true,
  plans: false,
  audit_logs: true,
  settings: false,
  admin_management: false,
  communication: true,
  support: true,
  team: true,
  reports: true,
};

export const FULL_PERMISSIONS: AdminPermissions = {
  dashboard: true,
  tenants: true,
  users: true,
  instances: true,
  leads: true,
  accounts: true,
  payments: true,
  subscriptions: true,
  plans: true,
  audit_logs: true,
  settings: true,
  admin_management: true,
  communication: true,
  support: true,
  team: true,
  reports: true,
};

export const PERMISSION_LABELS: Record<keyof AdminPermissions, string> = {
  dashboard: 'Dashboard',
  tenants: 'Tenants',
  users: 'Users',
  instances: 'WhatsApp',
  leads: 'Marketing Leads',
  accounts: 'Accounts',
  payments: 'Payments',
  subscriptions: 'Subscriptions',
  plans: 'Plans',
  audit_logs: 'Audit Logs',
  settings: 'Settings',
  admin_management: 'Admin Management',
  communication: 'Communication',
  support: 'Support',
  team: 'Team',
  reports: 'Reports',
};

export function useAdminPermissions() {
  const { user, loading: authLoading } = useAuth();
  const [permissions, setPermissions] = useState<AdminPermissions>(DEFAULT_PERMISSIONS);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPermissions() {
      if (authLoading) return;

      if (!user) {
        setPermissions(DEFAULT_PERMISSIONS);
        setIsSuperAdmin(false);
        setLoading(false);
        return;
      }

      try {
        // Check if user is super admin
        const { data: superAdminData } = await supabase.rpc('is_super_admin');
        const isSuper = superAdminData === true;
        setIsSuperAdmin(isSuper);

        if (isSuper) {
          // Super admins have full permissions
          setPermissions(FULL_PERMISSIONS);
        } else {
          // Fetch permissions from database
          const { data: permData } = await supabase.rpc('get_admin_permissions');
          
          if (permData && typeof permData === 'object') {
            setPermissions({
              ...DEFAULT_PERMISSIONS,
              ...(permData as Partial<AdminPermissions>),
            });
          } else {
            setPermissions(DEFAULT_PERMISSIONS);
          }
        }
      } catch (err) {
        console.error('Error fetching admin permissions:', err);
        setPermissions(DEFAULT_PERMISSIONS);
      } finally {
        setLoading(false);
      }
    }

    fetchPermissions();
  }, [user, authLoading]);

  const hasPermission = (module: keyof AdminPermissions): boolean => {
    if (isSuperAdmin) return true;
    return permissions[module] === true;
  };

  return {
    permissions,
    isSuperAdmin,
    loading: loading || authLoading,
    hasPermission,
  };
}
