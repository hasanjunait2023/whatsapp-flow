import React, { createContext, useContext, useCallback, useRef, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ErrorContext {
  type?: 'api' | 'js' | 'network' | 'component' | 'validation' | 'unknown';
  component?: string;
  action?: string;
}

interface ErrorReportContextType {
  reportError: (error: Error | string, context?: ErrorContext) => void;
}

const ErrorReportContext = createContext<ErrorReportContextType | undefined>(undefined);

// Rate limiting constants
const MAX_ERRORS_PER_HOUR = 10;
const DEDUP_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

// Storage keys
const ERRORS_STORAGE_KEY = 'error_reporter_recent';
const ERROR_COUNT_KEY = 'error_reporter_count';
const ERROR_COUNT_RESET_KEY = 'error_reporter_reset';

interface StoredError {
  hash: string;
  timestamp: number;
}

function getErrorHash(message: string): string {
  // Simple hash for deduplication
  let hash = 0;
  for (let i = 0; i < message.length; i++) {
    const char = message.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(36);
}

function getBrowserInfo(): string {
  const ua = navigator.userAgent;
  let browser = 'Unknown';
  let os = 'Unknown';

  // Detect browser
  if (ua.includes('Chrome') && !ua.includes('Edg')) browser = 'Chrome';
  else if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';
  else if (ua.includes('Edg')) browser = 'Edge';

  // Detect OS
  if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Mac')) os = 'macOS';
  else if (ua.includes('Linux')) os = 'Linux';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';

  return `${browser} / ${os}`;
}

function getSource(): 'tenant' | 'admin' | 'public' {
  const path = window.location.pathname;
  if (path.startsWith('/admin')) return 'admin';
  if (path.startsWith('/auth') || path === '/') return 'public';
  return 'tenant';
}

export function ErrorReportProvider({ children }: { children: ReactNode }) {
  const isReportingRef = useRef(false);

  const reportError = useCallback(async (error: Error | string, context?: ErrorContext) => {
    // Prevent recursive error reporting
    if (isReportingRef.current) {
      console.warn('Error reporting skipped: already reporting');
      return;
    }

    try {
      const errorMessage = typeof error === 'string' ? error : error.message;
      const errorStack = typeof error === 'object' ? error.stack : undefined;

      // Skip empty errors
      if (!errorMessage || errorMessage.trim() === '') return;

      // Skip certain non-critical errors
      const skipPatterns = [
        'ResizeObserver loop',
        'Script error',
        'Network request failed',
        'Failed to fetch', // Often temporary
        'Load failed',
        'cancelled',
        'AbortError'
      ];
      
      if (skipPatterns.some(pattern => errorMessage.includes(pattern))) {
        console.log('Error skipped (non-critical):', errorMessage.substring(0, 50));
        return;
      }

      // Deduplication check
      const errorHash = getErrorHash(errorMessage);
      const now = Date.now();
      
      try {
        const storedErrorsJson = sessionStorage.getItem(ERRORS_STORAGE_KEY);
        const storedErrors: StoredError[] = storedErrorsJson ? JSON.parse(storedErrorsJson) : [];
        
        // Clean old errors and check for duplicates
        const recentErrors = storedErrors.filter(e => now - e.timestamp < DEDUP_WINDOW_MS);
        const isDuplicate = recentErrors.some(e => e.hash === errorHash);
        
        if (isDuplicate) {
          console.log('Duplicate error skipped:', errorMessage.substring(0, 50));
          return;
        }

        // Rate limiting check
        const countResetTime = parseInt(sessionStorage.getItem(ERROR_COUNT_RESET_KEY) || '0');
        let errorCount = parseInt(sessionStorage.getItem(ERROR_COUNT_KEY) || '0');
        
        if (now - countResetTime > 60 * 60 * 1000) {
          // Reset hourly counter
          errorCount = 0;
          sessionStorage.setItem(ERROR_COUNT_RESET_KEY, now.toString());
        }

        if (errorCount >= MAX_ERRORS_PER_HOUR) {
          console.log('Rate limit reached, error not reported');
          return;
        }

        // Update storage
        recentErrors.push({ hash: errorHash, timestamp: now });
        sessionStorage.setItem(ERRORS_STORAGE_KEY, JSON.stringify(recentErrors));
        sessionStorage.setItem(ERROR_COUNT_KEY, (errorCount + 1).toString());
      } catch (storageError) {
        // Storage might be full or disabled - continue anyway
        console.warn('Storage error in error reporter:', storageError);
      }

      isReportingRef.current = true;

      // Get current user and tenant context
      const { data: { session } } = await supabase.auth.getSession();
      
      // Try to get tenant_id from localStorage or context
      let tenantId: string | undefined;
      try {
        const selectedTenantJson = localStorage.getItem('selectedTenantId');
        if (selectedTenantJson) {
          tenantId = selectedTenantJson.replace(/"/g, '');
        }
      } catch {
        // Ignore
      }

      const payload = {
        source: getSource(),
        tenant_id: tenantId,
        user_id: session?.user?.id,
        user_email: session?.user?.email,
        error_message: errorMessage.substring(0, 1000), // Limit message size
        error_stack: errorStack?.substring(0, 2000), // Limit stack size
        error_type: context?.type || 'unknown',
        page_url: window.location.pathname,
        component_name: context?.component,
        browser_info: getBrowserInfo(),
        user_action: context?.action
      };

      // Fire and forget - don't await, don't block
      fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/report-system-error`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify(payload)
      }).catch(err => {
        // Silent fail - don't crash the app because of error reporting
        console.warn('Failed to report error:', err);
      });

    } catch (reportingError) {
      // Never let error reporting crash the app
      console.error('Error in error reporter:', reportingError);
    } finally {
      isReportingRef.current = false;
    }
  }, []);

  return (
    <ErrorReportContext.Provider value={{ reportError }}>
      {children}
    </ErrorReportContext.Provider>
  );
}

export function useErrorReporter() {
  const context = useContext(ErrorReportContext);
  if (!context) {
    // Return a no-op if used outside provider (for safety)
    return {
      reportError: () => {
        console.warn('useErrorReporter used outside of ErrorReportProvider');
      }
    };
  }
  return context;
}
