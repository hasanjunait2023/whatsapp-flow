import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/useTenant';
import { format, subDays, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';

export interface WorkSession {
  id: string;
  userId: string;
  userName: string;
  avatarUrl: string | null;
  sessionDate: string;
  firstSeenAt: Date | null;
  lastSeenAt: Date | null;
  totalActiveMinutes: number;
  totalAwayMinutes: number;
  breakCount: number;
  longestSessionMinutes: number;
  pageActivity: Record<string, number>;
  messagesSent: number;
  messagesReceived: number;
  conversationsHandled: number;
}

export interface AttendanceRecord {
  userId: string;
  userName: string;
  avatarUrl: string | null;
  dates: {
    date: string;
    status: 'present' | 'late' | 'absent';
    firstSeenAt: Date | null;
  }[];
  attendanceRate: number;
}

export function useTeamWorkSessions(days: number = 7) {
  const { currentTenant } = useTenant();
  const [sessions, setSessions] = useState<WorkSession[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWorkSessions = useCallback(async () => {
    if (!currentTenant?.id) return;

    setLoading(true);
    setError(null);

    try {
      const endDate = new Date();
      const startDate = subDays(endDate, days - 1);
      
      // Fetch work sessions
      const { data: sessionData, error: sessionError } = await supabase
        .from('team_work_sessions')
        .select('*')
        .eq('tenant_id', currentTenant.id)
        .gte('session_date', format(startDate, 'yyyy-MM-dd'))
        .lte('session_date', format(endDate, 'yyyy-MM-dd'))
        .order('session_date', { ascending: false });

      if (sessionError) throw sessionError;

      // Fetch team members
      const { data: members, error: membersError } = await supabase
        .from('user_roles')
        .select(`
          user_id,
          profile:profiles!user_roles_user_id_fkey(full_name, avatar_url)
        `)
        .eq('tenant_id', currentTenant.id);

      if (membersError) throw membersError;

      // Map sessions with member info
      const workSessions: WorkSession[] = (sessionData || []).map(session => {
        const member = members?.find(m => m.user_id === session.user_id);
        return {
          id: session.id,
          userId: session.user_id,
          userName: (member?.profile as any)?.full_name || 'Unknown',
          avatarUrl: (member?.profile as any)?.avatar_url || null,
          sessionDate: session.session_date,
          firstSeenAt: session.first_seen_at ? new Date(session.first_seen_at) : null,
          lastSeenAt: session.last_seen_at ? new Date(session.last_seen_at) : null,
          totalActiveMinutes: session.total_active_minutes || 0,
          totalAwayMinutes: session.total_away_minutes || 0,
          breakCount: session.break_count || 0,
          longestSessionMinutes: session.longest_session_minutes || 0,
          pageActivity: (session.page_activity as Record<string, number>) || {},
          messagesSent: session.messages_sent || 0,
          messagesReceived: session.messages_received || 0,
          conversationsHandled: session.conversations_handled || 0,
        };
      });

      setSessions(workSessions);

      // Build attendance records
      const dateRange = eachDayOfInterval({ start: startDate, end: endDate });
      const attendanceRecords: AttendanceRecord[] = (members || []).map(member => {
        const memberSessions = workSessions.filter(s => s.userId === member.user_id);
        
        const dates = dateRange.map(date => {
          const dateStr = format(date, 'yyyy-MM-dd');
          const session = memberSessions.find(s => s.sessionDate === dateStr);
          
          let status: 'present' | 'late' | 'absent' = 'absent';
          if (session) {
            // Consider "late" if first seen after 10:00 AM
            if (session.firstSeenAt) {
              const firstHour = session.firstSeenAt.getHours();
              status = firstHour >= 10 ? 'late' : 'present';
            } else {
              status = 'present';
            }
          }
          
          return {
            date: dateStr,
            status,
            firstSeenAt: session?.firstSeenAt || null,
          };
        });

        const presentDays = dates.filter(d => d.status !== 'absent').length;
        const attendanceRate = dateRange.length > 0 
          ? Math.round((presentDays / dateRange.length) * 100) 
          : 0;

        return {
          userId: member.user_id,
          userName: (member.profile as any)?.full_name || 'Unknown',
          avatarUrl: (member.profile as any)?.avatar_url || null,
          dates,
          attendanceRate,
        };
      });

      setAttendance(attendanceRecords);
    } catch (err) {
      console.error('Error fetching work sessions:', err);
      setError('Failed to load work sessions');
    } finally {
      setLoading(false);
    }
  }, [currentTenant?.id, days]);

  useEffect(() => {
    fetchWorkSessions();
  }, [fetchWorkSessions]);

  // Get today's sessions
  const todaySessions = sessions.filter(
    s => s.sessionDate === format(new Date(), 'yyyy-MM-dd')
  );

  return {
    sessions,
    todaySessions,
    attendance,
    loading,
    error,
    refetch: fetchWorkSessions,
  };
}
