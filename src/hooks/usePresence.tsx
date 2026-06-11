import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/useTenant';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';

interface UserPresence {
  user_id: string;
  tenant_id: string;
  status: 'online' | 'away' | 'offline';
  last_seen_at: string;
  is_typing_in: string | null;
  current_page: string | null;
}

// Log presence to team_presence_logs every 5 minutes (5 heartbeats of 60s each)
const PRESENCE_LOG_INTERVAL = 5;

export function usePresence() {
  const { currentTenant } = useTenant();
  const { user } = useAuth();
  const [presenceMap, setPresenceMap] = useState<Map<string, UserPresence>>(new Map());
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentPageRef = useRef<string | null>(null);
  const heartbeatCountRef = useRef<number>(0);
  const lastLoggedStatusRef = useRef<string | null>(null);

  // Stable ID refs for callbacks
  const tenantRef = useRef(currentTenant);
  const userRef = useRef(user);
  tenantRef.current = currentTenant;
  userRef.current = user;

  // Log presence to team_presence_logs for analytics
  const logPresenceToHistory = useCallback(async (status: 'online' | 'away' | 'offline', forceLog: boolean = false) => {
    const tenant = tenantRef.current;
    const usr = userRef.current;
    if (!tenant || !usr) return;
    
    // Only log every 5 heartbeats (5 minutes) or on status change
    const shouldLog = forceLog || 
      heartbeatCountRef.current % PRESENCE_LOG_INTERVAL === 0 ||
      lastLoggedStatusRef.current !== status;
    
    if (!shouldLog) return;
    
    lastLoggedStatusRef.current = status;
    const now = new Date();
    
    try {
      await supabase
        .from('team_presence_logs')
        .insert({
          tenant_id: tenant.id,
          user_id: usr.id,
          status,
          current_page: currentPageRef.current,
          hour_of_day: now.getHours(),
          day_of_week: now.getDay(),
          date: format(now, 'yyyy-MM-dd'),
        });
    } catch (err) {
      console.error('Error logging presence history:', err);
    }
  }, []);

  // Update own presence with optional current page
  const updatePresence = useCallback(async (status: 'online' | 'away' | 'offline', currentPage?: string) => {
    const tenant = tenantRef.current;
    const usr = userRef.current;
    if (!tenant || !usr) return;

    // Update the ref if page provided
    if (currentPage !== undefined) {
      currentPageRef.current = currentPage;
    }

    try {
      const { error } = await supabase
        .from('user_presence')
        .upsert({
          user_id: usr.id,
          tenant_id: tenant.id,
          status,
          last_seen_at: new Date().toISOString(),
          current_page: currentPageRef.current,
        }, {
          onConflict: 'user_id',
        });

      if (error) console.error('Error updating presence:', error);
      
      // Log to history for analytics
      await logPresenceToHistory(status);
      heartbeatCountRef.current++;
    } catch (err) {
      console.error('Error updating presence:', err);
    }
  }, [logPresenceToHistory]);

  // Set typing status
  const setTyping = useCallback(async (roomId: string | null) => {
    const usr = userRef.current;
    if (!usr) return;

    try {
      await supabase
        .from('user_presence')
        .update({ 
          is_typing_in: roomId,
          last_seen_at: new Date().toISOString(),
        })
        .eq('user_id', usr.id);
    } catch (err) {
      console.error('Error setting typing:', err);
    }
  }, []);

  // Get presence for a user
  const getPresence = useCallback((userId: string): UserPresence | undefined => {
    return presenceMap.get(userId);
  }, [presenceMap]);

  // Check if user is online
  const isOnline = useCallback((userId: string): boolean => {
    const presence = presenceMap.get(userId);
    return presence?.status === 'online';
  }, [presenceMap]);

  // Check who is typing in a room
  const getTypingUsers = useCallback((roomId: string): string[] => {
    const typingUsers: string[] = [];
    presenceMap.forEach((presence, usrId) => {
      if (presence.is_typing_in === roomId && usrId !== user?.id) {
        typingUsers.push(usrId);
      }
    });
    return typingUsers;
  }, [presenceMap, user?.id]);

  // Fetch all presence data for tenant
  const fetchPresence = useCallback(async () => {
    const tenant = tenantRef.current;
    if (!tenant) return;

    try {
      const { data, error } = await supabase
        .from('user_presence')
        .select('*')
        .eq('tenant_id', tenant.id);

      if (error) throw error;

      const newMap = new Map<string, UserPresence>();
      (data || []).forEach(p => {
        newMap.set(p.user_id, p as UserPresence);
      });
      setPresenceMap(newMap);
    } catch (err) {
      console.error('Error fetching presence:', err);
    }
  }, []);

  // Setup presence tracking — use stable IDs to prevent effect re-runs
  const tenantId = currentTenant?.id;
  const userId = user?.id;

  useEffect(() => {
    if (!tenantId || !userId) return;

    // Reset heartbeat counter
    heartbeatCountRef.current = 0;

    // Set online when component mounts (with forced log)
    updatePresence('online');
    logPresenceToHistory('online', true);

    // Heartbeat every 60 seconds (reduced from 30s to lower CPU usage)
    heartbeatRef.current = setInterval(() => {
      updatePresence('online');
    }, 60000);

    // Fetch initial presence
    fetchPresence();

    // Subscribe to presence changes
    const presenceChannel = supabase
      .channel(`presence_changes_${tenantId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_presence',
          filter: `tenant_id=eq.${tenantId}`,
        },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            setPresenceMap(prev => {
              const newMap = new Map(prev);
              newMap.delete((payload.old as UserPresence).user_id);
              return newMap;
            });
          } else {
            const presence = payload.new as UserPresence;
            setPresenceMap(prev => {
              const newMap = new Map(prev);
              newMap.set(presence.user_id, presence);
              return newMap;
            });
          }
        }
      )
      .subscribe();

    // Handle visibility change
    const handleVisibilityChange = () => {
      if (document.hidden) {
        updatePresence('away');
        logPresenceToHistory('away', true);
      } else {
        updatePresence('online');
        logPresenceToHistory('online', true);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Handle before unload
    const handleBeforeUnload = () => {
      // Log offline status before leaving
      logPresenceToHistory('offline', true);
      // Use sendBeacon for reliable offline status
      const url = `https://cdkrvztqeuflxilrtnws.supabase.co/rest/v1/user_presence?user_id=eq.${userId}`;
      navigator.sendBeacon(url, JSON.stringify({ status: 'offline' }));
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      supabase.removeChannel(presenceChannel);
      
      // Set offline on cleanup
      updatePresence('offline');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, userId]);

  return {
    presenceMap,
    updatePresence,
    setTyping,
    getPresence,
    isOnline,
    getTypingUsers,
    fetchPresence,
  };
}
