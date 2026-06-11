import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/useTenant';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';

export interface ProductivityMetrics {
  userId: string;
  userName: string;
  avatarUrl: string | null;
  role: string;
  
  // Today's metrics
  messagesPerHour: number;
  totalMessagesSent: number;
  totalMessagesReceived: number;
  conversationsHandled: number;
  activeMinutes: number;
  
  // Comparison with team average
  vsTeamAverage: number; // percentage above/below
  
  // Trend (compared to yesterday)
  trend: 'up' | 'down' | 'stable';
  trendPercent: number;
}

export interface TeamProductivitySummary {
  totalActiveMembers: number;
  avgMessagesPerHour: number;
  totalConversations: number;
  avgActiveMinutes: number;
  topPerformer: ProductivityMetrics | null;
}

export function useTeamProductivity() {
  const { currentTenant } = useTenant();
  const [metrics, setMetrics] = useState<ProductivityMetrics[]>([]);
  const [summary, setSummary] = useState<TeamProductivitySummary>({
    totalActiveMembers: 0,
    avgMessagesPerHour: 0,
    totalConversations: 0,
    avgActiveMinutes: 0,
    topPerformer: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProductivity = useCallback(async () => {
    if (!currentTenant?.id) return;

    setLoading(true);
    setError(null);

    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');

      // Fetch today's work sessions
      const { data: todaySessions, error: todayError } = await supabase
        .from('team_work_sessions')
        .select('*')
        .eq('tenant_id', currentTenant.id)
        .eq('session_date', today);

      if (todayError) throw todayError;

      // Fetch yesterday's work sessions for comparison
      const { data: yesterdaySessions, error: yesterdayError } = await supabase
        .from('team_work_sessions')
        .select('*')
        .eq('tenant_id', currentTenant.id)
        .eq('session_date', yesterday);

      if (yesterdayError) throw yesterdayError;

      // Fetch team members
      const { data: members, error: membersError } = await supabase
        .from('user_roles')
        .select(`
          user_id,
          role,
          profile:profiles!user_roles_user_id_fkey(full_name, avatar_url)
        `)
        .eq('tenant_id', currentTenant.id);

      if (membersError) throw membersError;

      // Calculate metrics for each member
      const productivityMetrics: ProductivityMetrics[] = (members || []).map(member => {
        const todaySession = todaySessions?.find(s => s.user_id === member.user_id);
        const yesterdaySession = yesterdaySessions?.find(s => s.user_id === member.user_id);

        const activeMinutes = todaySession?.total_active_minutes || 0;
        const activeHours = activeMinutes / 60;
        const messagesSent = todaySession?.messages_sent || 0;
        const messagesPerHour = activeHours > 0 ? messagesSent / activeHours : 0;

        const yesterdayMessagesPerHour = yesterdaySession 
          ? (yesterdaySession.messages_sent || 0) / ((yesterdaySession.total_active_minutes || 1) / 60)
          : 0;

        let trend: 'up' | 'down' | 'stable' = 'stable';
        let trendPercent = 0;
        if (yesterdayMessagesPerHour > 0) {
          trendPercent = ((messagesPerHour - yesterdayMessagesPerHour) / yesterdayMessagesPerHour) * 100;
          trend = trendPercent > 5 ? 'up' : trendPercent < -5 ? 'down' : 'stable';
        }

        return {
          userId: member.user_id,
          userName: (member.profile as any)?.full_name || 'Unknown',
          avatarUrl: (member.profile as any)?.avatar_url || null,
          role: member.role,
          messagesPerHour: Math.round(messagesPerHour * 10) / 10,
          totalMessagesSent: messagesSent,
          totalMessagesReceived: todaySession?.messages_received || 0,
          conversationsHandled: todaySession?.conversations_handled || 0,
          activeMinutes,
          vsTeamAverage: 0, // Will calculate after
          trend,
          trendPercent: Math.round(trendPercent),
        };
      });

      // Calculate team averages
      const activeMembers = productivityMetrics.filter(m => m.activeMinutes > 0);
      const avgMph = activeMembers.length > 0
        ? activeMembers.reduce((sum, m) => sum + m.messagesPerHour, 0) / activeMembers.length
        : 0;

      // Update vsTeamAverage for each member
      productivityMetrics.forEach(m => {
        if (avgMph > 0 && m.activeMinutes > 0) {
          m.vsTeamAverage = Math.round(((m.messagesPerHour - avgMph) / avgMph) * 100);
        }
      });

      // Sort by messages per hour to find top performer
      const sortedByPerformance = [...productivityMetrics]
        .filter(m => m.activeMinutes > 0)
        .sort((a, b) => b.messagesPerHour - a.messagesPerHour);

      const summaryData: TeamProductivitySummary = {
        totalActiveMembers: activeMembers.length,
        avgMessagesPerHour: Math.round(avgMph * 10) / 10,
        totalConversations: productivityMetrics.reduce((sum, m) => sum + m.conversationsHandled, 0),
        avgActiveMinutes: activeMembers.length > 0
          ? Math.round(activeMembers.reduce((sum, m) => sum + m.activeMinutes, 0) / activeMembers.length)
          : 0,
        topPerformer: sortedByPerformance[0] || null,
      };

      setMetrics(productivityMetrics);
      setSummary(summaryData);
    } catch (err) {
      console.error('Error fetching productivity metrics:', err);
      setError('Failed to load productivity data');
    } finally {
      setLoading(false);
    }
  }, [currentTenant?.id]);

  useEffect(() => {
    fetchProductivity();
  }, [fetchProductivity]);

  return {
    metrics,
    summary,
    loading,
    error,
    refetch: fetchProductivity,
  };
}
