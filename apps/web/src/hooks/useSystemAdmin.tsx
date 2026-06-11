import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

// Helper: race a promise against a timeout
function withTimeout<T>(promise: PromiseLike<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    Promise.resolve(promise),
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

export function useSystemAdmin() {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function checkAdminStatus() {
      // Wait for auth to finish loading first
      if (authLoading) {
        return;
      }

      if (!user) {
        setIsAdmin(false);
        setIsSuperAdmin(false);
        setLoading(false);
        return;
      }

      try {
        // Run both RPC calls in parallel with a 3s timeout each
        const fallbackResult = { data: false, error: null, count: null, status: 200, statusText: 'OK' } as const;
        const [adminResult, superResult] = await Promise.all([
          withTimeout(supabase.rpc('is_system_admin').then(r => r), 3000, fallbackResult),
          withTimeout(supabase.rpc('is_super_admin').then(r => r), 3000, fallbackResult),
        ]);

        if (cancelled) return;

        if (adminResult.error) {
          console.error('Error checking admin status:', adminResult.error);
        }
        if (superResult.error) {
          console.error('Error checking super admin status:', superResult.error);
        }

        setIsAdmin(adminResult.data === true);
        setIsSuperAdmin(superResult.data === true);
      } catch (err) {
        if (cancelled) return;
        console.error('Exception checking admin status:', err);
        setIsAdmin(false);
        setIsSuperAdmin(false);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    checkAdminStatus();

    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  return { isAdmin, isSuperAdmin, loading: loading || authLoading };
}
