import { FBMessage } from '@/hooks/useFBMessages';
import { linkifyText } from '@/lib/linkify';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Check, CheckCheck, Clock, AlertCircle, FileText, Mic, Bot } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface FBMessageBubbleProps {
  message: FBMessage;
  showTimestamp?: boolean;
}

function StatusIndicator({ message }: { message: FBMessage }) {
  const getStatusInfo = () => {
    switch (message.status) {
      case 'pending':
        return { icon: Clock, label: 'Sending...', className: 'text-blue-200' };
      case 'sent':
        return { icon: Check, label: 'Sent', className: 'text-blue-200' };
      case 'delivered':
        return { 
          icon: CheckCheck, 
          label: message.delivered_at 
            ? `Delivered ${format(new Date(message.delivered_at), 'HH:mm')}`
            : 'Delivered',
          className: 'text-blue-200' 
        };
      case 'read':
        return { 
          icon: CheckCheck, 
          label: message.read_at 
            ? `Read ${format(new Date(message.read_at), 'HH:mm')}`
            : 'Read',
          className: 'text-white' 
        };
      case 'failed':
        return { icon: AlertCircle, label: 'Failed to send', className: 'text-red-300' };
      default:
        return { icon: Check, label: 'Sent', className: 'text-blue-200' };
    }
  };

  const { icon: Icon, label, className } = getStatusInfo();

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Icon className={cn("h-3.5 w-3.5 cursor-help", className)} />
        </TooltipTrigger>
        <TooltipContent side="left" className="text-xs">
          {label}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default function FBMessageBubble({ message, showTimestamp = true }: FBMessageBubbleProps) {
  const isOutbound = message.direction === 'outbound';

  const renderContent = () => {
    switch (message.content_type) {
      case 'image':
        return (
          <div className="space-y-1">
            {message.media_url && (
              <img
                src={message.media_url}
                alt="Image"
                className="max-w-xs rounded-lg cursor-pointer hover:opacity-90"
                onClick={() => window.open(message.media_url!, '_blank')}
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
          <div className="space-y-1">
            {message.media_url && (
              <video
                src={message.media_url}
                controls
                className="max-w-xs rounded-lg"
              />
            )}
            {message.content && (
              <p className="text-sm whitespace-pre-wrap break-words">
                {linkifyText(message.content, isOutbound ? 'text-blue-200 hover:underline break-all' : 'text-primary hover:underline break-all')}
              </p>
            )}
          </div>
        );

      case 'audio':
        return (
          <div className="flex items-center gap-2">
            <Mic className="h-4 w-4 shrink-0" />
            {message.media_url ? (
              <audio src={message.media_url} controls className="max-w-[200px]" />
            ) : (
              <span className="text-sm">Voice message</span>
            )}
          </div>
        );

      case 'file':
        return (
          <a
            href={message.media_url || '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
          >
            <FileText className="h-5 w-5 shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">
                {message.media_filename || 'Document'}
              </p>
              <p className="text-xs text-muted-foreground">
                {message.media_mime_type || 'File'}
              </p>
            </div>
          </a>
        );

      default:
        return (
          <p className="text-sm whitespace-pre-wrap break-words">
            {linkifyText(message.content || '', isOutbound ? 'text-blue-200 hover:underline break-all' : 'text-primary hover:underline break-all')}
          </p>
        );
    }
  };

  return (
    <div
      className={cn(
        "flex w-full",
        isOutbound ? "justify-end" : "justify-start"
      )}
    >
      <div
        className={cn(
          "max-w-[75%] rounded-2xl px-4 py-2",
          isOutbound
            ? "bg-primary text-primary-foreground rounded-br-md"
            : "bg-muted rounded-bl-md"
        )}
      >
        {/* AI indicator */}
        {message.is_from_ai && (
          <div className={cn(
            "flex items-center gap-1 text-xs mb-1",
            isOutbound ? "text-primary-foreground/70" : "text-muted-foreground"
          )}>
            <Bot className="h-3 w-3" />
            <span>AI Agent</span>
          </div>
        )}

        {/* Content */}
        {renderContent()}

        {/* Timestamp & Status */}
        {showTimestamp && message.sent_at && (
          <div
            className={cn(
              "flex items-center justify-end gap-1.5 mt-1",
              isOutbound ? "text-primary-foreground/70" : "text-muted-foreground"
            )}
          >
            <span className="text-[10px]">
              {format(new Date(message.sent_at), 'HH:mm')}
            </span>
            {isOutbound && <StatusIndicator message={message} />}
          </div>
        )}

        {/* Error message */}
        {message.status === 'failed' && message.error_message && (
          <p className={cn(
            "text-xs mt-1",
            isOutbound ? "text-red-200" : "text-destructive"
          )}>
            {message.error_message}
          </p>
        )}
      </div>
    </div>
  );
}
