import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from './useTenant';
import { useAuth } from './useAuth';

export interface ResourceAccess {
  id: string;
  tenant_id: string;
  user_id: string;
  resource_type: 'whatsapp_instance' | 'facebook_page';
  resource_id: string;
  created_at: string;
}

export function useTeamMemberAccess() {
  const { currentTenant } = useTenant();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  // Get all access assignments for a specific user
  const getUserAccess = useCallback(async (userId: string): Promise<ResourceAccess[]> => {
    if (!currentTenant?.id) return [];

    try {
      const { data, error } = await supabase
        .from('team_member_access')
        .select('*')
        .eq('tenant_id', currentTenant.id)
        .eq('user_id', userId);

      if (error) throw error;
      return (data || []) as ResourceAccess[];
    } catch (error) {
      console.error('Error fetching user access:', error);
      return [];
    }
  }, [currentTenant?.id]);

  // Get allowed instance IDs for a user
  const getAllowedInstances = useCallback(async (userId: string): Promise<string[]> => {
    if (!currentTenant?.id) return [];

    try {
      const { data, error } = await supabase
        .from('team_member_access')
        .select('resource_id')
        .eq('tenant_id', currentTenant.id)
        .eq('user_id', userId)
        .eq('resource_type', 'whatsapp_instance');

      if (error) throw error;
      return (data || []).map(r => r.resource_id);
    } catch (error) {
      console.error('Error fetching allowed instances:', error);
      return [];
    }
  }, [currentTenant?.id]);

  // Get allowed page IDs for a user
  const getAllowedPages = useCallback(async (userId: string): Promise<string[]> => {
    if (!currentTenant?.id) return [];

    try {
      const { data, error } = await supabase
        .from('team_member_access')
        .select('resource_id')
        .eq('tenant_id', currentTenant.id)
        .eq('user_id', userId)
        .eq('resource_type', 'facebook_page');

      if (error) throw error;
      return (data || []).map(r => r.resource_id);
    } catch (error) {
      console.error('Error fetching allowed pages:', error);
      return [];
    }
  }, [currentTenant?.id]);

  // Set access for a user (replaces all existing assignments for that resource type)
  const setUserAccess = useCallback(async (
    userId: string,
    resourceType: 'whatsapp_instance' | 'facebook_page',
    resourceIds: string[]
  ): Promise<boolean> => {
    if (!currentTenant?.id) return false;

    setLoading(true);
    try {
      // First, delete all existing assignments for this resource type
      const { error: deleteError } = await supabase
        .from('team_member_access')
        .delete()
        .eq('tenant_id', currentTenant.id)
        .eq('user_id', userId)
        .eq('resource_type', resourceType);

      if (deleteError) throw deleteError;

      // Then insert new assignments (if any)
      if (resourceIds.length > 0) {
        const records = resourceIds.map(resourceId => ({
          tenant_id: currentTenant.id,
          user_id: userId,
          resource_type: resourceType,
          resource_id: resourceId,
        }));

        const { error: insertError } = await supabase
          .from('team_member_access')
          .insert(records);

        if (insertError) throw insertError;
      }

      return true;
    } catch (error) {
      console.error('Error setting user access:', error);
      return false;
    } finally {
      setLoading(false);
    }
  }, [currentTenant?.id]);

  // Check if a user has access to a specific resource
  const checkAccess = useCallback(async (
    userId: string,
    resourceType: 'whatsapp_instance' | 'facebook_page',
    resourceId: string
  ): Promise<boolean> => {
    if (!currentTenant?.id) return false;

    try {
      // First check if user has any restrictions for this resource type
      const { data: allAccess, error: countError } = await supabase
        .from('team_member_access')
        .select('id')
        .eq('tenant_id', currentTenant.id)
        .eq('user_id', userId)
        .eq('resource_type', resourceType);

      if (countError) throw countError;

      // If no restrictions exist, user has full access
      if (!allAccess || allAccess.length === 0) return true;

      // Check if specific resource is allowed
      const { data, error } = await supabase
        .from('team_member_access')
        .select('id')
        .eq('tenant_id', currentTenant.id)
        .eq('user_id', userId)
        .eq('resource_type', resourceType)
        .eq('resource_id', resourceId)
        .maybeSingle();

      if (error) throw error;
      return !!data;
    } catch (error) {
      console.error('Error checking access:', error);
      return false;
    }
  }, [currentTenant?.id]);

  return {
    loading,
    getUserAccess,
    getAllowedInstances,
    getAllowedPages,
    setUserAccess,
    checkAccess,
  };
}

// Hook for current user's resource access (for filtering data)
export function useMyResourceAccess() {
  const { currentTenant, currentRole } = useTenant();
  const { user } = useAuth();
  const [allowedInstances, setAllowedInstances] = useState<string[]>([]);
  const [allowedPages, setAllowedPages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [accessLoaded, setAccessLoaded] = useState(false);

  const isOwnerOrManager = currentRole === 'owner' || currentRole === 'manager';

  useEffect(() => {
    const fetchMyAccess = async () => {
      // Owners and managers have full access - no need to fetch
      if (isOwnerOrManager) {
        // Use functional updates to avoid creating new array refs when already empty
        setAllowedInstances(prev => prev.length === 0 ? prev : []);
        setAllowedPages(prev => prev.length === 0 ? prev : []);
        setLoading(false);
        setAccessLoaded(true);
        return;
      }

      if (!currentTenant?.id || !user?.id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        // Fetch instance access
        const { data: instanceAccess, error: instError } = await supabase
          .from('team_member_access')
          .select('resource_id')
          .eq('tenant_id', currentTenant.id)
          .eq('user_id', user.id)
          .eq('resource_type', 'whatsapp_instance');

        if (instError) throw instError;
        const newInstances = (instanceAccess || []).map(r => r.resource_id);
        setAllowedInstances(prev => {
          if (prev.length === newInstances.length && prev.every((v, i) => v === newInstances[i])) return prev;
          return newInstances;
        });

        // Fetch page access
        const { data: pageAccess, error: pageError } = await supabase
          .from('team_member_access')
          .select('resource_id')
          .eq('tenant_id', currentTenant.id)
          .eq('user_id', user.id)
          .eq('resource_type', 'facebook_page');

        if (pageError) throw pageError;
        const newPages = (pageAccess || []).map(r => r.resource_id);
        setAllowedPages(prev => {
          if (prev.length === newPages.length && prev.every((v, i) => v === newPages[i])) return prev;
          return newPages;
        });

        setAccessLoaded(true);
      } catch (error) {
        console.error('Error fetching my resource access:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMyAccess();
  }, [currentTenant?.id, user?.id, isOwnerOrManager]);

  // Helper to check instance access
  const canAccessInstance = useCallback((instanceId: string): boolean => {
    if (isOwnerOrManager) return true;
    if (allowedInstances.length === 0) return true; // No restrictions = full access
    return allowedInstances.includes(instanceId);
  }, [allowedInstances, isOwnerOrManager]);

  // Helper to check page access
  const canAccessPage = useCallback((pageId: string): boolean => {
    if (isOwnerOrManager) return true;
    if (allowedPages.length === 0) return true; // No restrictions = full access
    return allowedPages.includes(pageId);
  }, [allowedPages, isOwnerOrManager]);

  return {
    allowedInstances,
    allowedPages,
    loading,
    accessLoaded,
    canAccessInstance,
    canAccessPage,
    isOwnerOrManager,
  };
}
