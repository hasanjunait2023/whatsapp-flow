import { useState, useEffect, useCallback } from 'react';
import { useTenant } from '@/hooks/useTenant';

const DEMO_TENANT_ID = '00000000-0000-0000-0000-000000000001';
const DEMO_SESSION_KEY = 'demo_session_start';
const DEMO_SESSION_DURATION = 30 * 60 * 1000; // 30 minutes in milliseconds

export function useDemoSession() {
  const { currentTenant } = useTenant();
  const isDemoTenant = currentTenant?.id === DEMO_TENANT_ID;

  const [sessionStart, setSessionStart] = useState<number>(() => {
    if (typeof window === 'undefined') return Date.now();
    const saved = localStorage.getItem(DEMO_SESSION_KEY);
    if (saved) {
      return parseInt(saved, 10);
    }
    const now = Date.now();
    localStorage.setItem(DEMO_SESSION_KEY, now.toString());
    return now;
  });

  const [timeRemaining, setTimeRemaining] = useState<number>(
    Math.max(0, DEMO_SESSION_DURATION - (Date.now() - sessionStart))
  );

  useEffect(() => {
    if (!isDemoTenant) return;

    const interval = setInterval(() => {
      const remaining = Math.max(0, DEMO_SESSION_DURATION - (Date.now() - sessionStart));
      setTimeRemaining(remaining);
    }, 1000);

    return () => clearInterval(interval);
  }, [sessionStart, isDemoTenant]);

  const resetSession = useCallback(() => {
    const now = Date.now();
    localStorage.setItem(DEMO_SESSION_KEY, now.toString());
    setSessionStart(now);
    setTimeRemaining(DEMO_SESSION_DURATION);
  }, []);

  const formatTime = useCallback((ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, []);

  return {
    isDemoTenant,
    sessionStart,
    timeRemaining,
    formattedTime: formatTime(timeRemaining),
    resetSession,
    isSessionExpired: timeRemaining <= 0,
    sessionProgress: Math.min(100, ((DEMO_SESSION_DURATION - timeRemaining) / DEMO_SESSION_DURATION) * 100),
  };
}
