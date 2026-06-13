import { ReactNode, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FeatureTour } from '@/components/onboarding/FeatureTour';
import { useAuth } from '@/hooks/useAuth';
import { useTenant } from '@/hooks/useTenant';
import { useProfile } from '@/hooks/useProfile';
import { useSystemAdmin } from '@/hooks/useSystemAdmin';
import { useSidebarUnreadCounts } from '@/hooks/useSidebarUnreadCounts';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Settings,
  LogOut,
  HelpCircle,
  Check,
  Plus,
  ChevronsUpDown,
  Shield,
  ChevronDown,
  Search,
} from 'lucide-react';
import {
  DashboardLayoutNestingProvider,
  useIsInsideDashboardLayout,
} from './LayoutNestingContext';
import { BrandMark } from './shell/BrandMark';
import { TopPillNav } from './shell/TopPillNav';
import { IconRail } from './shell/IconRail';
import { SectionTabs } from './shell/SectionTabs';
import {
  TENANT_SECTIONS,
  TENANT_RAIL,
  getActiveSection,
  type RailItem,
} from './shell/sections';
import { makeCanShow, type ModuleKey } from './shell/permissions';

interface DashboardLayoutProps {
  children: ReactNode;
  hideMobileNav?: boolean;
}

export default function DashboardLayout({ children, hideMobileNav }: DashboardLayoutProps) {
  const isNested = useIsInsideDashboardLayout();
  if (isNested) return <>{children}</>;

  return <DashboardLayoutInner hideMobileNav={hideMobileNav}>{children}</DashboardLayoutInner>;
}

function DashboardLayoutInner({ children, hideMobileNav }: DashboardLayoutProps) {
  const { t } = useTranslation('nav');
  const { user, signOut } = useAuth();
  const { currentTenant, tenants, switchTenant } = useTenant();
  const { profile } = useProfile();
  const { isAdmin } = useSystemAdmin();
  const { waUnreadCount, fbUnreadCount } = useSidebarUnreadCounts();
  const { canAccess, isOwnerOrManager } = useTeamPermissions();
  const { updatePresence } = usePresence();
  const location = useLocation();
  const navigate = useNavigate();

  // Track current page for presence — use stable IDs, not object refs.
  useEffect(() => {
    if (currentTenant?.id && user?.id) {
      updatePresence('online', location.pathname);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, currentTenant?.id, user?.id]);

  const activeSection = getActiveSection(TENANT_SECTIONS, location.pathname);
  const canShow = makeCanShow(isOwnerOrManager, canAccess as (k: ModuleKey) => boolean);
  const canShowRail = (item: RailItem) => canShow(item.perm);

  // Unread badges (kept from the old labelled sidebar): surface on the Inbox pill +
  // its WhatsApp / Facebook sub-tabs.
  const totalInboxUnread = (waUnreadCount || 0) + (fbUnreadCount || 0);
  const sectionBadges: Record<string, number> = { inbox: totalInboxUnread };
  const subTabBadges: Record<string, number> = {
    '/inbox': waUnreadCount || 0,
    '/fb-inbox': fbUnreadCount || 0,
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth/login');
  };

  const displayName =
    profile?.full_name || user?.user_metadata?.full_name || t('user.there', { defaultValue: 'there' });

  return (
    <DashboardLayoutNestingProvider value={true}>
      {/* Cream gutter frame (DESIGN.md §1.1): the app sits on a rounded surface with a
          small cream gutter; full-bleed on mobile. */}
      <div className="h-screen bg-background md:p-3 lg:p-4">
        <div className="flex h-full flex-col overflow-hidden bg-card md:rounded-card md:border md:border-border md:shadow-elevation-1">
          {/* Sticky glass top bar (§1.2) */}
          <header className="glass sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border px-3 sm:px-4 md:rounded-t-card">
            <BrandMark to="/dashboard" />

            <div className="flex flex-1 justify-center">
              <TopPillNav
                sections={TENANT_SECTIONS}
                activeId={activeSection.id}
                scope="tenant"
                badges={sectionBadges}
              />
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2">
              {/* Search — no command palette is wired yet, so this is a labelled
                  placeholder (DESIGN.md §1.2 allows a no-op when none present). */}
              <Button
                variant="ghost"
                size="icon"
                aria-label={t('actions.search', { defaultValue: 'Search' })}
                className="hidden sm:inline-flex text-muted-foreground"
              >
                <Search className="h-5 w-5" />
              </Button>
              <NotificationCenter />
              <ThemeToggle variant="dropdown" size="sm" />
              <div className="hidden lg:block">
                <LanguageSwitcher variant="ghost" size="sm" showLabel />
              </div>

              {/* Profile chip → dropdown (§1.2 right cluster) */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="h-auto gap-2 rounded-full bg-muted px-2 py-1.5 hover:bg-muted/80"
                  >
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={profile?.avatar_url || undefined} alt={displayName} />
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                        {displayName.charAt(0)?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="hidden text-left leading-tight lg:block">
                      <p className="max-w-[140px] truncate text-sm font-medium text-foreground">
                        {displayName}
                      </p>
                      <p className="max-w-[140px] truncate text-xs text-muted-foreground">
                        {user?.email}
                      </p>
                    </div>
                    <ChevronDown className="hidden h-4 w-4 text-muted-foreground lg:block" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-60">
                  <DropdownMenuLabel className="leading-tight">
                    {displayName}
                    <p className="truncate text-xs font-normal text-muted-foreground">{user?.email}</p>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/settings/profile">
                      <Settings className="mr-2 h-4 w-4" />
                      {t('settings.settings')}
                    </Link>
                  </DropdownMenuItem>

                  {/* Workspace switcher (kept from the old rail) */}
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                    {t('workspace.title')}
                  </DropdownMenuLabel>
                  {tenants.map((tenant) => (
                    <DropdownMenuItem
                      key={tenant.tenant_id}
                      onClick={() => switchTenant(tenant.tenant_id)}
                      className="cursor-pointer"
                    >
                      <Avatar className="mr-2 h-6 w-6 rounded">
                        <AvatarImage src={tenant.tenant.logo_url || undefined} alt={tenant.tenant.name} />
                        <AvatarFallback className="rounded bg-primary/10 text-primary text-xs">
                          {tenant.tenant.name?.charAt(0)?.toUpperCase() || 'W'}
                        </AvatarFallback>
                      </Avatar>
                      <span className="flex-1 truncate">{tenant.tenant.name}</span>
                      {currentTenant?.id === tenant.tenant_id && (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuItem asChild className="cursor-pointer">
                    <Link to="/onboarding">
                      <Plus className="mr-2 h-4 w-4" />
                      {t('workspace.createWorkspace')}
                    </Link>
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/help">
                      <HelpCircle className="mr-2 h-4 w-4" />
                      {t('user.helpSupport')}
                    </Link>
                  </DropdownMenuItem>
                  {isAdmin && (
                    <DropdownMenuItem asChild>
                      <Link to="/admin" className="text-destructive">
                        <Shield className="mr-2 h-4 w-4" />
                        {t('user.adminPanel')}
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    {t('user.signOut')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          {/* Mobile header (below the glass bar replaces brand row on small screens) */}
          <div className="md:hidden">
            <MobileHeader />
          </div>

          <div className="flex flex-1 overflow-hidden">
            {/* Left icon rail (§1.3) — quick-jump tools not in the top nav. */}
            <IconRail
              items={TENANT_RAIL}
              canShow={canShowRail}
              helpHref="/help"
              onSignOut={handleSignOut}
              variant="tenant"
            />

            {/* Workspace switcher (compact, pinned above content for quick switch) */}
            <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
              <DemoBanner />
              <SuspensionBanner />
              <DisconnectedInstancesBanner />

              {/* Compact workspace switcher row (desktop) */}
              <div className="hidden md:flex items-center justify-between px-4 pt-3 sm:px-6 lg:px-8">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-9 gap-2 rounded-control px-2 text-sm">
                      <Avatar className="h-6 w-6 rounded">
                        <AvatarImage src={currentTenant?.logo_url || undefined} alt={currentTenant?.name} />
                        <AvatarFallback className="rounded bg-brand text-brand-foreground text-xs">
                          {currentTenant?.name?.charAt(0)?.toUpperCase() || 'W'}
                        </AvatarFallback>
                      </Avatar>
                      <span className="max-w-[180px] truncate font-medium">
                        {currentTenant?.name || t('workspace.selectWorkspace')}
                      </span>
                      <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
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
                        <Avatar className="mr-2 h-6 w-6 rounded">
                          <AvatarImage src={tenant.tenant.logo_url || undefined} alt={tenant.tenant.name} />
                          <AvatarFallback className="rounded bg-primary/10 text-primary text-xs">
                            {tenant.tenant.name?.charAt(0)?.toUpperCase() || 'W'}
                          </AvatarFallback>
                        </Avatar>
                        <span className="flex-1 truncate">{tenant.tenant.name}</span>
                        {currentTenant?.id === tenant.tenant_id && (
                          <Check className="h-4 w-4 text-primary" />
                        )}
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild className="cursor-pointer">
                      <Link to="/onboarding">
                        <Plus className="mr-2 h-4 w-4" />
                        {t('workspace.createWorkspace')}
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* In-page sub-tabs for the active section (§1.5) */}
              <SectionTabs
                section={activeSection}
                canShow={(route) => canShow(route.perm)}
                badges={subTabBadges}
              />

              <main
                className={cn(
                  'flex-1 overflow-auto',
                  !hideMobileNav && 'pb-16 md:pb-0',
                )}
              >
                {children}
              </main>
            </div>
          </div>

          {/* Mobile Bottom Nav */}
          {!hideMobileNav && <MobileBottomNav />}
        </div>
      </div>

      {/* Global Feature Tour + demo conversion components */}
      <FeatureTour />
      <DemoConversionPrompts />
      <DemoExitIntent />
    </DashboardLayoutNestingProvider>
  );
}
