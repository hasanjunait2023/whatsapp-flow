import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';

export interface TenantAuditLog {
  id: string;
  tenant_id: string;
  user_id: string;
  activity_type: string;
  entity_type: string | null;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  profile?: {
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
  } | null;
}

export interface AuditLogFilters {
  userId?: string;
  activityType?: string;
  entityType?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export function useTenantAuditLogs() {
  const { currentTenant } = useTenantContext();
  const tenantId = currentTenant?.id;
  const [filters, setFilters] = useState<AuditLogFilters>({});

  const { data: logs = [], isLoading: loading, refetch } = useQuery({
    queryKey: ['tenant-audit-logs', tenantId, filters],
    queryFn: async () => {
      if (!tenantId) return [];

      let query = supabase
        .from('team_activity_logs')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(500);

      if (filters.userId) {
        query = query.eq('user_id', filters.userId);
      }
      if (filters.activityType) {
        query = query.eq('activity_type', filters.activityType);
      }
      if (filters.entityType) {
        query = query.eq('entity_type', filters.entityType);
      }
      if (filters.dateFrom) {
        query = query.gte('created_at', filters.dateFrom.toISOString());
      }
      if (filters.dateTo) {
        query = query.lte('created_at', filters.dateTo.toISOString());
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching audit logs:', error);
        return [];
      }

      // Fetch profiles for unique user IDs
      const userIds = [...new Set((data || []).map(log => log.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .in('id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      return (data || []).map(log => ({
        ...log,
        metadata: log.metadata as Record<string, unknown>,
        profile: profileMap.get(log.user_id) || null,
      })) as TenantAuditLog[];
    },
    enabled: !!tenantId,
  });

  // Get unique values for filters
  const activityTypes = [...new Set(logs.map(l => l.activity_type))];
  const entityTypes = [...new Set(logs.map(l => l.entity_type).filter(Boolean))];
  const users = [...new Map(logs.map(l => [l.user_id, l.profile])).entries()]
    .map(([id, profile]) => ({ id, name: profile?.full_name || profile?.email || 'Unknown' }));

  const updateFilters = useCallback((newFilters: Partial<AuditLogFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({});
  }, []);

  return {
    logs,
    loading,
    filters,
    activityTypes,
    entityTypes,
    users,
    updateFilters,
    clearFilters,
    refetch,
  };
}
