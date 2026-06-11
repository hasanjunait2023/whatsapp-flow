import { useState, useCallback, useRef, useEffect } from 'react';
import { usePresence } from './usePresence';

interface UseTypingIndicatorOptions {
  roomId: string | null;
  debounceMs?: number;
  timeoutMs?: number;
}

export function useTypingIndicator({ roomId, debounceMs = 300, timeoutMs = 3000 }: UseTypingIndicatorOptions) {
  const { setTyping, getTypingUsers } = usePresence();
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Start typing indicator
  const startTyping = useCallback(() => {
    if (!roomId) return;

    // Clear any existing debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Debounce the typing update
    debounceRef.current = setTimeout(() => {
      if (!isTyping) {
        setIsTyping(true);
        setTyping(roomId);
      }

      // Reset the timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Auto-stop typing after timeout
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
        setTyping(null);
      }, timeoutMs);
    }, debounceMs);
  }, [roomId, isTyping, setTyping, debounceMs, timeoutMs]);

  // Stop typing indicator
  const stopTyping = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    if (isTyping) {
      setIsTyping(false);
      setTyping(null);
    }
  }, [isTyping, setTyping]);

  // Get users currently typing in this room
  const typingUsers = roomId ? getTypingUsers(roomId) : [];

  // Cleanup on unmount or room change
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (isTyping) {
        setTyping(null);
      }
    };
  }, [roomId]);

  return {
    isTyping,
    startTyping,
    stopTyping,
    typingUsers,
  };
}
