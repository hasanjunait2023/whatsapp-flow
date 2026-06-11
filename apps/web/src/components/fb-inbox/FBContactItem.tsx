import { FBContact } from '@/hooks/useFBContacts';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { Image, MessageSquare, Mic, UserRound, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import CustomerStatusBadge from '@/components/inbox/CustomerStatusBadge';
import { CustomerStatusLabel } from '@/lib/customer-status-config';

interface FBContactItemProps {
  contact: FBContact & { fb_messages?: Array<{ content: string | null; content_type: string; direction: string; media_url: string | null }> };
  isSelected: boolean;
  onClick: () => void;
  customerStatus?: CustomerStatusLabel | null;
}

// Format PSID as readable name when actual name is unavailable
const formatPsidAsName = (psid: string) => {
  if (psid.length > 8) {
    return `FB-${psid.slice(0, 4)}...${psid.slice(-4)}`;
  }
  return `FB-${psid}`;
};

export default function FBContactItem({ contact, isSelected, onClick, customerStatus }: FBContactItemProps) {
  const displayName = contact.name || formatPsidAsName(contact.psid);
  const initials = displayName.slice(0, 2).toUpperCase();
  
  // Get the most recent message (first one since ordered by sent_at desc from query)
  const lastMessage = contact.fb_messages?.[0];
  
  const getLastMessagePreview = () => {
    if (!lastMessage) return null;
    
    const isOutgoing = lastMessage.direction === 'outbound';
    const prefix = isOutgoing ? 'You: ' : '';
    
    switch (lastMessage.content_type) {
      case 'image':
        return <><Image className="inline h-3 w-3 mr-1" />{prefix}Photo</>;
      case 'audio':
        return <><Mic className="inline h-3 w-3 mr-1" />{prefix}Voice message</>;
      case 'video':
        return <><Image className="inline h-3 w-3 mr-1" />{prefix}Video</>;
      case 'file':
        return <><FileText className="inline h-3 w-3 mr-1" />{prefix}Document</>;
      default:
        return prefix + (lastMessage.content || 'Message');
    }
  };
  
  const timeAgo = contact.last_message_at
    ? formatDistanceToNow(new Date(contact.last_message_at), { addSuffix: false })
    : null;

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-start gap-3 p-3 text-left transition-colors border-b border-border",
        isSelected
          ? "bg-accent"
          : contact.unread_count > 0
            ? "bg-brand/5 hover:bg-brand/10"
            : "hover:bg-muted/50"
      )}
    >
      <div className="relative">
        <Avatar className="h-10 w-10">
          <AvatarImage src={contact.profile_pic_url || undefined} />
          <AvatarFallback className="bg-blue-500 text-white text-sm">
            {initials}
          </AvatarFallback>
        </Avatar>
        {contact.needs_handoff && (
          <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-warning flex items-center justify-center">
            <UserRound className="h-2.5 w-2.5 text-warning-foreground" />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <span className={cn(
              "font-medium truncate text-sm",
              contact.unread_count > 0 && "text-foreground",
              !contact.unread_count && "text-muted-foreground"
            )}>
              {displayName}
            </span>
            <CustomerStatusBadge status={customerStatus} size="sm" />
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {contact.unread_count > 0 && (
              <Badge variant="default" className="h-5 min-w-5 px-1.5 text-xs bg-blue-500">
                {contact.unread_count}
              </Badge>
            )}
            {timeAgo && (
              <span className="text-xs text-muted-foreground">{timeAgo}</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 mt-0.5">
          {contact.facebook_pages?.page_name && (
            <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 shrink-0">
              {contact.facebook_pages.page_name}
            </Badge>
          )}
        </div>

        <p className={cn(
          "text-sm truncate mt-1",
          contact.unread_count > 0 ? "text-foreground font-medium" : "text-muted-foreground"
        )}>
          {lastMessage ? getLastMessagePreview() : (
            <>
              <MessageSquare className="inline h-3 w-3 mr-1" />
              No messages yet
            </>
          )}
        </p>
      </div>
    </button>
  );
}
