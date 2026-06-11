import { Message } from '@/hooks/useMessages';
import { Image, FileText, Mic, MapPin, Film } from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuotedMessageProps {
  message: Message;
  isOutbound: boolean;
  onClick?: () => void;
}

export default function QuotedMessage({ message, isOutbound, onClick }: QuotedMessageProps) {
  const quotedIsOutbound = message.direction === 'outbound';

  const getContentPreview = () => {
    switch (message.content_type) {
      case 'image':
        return (
          <div className="flex items-center gap-1.5">
            <Image className="h-3 w-3" />
            <span className="truncate">{message.content || 'Photo'}</span>
          </div>
        );
      case 'video':
        return (
          <div className="flex items-center gap-1.5">
            <Film className="h-3 w-3" />
            <span className="truncate">{message.content || 'Video'}</span>
          </div>
        );
      case 'audio':
        return (
          <div className="flex items-center gap-1.5">
            <Mic className="h-3 w-3" />
            <span>Voice message</span>
          </div>
        );
      case 'document':
        return (
          <div className="flex items-center gap-1.5">
            <FileText className="h-3 w-3" />
            <span className="truncate">{(message as any).media_filename || 'Document'}</span>
          </div>
        );
      case 'location':
        return (
          <div className="flex items-center gap-1.5">
            <MapPin className="h-3 w-3" />
            <span>Location</span>
          </div>
        );
      default:
        return <span className="truncate">{message.content}</span>;
    }
  };

  return (
    <div 
      className={cn(
        "flex items-stretch gap-2 p-2 rounded-lg mb-1 cursor-pointer hover:opacity-80 transition-opacity",
        isOutbound ? "bg-primary-foreground/10" : "bg-muted"
      )}
      onClick={onClick}
    >
      <div className={cn(
        "w-0.5 rounded-full shrink-0",
        quotedIsOutbound ? "bg-primary" : "bg-brand"
      )} />
      <div className="flex-1 min-w-0">
        <p className={cn(
          "text-[10px] font-medium mb-0.5",
          isOutbound 
            ? (quotedIsOutbound ? "text-primary-foreground/80" : "text-primary-foreground/60")
            : (quotedIsOutbound ? "text-primary" : "text-brand")
        )}>
          {quotedIsOutbound ? 'You' : 'Them'}
        </p>
        <div className={cn(
          "text-xs line-clamp-2",
          isOutbound ? "text-primary-foreground/70" : "text-muted-foreground"
        )}>
          {getContentPreview()}
        </div>
      </div>
      {message.content_type === 'image' && message.media_url && (
        <img 
          src={message.media_url} 
          alt="" 
          className="h-8 w-8 rounded object-cover shrink-0"
        />
      )}
    </div>
  );
}
