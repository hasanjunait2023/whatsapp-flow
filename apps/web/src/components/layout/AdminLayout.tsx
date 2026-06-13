import { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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
  ArrowLeft,
  ChevronDown,
  Search,
  Menu,
} from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AdminLayoutNestingProvider,
  useIsInsideAdminLayout,
} from './LayoutNestingContext';
import { BrandMark } from './shell/BrandMark';
import { TopPillNav } from './shell/TopPillNav';
import { IconRail } from './shell/IconRail';
import { SectionTabs } from './shell/SectionTabs';
import {
  ADMIN_SECTIONS,
  ADMIN_RAIL,
  getActiveSection,
  type RailItem,
  type Section,
  type SectionRoute,
} from './shell/sections';

interface AdminLayoutProps {
  children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const isNested = useIsInsideAdminLayout();
  if (isNested) return <>{children}</>;

  return <AdminLayoutInner>{children}</AdminLayoutInner>;
}

function AdminLayoutInner({ children }: AdminLayoutProps) {
  const { user, signOut } = useAuth();
  const { hasPermission } = useAdminPermissions();
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const activeSection = getActiveSection(ADMIN_SECTIONS, location.pathname);

  const canShowSection = (section: Section) =>
    !section.adminPerm || hasPermission(section.adminPerm);
  const canShowRoute = (route: SectionRoute) =>
    !route.adminPerm || hasPermission(route.adminPerm);
  const canShowRail = (item: RailItem) =>
    !item.adminPerm || hasPermission(item.adminPerm);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth/login');
  };

  const displayName = user?.user_metadata?.full_name || 'Admin';

  // Visible top sections (mobile drawer reuses the same model).
  const visibleSections = ADMIN_SECTIONS.filter(canShowSection);

  return (
    <AdminLayoutNestingProvider value={true}>
      <div className="h-screen bg-background md:p-3 lg:p-4">
        <div className="flex h-full flex-col overflow-hidden bg-card md:rounded-card md:border md:border-border md:shadow-elevation-1">
          {/* Sticky glass top bar — admin keeps the orange ADMIN ribbon identity. */}
          <header className="glass sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border px-3 sm:px-4 md:rounded-t-card">
            {/* Mobile: drawer trigger */}
            {isMobile && (
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="Menu">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[280px] bg-secondary p-0 text-secondary-foreground">
                  <SheetHeader className="border-b border-white/10 p-4">
                    <SheetTitle className="flex items-center gap-2 text-secondary-foreground">
                      <span className="grid h-8 w-8 place-items-center rounded-control bg-primary text-[9px] font-bold uppercase text-primary-foreground">
                        Adm
                      </span>
                      <span>Admin</span>
                    </SheetTitle>
                  </SheetHeader>
                  <ScrollArea className="h-[calc(100%-73px)]">
                    <nav className="space-y-1 p-3">
                      {visibleSections.map((section) => {
                        const active = section.id === activeSection.id;
                        const routes = (section.routes ?? []).filter(canShowRoute);
                        return (
                          <div key={section.id} className="space-y-1">
                            <Link
                              to={section.root}
                              className={cn(
                                'flex items-center gap-2 rounded-control px-3 py-2 text-sm font-semibold',
                                active
                                  ? 'bg-primary/15 text-primary'
                                  : 'text-secondary-foreground/80 hover:bg-white/5',
                              )}
                            >
                              {section.label}
                            </Link>
                            {active &&
                              routes.map((route) => (
                                <Link
                                  key={route.href}
                                  to={route.href}
                                  className={cn(
                                    'ml-3 block rounded-control px-3 py-1.5 text-sm',
                                    location.pathname === route.href
                                      ? 'text-primary'
                                      : 'text-secondary-foreground/60 hover:text-secondary-foreground',
                                  )}
                                >
                                  {route.label}
                                </Link>
                              ))}
                          </div>
                        );
                      })}
                      {ADMIN_RAIL.filter(canShowRail).map((item) => (
                        <Link
                          key={item.href}
                          to={item.href}
                          className="flex items-center gap-2 rounded-control px-3 py-2 text-sm text-secondary-foreground/70 hover:bg-white/5"
                        >
                          {item.icon}
                          {item.label}
                        </Link>
                      ))}
                    </nav>
                  </ScrollArea>
                </SheetContent>
              </Sheet>
            )}

            <BrandMark to="/admin" suffix="Admin" variant="tenant" />

            <div className="flex flex-1 justify-center">
              <TopPillNav
                sections={ADMIN_SECTIONS}
                activeId={activeSection.id}
                scope="admin"
                canShow={canShowSection}
              />
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2">
              <Button
                variant="ghost"
                size="icon"
                aria-label="Search"
                className="hidden sm:inline-flex text-muted-foreground"
              >
                <Search className="h-5 w-5" />
              </Button>
              <ThemeToggle variant="dropdown" size="sm" />

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="h-auto gap-2 rounded-full bg-muted px-2 py-1.5 hover:bg-muted/80"
                  >
                    <Avatar className="h-7 w-7">
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                        {displayName.charAt(0)?.toUpperCase() || 'A'}
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
                    <Link to="/admin/settings">
                      <Settings className="mr-2 h-4 w-4" />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/">
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Back to App
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          {/* Thin orange ADMIN ribbon — reinforces the distinct admin identity (§5.5). */}
          <div className="hidden h-7 items-center justify-center bg-primary text-[11px] font-bold uppercase tracking-[0.15em] text-primary-foreground md:flex">
            Admin
          </div>

          <div className="flex flex-1 overflow-hidden">
            {/* Near-black admin icon rail (§1.3 + §5.5). */}
            <IconRail
              items={ADMIN_RAIL}
              canShow={canShowRail}
              helpHref="/admin/settings"
              onSignOut={handleSignOut}
              variant="admin"
            />

            <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
              <SectionTabs section={activeSection} canShow={canShowRoute} />
              <main className="flex-1 overflow-auto">{children}</main>
            </div>
          </div>
        </div>
      </div>
    </AdminLayoutNestingProvider>
  );
}
