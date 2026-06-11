import { useState, useRef, useEffect } from 'react';
import { format, isToday, isYesterday, parseISO, isSameDay } from 'date-fns';
import { MoreVertical, Users, Settings, UserPlus, LogOut } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { InternalMessageBubble } from './InternalMessageBubble';
import { InternalChatInput } from './InternalChatInput';
import { TypingIndicator } from './TypingIndicator';
import { PresenceIndicator } from './PresenceIndicator';
import { useAuth } from '@/hooks/useAuth';
import { usePresence } from '@/hooks/usePresence';
import { useTypingIndicator } from '@/hooks/useTypingIndicator';
import { useTeam } from '@/hooks/useTeam';

interface ChatMember {
  id: string;
  user_id: string;
  is_admin: boolean;
  last_read_at: string;
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

interface ChatRoom {
  id: string;
  name: string | null;
  type: 'direct' | 'group';
  members?: ChatMember[];
}

interface ChatRoomViewProps {
  room: ChatRoom;
  messages: InternalMessage[];
  loading?: boolean;
  onSendMessage: (
    roomId: string,
    content: string,
    contentType?: string,
    mediaUrl?: string,
    mediaFilename?: string,
    replyToId?: string,
    mentions?: string[]
  ) => Promise<void>;
  onLeaveGroup?: (roomId: string) => void;
}

export function ChatRoomView({
  room,
  messages,
  loading,
  onSendMessage,
  onLeaveGroup,
}: ChatRoomViewProps) {
  const { user } = useAuth();
  const { isOnline, getTypingUsers } = usePresence();
  const { members } = useTeam();
  const [replyingTo, setReplyingTo] = useState<InternalMessage | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Get typing users for this room - with defensive check
  const typingUserIds = room?.id ? getTypingUsers(room.id) : [];
  const typingUsers = typingUserIds.map(id => {
    const member = members.find(m => m.user_id === id);
    return {
      id,
      full_name: member?.profile?.full_name || null,
      avatar_url: member?.profile?.avatar_url || null,
    };
  }).filter(Boolean);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // Get display info for room
  const getDisplayInfo = () => {
    if (room.type === 'group') {
      return {
        name: room.name || 'Unnamed Group',
        avatar: null,
        subtitle: `${room.members?.length || 0} members`,
        isOnline: false,
      };
    }

    const otherMember = room.members?.find(m => m.user_id !== user?.id);
    const displayName = otherMember?.profile?.full_name 
      || otherMember?.profile?.email?.split('@')[0] 
      || 'Team Member';
    return {
      name: displayName,
      avatar: otherMember?.profile?.avatar_url || null,
      subtitle: isOnline(otherMember?.user_id || '') ? 'Online' : 'Offline',
      isOnline: otherMember ? isOnline(otherMember.user_id) : false,
    };
  };

  const displayInfo = getDisplayInfo();

  // Group messages by date
  const messagesByDate = messages.reduce<{ date: string; messages: InternalMessage[] }[]>((acc, msg) => {
    const msgDate = parseISO(msg.created_at);
    const dateKey = format(msgDate, 'yyyy-MM-dd');
    
    const existing = acc.find(g => g.date === dateKey);
    if (existing) {
      existing.messages.push(msg);
    } else {
      acc.push({ date: dateKey, messages: [msg] });
    }
    
    return acc;
  }, []);

  const formatDateHeader = (dateStr: string) => {
    const date = parseISO(dateStr);
    if (isToday(date)) return 'Today';
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'MMMM d, yyyy');
  };

  // Check if a message is read by others
  const isMessageRead = (msg: InternalMessage) => {
    if (msg.sender_id !== user?.id) return false;
    
    return room.members?.some(member => {
      if (member.user_id === user?.id) return false;
      const lastReadAt = new Date(member.last_read_at);
      const msgCreatedAt = new Date(msg.created_at);
      return lastReadAt >= msgCreatedAt;
    }) || false;
  };

  // Handle sending message
  const handleSendMessage = async (
    content: string,
    contentType?: string,
    mediaUrl?: string,
    mediaFilename?: string,
    replyToId?: string,
    mentions?: string[]
  ) => {
    await onSendMessage(
      room.id,
      content,
      contentType,
      mediaUrl,
      mediaFilename,
      replyToId || replyingTo?.id,
      mentions
    );
    setReplyingTo(null);
  };

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Header */}
      <div className="h-16 border-b flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            {room.type === 'group' ? (
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-primary" />
              </div>
            ) : (
              <Avatar className="h-10 w-10">
                <AvatarImage src={displayInfo.avatar || undefined} />
                <AvatarFallback>{displayInfo.name.charAt(0)}</AvatarFallback>
              </Avatar>
            )}
            {room.type === 'direct' && (
              <PresenceIndicator
                isOnline={displayInfo.isOnline}
                size="sm"
                className="absolute -bottom-0.5 -right-0.5"
              />
            )}
          </div>
          <div>
            <h3 className="font-medium">{displayInfo.name}</h3>
            <p className="text-xs text-muted-foreground">{displayInfo.subtitle}</p>
          </div>
        </div>

        {room.type === 'group' && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Settings className="h-4 w-4 mr-2" />
                Group Settings
              </DropdownMenuItem>
              <DropdownMenuItem>
                <UserPlus className="h-4 w-4 mr-2" />
                Add Members
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => onLeaveGroup?.(room.id)}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Leave Group
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1" ref={scrollRef}>
        <div className="p-4 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent" />
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">No messages yet</p>
              <p className="text-xs">Send a message to start the conversation</p>
            </div>
          ) : (
            messagesByDate.map(({ date, messages: dayMessages }) => (
              <div key={date}>
                {/* Date header */}
                <div className="flex items-center justify-center my-4">
                  <span className="bg-muted px-3 py-1 rounded-full text-xs text-muted-foreground">
                    {formatDateHeader(date)}
                  </span>
                </div>
                
                {/* Messages for this date */}
                <div className="space-y-2">
                  {dayMessages.map((msg, idx) => {
                    // Show sender for first message or when sender changes
                    const prevMsg = idx > 0 ? dayMessages[idx - 1] : null;
                    const showSender = !prevMsg || prevMsg.sender_id !== msg.sender_id;
                    
                    return (
                      <InternalMessageBubble
                        key={msg.id}
                        message={msg}
                        showSender={showSender}
                        isRead={isMessageRead(msg)}
                        onReply={setReplyingTo}
                      />
                    );
                  })}
                </div>
              </div>
            ))
          )}
          
          {/* Typing indicator */}
          {typingUsers.length > 0 && (
            <TypingIndicator users={typingUsers} />
          )}
          
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <InternalChatInput
        roomId={room.id}
        onSendMessage={handleSendMessage}
        replyingTo={replyingTo}
        onCancelReply={() => setReplyingTo(null)}
      />
    </div>
  );
}
