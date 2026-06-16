import type { ReactNode } from 'react';
import {
  LayoutDashboard,
  Inbox,
  ShoppingCart,
  Receipt,
  Building2,
  Settings,
  UsersRound,
  Users,
  Zap,
  Package,
  CreditCard,
  FileBarChart,
  MessagesSquare,
  Kanban,
  BarChart3,
  Bot,
  Wrench,
  Workflow,
  Smartphone,
  Activity,
  Bell,
  Megaphone,
  ScrollText,
  Radio,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react';
import type { ModuleKey } from './permissions';
import type { AdminPermissions } from '@/hooks/useAdminPermissions';

/** Admin permission module key (subset of AdminPermissions). */
export type AdminModuleKey = keyof AdminPermissions;

/**
 * Shell IA model (DESIGN.md §1.5).
 *
 * A "section" is a PRIMARY top pill-nav entry. Its `root` is where the pill links,
 * and `routes` are every page that belongs to it (rendered as in-page sub-tabs so the
 * top-nav stays at 6 items while every existing route stays reachable). The pill-nav,
 * icon rail, and sub-tabs are pure PRESENTATIONS of the existing routes — no route is
 * added, removed, or changed here.
 */

export interface SectionRoute {
  /** i18n key (nav namespace) for the sub-tab label. */
  titleKey: string;
  /** Plain fallback label (used where i18n is not wired, e.g. admin). */
  label: string;
  href: string;
  /** Permission module gating this route (tenant only). */
  perm?: ModuleKey;
  /** Admin permission gating this route (admin shell only). */
  adminPerm?: AdminModuleKey;
}

export interface Section {
  id: string;
  titleKey: string;
  label: string;
  /** Pill links here + this route counts as the section root. */
  root: string;
  icon: LucideIcon;
  /** Admin permission gating the whole pill (admin shell only). */
  adminPerm?: AdminModuleKey;
  /** Sub-tab routes. Omitted/empty => no sub-tab row (single-page section). */
  routes?: SectionRoute[];
}

/** A quick-jump icon-rail target (a page NOT surfaced in the top pill-nav). */
export interface RailItem {
  titleKey: string;
  label: string;
  href: string;
  icon: ReactNode;
  perm?: ModuleKey;
  adminPerm?: AdminModuleKey;
}

// ---------------------------------------------------------------------------
// TENANT
// ---------------------------------------------------------------------------

export const TENANT_SECTIONS: Section[] = [
  {
    id: 'overview',
    titleKey: 'main.dashboard',
    label: 'Overview',
    root: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    id: 'inbox',
    titleKey: 'sections.inbox',
    label: 'Inbox',
    root: '/inbox',
    icon: Inbox,
    routes: [
      { titleKey: 'main.waInbox', label: 'WhatsApp', href: '/inbox', perm: 'inbox' },
      { titleKey: 'main.fbInbox', label: 'Facebook', href: '/fb-inbox', perm: 'fb_inbox' },
      { titleKey: 'main.groups', label: 'Groups', href: '/groups', perm: 'groups' },
      { titleKey: 'main.contacts', label: 'Contacts', href: '/contacts', perm: 'contacts' },
      { titleKey: 'main.waFunctions', label: 'Functions', href: '/whatsapp-functions', perm: 'inbox' },
      { titleKey: 'main.numberHealth', label: 'Number Health', href: '/number-health', perm: 'inbox' },
    ],
  },
  {
    id: 'sales',
    titleKey: 'sections.sales',
    label: 'Sales',
    root: '/orders',
    icon: ShoppingCart,
    routes: [
      { titleKey: 'main.orders', label: 'Orders', href: '/orders', perm: 'orders' },
      { titleKey: 'main.products', label: 'Products', href: '/products', perm: 'products' },
      { titleKey: 'main.inventory', label: 'Inventory', href: '/inventory', perm: 'products' },
      { titleKey: 'main.complaints', label: 'Complaints', href: '/complaints', perm: 'complaints' },
    ],
  },
  {
    id: 'finance',
    titleKey: 'sections.finance',
    label: 'Finance',
    root: '/accounts',
    icon: Receipt,
    routes: [
      { titleKey: 'main.accounting', label: 'Accounting', href: '/accounts', perm: 'accounts' },
      { titleKey: 'main.billing', label: 'Billing', href: '/billing' },
      { titleKey: 'main.reports', label: 'Reports', href: '/reports', perm: 'reports' },
    ],
  },
  {
    id: 'team',
    titleKey: 'sections.team',
    label: 'Team',
    root: '/team',
    icon: Users,
    routes: [
      { titleKey: 'teamWork.team', label: 'Team', href: '/team', perm: 'team' },
      { titleKey: 'teamWork.teamChat', label: 'Chat', href: '/internal-chat', perm: 'internal_chat' },
      { titleKey: 'teamWork.serviceBoards', label: 'Boards', href: '/service/boards', perm: 'service_boards' },
      { titleKey: 'teamWork.teamReports', label: 'Reports', href: '/team-reports', perm: 'team' },
    ],
  },
  {
    id: 'settings',
    titleKey: 'settings.settings',
    label: 'Settings',
    root: '/settings',
    icon: Settings,
  },
];

/**
 * Icon-rail quick-jump tools (DESIGN.md §1.3) — the deeper pages NOT in the top nav.
 * Nothing here duplicates a top pill; these are the "re-housed" tools.
 */
export const TENANT_RAIL: RailItem[] = [
  { titleKey: 'main.waFunctions', label: 'WhatsApp Functions', href: '/whatsapp-functions', icon: <Wrench className="h-5 w-5" />, perm: 'inbox' },
  { titleKey: 'tools.automation', label: 'Automation', href: '/automation', icon: <Zap className="h-5 w-5" />, perm: 'automation' },
  { titleKey: 'tools.workflows', label: 'Workflows', href: '/workflows', icon: <Workflow className="h-5 w-5" />, perm: 'workflows' },
  { titleKey: 'tools.aiAgent', label: 'AI Agent', href: '/ai-agent', icon: <Bot className="h-5 w-5" />, perm: 'ai_agent' },
  { titleKey: 'tools.analytics', label: 'Analytics', href: '/analytics', icon: <BarChart3 className="h-5 w-5" />, perm: 'analytics' },
  { titleKey: 'tools.segmentation', label: 'Segmentation', href: '/segmentation', icon: <UsersRound className="h-5 w-5" /> },
  { titleKey: 'teamWork.serviceBoards', label: 'Service Boards', href: '/service/boards', icon: <Kanban className="h-5 w-5" />, perm: 'service_boards' },
  { titleKey: 'main.instances', label: 'Instances', href: '/instances', icon: <Smartphone className="h-5 w-5" /> },
  { titleKey: 'main.numberHealth', label: 'Number Health', href: '/number-health', icon: <Activity className="h-5 w-5" />, perm: 'inbox' },
  { titleKey: 'main.notifications', label: 'Notifications', href: '/notifications', icon: <Bell className="h-5 w-5" /> },
];

// ---------------------------------------------------------------------------
// ADMIN
// ---------------------------------------------------------------------------

export const ADMIN_SECTIONS: Section[] = [
  {
    id: 'overview',
    titleKey: 'admin.overview',
    label: 'Overview',
    root: '/admin',
    icon: LayoutDashboard,
    adminPerm: 'dashboard',
    routes: [
      { titleKey: 'admin.overview', label: 'Overview', href: '/admin', adminPerm: 'dashboard' },
      { titleKey: 'admin.inbox', label: 'Inbox', href: '/admin/inbox', adminPerm: 'communication' },
      { titleKey: 'admin.communication', label: 'Communication', href: '/admin/communication', adminPerm: 'communication' },
    ],
  },
  {
    id: 'tenants',
    titleKey: 'admin.tenants',
    label: 'Tenants',
    root: '/admin/tenants',
    icon: Building2,
    adminPerm: 'tenants',
    routes: [
      { titleKey: 'admin.tenants', label: 'Tenants', href: '/admin/tenants', adminPerm: 'tenants' },
      { titleKey: 'admin.users', label: 'Users', href: '/admin/users', adminPerm: 'users' },
    ],
  },
  {
    id: 'billing',
    titleKey: 'admin.billing',
    label: 'Billing',
    root: '/admin/payments',
    icon: CreditCard,
    adminPerm: 'payments',
    routes: [
      { titleKey: 'admin.payments', label: 'Payments', href: '/admin/payments', adminPerm: 'payments' },
      { titleKey: 'admin.subscriptions', label: 'Subscriptions', href: '/admin/subscriptions', adminPerm: 'subscriptions' },
      { titleKey: 'admin.plans', label: 'Plans', href: '/admin/plans', adminPerm: 'plans' },
      { titleKey: 'admin.externalSales', label: 'External Sales', href: '/admin/external-sales', adminPerm: 'payments' },
      { titleKey: 'admin.accounts', label: 'Accounts', href: '/admin/accounts', adminPerm: 'accounts' },
    ],
  },
  {
    id: 'operations',
    titleKey: 'admin.operations',
    label: 'Operations',
    root: '/admin/instances',
    icon: Package,
    adminPerm: 'instances',
    routes: [
      { titleKey: 'admin.instances', label: 'WhatsApp', href: '/admin/instances', adminPerm: 'instances' },
      { titleKey: 'admin.waInstances', label: 'Instances', href: '/admin/whatsapp-instances', adminPerm: 'instances' },
      { titleKey: 'admin.waFunctions', label: 'WA Functions', href: '/admin/whatsapp-functions', adminPerm: 'communication' },
      { titleKey: 'admin.support', label: 'Support', href: '/admin/support', adminPerm: 'support' },
      { titleKey: 'admin.serviceBoards', label: 'Service Boards', href: '/admin/service-boards', adminPerm: 'support' },
    ],
  },
  {
    id: 'marketing',
    titleKey: 'admin.marketing',
    label: 'Marketing',
    root: '/admin/leads',
    icon: TrendingUp,
    adminPerm: 'leads',
    routes: [
      { titleKey: 'admin.leads', label: 'Leads', href: '/admin/leads', adminPerm: 'leads' },
      { titleKey: 'admin.campaigns', label: 'Campaigns', href: '/admin/marketing', adminPerm: 'leads' },
    ],
  },
  {
    id: 'settings',
    titleKey: 'admin.settings',
    label: 'Settings',
    root: '/admin/settings',
    icon: Settings,
    adminPerm: 'settings',
    routes: [
      { titleKey: 'admin.settings', label: 'Settings', href: '/admin/settings', adminPerm: 'settings' },
      { titleKey: 'admin.adminManagement', label: 'Admin Management', href: '/admin/admin-management', adminPerm: 'admin_management' },
      { titleKey: 'admin.auditLogs', label: 'Audit Logs', href: '/admin/audit-logs', adminPerm: 'audit_logs' },
    ],
  },
];

export const ADMIN_RAIL: RailItem[] = [
  { titleKey: 'admin.teamChat', label: 'Team Chat', href: '/admin/team-chat', icon: <MessagesSquare className="h-5 w-5" />, adminPerm: 'team' },
  { titleKey: 'admin.team', label: 'Team', href: '/admin/team', icon: <Users className="h-5 w-5" />, adminPerm: 'team' },
  { titleKey: 'admin.reports', label: 'Reports', href: '/admin/reports', icon: <FileBarChart className="h-5 w-5" />, adminPerm: 'reports' },
  { titleKey: 'admin.accounts', label: 'Accounts', href: '/admin/accounts', icon: <Receipt className="h-5 w-5" />, adminPerm: 'accounts' },
  { titleKey: 'admin.auditLogs', label: 'Audit Logs', href: '/admin/audit-logs', icon: <ScrollText className="h-5 w-5" />, adminPerm: 'audit_logs' },
  { titleKey: 'admin.communication', label: 'Communication', href: '/admin/communication', icon: <Radio className="h-5 w-5" />, adminPerm: 'communication' },
  { titleKey: 'admin.waFunctions', label: 'WA Functions', href: '/admin/whatsapp-functions', icon: <Wrench className="h-5 w-5" />, adminPerm: 'communication' },
  { titleKey: 'admin.inbox', label: 'Inbox', href: '/admin/inbox', icon: <Inbox className="h-5 w-5" />, adminPerm: 'communication' },
  { titleKey: 'admin.serviceBoards', label: 'Service Boards', href: '/admin/service-boards', icon: <Kanban className="h-5 w-5" />, adminPerm: 'support' },
];

/**
 * Detect the active section for a pathname (DESIGN.md §1.2: "active when the current
 * route belongs to it"). Longest-prefix match on `root` and on every sub-route `href`,
 * so e.g. /service/boards/:id still resolves to the Team section. Falls back to the
 * first section (Overview).
 */
export function getActiveSection(sections: Section[], pathname: string): Section {
  let best: { section: Section; len: number } | null = null;
  for (const section of sections) {
    const candidates = [section.root, ...(section.routes?.map((r) => r.href) ?? [])];
    for (const href of candidates) {
      const matches = pathname === href || pathname.startsWith(href + '/');
      if (matches && (!best || href.length > best.len)) {
        best = { section, len: href.length };
      }
    }
  }
  return best?.section ?? sections[0];
}
