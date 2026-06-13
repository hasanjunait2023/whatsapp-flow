import { ReactNode, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FeatureTour } from '@/components/onboarding/FeatureTour';
import { useAuth } from '@/hooks/useAuth';
import { useTenant } from '@/hooks/useTenant';
import { useProfile } from '@/hooks/useProfile';
import { useSystemAdmin } from '@/hooks/useSystemAdmin';
import { useSidebarUnreadCounts } from '@/hooks/useSidebarUnreadCounts';
import { useDisconnectedInstances } from '@/hooks/useDisconnectedInstances';
import { useTeamPermissions } from '@/hooks/useTeamPermissions';
import { usePresence } from '@/hooks/usePresence';
import { cn } from '@/lib/utils';
import SuspensionBanner from '@/components/SuspensionBanner';
import { DemoBanner } from '@/components/DemoBanner';
import { DemoConversionPrompts } from '@/components/demo/DemoConversionPrompts';
import { DemoExitIntent } from '@/components/demo/DemoExitIntent';
import { DisconnectedInstancesBanner } from '@/components/DisconnectedInstancesBanner';
import MobileHeader from '@/components/layout/MobileHeader';
import MobileBottomNav from '@/components/layout/MobileBottomNav';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { NotificationCenter } from '@/components/notifications/NotificationCenter';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  LayoutDashboard,
  Inbox,
  Users,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Smartphone,
  Zap,
  Bot,
  CreditCard,
  BarChart3,
  HelpCircle,
  Building2,
  Check,
  Plus,
  ChevronsUpDown,
  Shield,
  GitBranch,
  Package,
  Warehouse,
  Receipt,
  ShoppingCart,
  AlertTriangle,
  MessagesSquare,
  Calculator,
  ChevronDown,
  Wrench,
  FileBarChart,
  UsersRound,
  Facebook,
  Target,
  Kanban,
} from 'lucide-react';
import logoImage from '@/assets/logo.png';
import {
  DashboardLayoutNestingProvider,
  useIsInsideDashboardLayout,
} from './LayoutNestingContext';
import { usePersistentScrollPosition } from '@/hooks/usePersistentScrollPosition';

type ModuleKey = 
  | 'inbox' | 'orders' | 'products' | 'contacts' | 'groups'
  | 'automation' | 'workflows' | 'analytics' | 'reports'
  | 'complaints' | 'accounts' | 'team' | 'settings'
  | 'fb_inbox' | 'ai_agent' | 'internal_chat' | 'service_boards';

interface DashboardLayoutProps {
  children: ReactNode;
  hideMobileNav?: boolean;
}

interface NavItem {
  titleKey: string;
  href: string;
  icon: ReactNode;
  badge?: number;
}

/** Time-of-day greeting prefix shown in the dashboard top bar. */
function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function DashboardLayout({ children, hideMobileNav }: DashboardLayoutProps) {
  const isNested = useIsInsideDashboardLayout();
  if (isNested) return <>{children}</>;

  return <DashboardLayoutInner hideMobileNav={hideMobileNav}>{children}</DashboardLayoutInner>;
}

function DashboardLayoutInner({ children, hideMobileNav }: DashboardLayoutProps) {
  const { t } = useTranslation('nav');
  const [collapsed, setCollapsed] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [teamWorkOpen, setTeamWorkOpen] = useState(false);
  const { user, signOut } = useAuth();
  const { currentTenant, tenants, switchTenant } = useTenant();
  const { profile } = useProfile();
  const { isAdmin } = useSystemAdmin();
  const { waUnreadCount, fbUnreadCount } = useSidebarUnreadCounts();
  const { disconnectedCount, hasDisconnected } = useDisconnectedInstances();
  const { canAccess, isOwnerOrManager } = useTeamPermissions();
  const { updatePresence } = usePresence();
  const location = useLocation();
  const navigate = useNavigate();

  const sidebarNavRef = usePersistentScrollPosition<HTMLElement>(
    'dashboard_sidebar_nav_scroll_top',
    [location.pathname]
  );

  // Track current page for presence — use stable IDs, not object refs
  useEffect(() => {
    if (currentTenant?.id && user?.id) {
      updatePresence('online', location.pathname);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, currentTenant?.id, user?.id]);

  // Permission-to-route mapping
  const routePermissionMap: Record<string, ModuleKey> = {
    '/inbox': 'inbox',
    '/fb-inbox': 'fb_inbox',
    '/contacts': 'contacts',
    '/products': 'products',
    '/orders': 'orders',
    '/complaints': 'complaints',
    '/groups': 'groups',
    '/accounts': 'accounts',
    '/automation': 'automation',
    '/workflows': 'workflows',
    '/ai-agent': 'ai_agent',
    '/analytics': 'analytics',
    '/reports': 'reports',
    '/team': 'team',
    '/team-reports': 'team',
    '/internal-chat': 'internal_chat',
    '/settings': 'settings',
    '/service/boards': 'service_boards',
  };

  // Filter nav items based on permissions
  const filterNavItems = (items: NavItem[]): NavItem[] => {
    if (isOwnerOrManager) return items;
    return items.filter(item => {
      const permKey = routePermissionMap[item.href];
      if (!permKey) return true; // Allow if no permission mapping
      return canAccess(permKey);
    });
  };

  // Core navigation - always visible
  const coreNavItems: NavItem[] = [
    { titleKey: 'main.dashboard', href: '/dashboard', icon: <LayoutDashboard className="h-5 w-5" /> },
  ];

  // Inbox & Contacts section
  const communicationNavItems: NavItem[] = [
    { titleKey: 'main.waInbox', href: '/inbox', icon: <Inbox className="h-5 w-5" />, badge: waUnreadCount || undefined },
    { titleKey: 'main.fbInbox', href: '/fb-inbox', icon: <Facebook className="h-5 w-5" />, badge: fbUnreadCount || undefined },
    { titleKey: 'main.contacts', href: '/contacts', icon: <Users className="h-5 w-5" /> },
    { titleKey: 'main.groups', href: '/groups', icon: <UsersRound className="h-5 w-5" /> },
    { titleKey: 'main.waFunctions', href: '/whatsapp-functions', icon: <Zap className="h-5 w-5" /> },
  ];

  // Sales & Operations section
  const salesNavItems: NavItem[] = [
    { titleKey: 'main.orders', href: '/orders', icon: <ShoppingCart className="h-5 w-5" /> },
    { titleKey: 'main.products', href: '/products', icon: <Package className="h-5 w-5" /> },
    { titleKey: 'main.inventory', href: '/inventory', icon: <Warehouse className="h-5 w-5" /> },
    { titleKey: 'main.complaints', href: '/complaints', icon: <AlertTriangle className="h-5 w-5" /> },
  ];

  // Finance section. Accounting consolidated onto /accounts (the full P&L /
  // cashflow / recurring-expense page) — the old simpler /accounting redirects here.
  const financeNavItems: NavItem[] = [
    { titleKey: 'main.accounting', href: '/accounts', icon: <Receipt className="h-5 w-5" /> },
    { titleKey: 'main.billing', href: '/billing', icon: <CreditCard className="h-5 w-5" /> },
  ];

  // Channels section - WhatsApp instances
  const channelsNavItems: NavItem[] = [
    { 
      titleKey: 'main.instances', 
      href: '/instances', 
      icon: hasDisconnected ? (
        <span className="relative">
          <Smartphone className="h-5 w-5" />
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-destructive"></span>
          </span>
        </span>
      ) : <Smartphone className="h-5 w-5" />,
      badge: hasDisconnected ? disconnectedCount : undefined
    },
  ];

  // AI & Automation section (collapsible)
  const toolsNavItems: NavItem[] = [
    { titleKey: 'tools.aiAgent', href: '/ai-agent', icon: <Bot className="h-5 w-5" /> },
    { titleKey: 'tools.automation', href: '/automation', icon: <Zap className="h-5 w-5" /> },
    { titleKey: 'tools.workflows', href: '/workflows', icon: <GitBranch className="h-5 w-5" /> },
    { titleKey: 'tools.segmentation', href: '/segmentation', icon: <Target className="h-5 w-5" /> },
    { titleKey: 'tools.analytics', href: '/analytics', icon: <BarChart3 className="h-5 w-5" /> },
  ];

  // Team section (collapsible)
  const teamWorkNavItems: NavItem[] = [
    { titleKey: 'teamWork.team', href: '/team', icon: <Building2 className="h-5 w-5" /> },
    { titleKey: 'teamWork.teamChat', href: '/internal-chat', icon: <MessagesSquare className="h-5 w-5" /> },
    { titleKey: 'teamWork.serviceBoards', href: '/service/boards', icon: <Kanban className="h-5 w-5" /> },
    { titleKey: 'teamWork.teamReports', href: '/team-reports', icon: <BarChart3 className="h-5 w-5" /> },
  ];

  // Filtered nav items based on permissions
  const filteredCoreNavItems = useMemo(() => filterNavItems(coreNavItems), [isOwnerOrManager, canAccess]);
  const filteredCommunicationNavItems = useMemo(() => filterNavItems(communicationNavItems), [isOwnerOrManager, canAccess, waUnreadCount, fbUnreadCount]);
  const filteredSalesNavItems = useMemo(() => filterNavItems(salesNavItems), [isOwnerOrManager, canAccess]);
  const filteredFinanceNavItems = useMemo(() => filterNavItems(financeNavItems), [isOwnerOrManager, canAccess]);
  const filteredChannelsNavItems = useMemo(() => filterNavItems(channelsNavItems), [isOwnerOrManager, canAccess, hasDisconnected, disconnectedCount]);
  const filteredToolsNavItems = useMemo(() => filterNavItems(toolsNavItems), [isOwnerOrManager, canAccess]);
  const filteredTeamWorkNavItems = useMemo(() => filterNavItems(teamWorkNavItems), [isOwnerOrManager, canAccess]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth/login');
  };

  // Check if any item in a group is active
  const isGroupActive = (items: NavItem[]) => 
    items.some(item => location.pathname === item.href);

  // Section Divider Component - Premium styling
  const SectionDivider = ({ label }: { label?: string }) => (
    <div className="py-2.5">
      {!collapsed && label ? (
        <div className="flex items-center gap-3 px-3">
          <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-primary/60">
            {label}
          </span>
          <div className="h-px flex-1 bg-gradient-to-r from-primary/20 via-sidebar-border/30 to-transparent" />
        </div>
      ) : (
        <div className="mx-3 h-px bg-gradient-to-r from-sidebar-border/50 via-sidebar-border/20 to-transparent" />
      )}
    </div>
  );

  const NavLink = ({ item }: { item: NavItem }) => {
    const isActive = location.pathname === item.href;
    return (
      <Link
        to={item.href}
        className={cn(
          // Soft orange tint active treatment (Finexy) — calm for all-day use, not a loud gradient.
          'group relative flex items-center gap-3 rounded-control px-3 py-2.5 text-sm font-medium transition-all duration-200',
          isActive
            ? 'bg-sidebar-accent text-sidebar-accent-foreground'
            : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
        )}
        aria-current={isActive ? 'page' : undefined}
      >
        {/* 3px orange left-edge bar marks the active item. */}
        {isActive && (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 bg-primary rounded-r-full" />
        )}
        <span className={cn(
          "relative transition-all duration-200 flex-shrink-0",
          isActive ? "text-primary" : "group-hover:text-primary"
        )}>
          {item.icon}
          {/* Badge for collapsed sidebar - show on icon */}
          {collapsed && item.badge && (
            <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white shadow-md ring-2 ring-sidebar">
              {item.badge > 99 ? '99+' : item.badge}
            </span>
          )}
        </span>
        {!collapsed && (
          <>
            <span className="flex-1 truncate">{t(item.titleKey)}</span>
            {item.badge && (
              <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white shadow-md animate-pulse">
                {item.badge > 99 ? '99+' : item.badge}
              </span>
            )}
          </>
        )}
      </Link>
    );
  };

  const CollapsibleNavSection = ({ 
    items, 
    titleKey, 
    icon,
    open,
    onOpenChange 
  }: { 
    items: NavItem[]; 
    titleKey: string;
    icon: ReactNode;
    open: boolean;
    onOpenChange: (open: boolean) => void;
  }) => {
    const hasActiveItem = isGroupActive(items);
    
    if (collapsed) {
      // When sidebar is collapsed, show just the icon with dropdown
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                'flex items-center justify-center w-full rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                hasActiveItem
                  ? 'bg-sidebar-primary/20 text-sidebar-primary-foreground'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              )}
            >
              {icon}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="right" align="start" className="w-48">
            <DropdownMenuLabel>{t(titleKey)}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {items.map((item) => (
              <DropdownMenuItem key={item.href} asChild>
                <Link to={item.href} className="flex items-center gap-2">
                  {item.icon}
                  <span>{t(item.titleKey)}</span>
                </Link>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      );
    }

    return (
      <Collapsible open={open} onOpenChange={onOpenChange}>
        <CollapsibleTrigger asChild>
          <button
            className={cn(
              'flex items-center gap-3 w-full rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
              hasActiveItem
                ? 'text-sidebar-primary-foreground'
                : 'text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
            )}
          >
            {icon}
            <span className="flex-1 text-left">{t(titleKey)}</span>
            <ChevronDown 
              className={cn(
                "h-4 w-4 transition-transform duration-200",
                open && "rotate-180"
              )} 
            />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pl-4 space-y-1 pt-1">
          {items.map((item) => (
            <NavLink key={item.href} item={item} />
          ))}
        </CollapsibleContent>
      </Collapsible>
    );
  };

  const NavSection = ({ items }: { items: NavItem[] }) => (
    <div className="space-y-1">
      {items.map((item) => (
        <NavLink key={item.href} item={item} />
      ))}
    </div>
  );

  return (
    <DashboardLayoutNestingProvider value={true}>
      <div className="flex h-screen bg-background">
      {/* Desktop Sidebar - Hidden on mobile */}
      <aside
        className={cn(
          'hidden md:flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300 shadow-elevation-1',
          collapsed ? 'w-[72px]' : 'w-[260px]'
        )}
      >
        {/* Workspace Switcher */}
        <div className="sticky top-0 z-10 p-3 border-b border-sidebar-border/30 bg-sidebar-accent/5">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className={cn(
                  'w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent h-auto py-2',
                  collapsed && 'justify-center px-0'
                )}
              >
                <Avatar className="h-8 w-8 rounded-lg flex-shrink-0">
                  <AvatarImage src={currentTenant?.logo_url || undefined} alt={currentTenant?.name} />
                  <AvatarFallback className="rounded-lg bg-brand text-brand-foreground p-1">
                    <img src={logoImage} alt="What A App" className="h-full w-full object-contain" />
                  </AvatarFallback>
                </Avatar>
                {!collapsed && (
                  <>
                    <div className="ml-2 text-left overflow-hidden flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">
                        {currentTenant?.name || t('workspace.selectWorkspace')}
                      </p>
                    </div>
                    <ChevronsUpDown className="h-4 w-4 text-sidebar-muted ml-1 flex-shrink-0" />
                  </>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuLabel>{t('workspace.title')}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {tenants.map((tenant) => (
                <DropdownMenuItem
                  key={tenant.tenant_id}
                  onClick={() => switchTenant(tenant.tenant_id)}
                  className="cursor-pointer"
                >
                  <Avatar className="h-6 w-6 rounded mr-2 flex-shrink-0">
                    <AvatarImage src={tenant.tenant.logo_url || undefined} alt={tenant.tenant.name} />
                    <AvatarFallback className="rounded bg-primary/10 text-primary text-xs">
                      {tenant.tenant.name?.charAt(0)?.toUpperCase() || 'W'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="flex-1">{tenant.tenant.name}</span>
                  {currentTenant?.id === tenant.tenant_id && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild className="cursor-pointer">
                <Link to="/onboarding">
                  <Plus className="h-4 w-4 mr-2" />
                  {t('workspace.createWorkspace')}
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Navigation */}
        <nav ref={sidebarNavRef} className="flex-1 overflow-y-auto p-3 scrollbar-thin space-y-1">
          {/* Dashboard - Always on top */}
          <NavSection items={filteredCoreNavItems} />

          <SectionDivider label="Inbox" />

          {/* Inbox & Contacts */}
          <NavSection items={filteredCommunicationNavItems} />

          <SectionDivider label="Sales" />

          {/* Sales & Operations */}
          <NavSection items={filteredSalesNavItems} />

          <SectionDivider label="Finance" />

          {/* Finance: Accounting (P&L/cashflow), Billing, Reports */}
          <div className="space-y-1">
            <NavSection items={filteredFinanceNavItems} />
            {(isOwnerOrManager || canAccess('reports')) && (
              <NavLink item={{ titleKey: 'main.reports', href: '/reports', icon: <FileBarChart className="h-5 w-5" /> }} />
            )}
          </div>

          <SectionDivider label="AI & Automation" />

          {/* Collapsible AI & Automation Section */}
          {filteredToolsNavItems.length > 0 && (
            <CollapsibleNavSection
              items={filteredToolsNavItems}
              titleKey="tools.title"
              icon={<Wrench className="h-5 w-5" />}
              open={toolsOpen}
              onOpenChange={setToolsOpen}
            />
          )}

          <SectionDivider label="Team" />

          {/* Collapsible Team Section */}
          {filteredTeamWorkNavItems.length > 0 && (
            <CollapsibleNavSection
              items={filteredTeamWorkNavItems}
              titleKey="teamWork.title"
              icon={<Users className="h-5 w-5" />}
              open={teamWorkOpen}
              onOpenChange={setTeamWorkOpen}
            />
          )}

          <SectionDivider label="Channels" />

          {/* Channels - WhatsApp instances (setup) */}
          <NavSection items={filteredChannelsNavItems} />

          <SectionDivider />

          {/* Settings - Direct Link */}
          {(isOwnerOrManager || canAccess('settings')) && (
            <NavLink item={{ titleKey: 'settings.settings', href: '/settings', icon: <Settings className="h-5 w-5" /> }} />
          )}
        </nav>

        {/* Collapse toggle - simplified */}
        <div className="p-2 border-t border-sidebar-border/30 bg-sidebar-accent/5">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCollapsed(!collapsed)}
            className="w-full justify-center text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent/80 rounded-lg transition-all duration-200 h-8"
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <div className="flex items-center gap-1">
                <ChevronLeft className="h-3 w-3" />
                <span className="text-xs">{t('actions.collapse')}</span>
              </div>
            )}
          </Button>
        </div>

        {/* User section */}
        <div className="p-3 border-t border-sidebar-border/30 bg-gradient-to-t from-sidebar-accent/10 to-transparent">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className={cn(
                  'w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent',
                  collapsed && 'justify-center px-0'
                )}
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.full_name || 'User'} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                    {profile?.full_name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                {!collapsed && (
                  <div className="ml-3 text-left overflow-hidden">
                    <p className="text-sm font-medium truncate">
                      {profile?.full_name || user?.user_metadata?.full_name || 'User'}
                    </p>
                    <p className="text-xs text-sidebar-muted truncate">
                      {user?.email}
                    </p>
                  </div>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>{t('user.myAccount')}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/settings/profile">
                  <Settings className="mr-2 h-4 w-4" />
                  {t('settings.settings')}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/help">
                  <HelpCircle className="mr-2 h-4 w-4" />
                  {t('user.helpSupport')}
                </Link>
              </DropdownMenuItem>
              {isAdmin && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/admin" className="text-destructive">
                      <Shield className="mr-2 h-4 w-4" />
                      {t('user.adminPanel')}
                    </Link>
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                {t('user.signOut')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden w-full">
        {/* Mobile Header */}
        <MobileHeader />
        
        {/* Sticky glass top bar — greeting/title slot on the left, controls on the right (§5.2). */}
        <div className="hidden md:flex glass sticky top-0 z-20 h-14 items-center justify-between gap-2 px-4">
          <div className="min-w-0">
            {location.pathname === '/dashboard' ? (
              <div className="leading-tight">
                <p className="text-base font-bold truncate text-foreground">
                  {t('greeting.hello', {
                    defaultValue: `${getGreeting()}, {{name}}`,
                    name: profile?.full_name?.split(' ')[0] || user?.user_metadata?.full_name?.split(' ')[0] || t('user.there', { defaultValue: 'there' }),
                  })}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {t('greeting.subtitle', { defaultValue: "Here's what's happening today" })}
                </p>
              </div>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <NotificationCenter />
            <ThemeToggle variant="dropdown" size="sm" />
            <LanguageSwitcher variant="ghost" size="sm" showLabel />
          </div>
        </div>
        
        <DemoBanner />
        <SuspensionBanner />
        <DisconnectedInstancesBanner />
        <main className={cn(
          "flex-1 overflow-auto",
          !hideMobileNav && "pb-16 md:pb-0"
        )}>
          {children}
        </main>
        {/* Mobile Bottom Nav */}
        {!hideMobileNav && <MobileBottomNav />}
      </div>
      
      {/* Global Feature Tour */}
      <FeatureTour />
      
      {/* Demo Conversion Components */}
      <DemoConversionPrompts />
      <DemoExitIntent />
      </div>
    </DashboardLayoutNestingProvider>
  );
}
