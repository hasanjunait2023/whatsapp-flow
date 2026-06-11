import { useState, useRef, useEffect } from 'react';
import { Send, X, Image, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { FBPostComment } from '@/hooks/useFBPostComments';

interface FBCommentInputProps {
  replyingTo: FBPostComment | null;
  onCancelReply: () => void;
  onSend: (message: string, attachmentUrl?: string) => Promise<void>;
  sending: boolean;
  placeholder?: string;
}

export function FBCommentInput({
  replyingTo,
  onCancelReply,
  onSend,
  sending,
  placeholder = 'Write a reply...',
}: FBCommentInputProps) {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Focus textarea when replying to someone
  useEffect(() => {
    if (replyingTo && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [replyingTo]);

  const handleSend = async () => {
    if (!message.trim() || sending) return;

    try {
      await onSend(message.trim());
      setMessage('');
    } catch {
      // Error handled in hook
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    if (e.key === 'Escape' && replyingTo) {
      onCancelReply();
    }
  };

  return (
    <div className="border-t border-border bg-background p-3">
      {/* Replying to indicator */}
      {replyingTo && (
        <div className="flex items-center gap-2 mb-2 px-1">
          <span className="text-xs text-muted-foreground">
            Replying to{' '}
            <span className="font-medium text-foreground">
              {replyingTo.commenter_name || 'someone'}
            </span>
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-5 w-5 p-0"
            onClick={onCancelReply}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      {/* Input area */}
      <div className="flex items-end gap-2">
        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className={cn(
              "min-h-[40px] max-h-32 resize-none pr-10",
              "scrollbar-thin scrollbar-thumb-muted"
            )}
            rows={1}
            disabled={sending}
          />
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            disabled={sending}
            title="Attach image"
          >
            <Image className="h-4 w-4" />
          </Button>

          <Button
            size="icon"
            className="h-9 w-9"
            onClick={handleSend}
            disabled={!message.trim() || sending}
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
