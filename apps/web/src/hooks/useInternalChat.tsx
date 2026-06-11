import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/useTenant';
import { useAuth } from '@/hooks/useAuth';

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

export function useInternalChat() {
  const { currentTenant } = useTenant();
  const { user } = useAuth();
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [currentRoom, setCurrentRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<InternalMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // OPTIMIZED: Batch fetch all rooms with members in minimal queries
  const fetchRooms = useCallback(async () => {
    if (!currentTenant || !user) {
      setLoading(false);
      return;
    }

    try {
      setError(null);
      
      // Step 1: Get room IDs where user is a member
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

      // Step 2: BATCH - Fetch all data in parallel (4 queries total instead of 4×N)
      const [roomsResult, allMembersResult, recentMessagesResult] = await Promise.all([
        // Fetch all rooms
        supabase
          .from('internal_chat_rooms')
          .select('*')
          .in('id', roomIds)
          .eq('tenant_id', currentTenant.id)
          .order('updated_at', { ascending: false }),
        
        // Fetch ALL members for ALL rooms at once
        supabase
          .from('internal_chat_members')
          .select('*')
          .in('room_id', roomIds),
        
        // Fetch recent messages for all rooms (last 1 per room, we'll group client-side)
        supabase
          .from('internal_messages')
          .select('*')
          .in('room_id', roomIds)
          .eq('is_deleted', false)
          .order('created_at', { ascending: false })
          .limit(roomIds.length * 2), // Get enough to have at least 1 per room
      ]);

      if (roomsResult.error) throw roomsResult.error;
      
      const roomsData = roomsResult.data || [];
      const allMembers = allMembersResult.data || [];
      const recentMessages = recentMessagesResult.data || [];

      // Step 3: Fetch profiles for all unique member user IDs
      const allMemberUserIds = [...new Set(allMembers.map(m => m.user_id))];
      const { data: allProfiles } = await supabase
        .from('profiles')
        .select('id, email, full_name, avatar_url')
        .in('id', allMemberUserIds);

      const profilesMap = new Map(allProfiles?.map(p => [p.id, p]) || []);

      // Step 4: Build room data client-side (no more loops with DB calls!)
      const lastMessageByRoom = new Map<string, InternalMessage>();
      for (const msg of recentMessages) {
        if (!lastMessageByRoom.has(msg.room_id)) {
          lastMessageByRoom.set(msg.room_id, msg);
        }
      }

      // Group members by room
      const membersByRoom = new Map<string, typeof allMembers>();
      for (const member of allMembers) {
        if (!membersByRoom.has(member.room_id)) {
          membersByRoom.set(member.room_id, []);
        }
        membersByRoom.get(member.room_id)!.push(member);
      }

      const roomsWithData = roomsData.map(room => {
        const roomMembers = membersByRoom.get(room.id) || [];
        const membersWithProfiles = roomMembers.map(m => ({
          ...m,
          profile: profilesMap.get(m.user_id),
        }));

        // Calculate unread count client-side
        const myMember = membersWithProfiles.find(m => m.user_id === user.id);
        const lastReadAt = myMember?.last_read_at ? new Date(myMember.last_read_at) : new Date(0);
        
        // Count messages after last_read_at that aren't from current user
        const unreadCount = recentMessages.filter(
          msg => msg.room_id === room.id && 
                 msg.sender_id !== user.id && 
                 new Date(msg.created_at) > lastReadAt
        ).length;

        return {
          ...room,
          type: room.type as 'direct' | 'group',
          members: membersWithProfiles,
          last_message: lastMessageByRoom.get(room.id) || null,
          unread_count: unreadCount,
        };
      });

      setRooms(roomsWithData);
    } catch (err) {
      console.error('Error fetching rooms:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [currentTenant, user]);

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

      // Batch fetch sender profiles
      const senderIds = [...new Set(messagesData?.map(m => m.sender_id) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email, full_name, avatar_url')
        .in('id', senderIds);

      const profilesMap = new Map<string, { id: string; email: string | null; full_name: string | null; avatar_url: string | null }>(
        (profiles || []).map(p => [p.id, p])
      );

      // Batch fetch reply-to messages
      const replyIds = messagesData?.filter(m => m.reply_to_id).map(m => m.reply_to_id) || [];
      let repliesMap = new Map<string, InternalMessage>();
      
      if (replyIds.length > 0) {
        const { data: replyMessages } = await supabase
          .from('internal_messages')
          .select('*')
          .in('id', replyIds);
        
        repliesMap = new Map(
          (replyMessages || []).map(r => [r.id, { ...r, mentions: r.mentions || [] } as InternalMessage])
        );
      }

      const messagesWithSenders: InternalMessage[] = (messagesData || []).map(msg => ({
        ...msg,
        mentions: msg.mentions || [],
        sender: profilesMap.get(msg.sender_id),
        reply_to: msg.reply_to_id ? repliesMap.get(msg.reply_to_id) || null : null,
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

  // Send a message with optimistic update
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

    // Create optimistic message
    const optimisticId = `temp-${Date.now()}`;
    const optimisticMessage: InternalMessage = {
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
      sender: {
        id: user.id,
        email: user.email || null,
        full_name: null,
        avatar_url: null,
      },
    };

    // Add optimistic message immediately
    setMessages(prev => [...prev, optimisticMessage]);

    try {
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

      // Replace optimistic message with real one
      setMessages(prev => prev.map(msg => 
        msg.id === optimisticId 
          ? { ...data, mentions: data.mentions || [], sender: optimisticMessage.sender }
          : msg
      ));

      // Update room's updated_at (fire and forget)
      supabase
        .from('internal_chat_rooms')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', roomId);

      return data;
    } catch (error) {
      // Remove optimistic message on error
      setMessages(prev => prev.filter(msg => msg.id !== optimisticId));
      throw error;
    }
  };

  // Create or find direct chat
  const createDirectChat = async (otherUserId: string) => {
    if (!currentTenant || !user) return null;

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

      for (const membership of otherMemberships || []) {
        const { data: room } = await supabase
          .from('internal_chat_rooms')
          .select('*')
          .eq('id', membership.room_id)
          .eq('type', 'direct')
          .single();

        if (room) {
          return room;
        }
      }
    }

    // Create new direct chat
    const { data: newRoom, error: roomError } = await supabase
      .from('internal_chat_rooms')
      .insert({
        tenant_id: currentTenant.id,
        type: 'direct',
        created_by: user.id,
      })
      .select()
      .single();

    if (roomError) throw roomError;

    // Add both members
    await supabase
      .from('internal_chat_members')
      .insert([
        { room_id: newRoom.id, user_id: user.id, is_admin: true },
        { room_id: newRoom.id, user_id: otherUserId, is_admin: true },
      ]);

    // Fetch rooms in background (non-blocking)
    fetchRooms();
    return newRoom;
  };

  // Create group chat
  const createGroupChat = async (name: string, memberIds: string[]) => {
    if (!currentTenant || !user) return null;

    try {
      const { data: newRoom, error: roomError } = await supabase
        .from('internal_chat_rooms')
        .insert({
          tenant_id: currentTenant.id,
          name,
          type: 'group',
          created_by: user.id,
        })
        .select()
        .single();

      if (roomError) throw roomError;

      // Add creator as admin + other members
      const membersToInsert = [
        { room_id: newRoom.id, user_id: user.id, is_admin: true },
        ...memberIds.filter(id => id !== user.id).map(id => ({
          room_id: newRoom.id,
          user_id: id,
          is_admin: false,
        })),
      ];

      const { error: membersError } = await supabase
        .from('internal_chat_members')
        .insert(membersToInsert);

      if (membersError) throw membersError;

      // Create immediate return object
      const roomWithMembers: ChatRoom = {
        ...newRoom,
        type: 'group' as const,
        members: membersToInsert.map(m => ({
          id: `temp-${m.user_id}`,
          room_id: newRoom.id,
          user_id: m.user_id,
          last_read_at: new Date().toISOString(),
          joined_at: new Date().toISOString(),
          is_admin: m.is_admin,
        })),
        last_message: null,
        unread_count: 0,
      };

      // Fetch rooms in background (non-blocking)
      fetchRooms();
      return roomWithMembers;
    } catch (error) {
      console.error('Error creating group chat:', error);
      throw error;
    }
  };

  // Add member to group
  const addMemberToGroup = async (roomId: string, userId: string) => {
    const { error } = await supabase
      .from('internal_chat_members')
      .insert({ room_id: roomId, user_id: userId, is_admin: false });

    if (error) throw error;
    fetchRooms();
  };

  // Remove member from group
  const removeMemberFromGroup = async (roomId: string, userId: string) => {
    const { error } = await supabase
      .from('internal_chat_members')
      .delete()
      .eq('room_id', roomId)
      .eq('user_id', userId);

    if (error) throw error;
    fetchRooms();
  };

  // Setup real-time subscriptions
  useEffect(() => {
    if (!currentTenant || !user) return;

    fetchRooms();

    // Subscribe to new messages
    const messagesChannel = supabase
      .channel(`internal_messages_${currentTenant.id}`)
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
            setMessages(prev => {
              // Avoid duplicates (from optimistic update)
              if (prev.some(m => m.id === newMessage.id)) return prev;
              // Remove any temp messages that match
              const withoutTemp = prev.filter(m => !m.id.startsWith('temp-'));
              return [...withoutTemp, messageWithSender];
            });
            
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
  }, [currentTenant, user, currentRoom?.id]);

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
    addMemberToGroup,
    removeMemberFromGroup,
    fetchRooms,
    fetchMessages,
  };
}
