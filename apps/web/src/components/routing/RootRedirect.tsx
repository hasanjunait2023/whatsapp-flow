import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

import { useAuth } from '@/hooks/useAuth';
import { useSystemAdmin } from '@/hooks/useSystemAdmin';
import { useTenant } from '@/hooks/useTenant';

/**
 * Chooses the correct landing page.
 * - Admins with tenants → /dashboard (they can access /admin from sidebar)
 * - Admins without tenants → /admin
 * - Regular users with tenants → /dashboard
 * - Not logged in → /auth/login
 */
export default function RootRedirect() {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useSystemAdmin();
  const { tenants, loading: tenantLoading } = useTenant();

  if (authLoading || adminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth/login" replace />;
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

  // Regular user without tenants → login page
  return <Navigate to="/auth/login" replace />;
}
