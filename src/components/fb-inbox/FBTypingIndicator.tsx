import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface FBTypingIndicatorProps {
  typingAt: string | null;
  contactName: string;
  className?: string;
}

const TYPING_TIMEOUT_MS = 10000; // 10 seconds auto-expiry

export default function FBTypingIndicator({ 
  typingAt, 
  contactName,
  className 
}: FBTypingIndicatorProps) {
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    if (!typingAt) {
      setIsTyping(false);
      return;
    }

    const typingTime = new Date(typingAt).getTime();
    const now = Date.now();
    const elapsed = now - typingTime;

    // If typing indicator is older than timeout, don't show
    if (elapsed > TYPING_TIMEOUT_MS) {
      setIsTyping(false);
      return;
    }

    setIsTyping(true);

    // Set timeout to auto-expire the typing indicator
    const remainingTime = TYPING_TIMEOUT_MS - elapsed;
    const timeout = setTimeout(() => {
      setIsTyping(false);
    }, remainingTime);

    return () => clearTimeout(timeout);
  }, [typingAt]);

  if (!isTyping) return null;

  return (
    <div className={cn("flex items-center gap-2 px-4 py-2", className)}>
      <div className="flex items-center gap-1 bg-muted rounded-full px-3 py-2">
        <div className="flex gap-1">
          <span 
            className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce"
            style={{ animationDelay: '0ms' }}
          />
          <span 
            className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce"
            style={{ animationDelay: '150ms' }}
          />
          <span 
            className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce"
            style={{ animationDelay: '300ms' }}
          />
        </div>
      </div>
      <span className="text-xs text-muted-foreground">
        {contactName} is typing...
      </span>
    </div>
  );
}
