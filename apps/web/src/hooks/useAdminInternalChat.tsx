import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

// System Tenant ID for admin operations
const SYSTEM_TENANT_ID = '5a0ad1d5-588a-473a-af82-724e69890074';

function uuidv4() {
  // Prefer native UUID when available
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  // Fallback: RFC4122 v4 using getRandomValues
  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0'));
  return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex.slice(6, 8).join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10, 16).join('')}`;
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
  };
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
  };
  reply_to?: InternalMessage | null;
}

export function useAdminInternalChat() {
  const { user } = useAuth();
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [currentRoom, setCurrentRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<InternalMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchRoomMembersWithProfiles = useCallback(
    async (roomId: string) => {
      const { data: members } = await supabase
        .from('internal_chat_members')
        .select('*')
        .eq('room_id', roomId);

      const memberUserIds = [...new Set((members || []).map((m) => m.user_id))];
      const { data: profiles } = memberUserIds.length
        ? await supabase
            .from('profiles')
            .select('id, email, full_name, avatar_url')
            .in('id', memberUserIds)
        : { data: [] };

      const profilesMap = new Map((profiles || []).map((p) => [p.id, p]));
      const membersWithProfiles = (members || []).map((m) => ({
        ...m,
        profile: profilesMap.get(m.user_id),
      }));

      return membersWithProfiles as ChatMember[];
    },
    []
  );

  // Fetch all chat rooms for admin user
  const fetchRooms = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setError(null);
      // Get rooms where user is a member
      const { data: memberData, error: memberError } = await supabase
        .from('internal_chat_members')
        .select('room_id')
        .eq('user_id', user.id);

      if (memberError) throw memberError;

      const roomIds = memberData?.map(m => m.room_id) || [];
      if (roomIds.length === 0) {
        setRooms([]);
        setLoading(false);
        return;
      }

      // Fetch rooms with SYSTEM_TENANT_ID
      const { data: roomsData, error: roomsError } = await supabase
        .from('internal_chat_rooms')
        .select('*')
        .in('id', roomIds)
        .eq('tenant_id', SYSTEM_TENANT_ID)
        .order('updated_at', { ascending: false });

      if (roomsError) throw roomsError;

      const allRoomIds = (roomsData || []).map((r) => r.id);

      // Batch fetch members for all rooms
      const { data: membersData, error: membersError } = await supabase
        .from('internal_chat_members')
        .select('*')
        .in('room_id', allRoomIds);

      if (membersError) throw membersError;

      const membersByRoom = new Map<string, ChatMember[]>();
      (membersData || []).forEach((m: any) => {
        const list = membersByRoom.get(m.room_id) || [];
        list.push(m);
        membersByRoom.set(m.room_id, list);
      });

      // Batch fetch profiles
      const memberUserIds = [...new Set((membersData || []).map((m: any) => m.user_id))];
      const { data: profiles, error: profilesError } = memberUserIds.length
        ? await supabase
            .from('profiles')
            .select('id, email, full_name, avatar_url')
            .in('id', memberUserIds)
        : { data: [], error: null };

      if (profilesError) throw profilesError;

      const profilesMap = new Map((profiles || []).map((p: any) => [p.id, p]));

      // Determine last_read_at per room for current user
      const myLastReadByRoom = new Map<string, string>();
      (membersData || []).forEach((m: any) => {
        if (m.user_id === user.id) {
          myLastReadByRoom.set(m.room_id, m.last_read_at || '1970-01-01');
        }
      });

      const minLastReadAt = (() => {
        const vals = [...myLastReadByRoom.values()];
        if (vals.length === 0) return '1970-01-01';
        return vals.reduce((min, cur) => (new Date(cur) < new Date(min) ? cur : min), vals[0]);
      })();

      // Fetch recent messages across all rooms to derive last_message per room
      const lastMessageLimit = Math.min(Math.max(allRoomIds.length * 10, 50), 500);
      const { data: recentMessages, error: recentMsgError } = await supabase
        .from('internal_messages')
        .select('*')
        .in('room_id', allRoomIds)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(lastMessageLimit);

      if (recentMsgError) throw recentMsgError;

      const lastMessageByRoom = new Map<string, InternalMessage>();
      for (const msg of recentMessages || []) {
        if (!lastMessageByRoom.has(msg.room_id)) {
          lastMessageByRoom.set(msg.room_id, msg as any);
        }
        if (lastMessageByRoom.size >= allRoomIds.length) break;
      }

      // Fetch candidate unread messages in one go and compute per-room counts client-side
      const unreadLimit = Math.min(Math.max(allRoomIds.length * 200, 500), 5000);
      const { data: unreadCandidates, error: unreadError } = await supabase
        .from('internal_messages')
        .select('room_id, created_at, sender_id')
        .in('room_id', allRoomIds)
        .eq('is_deleted', false)
        .neq('sender_id', user.id)
        .gt('created_at', minLastReadAt)
        .order('created_at', { ascending: false })
        .limit(unreadLimit);

      if (unreadError) throw unreadError;

      const unreadCountByRoom = new Map<string, number>();
      (unreadCandidates || []).forEach((m: any) => {
        const lastReadAt = myLastReadByRoom.get(m.room_id) || '1970-01-01';
        if (new Date(m.created_at) > new Date(lastReadAt)) {
          unreadCountByRoom.set(m.room_id, (unreadCountByRoom.get(m.room_id) || 0) + 1);
        }
      });

      const roomsWithMembers = (roomsData || []).map((room: any) => {
        const members = membersByRoom.get(room.id) || [];
        const membersWithProfiles = members.map((m: any) => ({
          ...m,
          profile: profilesMap.get(m.user_id),
        }));

        return {
          ...room,
          type: room.type as 'direct' | 'group',
          members: membersWithProfiles,
          last_message: lastMessageByRoom.get(room.id) || null,
          unread_count: unreadCountByRoom.get(room.id) || 0,
        } as ChatRoom;
      });

      setRooms(roomsWithMembers);
    } catch (err) {
      console.error('Error fetching admin rooms:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Fetch messages for a room
  const fetchMessages = useCallback(async (roomId: string) => {
    if (!user) return;

    setMessagesLoading(true);
    try {
      const { data: messagesData, error } = await supabase
        .from('internal_messages')
        .select('*')
        .eq('room_id', roomId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Fetch sender profiles
      const senderIds = [...new Set(messagesData?.map(m => m.sender_id) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email, full_name, avatar_url')
        .in('id', senderIds);

      const profilesMap = new Map(profiles?.map(p => [p.id, p]));

      // Fetch reply-to messages
      const replyIds = messagesData?.filter(m => m.reply_to_id).map(m => m.reply_to_id) || [];
      const { data: replyMessages } = await supabase
        .from('internal_messages')
        .select('*')
        .in('id', replyIds);

      const repliesMap = new Map(replyMessages?.map(r => [r.id, r]));

      const messagesWithSenders = (messagesData || []).map(msg => ({
        ...msg,
        mentions: msg.mentions || [],
        sender: profilesMap.get(msg.sender_id),
        reply_to: msg.reply_to_id ? repliesMap.get(msg.reply_to_id) : null,
      }));

      setMessages(messagesWithSenders);

      // Mark messages as read
      await supabase
        .from('internal_chat_members')
        .update({ last_read_at: new Date().toISOString() })
        .eq('room_id', roomId)
        .eq('user_id', user.id);

    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setMessagesLoading(false);
    }
  }, [user]);

  // Send a message
  const sendMessage = async (
    roomId: string,
    content: string,
    contentType: string = 'text',
    mediaUrl?: string,
    mediaFilename?: string,
    replyToId?: string,
    mentions?: string[]
  ) => {
    if (!user) return;

    const { data, error } = await supabase
      .from('internal_messages')
      .insert({
        room_id: roomId,
        sender_id: user.id,
        content,
        content_type: contentType,
        media_url: mediaUrl,
        media_filename: mediaFilename,
        reply_to_id: replyToId,
        mentions: mentions || [],
      })
      .select()
      .single();

    if (error) throw error;

    // Update room's updated_at
    await supabase
      .from('internal_chat_rooms')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', roomId);

    return data;
  };

  // Create or find direct chat with another admin
  const createDirectChat = async (otherUserId: string) => {
    if (!user) return null;

    // Check if direct chat already exists
    const { data: myMemberships } = await supabase
      .from('internal_chat_members')
      .select('room_id')
      .eq('user_id', user.id);

    const myRoomIds = myMemberships?.map(m => m.room_id) || [];

    if (myRoomIds.length > 0) {
      const { data: otherMemberships } = await supabase
        .from('internal_chat_members')
        .select('room_id')
        .eq('user_id', otherUserId)
        .in('room_id', myRoomIds);

      const candidateRoomIds = (otherMemberships || []).map((m) => m.room_id);
      if (candidateRoomIds.length > 0) {
        const { data: candidateRooms, error: candidateErr } = await supabase
          .from('internal_chat_rooms')
          .select('*')
          .in('id', candidateRoomIds)
          .eq('type', 'direct')
          .eq('tenant_id', SYSTEM_TENANT_ID)
          .limit(1);

        if (candidateErr) throw candidateErr;

        const existingRoom = candidateRooms?.[0] as any;
        if (existingRoom) {
          const membersWithProfiles = await fetchRoomMembersWithProfiles(existingRoom.id);
          // Refresh list in background (don’t block opening)
          void fetchRooms();
          return {
            ...existingRoom,
            type: 'direct' as const,
            members: membersWithProfiles,
            last_message: null,
            unread_count: 0,
          } as ChatRoom;
        }
      }
    }

    // Create new direct chat with SYSTEM_TENANT_ID.
    // Important: avoid `insert(...).select().single()` here; PostgREST can fail with RLS
    // when it tries to return the inserted row before membership rows exist.
    const roomId = uuidv4();
    const { error: roomError } = await supabase
      .from('internal_chat_rooms')
      .insert({
        id: roomId,
        tenant_id: SYSTEM_TENANT_ID,
        type: 'direct',
        created_by: user.id,
      });

    if (roomError) throw roomError;

    // Add both members
    const { error: membersError } = await supabase
      .from('internal_chat_members')
      .insert([
        { room_id: roomId, user_id: user.id, is_admin: true },
        { room_id: roomId, user_id: otherUserId, is_admin: true },
      ]);

    if (membersError) throw membersError;

    // Fetch room + members (now readable due to membership)
    const { data: roomRow, error: fetchRoomError } = await supabase
      .from('internal_chat_rooms')
      .select('*')
      .eq('id', roomId)
      .eq('tenant_id', SYSTEM_TENANT_ID)
      .maybeSingle();

    if (fetchRoomError) throw fetchRoomError;

    const { data: members } = await supabase
      .from('internal_chat_members')
      .select('*')
      .eq('room_id', roomId);

    const memberUserIds = members?.map((m) => m.user_id) || [];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, email, full_name, avatar_url')
      .in('id', memberUserIds);

    const profilesMap = new Map(profiles?.map((p) => [p.id, p]));
    const membersWithProfiles = (members || []).map((m) => ({
      ...m,
      profile: profilesMap.get(m.user_id),
    }));

    const roomWithMembers = (
      roomRow || {
        id: roomId,
        tenant_id: SYSTEM_TENANT_ID,
        name: null,
        type: 'direct',
        created_by: user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
    ) as any;

    const normalizedRoomWithMembers = {
      ...roomWithMembers,
      type: 'direct' as const,
      members: membersWithProfiles,
      last_message: null,
      unread_count: 0,
    } as ChatRoom;

    void fetchRooms();
    return normalizedRoomWithMembers;
  };

  // Create group chat
  const createGroupChat = async (name: string, memberIds: string[]) => {
    if (!user) return null;

    try {
      const roomId = uuidv4();
      const { error: roomError } = await supabase
        .from('internal_chat_rooms')
        .insert({
          id: roomId,
          tenant_id: SYSTEM_TENANT_ID,
          name,
          type: 'group',
          created_by: user.id,
        });

      if (roomError) throw roomError;

      // Add creator as admin + other members
      const membersToInsert = [
        { room_id: roomId, user_id: user.id, is_admin: true },
        ...memberIds.filter(id => id !== user.id).map(id => ({
          room_id: roomId,
          user_id: id,
          is_admin: false,
        })),
      ];

      const { error: membersError } = await supabase
        .from('internal_chat_members')
        .insert(membersToInsert);

      if (membersError) throw membersError;

      // Fetch the room with members for immediate use
      const { data: membersData } = await supabase
        .from('internal_chat_members')
        .select('*')
        .eq('room_id', roomId);

      const { data: roomRow } = await supabase
        .from('internal_chat_rooms')
        .select('*')
        .eq('id', roomId)
        .eq('tenant_id', SYSTEM_TENANT_ID)
        .maybeSingle();

      // Get profiles for members
      const memberUserIds = membersData?.map(m => m.user_id) || [];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email, full_name, avatar_url')
        .in('id', memberUserIds);

      const profilesMap = new Map(profiles?.map(p => [p.id, p]));
      
      const membersWithProfiles = (membersData || []).map(m => ({
        ...m,
        profile: profilesMap.get(m.user_id),
      }));

      const roomWithMembers = {
        ...(roomRow || { id: roomId, tenant_id: SYSTEM_TENANT_ID, name, type: 'group', created_by: user.id }),
        type: 'group' as const,
        members: membersWithProfiles,
        last_message: null,
        unread_count: 0,
      } as ChatRoom;

       void fetchRooms();
      return roomWithMembers;
    } catch (error) {
      console.error('Error creating group chat:', error);
      throw error;
    }
  };

  // Setup real-time subscriptions
  useEffect(() => {
    if (!user) return;

    fetchRooms();

    // Subscribe to new messages
    const messagesChannel = supabase
      .channel('admin_internal_messages_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'internal_messages',
        },
        async (payload) => {
          const newMessage = payload.new as InternalMessage;
          
          // Check if this message is for a room we're in
          const room = rooms.find(r => r.id === newMessage.room_id);
          if (!room) {
            // Might be a new room, refresh rooms
            fetchRooms();
            return;
          }

          // Get sender profile
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, email, full_name, avatar_url')
            .eq('id', newMessage.sender_id)
            .single();

          const messageWithSender = {
            ...newMessage,
            mentions: newMessage.mentions || [],
            sender: profile,
          };

          // If we're viewing this room, add to messages
          if (currentRoom?.id === newMessage.room_id) {
            setMessages(prev => [...prev, messageWithSender]);
            
            // Mark as read
            if (newMessage.sender_id !== user.id) {
              await supabase
                .from('internal_chat_members')
                .update({ last_read_at: new Date().toISOString() })
                .eq('room_id', newMessage.room_id)
                .eq('user_id', user.id);
            }
          } else {
            // Update unread count
            setRooms(prev => prev.map(r => 
              r.id === newMessage.room_id
                ? { ...r, last_message: messageWithSender, unread_count: (r.unread_count || 0) + 1 }
                : r
            ));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messagesChannel);
    };
  }, [user, currentRoom?.id]);

  // Fetch messages when room changes
  useEffect(() => {
    if (currentRoom) {
      fetchMessages(currentRoom.id);
    } else {
      setMessages([]);
    }
  }, [currentRoom?.id]);

  // Get total unread count
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
    fetchRooms,
    fetchMessages,
  };
}
