import { useRef, useState, useCallback, ReactNode } from 'react';
import { Reply } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SwipeableMessageProps {
  children: ReactNode;
  onSwipeReply: () => void;
  direction: 'inbound' | 'outbound';
}

export default function SwipeableMessage({ 
  children, 
  onSwipeReply,
  direction 
}: SwipeableMessageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [translateX, setTranslateX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startXRef = useRef(0);
  const currentXRef = useRef(0);

  const isOutbound = direction === 'outbound';
  const swipeThreshold = 60;
  const maxSwipe = 80;

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    startXRef.current = e.touches[0].clientX;
    currentXRef.current = e.touches[0].clientX;
    setIsDragging(true);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging) return;
    
    currentXRef.current = e.touches[0].clientX;
    const diff = currentXRef.current - startXRef.current;
    
    // For outbound (right side), swipe left to reply (negative diff)
    // For inbound (left side), swipe right to reply (positive diff)
    if (isOutbound) {
      // Allow swiping left only
      const newTranslate = Math.max(-maxSwipe, Math.min(0, diff));
      setTranslateX(newTranslate);
    } else {
      // Allow swiping right only
      const newTranslate = Math.min(maxSwipe, Math.max(0, diff));
      setTranslateX(newTranslate);
    }
  }, [isDragging, isOutbound]);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
    
    const shouldTrigger = isOutbound 
      ? translateX < -swipeThreshold 
      : translateX > swipeThreshold;

    if (shouldTrigger) {
      onSwipeReply();
    }
    
    setTranslateX(0);
  }, [translateX, isOutbound, onSwipeReply]);

  const showReplyIcon = isOutbound
    ? translateX < -20 
    : translateX > 20;

  const replyIconOpacity = isOutbound
    ? Math.min(1, Math.abs(translateX) / swipeThreshold)
    : Math.min(1, translateX / swipeThreshold);

  return (
    <div 
      ref={containerRef}
      className="relative select-text"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Reply icon indicator */}
      <div 
        className={cn(
          "absolute top-1/2 -translate-y-1/2 flex items-center justify-center transition-opacity",
          isOutbound ? "right-0" : "left-0",
          showReplyIcon ? "opacity-100" : "opacity-0"
        )}
        style={{ opacity: replyIconOpacity }}
      >
        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
          <Reply className="h-4 w-4 text-primary" />
        </div>
      </div>

      {/* Message content */}
      <div
        className={cn(
          "transition-transform",
          !isDragging && "duration-200"
        )}
        style={{ transform: `translateX(${translateX}px)` }}
      >
        {children}
      </div>
    </div>
  );
}
