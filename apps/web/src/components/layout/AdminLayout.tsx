import { ReactNode, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAdminPermissions, AdminPermissions } from '@/hooks/useAdminPermissions';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  Building2,
  CreditCard,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Shield,
  ArrowLeft,
  Receipt,
  Inbox,
  Layers,
  Users,
  Smartphone,
  FileText,
  Calculator,
  UserPlus,
  Crown,
  MessageSquare,
  MessagesSquare,
  Headphones,
  BarChart3,
  Menu,
  X,
  LayoutList,
  Zap,
} from 'lucide-react';
import { APP_NAME } from '@/config/branding';
import { ThemeToggle } from '@/components/ThemeToggle';
import {
  AdminLayoutNestingProvider,
  useIsInsideAdminLayout,
} from './LayoutNestingContext';

interface AdminLayoutProps {
  children: ReactNode;
}

interface NavItem {
  title: string;
  href: string;
  icon: ReactNode;
  permission?: keyof AdminPermissions;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const adminNavSections: NavSection[] = [
  {
    title: 'Main',
    items: [
      { title: 'Overview', href: '/admin', icon: <LayoutDashboard className="h-5 w-5" />, permission: 'dashboard' },
      { title: 'Inbox', href: '/admin/inbox', icon: <Inbox className="h-5 w-5" />, permission: 'communication' },
    ],
  },
  {
    title: 'Business',
    items: [
      { title: 'Tenants', href: '/admin/tenants', icon: <Building2 className="h-5 w-5" />, permission: 'tenants' },
      { title: 'Users', href: '/admin/users', icon: <Users className="h-5 w-5" />, permission: 'users' },
      { title: 'WhatsApp', href: '/admin/instances', icon: <Smartphone className="h-5 w-5" />, permission: 'instances' },
      { title: 'Communication', href: '/admin/communication', icon: <MessageSquare className="h-5 w-5" />, permission: 'communication' },
      { title: 'WA Functions', href: '/admin/whatsapp-functions', icon: <Zap className="h-5 w-5" />, permission: 'communication' },
    ],
  },
  {
    title: 'Support & Team',
    items: [
      { title: 'Support', href: '/admin/support', icon: <Headphones className="h-5 w-5" />, permission: 'support' },
      { title: 'Service Boards', href: '/admin/service-boards', icon: <LayoutList className="h-5 w-5" />, permission: 'support' },
      { title: 'Team Chat', href: '/admin/team-chat', icon: <MessagesSquare className="h-5 w-5" />, permission: 'team' },
      { title: 'Team', href: '/admin/team', icon: <Users className="h-5 w-5" />, permission: 'team' },
      { title: 'Reports', href: '/admin/reports', icon: <BarChart3 className="h-5 w-5" />, permission: 'reports' },
    ],
  },
  {
    title: 'Marketing',
    items: [
      { title: 'Campaigns', href: '/admin/marketing', icon: <UserPlus className="h-5 w-5" />, permission: 'leads' },
      { title: 'Leads', href: '/admin/leads', icon: <UserPlus className="h-5 w-5" />, permission: 'leads' },
    ],
  },
  {
    title: 'Finance',
    items: [
      { title: 'External Sales', href: '/admin/external-sales', icon: <Receipt className="h-5 w-5" />, permission: 'payments' },
      { title: 'Accounts', href: '/admin/accounts', icon: <Calculator className="h-5 w-5" />, permission: 'accounts' },
      { title: 'Payments', href: '/admin/payments', icon: <CreditCard className="h-5 w-5" />, permission: 'payments' },
      { title: 'Subscriptions', href: '/admin/subscriptions', icon: <CreditCard className="h-5 w-5" />, permission: 'subscriptions' },
      { title: 'Plans', href: '/admin/plans', icon: <Layers className="h-5 w-5" />, permission: 'plans' },
    ],
  },
  {
    title: 'System',
    items: [
      { title: 'Audit Logs', href: '/admin/audit-logs', icon: <FileText className="h-5 w-5" />, permission: 'audit_logs' },
      { title: 'Admin Management', href: '/admin/admin-management', icon: <Crown className="h-5 w-5" />, permission: 'admin_management' },
      { title: 'Settings', href: '/admin/settings', icon: <Settings className="h-5 w-5" />, permission: 'settings' },
    ],
  },
];

export default function AdminLayout({ children }: AdminLayoutProps) {
  const isNested = useIsInsideAdminLayout();
  if (isNested) return <>{children}</>;

  const [collapsed, setCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { user, signOut } = useAuth();
  const { hasPermission } = useAdminPermissions();
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  // Preserve sidebar scroll position across navigation.
  // ScrollArea uses an internal viewport element where scrollTop lives.
  const navScrollAreaRef = useRef<HTMLDivElement | null>(null);
  const getNavViewport = () =>
    (navScrollAreaRef.current?.querySelector(
      '[data-radix-scroll-area-viewport]'
    ) as HTMLElement | null) ?? null;

  useLayoutEffect(() => {
    const viewport = getNavViewport();
    if (!viewport) return;
    const raw = sessionStorage.getItem('admin_sidebar_nav_scroll_top');
    if (!raw) return;
    const value = Number(raw);
    if (Number.isFinite(value)) viewport.scrollTop = value;
  }, [location.pathname]);

  useEffect(() => {
    const viewport = getNavViewport();
    if (!viewport) return;

    let raf = 0;
    const onScroll = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        sessionStorage.setItem('admin_sidebar_nav_scroll_top', String(viewport.scrollTop));
      });
    };

    viewport.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      if (raf) cancelAnimationFrame(raf);
      viewport.removeEventListener('scroll', onScroll);
    };
  }, [location.pathname]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth/login');
  };

  // Navigation content - shared between desktop sidebar and mobile drawer
  const NavContent = ({ onItemClick }: { onItemClick?: () => void }) => (
    <>
      {/* Back to App */}
      <div className="p-3 border-b border-sidebar-border">
        <Link to="/" onClick={onItemClick}>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              'w-full justify-start text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent',
              collapsed && !isMobile && 'justify-center px-0'
            )}
          >
            <ArrowLeft className="h-4 w-4" />
            {(!collapsed || isMobile) && <span className="ml-2">Back to App</span>}
          </Button>
        </Link>
      </div>

      {/* Navigation */}
       <ScrollArea ref={navScrollAreaRef as any} className="flex-1">
        <nav className="p-3 space-y-4">
          {adminNavSections.map((section) => {
            const visibleItems = section.items.filter(item => 
              !item.permission || hasPermission(item.permission)
            );
            
            if (visibleItems.length === 0) return null;
            
            return (
              <div key={section.title}>
                {(!collapsed || isMobile) && (
                  <div className="px-3 py-1.5 text-xs font-semibold text-sidebar-muted uppercase tracking-wider">
                    {section.title}
                  </div>
                )}
                <div className="space-y-1">
                  {visibleItems.map((item) => {
                    const isActive = location.pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        to={item.href}
                        onClick={onItemClick}
                        className={cn(
                          // Inverted near-black admin rail; active = soft orange tint + 3px bar.
                          'relative flex items-center gap-3 rounded-control px-3 py-2 text-sm font-medium transition-colors',
                          isActive
                            ? 'bg-primary/15 text-primary'
                            : 'text-secondary-foreground/70 hover:bg-white/5 hover:text-secondary-foreground'
                        )}
                        aria-current={isActive ? 'page' : undefined}
                      >
                        {isActive && (
                          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 bg-primary rounded-r-full" />
                        )}
                        {item.icon}
                        {(!collapsed || isMobile) && <span className="flex-1">{item.title}</span>}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>
      </ScrollArea>

      {/* Collapse toggle - desktop only */}
      {!isMobile && (
        <div className="p-3 border-t border-sidebar-border">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCollapsed(!collapsed)}
            className="w-full justify-center text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent"
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <>
                <ChevronLeft className="h-4 w-4 mr-2" />
                <span>Collapse</span>
              </>
            )}
          </Button>
        </div>
      )}

      {/* User section */}
      <div className="p-3 border-t border-sidebar-border">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className={cn(
                'w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent',
                collapsed && !isMobile && 'justify-center px-0'
              )}
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src="" />
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                  {user?.email?.charAt(0).toUpperCase() || 'A'}
                </AvatarFallback>
              </Avatar>
              {(!collapsed || isMobile) && (
                <div className="ml-3 text-left overflow-hidden">
                  <p className="text-sm font-medium truncate">
                    {user?.user_metadata?.full_name || 'Admin'}
                  </p>
                  <p className="text-xs text-sidebar-muted truncate">
                    {user?.email}
                  </p>
                </div>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Admin Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/settings">
                <Settings className="mr-2 h-4 w-4" />
                Settings
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
    </>
  );

  return (
    <AdminLayoutNestingProvider value={true}>
      <div className="flex h-screen bg-background">
      {/* Mobile Header */}
      {isMobile && (
        <header className="fixed top-0 left-0 right-0 z-50 h-14 border-b bg-sidebar flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileNavOpen(true)}
              className="text-sidebar-foreground"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-control bg-primary flex items-center justify-center">
                <Shield className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-semibold text-sidebar-foreground">Admin</span>
            </div>
            <ThemeToggle size="sm" className="text-sidebar-foreground" />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="text-sidebar-foreground">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                    {user?.email?.charAt(0).toUpperCase() || 'A'}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                {user?.user_metadata?.full_name || 'Admin'}
                <p className="text-xs font-normal text-muted-foreground">{user?.email}</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/settings">
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
      )}

      {/* Mobile Navigation Drawer */}
      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="left" className="w-[280px] p-0 bg-sidebar border-sidebar-border">
          <SheetHeader className="p-4 border-b border-sidebar-border">
            <SheetTitle className="flex items-center gap-2 text-sidebar-foreground">
              <div className="h-8 w-8 rounded-control bg-primary flex items-center justify-center">
                <Shield className="h-4 w-4 text-primary-foreground" />
              </div>
              <div className="text-left flex-1">
                <p className="text-sm font-semibold">{APP_NAME} Admin</p>
                <p className="text-xs text-sidebar-muted font-normal">System Management</p>
              </div>
              <ThemeToggle size="sm" className="text-sidebar-foreground" />
            </SheetTitle>
          </SheetHeader>
          <div className="flex flex-col h-[calc(100%-73px)]">
            <NavContent onItemClick={() => setMobileNavOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>

      {/* Desktop Sidebar */}
      {!isMobile && (
        <aside
          className={cn(
            // Distinct near-black admin identity so staff never confuse it with the tenant panel (§5.5).
            'flex flex-col bg-secondary text-secondary-foreground border-r border-white/10 transition-all duration-300',
            collapsed ? 'w-[68px]' : 'w-[260px]'
          )}
        >
          {/* Header */}
          <div className="p-3 border-b border-white/10">
            <div
              className={cn(
                'flex items-center gap-2 px-2 py-2',
                collapsed && 'flex-col gap-3 px-0'
              )}
            >
              <div className="h-8 w-8 rounded-control bg-primary flex items-center justify-center flex-shrink-0">
                <Shield className="h-4 w-4 text-primary-foreground" />
              </div>
              {!collapsed && (
                <div className="text-left overflow-hidden flex-1">
                  <p className="text-sm font-semibold truncate text-secondary-foreground">
                    {APP_NAME} Admin
                  </p>
                  <p className="text-xs text-secondary-foreground/60 truncate">
                    System Management
                  </p>
                </div>
              )}
              <ThemeToggle size="sm" className="text-secondary-foreground hover:bg-white/10" />
            </div>
          </div>
          <NavContent />
        </aside>
      )}

      {/* Main content */}
      <div className={cn(
        'flex-1 flex flex-col overflow-hidden',
        isMobile && 'pt-14'
      )}>
        {/* Thin orange ADMIN ribbon — reinforces the distinct admin identity (§5.5). */}
        {!isMobile && (
          <div className="h-7 flex items-center justify-center bg-primary text-primary-foreground text-[11px] font-bold uppercase tracking-[0.15em]">
            Admin
          </div>
        )}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
      </div>
    </AdminLayoutNestingProvider>
  );
}
