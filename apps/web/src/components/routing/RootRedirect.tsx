import { lazy, Suspense } from 'react';
import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

import { useAuth } from '@/hooks/useAuth';
import { useSystemAdmin } from '@/hooks/useSystemAdmin';
import { useTenant } from '@/hooks/useTenant';

// Code-split the marketing landing so its bundle/CSS never loads for authed users.
const Landing = lazy(() => import('@/pages/Landing'));

/**
 * Chooses what `/` renders.
 * - Not logged in → public marketing Landing page
 * - Admins with tenants → /dashboard (they can access /admin from sidebar)
 * - Admins without tenants → /admin
 * - Regular users with tenants → /dashboard
 * - Regular user without tenants → /auth/login
 */
export default function RootRedirect() {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useSystemAdmin();
  const { tenants, loading: tenantLoading } = useTenant();

  // While auth is resolving, render nothing heavy. Once resolved with no user we
  // show the Landing; we avoid blocking the public page on admin/tenant loads.
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Logged-out visitors get the marketing landing page at `/`.
  if (!user) {
    return (
      <Suspense fallback={<div className="min-h-screen bg-[#08080c]" />}>
        <Landing />
      </Suspense>
    );
  }

  // Authenticated below — wait for admin/tenant checks before deciding the redirect.
  if (adminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Wait for tenant data to load before deciding
  if (tenantLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading workspace...</p>
        </div>
      </div>
    );
  }

  // If user has tenants (admin or not), go to dashboard
  if (tenants.length > 0) {
    return <Navigate to="/dashboard" replace />;
  }

  // Admin without tenants → admin panel
  if (isAdmin) {
    return <Navigate to="/admin" replace />;
  }

  // Logged-in user without a tenant yet → onboarding (NOT login — that was a
  // dead-end loop). Onboarding creates their workspace + starts the 5-day trial.
  return <Navigate to="/onboarding" replace />;
}
