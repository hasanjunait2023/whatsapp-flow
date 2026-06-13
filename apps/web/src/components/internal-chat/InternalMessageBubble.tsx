import { format, isToday, isYesterday, isThisYear } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { ReadReceiptIndicator } from './ReadReceiptIndicator';
import { useAuth } from '@/hooks/useAuth';
import { Reply, FileText, Image, Video, Mic } from 'lucide-react';

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

interface InternalMessageBubbleProps {
  message: InternalMessage;
  showSender?: boolean;
  isRead?: boolean;
  onReply?: (message: InternalMessage) => void;
  teamMembers?: Map<string, { full_name: string | null }>;
}

export function InternalMessageBubble({
  message,
  showSender = true,
  isRead = false,
  onReply,
  teamMembers,
}: InternalMessageBubbleProps) {
  const { user } = useAuth();
  const isOwn = message.sender_id === user?.id;

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return format(date, 'h:mm a');
  };

  // Highlight @mentions in content
  const renderContent = () => {
    if (!message.content) return null;
    
    if (message.mentions && message.mentions.length > 0) {
      // Simple mention highlighting - could be enhanced with regex
      const parts = message.content.split(/(@\w+)/g);
      return parts.map((part, i) => {
        if (part.startsWith('@')) {
          return (
            <span key={i} className="text-primary font-medium">
              {part}
            </span>
          );
        }
        return part;
      });
    }
    
    return message.content;
  };

  const renderMedia = () => {
    if (!message.media_url) return null;

    switch (message.content_type) {
      case 'image':
        return (
          <img
            src={message.media_url}
            alt={message.media_filename || 'Image'}
            className="max-w-sm rounded-lg cursor-pointer hover:opacity-90"
            onClick={() => window.open(message.media_url!, '_blank')}
          />
        );
      case 'video':
        return (
          <video
            src={message.media_url}
            controls
            className="max-w-sm rounded-lg"
          />
        );
      case 'audio':
        return (
          <div className="flex items-center gap-2 bg-accent/50 rounded-lg p-2">
            <Mic className="h-4 w-4 text-primary" />
            <audio src={message.media_url} controls className="max-w-48" />
          </div>
        );
      case 'document':
        return (
          <a
            href={message.media_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-accent/50 rounded-lg p-3 hover:bg-accent transition-colors"
          >
            <FileText className="h-5 w-5 text-primary" />
            <span className="text-sm truncate max-w-48">
              {message.media_filename || 'Document'}
            </span>
          </a>
        );
      default:
        return null;
    }
  };

  if (message.is_deleted) {
    return (
      <div className={cn('flex', isOwn ? 'justify-end' : 'justify-start')}>
        <div className="text-sm text-muted-foreground italic px-3 py-1.5">
          This message was deleted
        </div>
      </div>
    );
  }

  return (
    <div className={cn('group flex gap-2', isOwn ? 'flex-row-reverse' : 'flex-row')}>
      {!isOwn && showSender && (
        <Avatar className="h-8 w-8 flex-shrink-0 mt-auto">
          <AvatarImage src={message.sender?.avatar_url || undefined} />
          <AvatarFallback className="text-xs">
            {message.sender?.full_name?.charAt(0) || '?'}
          </AvatarFallback>
        </Avatar>
      )}
      
      <div className={cn('flex flex-col max-w-[70%]', isOwn ? 'items-end' : 'items-start')}>
        {!isOwn && showSender && (
          <span className="text-xs text-muted-foreground mb-0.5 px-1">
            {message.sender?.full_name || 'Unknown'}
          </span>
        )}
        
        {message.reply_to && (
          <div
            className={cn(
              'text-xs rounded-lg px-2 py-1 mb-1 border-l-2 border-secondary/40',
              isOwn ? 'bg-secondary/10' : 'bg-muted'
            )}
          >
            <span className="font-medium text-foreground">
              {message.reply_to.sender?.full_name || 'Unknown'}
            </span>
            <p className="truncate text-muted-foreground max-w-48">
              {message.reply_to.content || '[Media]'}
            </p>
          </div>
        )}

        <div
          className={cn(
            'rounded-2xl px-3 py-2 relative',
            isOwn
              ? 'bg-secondary text-secondary-foreground rounded-br-md'
              : 'bg-card border border-border text-foreground rounded-bl-md'
          )}
        >
          {renderMedia()}
          {message.content && (
            <p className="text-sm whitespace-pre-wrap break-words">
              {renderContent()}
            </p>
          )}
          
          <div className={cn(
            'flex items-center gap-1 mt-0.5',
            isOwn ? 'justify-end' : 'justify-start'
          )}>
            <span className={cn(
              'text-[10px]',
              isOwn ? 'text-secondary-foreground/70' : 'text-muted-foreground'
            )}>
              {formatTime(message.created_at)}
            </span>
            {message.edited_at && (
              <span className={cn(
                'text-[10px]',
                isOwn ? 'text-secondary-foreground/70' : 'text-muted-foreground'
              )}>
                (edited)
              </span>
            )}
            {isOwn && (
              <ReadReceiptIndicator isRead={isRead} isSent={true} />
            )}
          </div>
        </div>
      </div>
      
      {/* Reply button */}
      {onReply && (
        <button
          onClick={() => onReply(message)}
          className={cn(
            'self-center opacity-0 group-hover:opacity-100 transition-opacity',
            'p-1.5 rounded-full hover:bg-accent'
          )}
        >
          <Reply className="h-4 w-4 text-muted-foreground" />
        </button>
      )}
    </div>
  );
}
