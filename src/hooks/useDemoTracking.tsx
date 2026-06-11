import { useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useDemoSession } from './useDemoSession';

const VISITED_PAGES_KEY = 'demo_visited_pages';
const SESSION_START_TIME_KEY = 'demo_start_time';

export type DemoEngagementStatus = 
  | 'demo_accessed'
  | 'engaged'
  | 'hot'
  | 'qualified'
  | 'ready_to_convert';

export function useDemoTracking() {
  const { isDemoTenant, sessionStart } = useDemoSession();
  const location = useLocation();
  const startTimeRef = useRef<number>(Date.now());

  // Track visited pages
  const trackPageVisit = useCallback((pathname: string) => {
    if (!isDemoTenant) return;

    const saved = localStorage.getItem(VISITED_PAGES_KEY);
    const visitedPages: string[] = saved ? JSON.parse(saved) : [];
    
    if (!visitedPages.includes(pathname)) {
      const updated = [...visitedPages, pathname];
      localStorage.setItem(VISITED_PAGES_KEY, JSON.stringify(updated));
    }
  }, [isDemoTenant]);

  // Get visited pages count
  const getVisitedPagesCount = useCallback(() => {
    const saved = localStorage.getItem(VISITED_PAGES_KEY);
    const visitedPages: string[] = saved ? JSON.parse(saved) : [];
    return visitedPages.length;
  }, []);

  // Get time spent in demo (in minutes)
  const getTimeSpent = useCallback(() => {
    return Math.floor((Date.now() - sessionStart) / 60000);
  }, [sessionStart]);

  // Calculate engagement status
  const getEngagementStatus = useCallback((): DemoEngagementStatus => {
    const pagesVisited = getVisitedPagesCount();
    const timeSpent = getTimeSpent();
    const saved = localStorage.getItem(VISITED_PAGES_KEY);
    const visitedPages: string[] = saved ? JSON.parse(saved) : [];
    
    // Check if billing page was visited
    const visitedBilling = visitedPages.includes('/billing');
    
    if (visitedBilling) {
      return 'hot';
    }
    
    if (timeSpent >= 5 && pagesVisited >= 5) {
      return 'qualified';
    }
    
    if (pagesVisited >= 3) {
      return 'engaged';
    }
    
    return 'demo_accessed';
  }, [getVisitedPagesCount, getTimeSpent]);

  // Track page visits on route change
  useEffect(() => {
    if (isDemoTenant) {
      trackPageVisit(location.pathname);
    }
  }, [location.pathname, isDemoTenant, trackPageVisit]);

  // Get engagement metrics
  const getEngagementMetrics = useCallback(() => {
    return {
      pagesVisited: getVisitedPagesCount(),
      timeSpentMinutes: getTimeSpent(),
      status: getEngagementStatus(),
    };
  }, [getVisitedPagesCount, getTimeSpent, getEngagementStatus]);

  // Reset tracking (for testing)
  const resetTracking = useCallback(() => {
    localStorage.removeItem(VISITED_PAGES_KEY);
  }, []);

  return {
    isDemoTenant,
    trackPageVisit,
    getVisitedPagesCount,
    getTimeSpent,
    getEngagementStatus,
    getEngagementMetrics,
    resetTracking,
  };
}
