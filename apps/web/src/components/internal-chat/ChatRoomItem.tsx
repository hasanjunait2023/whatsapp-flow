import { format, isToday, isYesterday, isThisWeek, isThisYear } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { PresenceIndicator } from './PresenceIndicator';
import { Hash, Users } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface ChatMember {
  id: string;
  user_id: string;
  profile?: {
    id: string;
    email: string | null;
    full_name: string | null;
    avatar_url: string | null;
  };
}

interface ChatRoom {
  id: string;
  name: string | null;
  type: 'direct' | 'group';
  members?: ChatMember[];
  last_message?: {
    content: string | null;
    content_type: string;
    created_at: string;
    sender_id: string;
  } | null;
  unread_count?: number;
}

interface ChatRoomItemProps {
  room: ChatRoom;
  isSelected: boolean;
  isOnline?: boolean;
  onClick: () => void;
}

export function ChatRoomItem({ room, isSelected, isOnline = false, onClick }: ChatRoomItemProps) {
  const { user } = useAuth();

  const getDisplayName = () => {
    if (room.type === 'group') {
      return room.name || 'Unnamed Group';
    }

    // For direct chats, show the other person's name
    const otherMember = room.members?.find(m => m.user_id !== user?.id);
    return otherMember?.profile?.full_name || otherMember?.profile?.email || 'Unknown';
  };

  const getAvatarUrl = () => {
    if (room.type === 'group') {
      return null;
    }
    const otherMember = room.members?.find(m => m.user_id !== user?.id);
    return otherMember?.profile?.avatar_url;
  };

  const getInitials = () => {
    const name = getDisplayName();
    return name.charAt(0).toUpperCase();
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) {
      return format(date, 'h:mm a');
    }
    if (isYesterday(date)) {
      return 'Yesterday';
    }
    if (isThisWeek(date)) {
      return format(date, 'EEE');
    }
    if (isThisYear(date)) {
      return format(date, 'MMM d');
    }
    return format(date, 'MM/dd/yy');
  };

  const getLastMessagePreview = () => {
    if (!room.last_message) return 'No messages yet';
    
    const prefix = room.last_message.sender_id === user?.id ? 'You: ' : '';
    
    switch (room.last_message.content_type) {
      case 'image':
        return `${prefix}📷 Photo`;
      case 'video':
        return `${prefix}🎥 Video`;
      case 'audio':
        return `${prefix}🎵 Voice message`;
      case 'document':
        return `${prefix}📄 Document`;
      default:
        return `${prefix}${room.last_message.content || ''}`;
    }
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors',
        'hover:bg-accent/50',
        isSelected && 'bg-accent'
      )}
    >
      <div className="relative flex-shrink-0">
        {room.type === 'group' ? (
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Users className="h-5 w-5 text-primary" />
          </div>
        ) : (
          <Avatar className="h-10 w-10">
            <AvatarImage src={getAvatarUrl() || undefined} />
            <AvatarFallback>{getInitials()}</AvatarFallback>
          </Avatar>
        )}
        {room.type === 'direct' && (
          <PresenceIndicator
            isOnline={isOnline}
            size="sm"
            className="absolute -bottom-0.5 -right-0.5"
          />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="font-medium truncate">{getDisplayName()}</span>
          {room.last_message && (
            <span className="text-xs text-muted-foreground flex-shrink-0">
              {formatTime(room.last_message.created_at)}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm text-muted-foreground truncate">
            {getLastMessagePreview()}
          </span>
          {(room.unread_count || 0) > 0 && (
            <Badge variant="default" className="h-5 min-w-5 text-xs px-1.5 flex-shrink-0">
              {room.unread_count}
            </Badge>
          )}
        </div>
      </div>
    </button>
  );
}
