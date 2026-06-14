import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/useTenant';
import { useAuth } from '@/hooks/useAuth';

interface ChatMember {
  id: string;
  room_id: string;
  user_id: string;
  last_read_at: string;
  joined_at: string;
  is_admin: boolean;
  profile?: {
    id: string;
    email: string | null;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

interface InternalMessage {
  id: string;
  room_id: string;
  sender_id: string;
  content: string | null;
  content_type: string;
  media_url: string | null;
  media_filename: string | null;
  reply_to_id: string | null;
  mentions: string[];
  created_at: string;
  edited_at: string | null;
  is_deleted: boolean;
  sender?: {
    id: string;
    email: string | null;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
  reply_to?: InternalMessage | null;
}

interface ChatRoom {
  id: string;
  tenant_id: string;
  name: string | null;
  type: 'direct' | 'group';
  created_by: string | null;
  created_at: string;
  updated_at: string;
  members?: ChatMember[];
  last_message?: InternalMessage | null;
  unread_count?: number;
}

/**
 * Internal Chat hook — backed by the dedicated, membership-scoped server route
 * (/api/fn/internal-chat-*). All room/member/message access is authorized
 * server-side; the client never touches the raw tables.
 */
export function useInternalChat() {
  const { currentTenant } = useTenant();
  const { user } = useAuth();
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [currentRoom, setCurrentRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<InternalMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchRooms = useCallback(async () => {
    if (!currentTenant || !user) {
      setLoading(false);
      return;
    }
    try {
      setError(null);
      const { data, error: fnError } = await supabase.functions.invoke('internal-chat-list-rooms', { body: {} });
      if (fnError) throw fnError;
      setRooms((data as ChatRoom[]) || []);
    } catch (err) {
      console.error('Error fetching rooms:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [currentTenant, user]);

  const fetchMessages = useCallback(async (roomId: string) => {
    if (!user) return;
    setMessagesLoading(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('internal-chat-list-messages', {
        body: { room_id: roomId },
      });
      if (fnError) throw fnError;
      const list = (data as InternalMessage[]) || [];
      const byId = new Map(list.map((m) => [m.id, m]));
      setMessages(
        list.map((m) => ({
          ...m,
          reply_to: m.reply_to_id ? byId.get(m.reply_to_id) || null : null,
        })),
      );
    } catch (err) {
      console.error('Error fetching messages:', err);
    } finally {
      setMessagesLoading(false);
    }
  }, [user]);

  const sendMessage = async (
    roomId: string,
    content: string,
    contentType: string = 'text',
    mediaUrl?: string,
    mediaFilename?: string,
    replyToId?: string,
    mentions?: string[],
  ) => {
    if (!user) return;
    const optimisticId = `temp-${Date.now()}`;
    const optimistic: InternalMessage = {
      id: optimisticId,
      room_id: roomId,
      sender_id: user.id,
      content,
      content_type: contentType,
      media_url: mediaUrl || null,
      media_filename: mediaFilename || null,
      reply_to_id: replyToId || null,
      mentions: mentions || [],
      created_at: new Date().toISOString(),
      edited_at: null,
      is_deleted: false,
      sender: { id: user.id, email: user.email || null, full_name: null, avatar_url: null },
    };
    setMessages((prev) => [...prev, optimistic]);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('internal-chat-send', {
        body: {
          room_id: roomId,
          content,
          content_type: contentType,
          media_url: mediaUrl,
          media_filename: mediaFilename,
          reply_to_id: replyToId,
          mentions: mentions || [],
        },
      });
      if (fnError) throw fnError;
      const saved = data as { id: string; created_at: string };
      setMessages((prev) =>
        prev.map((m) => (m.id === optimisticId ? { ...optimistic, id: saved.id, created_at: saved.created_at } : m)),
      );
      return saved;
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
      throw err;
    }
  };

  const createDirectChat = async (otherUserId: string) => {
    if (!currentTenant || !user) return null;
    const { data, error: fnError } = await supabase.functions.invoke('internal-chat-create-direct', {
      body: { other_user_id: otherUserId },
    });
    if (fnError) throw fnError;
    await fetchRooms();
    return data as { id: string };
  };

  const createGroupChat = async (name: string, memberIds: string[]) => {
    if (!currentTenant || !user) return null;
    const { data, error: fnError } = await supabase.functions.invoke('internal-chat-create-group', {
      body: { name, member_ids: memberIds },
    });
    if (fnError) throw fnError;
    await fetchRooms();
    return data as ChatRoom;
  };

  const addMemberToGroup = async (roomId: string, userId: string) => {
    const { error: fnError } = await supabase.functions.invoke('internal-chat-add-member', {
      body: { room_id: roomId, user_id: userId },
    });
    if (fnError) throw fnError;
    await fetchRooms();
  };

  const removeMemberFromGroup = async (roomId: string, userId: string) => {
    const { error: fnError } = await supabase.functions.invoke('internal-chat-remove-member', {
      body: { room_id: roomId, user_id: userId },
    });
    if (fnError) throw fnError;
    await fetchRooms();
  };

  // Initial load + realtime: a coarse internal_messages event refreshes the
  // open room's messages (or the room list's unread counts).
  useEffect(() => {
    if (!currentTenant || !user) return;
    fetchRooms();

    const channel = supabase
      .channel(`internal_messages_${currentTenant.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'internal_messages' }, () => {
        if (currentRoom) fetchMessages(currentRoom.id);
        fetchRooms();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentTenant, user, currentRoom?.id, fetchRooms, fetchMessages]);

  useEffect(() => {
    if (currentRoom) fetchMessages(currentRoom.id);
    else setMessages([]);
  }, [currentRoom?.id, fetchMessages]);

  const totalUnreadCount = rooms.reduce((sum, room) => sum + (room.unread_count || 0), 0);

  return {
    rooms,
    currentRoom,
    setCurrentRoom,
    messages,
    loading,
    messagesLoading,
    error,
    totalUnreadCount,
    sendMessage,
    createDirectChat,
    createGroupChat,
    addMemberToGroup,
    removeMemberFromGroup,
    fetchRooms,
    fetchMessages,
  };
}
