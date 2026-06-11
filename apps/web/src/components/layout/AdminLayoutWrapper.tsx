import { Outlet } from 'react-router-dom';
import AdminProtectedRoute from '@/components/AdminProtectedRoute';
import AdminLayout from './AdminLayout';

/**
 * Wrapper component that combines AdminProtectedRoute with AdminLayout.
 * Uses Outlet to render nested routes, keeping the layout mounted during navigation.
 * This prevents sidebar scroll position reset and component remounting.
 */
export default function AdminLayoutWrapper() {
  return (
    <AdminProtectedRoute>
      <AdminLayout>
        <Outlet />
      </AdminLayout>
    </AdminProtectedRoute>
  );
}
