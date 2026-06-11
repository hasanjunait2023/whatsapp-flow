import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface AdminStats {
  totalTickets: number;
  openTickets: number;
  resolvedTickets: number;
  avgResponseTime: number;
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
}

export interface ActivityLog {
  id: string;
  admin_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: any;
  created_at: string;
  admin_name?: string;
  admin_email?: string;
}

export function useAdminReports() {
  const [stats, setStats] = useState<AdminStats>({
    totalTickets: 0,
    openTickets: 0,
    resolvedTickets: 0,
    avgResponseTime: 0,
    totalTasks: 0,
    completedTasks: 0,
    pendingTasks: 0,
  });
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      // Fetch ticket stats
      const { data: tickets } = await supabase
        .from('support_tickets')
        .select('status');

      const totalTickets = tickets?.length || 0;
      const openTickets = tickets?.filter(t => t.status === 'open' || t.status === 'in_progress').length || 0;
      const resolvedTickets = tickets?.filter(t => t.status === 'resolved' || t.status === 'closed').length || 0;

      // Fetch task stats
      const { data: tasks } = await supabase
        .from('admin_tasks')
        .select('status');

      const totalTasks = tasks?.length || 0;
      const completedTasks = tasks?.filter(t => t.status === 'done').length || 0;
      const pendingTasks = tasks?.filter(t => t.status === 'todo' || t.status === 'in_progress').length || 0;

      setStats({
        totalTickets,
        openTickets,
        resolvedTickets,
        avgResponseTime: 0,
        totalTasks,
        completedTasks,
        pendingTasks,
      });
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  }, []);

  const fetchActivityLogs = useCallback(async () => {
    try {
      const { data: logsData, error } = await supabase
        .from('admin_audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      // Fetch admin profiles
      const adminIds = [...new Set(logsData?.filter(l => l.admin_id).map(l => l.admin_id) || [])];
      const { data: admins } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', adminIds.length > 0 ? adminIds : ['']);

      const enrichedLogs: ActivityLog[] = (logsData || []).map(log => ({
        ...log,
        admin_name: admins?.find(a => a.id === log.admin_id)?.full_name,
        admin_email: admins?.find(a => a.id === log.admin_id)?.email,
      }));

      setActivityLogs(enrichedLogs);
    } catch (err) {
      console.error('Error fetching activity logs:', err);
    }
  }, []);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchStats(), fetchActivityLogs()]);
    setLoading(false);
  }, [fetchStats, fetchActivityLogs]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return {
    stats,
    activityLogs,
    loading,
    fetchAll,
  };
}
