import { Message } from '@/hooks/useMessages';
import { X, Reply, Image, FileText, Mic, MapPin, Film } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ReplyPreviewProps {
  message: Message;
  onCancel: () => void;
}

export default function ReplyPreview({ message, onCancel }: ReplyPreviewProps) {
  const isOutbound = message.direction === 'outbound';

  const getContentPreview = () => {
    switch (message.content_type) {
      case 'image':
        return (
          <div className="flex items-center gap-2">
            <Image className="h-4 w-4 text-muted-foreground" />
            <span className="truncate">{message.content || 'Photo'}</span>
          </div>
        );
      case 'video':
        return (
          <div className="flex items-center gap-2">
            <Film className="h-4 w-4 text-muted-foreground" />
            <span className="truncate">{message.content || 'Video'}</span>
          </div>
        );
      case 'audio':
        return (
          <div className="flex items-center gap-2">
            <Mic className="h-4 w-4 text-muted-foreground" />
            <span>Voice message</span>
          </div>
        );
      case 'document':
        return (
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="truncate">{(message as any).media_filename || message.content || 'Document'}</span>
          </div>
        );
      case 'location':
        return (
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span>Location</span>
          </div>
        );
      default:
        return <span className="truncate">{message.content}</span>;
    }
  };

  return (
    <div className="flex items-stretch gap-2 p-3 bg-muted/50 border-b border-border">
      <div className={cn(
        "w-1 rounded-full shrink-0",
        isOutbound ? "bg-primary" : "bg-brand"
      )} />
      <div className="flex-1 min-w-0">
        <p className={cn(
          "text-xs font-medium mb-0.5",
          isOutbound ? "text-primary" : "text-brand"
        )}>
          {isOutbound ? 'You' : 'Reply to'}
        </p>
        <div className="text-sm text-muted-foreground">
          {getContentPreview()}
        </div>
      </div>
      {message.content_type === 'image' && message.media_url && (
        <img 
          src={message.media_url} 
          alt="" 
          className="h-10 w-10 rounded object-cover shrink-0"
        />
      )}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0 self-center"
        onClick={onCancel}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
