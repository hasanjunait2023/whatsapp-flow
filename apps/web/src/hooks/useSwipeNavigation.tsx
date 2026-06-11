import { useRef, useState, useCallback } from 'react';

interface UseSwipeNavigationOptions {
  onSwipeRight?: () => void;
  onSwipeLeft?: () => void;
  threshold?: number;
  enabled?: boolean;
}

export function useSwipeNavigation({
  onSwipeRight,
  onSwipeLeft,
  threshold = 80,
  enabled = true,
}: UseSwipeNavigationOptions) {
  const [translateX, setTranslateX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const isHorizontalRef = useRef<boolean | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!enabled) return;
    startXRef.current = e.touches[0].clientX;
    startYRef.current = e.touches[0].clientY;
    isHorizontalRef.current = null;
    setIsDragging(true);
  }, [enabled]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!enabled || !isDragging) return;
    
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const diffX = currentX - startXRef.current;
    const diffY = currentY - startYRef.current;
    
    // Determine scroll direction on first move
    if (isHorizontalRef.current === null) {
      if (Math.abs(diffX) > 10 || Math.abs(diffY) > 10) {
        isHorizontalRef.current = Math.abs(diffX) > Math.abs(diffY);
      }
    }
    
    // Only handle horizontal swipes
    if (isHorizontalRef.current) {
      // Prevent vertical scrolling when swiping horizontally
      e.preventDefault();
      
      // Only allow swipe right (positive diff) for back navigation
      // Edge swipe from left side of screen
      if (startXRef.current < 50 && diffX > 0 && onSwipeRight) {
        const dampedTranslate = Math.min(150, diffX * 0.5);
        setTranslateX(dampedTranslate);
      }
    }
  }, [enabled, isDragging, onSwipeRight]);

  const handleTouchEnd = useCallback(() => {
    if (!enabled) return;
    setIsDragging(false);
    
    if (translateX > threshold && onSwipeRight) {
      onSwipeRight();
    }
    
    setTranslateX(0);
    isHorizontalRef.current = null;
  }, [enabled, translateX, threshold, onSwipeRight]);

  const swipeIndicatorOpacity = Math.min(1, translateX / threshold);
  const showSwipeIndicator = translateX > 20;

  return {
    translateX,
    isDragging,
    swipeIndicatorOpacity,
    showSwipeIndicator,
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
  };
}
