import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useSystemAdmin } from '@/hooks/useSystemAdmin';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

interface AdminProtectedRouteProps {
  children: ReactNode;
}

/**
 * Protected route for admin pages.
 * Admin users do NOT require a tenant to access admin pages.
 * This prevents the redirect loop: admin → dashboard → onboarding
 */
export default function AdminProtectedRoute({ children }: AdminProtectedRouteProps) {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useSystemAdmin();
  const location = useLocation();

  // Show loading while checking auth and admin status
  if (authLoading || adminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Verifying admin access...</p>
        </div>
      </div>
    );
  }

  // Not logged in - redirect to login
  if (!user) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  // Logged in but not admin - redirect to dashboard
  // Note: This may trigger ProtectedRoute's tenant check, which is expected
  // for regular users who accidentally navigate to admin URLs
  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  // User is authenticated AND is admin - render admin content
  // No tenant requirement for admin pages!
  return <>{children}</>;
}
