import { useTenantContext } from '@/contexts/TenantContext';

// Kept for backward compatibility: the entire app should use the shared tenant context.
export function useTenant() {
  return useTenantContext();
}

