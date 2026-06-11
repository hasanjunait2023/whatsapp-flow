import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/useTenant';
import { useTeam } from '@/hooks/useTeam';
import { formatDistanceToNow } from 'date-fns';
import { bn } from 'date-fns/locale';

export type PresenceStatus = 'online' | 'away' | 'offline';

export interface TeamMemberPresence {
  user_id: string;
  name: string;
  email: string | null;
  avatar_url: string | null;
  role: 'owner' | 'manager' | 'agent';
  status: PresenceStatus;
  current_page: string | null;
  last_seen_at: string | null;
  last_seen_text: string;
}

// 2 minutes threshold for considering someone offline
const OFFLINE_THRESHOLD_MS = 2 * 60 * 1000;

export function useTeamPresence() {
  const { currentTenant } = useTenant();
  const { members } = useTeam();
  const [presenceData, setPresenceData] = useState<Map<string, any>>(new Map());
  const [loading, setLoading] = useState(true);

  // Calculate effective status based on last_seen_at and reported status
  const getEffectiveStatus = useCallback((presence: any | null): PresenceStatus => {
    if (!presence) return 'offline';
    
    const lastSeen = new Date(presence.last_seen_at);
    const now = new Date();
    const diffMs = now.getTime() - lastSeen.getTime();
    
    // If no heartbeat for 2 minutes, consider offline regardless of reported status
    if (diffMs > OFFLINE_THRESHOLD_MS) {
      return 'offline';
    }
    
    return presence.status as PresenceStatus;
  }, []);

  // Get formatted last seen text
  const getLastSeenText = useCallback((presence: any | null, status: PresenceStatus): string => {
    if (status === 'online') return 'Online now';
    if (status === 'away') return 'Away';
    if (!presence?.last_seen_at) return 'Offline';
    
    try {
      return `Last seen ${formatDistanceToNow(new Date(presence.last_seen_at), { addSuffix: true })}`;
    } catch {
      return 'Offline';
    }
  }, []);

  // Get page display name
  const getPageDisplayName = useCallback((currentPage: string | null): string | null => {
    if (!currentPage) return null;
    
    const pageMap: Record<string, string> = {
      '/dashboard': 'Dashboard',
      '/inbox': 'Inbox',
      '/fb-inbox': 'FB Inbox',
      '/contacts': 'Contacts',
      '/products': 'Products',
      '/orders': 'Orders',
      '/complaints': 'Complaints',
      '/groups': 'Groups',
      '/instances': 'Instances',
      '/automation': 'Automation',
      '/workflows': 'Workflows',
      '/ai-agent': 'AI Agent',
      '/analytics': 'Analytics',
      '/reports': 'Reports',
      '/team': 'Team',
      '/team-reports': 'Team Reports',
      '/internal-chat': 'Team Chat',
      '/settings': 'Settings',
      '/billing': 'Billing',
      '/accounts': 'Accounts',
      '/segmentation': 'Segmentation',
    };
    
    return pageMap[currentPage] || currentPage.replace('/', '').replace(/-/g, ' ');
  }, []);

  // Fetch presence data
  const fetchPresence = useCallback(async () => {
    if (!currentTenant?.id) return;

    try {
      const { data, error } = await supabase
        .from('user_presence')
        .select('user_id, status, last_seen_at, is_typing_in, current_page')
        .eq('tenant_id', currentTenant.id);

      if (error) throw error;

      const newMap = new Map<string, any>();
      (data || []).forEach(p => {
        newMap.set(p.user_id, p);
      });
      setPresenceData(newMap);
    } catch (err) {
      console.error('Error fetching team presence:', err);
    } finally {
      setLoading(false);
    }
  }, [currentTenant?.id]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!currentTenant?.id) {
      setLoading(false);
      return;
    }

    fetchPresence();

    // Subscribe to presence changes
    const channel = supabase
      .channel('team_presence_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_presence',
          filter: `tenant_id=eq.${currentTenant.id}`,
        },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            setPresenceData(prev => {
              const newMap = new Map(prev);
              newMap.delete((payload.old as any).user_id);
              return newMap;
            });
          } else {
            const presence = payload.new as any;
            setPresenceData(prev => {
              const newMap = new Map(prev);
              newMap.set(presence.user_id, presence);
              return newMap;
            });
          }
        }
      )
      .subscribe();

    // Refresh presence every 30 seconds to update "last seen" text
    const refreshInterval = setInterval(() => {
      setPresenceData(prev => new Map(prev)); // Force re-render
    }, 30000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(refreshInterval);
    };
  }, [currentTenant?.id, fetchPresence]);

  // Build combined team presence list
  const teamPresence: TeamMemberPresence[] = members.map(member => {
    const presence = presenceData.get(member.user_id);
    const status = getEffectiveStatus(presence);
    
    return {
      user_id: member.user_id,
      name: member.profile?.full_name || 'Unknown',
      email: member.profile?.email || null,
      avatar_url: member.profile?.avatar_url || null,
      role: member.role,
      status,
      current_page: status === 'online' ? getPageDisplayName(presence?.current_page) : null,
      last_seen_at: presence?.last_seen_at || null,
      last_seen_text: getLastSeenText(presence, status),
    };
  });

  // Categorized lists
  const onlineMembers = teamPresence.filter(m => m.status === 'online');
  const awayMembers = teamPresence.filter(m => m.status === 'away');
  const offlineMembers = teamPresence.filter(m => m.status === 'offline');

  // Stats
  const activeCount = onlineMembers.length;
  const totalCount = teamPresence.length;

  // Get presence for a specific user
  const getMemberPresence = useCallback((userId: string): TeamMemberPresence | undefined => {
    return teamPresence.find(m => m.user_id === userId);
  }, [teamPresence]);

  return {
    teamPresence,
    onlineMembers,
    awayMembers,
    offlineMembers,
    activeCount,
    totalCount,
    loading,
    getMemberPresence,
    refetch: fetchPresence,
  };
}
