import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/useTenant';
import { startOfDay, endOfDay, subDays, format, eachDayOfInterval } from 'date-fns';

export interface HeatmapCell {
  hour: number;
  status: 'online' | 'away' | 'offline' | 'none';
  count: number;
}

export interface MemberHeatmapData {
  userId: string;
  userName: string;
  avatarUrl: string | null;
  cells: HeatmapCell[];
}

export interface HeatmapData {
  date: Date;
  members: MemberHeatmapData[];
}

type DateRange = 'today' | 'yesterday' | 'week';

export function useTeamActivityHeatmap(dateRange: DateRange = 'today') {
  const { currentTenant } = useTenant();
  const [heatmapData, setHeatmapData] = useState<HeatmapData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getDateRange = useCallback(() => {
    const now = new Date();
    switch (dateRange) {
      case 'today':
        return { start: startOfDay(now), end: endOfDay(now) };
      case 'yesterday':
        const yesterday = subDays(now, 1);
        return { start: startOfDay(yesterday), end: endOfDay(yesterday) };
      case 'week':
        return { start: startOfDay(subDays(now, 6)), end: endOfDay(now) };
      default:
        return { start: startOfDay(now), end: endOfDay(now) };
    }
  }, [dateRange]);

  const fetchHeatmapData = useCallback(async () => {
    if (!currentTenant?.id) return;

    setLoading(true);
    setError(null);

    try {
      const { start, end } = getDateRange();
      const startDate = format(start, 'yyyy-MM-dd');
      const endDate = format(end, 'yyyy-MM-dd');

      // Fetch presence logs for date range
      const { data: logs, error: logsError } = await supabase
        .from('team_presence_logs')
        .select('user_id, status, hour_of_day, date')
        .eq('tenant_id', currentTenant.id)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('recorded_at', { ascending: true });

      if (logsError) throw logsError;

      // Fetch team members (user_roles)
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('tenant_id', currentTenant.id);

      if (rolesError) throw rolesError;

      // Fetch profiles separately (no FK relationship exists)
      const userIds = (userRoles || []).map(r => r.user_id);
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      // Create a lookup map for profiles
      const profileMap = new Map((profiles || []).map(p => [p.id, p]));

      // Build heatmap data structure
      const dates = eachDayOfInterval({ start, end });
      const result: HeatmapData[] = dates.map(date => {
        const dateStr = format(date, 'yyyy-MM-dd');
        const dayLogs = logs?.filter(l => l.date === dateStr) || [];

        const memberData: MemberHeatmapData[] = (userRoles || []).map(role => {
          const profile = profileMap.get(role.user_id);
          const memberLogs = dayLogs.filter(l => l.user_id === role.user_id);
          
          // Create 24-hour cells
          const cells: HeatmapCell[] = Array.from({ length: 24 }, (_, hour) => {
            const hourLogs = memberLogs.filter(l => l.hour_of_day === hour);
            if (hourLogs.length === 0) {
              return { hour, status: 'none', count: 0 };
            }
            
            // Count status occurrences
            const onlineCount = hourLogs.filter(l => l.status === 'online').length;
            const awayCount = hourLogs.filter(l => l.status === 'away').length;
            
            // Determine dominant status
            let status: 'online' | 'away' | 'offline' | 'none' = 'offline';
            if (onlineCount > 0) status = 'online';
            else if (awayCount > 0) status = 'away';
            
            return { hour, status, count: hourLogs.length };
          });

          return {
            userId: role.user_id,
            userName: profile?.full_name || 'Unknown',
            avatarUrl: profile?.avatar_url || null,
            cells,
          };
        });

        return { date, members: memberData };
      });

      setHeatmapData(result);
    } catch (err) {
      console.error('Error fetching heatmap data:', err);
      setError('Failed to load activity heatmap');
    } finally {
      setLoading(false);
    }
  }, [currentTenant?.id, getDateRange]);

  useEffect(() => {
    fetchHeatmapData();
  }, [fetchHeatmapData]);

  return {
    heatmapData,
    loading,
    error,
    refetch: fetchHeatmapData,
  };
}
