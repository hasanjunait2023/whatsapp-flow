import { Outlet, matchPath, useLocation } from 'react-router-dom';
import ProtectedRoute from '@/components/ProtectedRoute';
import DashboardLayout from './DashboardLayout';
import { GlobalErrorBoundary } from '@/components/GlobalErrorBoundary';

/**
 * Wrapper component that combines ProtectedRoute with DashboardLayout.
 * Uses Outlet to render nested routes, keeping the layout mounted during navigation.
 * This prevents sidebar scroll position reset and component remounting.
 */
export default function DashboardLayoutWrapper() {
  const { pathname } = useLocation();

  // Some pages previously set hideMobileNav when they self-wrapped with DashboardLayout.
  // Now that layout is provided by the wrapper, we preserve the same behavior here.
  const hideMobileNav = Boolean(
    matchPath({ path: '/inbox', end: true }, pathname) ||
      matchPath({ path: '/fb-inbox', end: true }, pathname) ||
      matchPath({ path: '/internal-chat', end: true }, pathname) ||
      matchPath({ path: '/service/boards/:boardId' }, pathname)
  );

  return (
    <ProtectedRoute>
      <DashboardLayout hideMobileNav={hideMobileNav}>
        {/* Per-route error boundary, keyed by path so a crash on one page is
            contained (sidebar stays, user can navigate away) and resets when
            they move to another page — instead of white-screening the whole app. */}
        <GlobalErrorBoundary key={pathname}>
          <Outlet />
        </GlobalErrorBoundary>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
