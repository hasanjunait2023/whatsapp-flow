import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface AuditLog {
  id: string;
  admin_id: string | null;
  admin_email: string | null;
  admin_name: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: Record<string, unknown>;
  created_at: string;
}

interface AuditLogFilters {
  action?: string;
  entity_type?: string;
  admin_id?: string;
  startDate?: string;
  endDate?: string;
}

export function useAdminAuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = useCallback(async (filters?: AuditLogFilters) => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('admin_audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (filters?.action) {
        query = query.eq('action', filters.action);
      }
      if (filters?.entity_type) {
        query = query.eq('entity_type', filters.entity_type);
      }
      if (filters?.admin_id) {
        query = query.eq('admin_id', filters.admin_id);
      }
      if (filters?.startDate) {
        query = query.gte('created_at', filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte('created_at', filters.endDate);
      }

      const { data: logsData, error: logsError } = await query;

      if (logsError) throw logsError;

      // Fetch admin profiles for display
      const adminIds = [...new Set(logsData?.map(l => l.admin_id).filter(Boolean))];
      
      let profilesMap: Record<string, { email: string | null; full_name: string | null }> = {};
      
      if (adminIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, email, full_name')
          .in('id', adminIds);
        
        profilesMap = (profiles || []).reduce((acc, p) => {
          acc[p.id] = { email: p.email, full_name: p.full_name };
          return acc;
        }, {} as Record<string, { email: string | null; full_name: string | null }>);
      }

      const enrichedLogs: AuditLog[] = (logsData || []).map(log => ({
        id: log.id,
        admin_id: log.admin_id,
        admin_email: log.admin_id ? profilesMap[log.admin_id]?.email || null : null,
        admin_name: log.admin_id ? profilesMap[log.admin_id]?.full_name || null : null,
        action: log.action,
        entity_type: log.entity_type,
        entity_id: log.entity_id,
        details: log.details as Record<string, unknown>,
        created_at: log.created_at,
      }));

      setLogs(enrichedLogs);
    } catch (err) {
      console.error('Error fetching audit logs:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch audit logs');
    } finally {
      setLoading(false);
    }
  }, []);

  const logAction = useCallback(async (
    action: string,
    entityType: string,
    entityId?: string,
    details?: Record<string, unknown>
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('admin_audit_logs')
        .insert([{
          admin_id: user?.id,
          action,
          entity_type: entityType,
          entity_id: entityId || null,
          details: details || {},
        }] as any);

      if (error) throw error;
    } catch (err) {
      console.error('Error logging action:', err);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return {
    logs,
    loading,
    error,
    refetch: fetchLogs,
    logAction,
  };
}
