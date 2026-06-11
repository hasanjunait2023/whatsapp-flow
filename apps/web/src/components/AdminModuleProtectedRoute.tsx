import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAdminPermissions, AdminPermissions } from '@/hooks/useAdminPermissions';
import { Loader2 } from 'lucide-react';

interface AdminModuleProtectedRouteProps {
  children: ReactNode;
  module: keyof AdminPermissions;
}

export default function AdminModuleProtectedRoute({ 
  children, 
  module 
}: AdminModuleProtectedRouteProps) {
  const { hasPermission, loading } = useAdminPermissions();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!hasPermission(module)) {
    return <Navigate to="/admin" replace />;
  }

  return <>{children}</>;
}
