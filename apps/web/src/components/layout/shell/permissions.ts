/**
 * Tenant permission module keys (mirrors the routePermissionMap that DashboardLayout
 * already used). Centralised so the pill-nav, icon rail, and sub-tabs all filter
 * through the same contract via useTeamPermissions.
 */
export type ModuleKey =
  | 'inbox'
  | 'orders'
  | 'products'
  | 'contacts'
  | 'groups'
  | 'automation'
  | 'workflows'
  | 'analytics'
  | 'reports'
  | 'complaints'
  | 'accounts'
  | 'team'
  | 'settings'
  | 'fb_inbox'
  | 'ai_agent'
  | 'internal_chat'
  | 'service_boards';

/**
 * Build a permission predicate. Owners/managers see everything; everyone else is
 * gated by `canAccess`. A route with no `perm` is always allowed (e.g. Overview).
 */
export function makeCanShow(
  isOwnerOrManager: boolean,
  canAccess: (key: ModuleKey) => boolean,
): (perm?: ModuleKey) => boolean {
  return (perm?: ModuleKey) => {
    if (isOwnerOrManager) return true;
    if (!perm) return true;
    return canAccess(perm);
  };
}
