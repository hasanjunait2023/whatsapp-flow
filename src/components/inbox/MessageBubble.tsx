import { Message } from '@/hooks/useMessages';
import { linkifyText } from '@/lib/linkify';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Check, CheckCheck, Clock, AlertCircle, Bot, FileText, Download, MapPin, Reply, User, Smartphone, Trash2, Forward, Square, CheckSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import QuotedMessage from './QuotedMessage';
import SwipeableMessage from './SwipeableMessage';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface MessageBubbleProps {
  message: Message & { sender_name?: string };
  quotedMessage?: Message | null;
  showTimestamp?: boolean;
  onReply?: (message: Message) => void;
  onQuotedClick?: (messageId: string) => void;
  onDelete?: (messageId: string) => void;
  canDelete?: boolean;
  selectionMode?: boolean;
  isSelected?: boolean;
  onSelect?: (message: Message, selected: boolean) => void;
  onForward?: (message: Message) => void;
}

// Status icons are now rendered inline for better reliability
export default function MessageBubble({ 
  message, 
  quotedMessage,
  showTimestamp = true,
  onReply,
  onQuotedClick,
  onDelete,
  canDelete = false,
  selectionMode = false,
  isSelected = false,
  onSelect,
  onForward,
}: MessageBubbleProps) {
  const isOutbound = message.direction === 'outbound';

  // Check for location and sync data (using type assertion for extended columns)
  const msgAny = message as any;
  const hasLocation = msgAny.location_lat && msgAny.location_lng;
  const isSyncedFromDevice = msgAny.is_synced_from_device === true;

  const handleReply = () => {
    onReply?.(message);
  };

  const handleDoubleClick = () => {
    if (selectionMode) return;
    onReply?.(message);
  };

  const handleForwardSingle = () => {
    onForward?.(message);
  };

  const handleStartSelection = () => {
    // Start selection mode by selecting this message
    onSelect?.(message, true);
  };

  const handleClick = () => {
    if (selectionMode && onSelect) {
      onSelect(message, !isSelected);
    }
  };

  const renderContent = () => {
    switch (message.content_type) {
      case 'image':
        return (
          <div className="space-y-2">
            {message.media_url && (
              <img
                src={message.media_url}
                alt="Shared image"
                className="rounded-lg max-w-xs cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => window.open(message.media_url!, '_blank')}
                onError={(e) => {
                  e.currentTarget.src = '/placeholder.svg';
                  e.currentTarget.classList.add('opacity-50');
                }}
              />
            )}
            {message.content && (
              <p className="text-sm whitespace-pre-wrap break-words">
                {linkifyText(message.content, isOutbound ? 'text-blue-200 hover:underline break-all' : 'text-primary hover:underline break-all')}
              </p>
            )}
          </div>
        );

      case 'video':
        return (
          <div className="space-y-2">
            {message.media_url && (
              <div className="relative rounded-lg overflow-hidden max-w-xs">
                <video
                  src={message.media_url}
                  controls
                  className="w-full rounded-lg"
                  preload="metadata"
                />
              </div>
            )}
            {message.content && (
              <p className="text-sm whitespace-pre-wrap break-words">
                {linkifyText(message.content, isOutbound ? 'text-blue-200 hover:underline break-all' : 'text-primary hover:underline break-all')}
              </p>
            )}
          </div>
        );

      case 'audio':
      case 'voice':
        return (
          <div className="min-w-[200px]">
            {message.media_url && (
              <audio
                src={message.media_url}
                controls
                className="w-full h-10"
                preload="metadata"
              />
            )}
          </div>
        );

      case 'document':
        return (
          <div className="flex items-center gap-3 p-3 bg-background/10 rounded-lg min-w-[200px]">
            <div className="h-12 w-12 rounded-lg bg-background/20 flex items-center justify-center shrink-0">
              <FileText className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {msgAny.media_filename || message.content || 'Document'}
              </p>
              <p className={cn(
                'text-xs',
                isOutbound ? 'text-primary-foreground/70' : 'text-muted-foreground'
              )}>
                {message.media_mime_type || 'Document'}
              </p>
            </div>
            {message.media_url && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => window.open(message.media_url!, '_blank')}
              >
                <Download className="h-4 w-4" />
              </Button>
            )}
          </div>
        );

      case 'location':
        if (hasLocation) {
          const mapUrl = `https://www.google.com/maps?q=${msgAny.location_lat},${msgAny.location_lng}`;
          
          return (
            <div className="space-y-2">
              <a 
                href={mapUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="block"
              >
                <div className="relative rounded-lg overflow-hidden bg-muted min-h-[120px] flex items-center justify-center">
                  <div className="absolute inset-0 flex items-center justify-center bg-primary/10">
                    <MapPin className="h-8 w-8 text-primary" />
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/50 to-transparent">
                    <p className="text-xs text-white flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {msgAny.location_lat.toFixed(4)}, {msgAny.location_lng.toFixed(4)}
                    </p>
                  </div>
                </div>
              </a>
              {message.content && (
                <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
              )}
            </div>
          );
        }
        return <p className="text-sm">📍 Location shared</p>;

      case 'sticker':
        return message.media_url ? (
          <img
            src={message.media_url}
            alt="Sticker"
            className="max-w-[150px] max-h-[150px]"
          />
        ) : null;

      case 'text':
      default:
        return (
          <p className="text-sm whitespace-pre-wrap break-words">
            {linkifyText(message.content || '', isOutbound ? 'text-blue-200 hover:underline break-all' : 'text-primary hover:underline break-all')}
          </p>
        );
    }
  };

  const bubbleContent = (
    <div
      className={cn(
        'flex group',
        isOutbound ? 'justify-end' : 'justify-start',
        selectionMode && 'cursor-pointer'
      )}
      onDoubleClick={handleDoubleClick}
      onClick={handleClick}
    >
      {/* Selection Checkbox */}
      {selectionMode && (
        <div className="flex items-center mr-2">
          <div
            className={cn(
              'h-5 w-5 rounded border-2 flex items-center justify-center transition-colors',
              isSelected
                ? 'bg-primary border-primary'
                : 'border-muted-foreground/50 bg-background'
            )}
          >
            {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
          </div>
        </div>
      )}

      {/* Select button for outbound - appears on left (to start multi-selection) */}
      {isOutbound && onSelect && !selectionMode && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity self-center mr-1"
          onClick={(e) => { e.stopPropagation(); handleStartSelection(); }}
          title="Select to forward multiple"
        >
          <Square className="h-4 w-4 text-muted-foreground" />
        </Button>
      )}

      {/* Forward button for outbound - appears on left */}
      {isOutbound && onForward && !selectionMode && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity self-center mr-1"
          onClick={(e) => { e.stopPropagation(); handleForwardSingle(); }}
        >
          <Forward className="h-4 w-4 text-muted-foreground" />
        </Button>
      )}

      {/* Reply button for outbound - appears on left */}
      {isOutbound && onReply && !selectionMode && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity self-center mr-2"
          onClick={(e) => { e.stopPropagation(); handleReply(); }}
        >
          <Reply className="h-4 w-4 text-muted-foreground" />
        </Button>
      )}

      <div
        className={cn(
          'max-w-[70%] rounded-2xl shadow-sm select-text',
          // Reduced padding for media messages, normal for text
          ['image', 'video', 'sticker'].includes(message.content_type)
            ? 'p-1'
            : 'px-4 py-2',
          isOutbound
            ? 'bg-primary text-primary-foreground rounded-br-md'
            : 'bg-card border border-border rounded-bl-md'
        )}
      >
        {/* Show who sent the message */}
        {isOutbound && (message.is_from_ai || isSyncedFromDevice || (message as any).sender_name) && (
          <div className={cn(
            'flex items-center gap-1 text-xs mb-1',
            isOutbound ? 'text-primary-foreground/70' : 'text-muted-foreground'
          )}>
            {message.is_from_ai ? (
              <>
                <Bot className="h-3 w-3" />
                <span>AI Response</span>
              </>
            ) : isSyncedFromDevice ? (
              <>
                <Smartphone className="h-3 w-3" />
                <span>Sent from device</span>
              </>
            ) : (message as any).sender_name ? (
              <>
                <User className="h-3 w-3" />
                <span>{(message as any).sender_name}</span>
              </>
            ) : null}
          </div>
        )}

        {/* Quoted message preview */}
        {quotedMessage && (
          <QuotedMessage 
            message={quotedMessage} 
            isOutbound={isOutbound}
            onClick={() => onQuotedClick?.(quotedMessage.id)}
          />
        )}

        {renderContent()}

        {showTimestamp && message.sent_at && (
          <div
            className={cn(
              'flex items-center justify-end gap-1.5 mt-1',
              isOutbound ? 'text-primary-foreground/70' : 'text-muted-foreground'
            )}
          >
            <span className="text-[10px]">
              {format(new Date(message.sent_at), 'HH:mm')}
            </span>
            {isOutbound && message.status && (
              <>
                {(message.status === 'delivered' || message.status === 'read') ? (
                  <CheckCheck
                    className={cn(
                      'h-4 w-4 transition-colors duration-200',
                      message.status === 'delivered' && 'text-primary-foreground',
                      message.status === 'read' && 'text-sky-400'
                    )}
                  />
                ) : message.status === 'pending' ? (
                  <Clock className="h-4 w-4 text-primary-foreground/50" />
                ) : message.status === 'failed' ? (
                  <Clock className="h-4 w-4 text-destructive" />
                ) : (
                  <Check className="h-4 w-4 text-primary-foreground/70" />
                )}
              </>
            )}
          </div>
        )}

        {/* Error message hidden - messages will auto-retry */}
      </div>

      {/* Reply button for inbound - appears on right */}
      {!isOutbound && onReply && !selectionMode && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity self-center ml-2"
          onClick={(e) => { e.stopPropagation(); handleReply(); }}
        >
          <Reply className="h-4 w-4 text-muted-foreground" />
        </Button>
      )}

      {/* Forward button for inbound - appears on right */}
      {!isOutbound && onForward && !selectionMode && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity self-center ml-1"
          onClick={(e) => { e.stopPropagation(); handleForwardSingle(); }}
        >
          <Forward className="h-4 w-4 text-muted-foreground" />
        </Button>
      )}

      {/* Select button for inbound - appears on right (to start multi-selection) */}
      {!isOutbound && onSelect && !selectionMode && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity self-center ml-1"
          onClick={(e) => { e.stopPropagation(); handleStartSelection(); }}
          title="Select to forward multiple"
        >
          <Square className="h-4 w-4 text-muted-foreground" />
        </Button>
      )}

      {/* Delete button - only for owners */}
      {canDelete && onDelete && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity self-center ml-1"
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Message</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this message? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => onDelete(message.id)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );

  // If reply handler is provided, wrap with swipeable
  if (onReply) {
    return (
      <SwipeableMessage 
        onSwipeReply={handleReply}
        direction={message.direction}
      >
        {bubbleContent}
      </SwipeableMessage>
    );
  }

  return bubbleContent;
}
