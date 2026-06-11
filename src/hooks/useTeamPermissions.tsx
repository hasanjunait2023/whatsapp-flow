import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/useTenant';
import { useAuth } from '@/hooks/useAuth';

export interface TeamPermissions {
  // Module Access
  can_access_inbox: boolean;
  can_access_orders: boolean;
  can_access_products: boolean;
  can_access_contacts: boolean;
  can_access_groups: boolean;
  can_access_automation: boolean;
  can_access_workflows: boolean;
  can_access_analytics: boolean;
  can_access_reports: boolean;
  can_access_complaints: boolean;
  can_access_accounts: boolean;
  can_access_team: boolean;
  can_access_settings: boolean;
  can_access_fb_inbox: boolean;
  can_access_ai_agent: boolean;
  can_access_internal_chat: boolean;
  
  // Order Permissions
  can_create_orders: boolean;
  can_edit_orders: boolean;
  can_delete_orders: boolean;
  can_update_order_status: boolean;
  can_update_payment_status: boolean;
  
  // Product Permissions
  can_create_products: boolean;
  can_edit_products: boolean;
  can_delete_products: boolean;
  
  // Contact Permissions
  can_create_contacts: boolean;
  can_edit_contacts: boolean;
  can_delete_contacts: boolean;
  can_assign_contacts: boolean;
  
  // Message Permissions
  can_send_messages: boolean;
  can_delete_messages: boolean;
  can_send_bulk_messages: boolean;
  
  // Data Permissions
  can_view_revenue: boolean;
  can_export_data: boolean;
}

export interface PermissionTemplate {
  id: string;
  name: string;
  description: string | null;
  permissions: Partial<TeamPermissions>;
  is_system: boolean;
  tenant_id: string | null;
}

const DEFAULT_PERMISSIONS: TeamPermissions = {
  can_access_inbox: true,
  can_access_orders: true,
  can_access_products: false,
  can_access_contacts: true,
  can_access_groups: false,
  can_access_automation: false,
  can_access_workflows: false,
  can_access_analytics: false,
  can_access_reports: false,
  can_access_complaints: true,
  can_access_accounts: false,
  can_access_team: false,
  can_access_settings: false,
  can_access_fb_inbox: false,
  can_access_ai_agent: false,
  can_access_internal_chat: true,
  can_create_orders: true,
  can_edit_orders: false,
  can_delete_orders: false,
  can_update_order_status: true,
  can_update_payment_status: false,
  can_create_products: false,
  can_edit_products: false,
  can_delete_products: false,
  can_create_contacts: true,
  can_edit_contacts: true,
  can_delete_contacts: false,
  can_assign_contacts: false,
  can_send_messages: true,
  can_delete_messages: false,
  can_send_bulk_messages: false,
  can_view_revenue: false,
  can_export_data: false,
};

const FULL_PERMISSIONS: TeamPermissions = {
  can_access_inbox: true,
  can_access_orders: true,
  can_access_products: true,
  can_access_contacts: true,
  can_access_groups: true,
  can_access_automation: true,
  can_access_workflows: true,
  can_access_analytics: true,
  can_access_reports: true,
  can_access_complaints: true,
  can_access_accounts: true,
  can_access_team: true,
  can_access_settings: true,
  can_access_fb_inbox: true,
  can_access_ai_agent: true,
  can_access_internal_chat: true,
  can_create_orders: true,
  can_edit_orders: true,
  can_delete_orders: true,
  can_update_order_status: true,
  can_update_payment_status: true,
  can_create_products: true,
  can_edit_products: true,
  can_delete_products: true,
  can_create_contacts: true,
  can_edit_contacts: true,
  can_delete_contacts: true,
  can_assign_contacts: true,
  can_send_messages: true,
  can_delete_messages: true,
  can_send_bulk_messages: true,
  can_view_revenue: true,
  can_export_data: true,
};

type ModuleKey = 
  | 'inbox' | 'orders' | 'products' | 'contacts' | 'groups'
  | 'automation' | 'workflows' | 'analytics' | 'reports'
  | 'complaints' | 'accounts' | 'team' | 'settings'
  | 'fb_inbox' | 'ai_agent' | 'internal_chat' | 'service_boards';

type EntityKey = 'orders' | 'products' | 'contacts' | 'messages';
type ActionKey = 'create' | 'edit' | 'delete' | 'update_status' | 'update_payment' | 'assign' | 'bulk';

export function useTeamPermissions() {
  const tenantContext = useTenant();
  const authContext = useAuth();
  
  const currentTenant = tenantContext?.currentTenant;
  const currentRole = tenantContext?.currentRole;
  const user = authContext?.user;
  
  const [permissions, setPermissions] = useState<TeamPermissions>(DEFAULT_PERMISSIONS);
  const [loading, setLoading] = useState(true);
  const [refetchTrigger, setRefetchTrigger] = useState(0);

  const isOwnerOrManager = currentRole === 'owner' || currentRole === 'manager';
  const isOwner = currentRole === 'owner';

  useEffect(() => {
    let isMounted = true;
    
    const fetchPermissions = async () => {
      if (!currentTenant?.id || !user?.id) {
        if (isMounted) setLoading(false);
        return;
      }

      // Owners and managers get full access
      if (isOwnerOrManager) {
        if (isMounted) {
          setPermissions(FULL_PERMISSIONS);
          setLoading(false);
        }
        return;
      }

      try {
        if (isMounted) setLoading(true);
        
        const { data, error } = await supabase
          .from('team_member_permissions')
          .select('*')
          .eq('tenant_id', currentTenant.id)
          .eq('user_id', user.id)
          .maybeSingle();

        if (!isMounted) return;

        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching permissions:', error);
        }

        if (data) {
          setPermissions(data as unknown as TeamPermissions);
        } else {
          setPermissions(DEFAULT_PERMISSIONS);
        }
      } catch (error) {
        console.error('Permission fetch error:', error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchPermissions();
    
    return () => {
      isMounted = false;
    };
  }, [currentTenant?.id, user?.id, isOwnerOrManager, refetchTrigger]);

  const refetch = useCallback(() => {
    setRefetchTrigger(prev => prev + 1);
  }, []);

  const canAccess = useCallback((module: ModuleKey): boolean => {
    if (isOwnerOrManager) return true;
    const key = `can_access_${module}` as keyof TeamPermissions;
    return permissions[key] ?? false;
  }, [permissions, isOwnerOrManager]);

  const canPerform = useCallback((action: ActionKey, entity: EntityKey): boolean => {
    if (isOwnerOrManager) return true;

    const actionMap: Record<EntityKey, Record<ActionKey, keyof TeamPermissions | null>> = {
      orders: {
        create: 'can_create_orders',
        edit: 'can_edit_orders',
        delete: 'can_delete_orders',
        update_status: 'can_update_order_status',
        update_payment: 'can_update_payment_status',
        assign: null,
        bulk: null,
      },
      products: {
        create: 'can_create_products',
        edit: 'can_edit_products',
        delete: 'can_delete_products',
        update_status: null,
        update_payment: null,
        assign: null,
        bulk: null,
      },
      contacts: {
        create: 'can_create_contacts',
        edit: 'can_edit_contacts',
        delete: 'can_delete_contacts',
        update_status: null,
        update_payment: null,
        assign: 'can_assign_contacts',
        bulk: null,
      },
      messages: {
        create: 'can_send_messages',
        edit: null,
        delete: 'can_delete_messages',
        update_status: null,
        update_payment: null,
        assign: null,
        bulk: 'can_send_bulk_messages',
      },
    };

    const permKey = actionMap[entity]?.[action];
    if (!permKey) return false;
    return permissions[permKey] ?? false;
  }, [permissions, isOwnerOrManager]);

  const canViewRevenue = isOwnerOrManager || permissions.can_view_revenue;
  const canExportData = isOwnerOrManager || permissions.can_export_data;

  return {
    permissions,
    loading,
    canAccess,
    canPerform,
    canViewRevenue,
    canExportData,
    isOwner,
    isOwnerOrManager,
    isFullAccess: isOwnerOrManager,
    refetch,
  };
}

export function useManagePermissions() {
  const { currentTenant } = useTenant();
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState<PermissionTemplate[]>([]);

  useEffect(() => {
    fetchTemplates();
  }, [currentTenant?.id]);

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('permission_templates')
        .select('*')
        .or(`tenant_id.is.null,tenant_id.eq.${currentTenant?.id || '00000000-0000-0000-0000-000000000000'}`)
        .order('is_system', { ascending: false });

      if (error) throw error;
      setTemplates((data || []) as unknown as PermissionTemplate[]);
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  };

  const getMemberPermissions = async (userId: string): Promise<TeamPermissions | null> => {
    if (!currentTenant?.id) return null;

    try {
      const { data, error } = await supabase
        .from('team_member_permissions')
        .select('*')
        .eq('tenant_id', currentTenant.id)
        .eq('user_id', userId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      return (data as unknown as TeamPermissions) || DEFAULT_PERMISSIONS;
    } catch (error) {
      console.error('Error fetching member permissions:', error);
      return null;
    }
  };

  const updateMemberPermissions = async (userId: string, perms: Partial<TeamPermissions>) => {
    if (!currentTenant?.id) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('team_member_permissions')
        .upsert({
          tenant_id: currentTenant.id,
          user_id: userId,
          ...perms,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'tenant_id,user_id',
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error updating permissions:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const applyTemplate = async (userId: string, templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (!template) return;

    await updateMemberPermissions(userId, template.permissions);
  };

  return {
    templates,
    loading,
    getMemberPermissions,
    updateMemberPermissions,
    applyTemplate,
    refetchTemplates: fetchTemplates,
  };
}

export { DEFAULT_PERMISSIONS, FULL_PERMISSIONS };
