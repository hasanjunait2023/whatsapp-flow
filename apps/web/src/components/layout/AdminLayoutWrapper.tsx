import { Outlet, useLocation } from 'react-router-dom';
import AdminProtectedRoute from '@/components/AdminProtectedRoute';
import AdminLayout from './AdminLayout';
import { GlobalErrorBoundary } from '@/components/GlobalErrorBoundary';

/**
 * Wrapper component that combines AdminProtectedRoute with AdminLayout.
 * Uses Outlet to render nested routes, keeping the layout mounted during navigation.
 * This prevents sidebar scroll position reset and component remounting.
 */
export default function AdminLayoutWrapper() {
  const { pathname } = useLocation();

  return (
    <AdminProtectedRoute>
      <AdminLayout>
        {/* Per-route error boundary, keyed by path so a crash on one admin page
            is contained (sidebar stays, user can navigate away) and resets when
            they move to another page — instead of white-screening the whole app. */}
        <GlobalErrorBoundary key={pathname}>
          <Outlet />
        </GlobalErrorBoundary>
      </AdminLayout>
    </AdminProtectedRoute>
  );
}
