/**
 * Utility to wrap async operations with error reporting
 * 
 * Usage:
 * const result = await withApiErrorReporting(
 *   async () => supabase.from('orders').select(),
 *   reportError,
 *   { action: 'fetch_orders' }
 * );
 */

type ErrorReporter = (
  error: Error | string,
  context?: {
    type?: 'api' | 'js' | 'network' | 'component' | 'validation' | 'unknown';
    component?: string;
    action?: string;
  }
) => void;

interface ErrorReportingOptions {
  action?: string;
  component?: string;
  rethrow?: boolean; // Default true - rethrows after reporting
  silent?: boolean; // If true, don't show any UI feedback
}

/**
 * Wraps an async API call with automatic error reporting
 */
export async function withApiErrorReporting<T>(
  operation: () => Promise<T>,
  reportError: ErrorReporter,
  options: ErrorReportingOptions = {}
): Promise<T | null> {
  const { action, component, rethrow = true } = options;

  try {
    return await operation();
  } catch (error) {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    
    // Report the error
    reportError(errorObj, {
      type: 'api',
      action,
      component
    });

    if (rethrow) {
      throw error;
    }
    return null;
  }
}

/**
 * Wraps a Supabase query response and reports if there's an error
 */
export function handleSupabaseError<T extends { error: any }>(
  result: T,
  reportError: ErrorReporter,
  options: ErrorReportingOptions = {}
): T {
  if (result.error) {
    const errorMessage = result.error.message || result.error.toString();
    
    reportError(errorMessage, {
      type: 'api',
      action: options.action,
      component: options.component
    });
  }
  return result;
}

/**
 * Creates a wrapped fetch function that reports network errors
 */
export function createReportingFetch(reportError: ErrorReporter) {
  return async function reportingFetch(
    input: RequestInfo | URL,
    init?: RequestInit,
    options?: ErrorReportingOptions
  ): Promise<Response> {
    try {
      const response = await fetch(input, init);
      
      // Report server errors (5xx)
      if (response.status >= 500) {
        const url = typeof input === 'string' ? input : input.toString();
        reportError(`Server error ${response.status} for ${url}`, {
          type: 'api',
          action: options?.action || url.split('/').pop()
        });
      }
      
      return response;
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      
      reportError(errorObj, {
        type: 'network',
        action: options?.action
      });
      
      throw error;
    }
  };
}

/**
 * Creates a wrapper for try-catch blocks in hooks
 * 
 * Usage in hooks:
 * const { reportError } = useErrorReporter();
 * const safeAsync = createSafeAsync(reportError);
 * 
 * const fetchData = async () => {
 *   await safeAsync(async () => {
 *     // your async code
 *   }, { action: 'fetch_data' });
 * };
 */
export function createSafeAsync(reportError: ErrorReporter) {
  return async function safeAsync<T>(
    operation: () => Promise<T>,
    options?: ErrorReportingOptions
  ): Promise<T | null> {
    try {
      return await operation();
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      
      reportError(errorObj, {
        type: 'unknown',
        action: options?.action,
        component: options?.component
      });
      
      if (options?.rethrow) {
        throw error;
      }
      return null;
    }
  };
}
