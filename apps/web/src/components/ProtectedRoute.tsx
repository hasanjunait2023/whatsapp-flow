import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useTenant } from '@/hooks/useTenant';
import { useSystemAdmin } from '@/hooks/useSystemAdmin';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
  requireTenant?: boolean;
  requireActivation?: boolean;
}

export default function ProtectedRoute({ 
  children, 
  requireTenant = true,
  requireActivation = true 
}: ProtectedRouteProps) {
  const { user, loading: authLoading } = useAuth();
  const { hasTenants, loading: tenantLoading, tenants, currentTenant } = useTenant();
  const { isAdmin, loading: adminLoading } = useSystemAdmin();
  const location = useLocation();

  // Show loading while auth/admin is checking
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
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  // Wait for tenant data to load before deciding to redirect
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

  // If tenant is required but user has none, redirect appropriately
  if (requireTenant && tenants.length === 0) {
    // System admins go to admin panel (they don't need a tenant)
    if (isAdmin) {
      return <Navigate to="/admin" replace />;
    }

    // Regular users without a tenant go to onboarding so they can create
    // their first workspace instead of bouncing back to /auth/login.
    // (This fixes the new-user-infinite-redirect-loop gap.)
    return <Navigate to="/onboarding" replace />;
  }

  // Check if tenant is activated (only if requireActivation is true)
  if (requireTenant && requireActivation && currentTenant && !currentTenant.is_activated) {
    return <Navigate to="/pending-activation" replace />;
  }

  return <>{children}</>;
}
