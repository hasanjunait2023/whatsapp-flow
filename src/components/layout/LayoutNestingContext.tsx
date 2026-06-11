import { createContext, useContext } from 'react';

/**
 * Prevents layouts from rendering twice when pages still wrap themselves
 * (e.g. <DashboardLayout> inside a route already wrapped by DashboardLayoutWrapper).
 */

const DashboardLayoutNestingContext = createContext(false);
export const DashboardLayoutNestingProvider = DashboardLayoutNestingContext.Provider;
export const useIsInsideDashboardLayout = () => useContext(DashboardLayoutNestingContext);

const AdminLayoutNestingContext = createContext(false);
export const AdminLayoutNestingProvider = AdminLayoutNestingContext.Provider;
export const useIsInsideAdminLayout = () => useContext(AdminLayoutNestingContext);
