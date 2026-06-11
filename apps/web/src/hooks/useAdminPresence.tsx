import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

// System Tenant ID for admin operations
const SYSTEM_TENANT_ID = '5a0ad1d5-588a-473a-af82-724e69890074';

interface UserPresence {
  user_id: string;
  tenant_id: string;
  status: 'online' | 'away' | 'offline';
  last_seen_at: string;
  is_typing_in: string | null;
  current_page: string | null;
}

export function useAdminPresence() {
  const { user } = useAuth();
  const [presenceMap, setPresenceMap] = useState<Map<string, UserPresence>>(new Map());
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentPageRef = useRef<string | null>(null);

  // Update own presence with optional current page
  const updatePresence = useCallback(async (status: 'online' | 'away' | 'offline', currentPage?: string) => {
    if (!user) return;

    // Update the ref if page provided
    if (currentPage !== undefined) {
      currentPageRef.current = currentPage;
    }

    try {
      const { error } = await supabase
        .from('user_presence')
        .upsert({
          user_id: user.id,
          tenant_id: SYSTEM_TENANT_ID,
          status,
          last_seen_at: new Date().toISOString(),
          current_page: currentPageRef.current,
        }, {
          onConflict: 'user_id',
        });

      if (error) console.error('Error updating admin presence:', error);
    } catch (err) {
      console.error('Error updating admin presence:', err);
    }
  }, [user]);

  // Set typing status
  const setTyping = useCallback(async (roomId: string | null) => {
    if (!user) return;

    try {
      await supabase
        .from('user_presence')
        .update({ 
          is_typing_in: roomId,
          last_seen_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);
    } catch (err) {
      console.error('Error setting typing:', err);
    }
  }, [user]);

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

  // Fetch all presence data for admin tenant
  const fetchPresence = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('user_presence')
        .select('*')
        .eq('tenant_id', SYSTEM_TENANT_ID);

      if (error) throw error;

      const newMap = new Map<string, UserPresence>();
      (data || []).forEach(p => {
        newMap.set(p.user_id, p as UserPresence);
      });
      setPresenceMap(newMap);
    } catch (err) {
      console.error('Error fetching admin presence:', err);
    }
  }, []);

  // Setup presence tracking
  useEffect(() => {
    if (!user) return;

    // Set online when component mounts
    updatePresence('online');

    // Heartbeat every 30 seconds
    heartbeatRef.current = setInterval(() => {
      updatePresence('online');
    }, 30000);

    // Fetch initial presence
    fetchPresence();

    // Subscribe to presence changes for admin tenant
    const presenceChannel = supabase
      .channel('admin_presence_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_presence',
          filter: `tenant_id=eq.${SYSTEM_TENANT_ID}`,
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
      } else {
        updatePresence('online');
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Handle before unload
    const handleBeforeUnload = () => {
      // Use sendBeacon for reliable offline status
      const url = `https://cdkrvztqeuflxilrtnws.supabase.co/rest/v1/user_presence?user_id=eq.${user.id}`;
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
  }, [user]);

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
