import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { useTenant } from '@/hooks/useTenant';
import { useProfile } from '@/hooks/useProfile';
import { useSystemAdmin } from '@/hooks/useSystemAdmin';
import { cn } from '@/lib/utils';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Menu,
  Settings,
  LogOut,
  HelpCircle,
  Shield,
  Check,
  Plus,
  ChevronsUpDown,
  LayoutDashboard,
  Inbox,
  Users,
  Package,
  ShoppingCart,
  AlertTriangle,
  Smartphone,
  Zap,
  GitBranch,
  Bot,
  BarChart3,
  MessagesSquare,
  Building2,
  CreditCard,
} from 'lucide-react';
import logoImage from '@/assets/logo.png';

interface NavItem {
  titleKey: string;
  href: string;
  icon: React.ReactNode;
  badge?: number;
}

export default function MobileHeader() {
  const { t } = useTranslation('nav');
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, signOut } = useAuth();
  const { currentTenant, tenants, switchTenant } = useTenant();
  const { profile } = useProfile();
  const { isAdmin } = useSystemAdmin();
  const location = useLocation();
  const navigate = useNavigate();

  const mainNavItems: NavItem[] = [
    { titleKey: 'main.dashboard', href: '/dashboard', icon: <LayoutDashboard className="h-5 w-5" /> },
    { titleKey: 'main.inbox', href: '/inbox', icon: <Inbox className="h-5 w-5" />, badge: 12 },
    { titleKey: 'main.contacts', href: '/contacts', icon: <Users className="h-5 w-5" /> },
    { titleKey: 'main.products', href: '/products', icon: <Package className="h-5 w-5" /> },
    { titleKey: 'main.orders', href: '/orders', icon: <ShoppingCart className="h-5 w-5" /> },
    { titleKey: 'main.complaints', href: '/complaints', icon: <AlertTriangle className="h-5 w-5" /> },
    { titleKey: 'main.instances', href: '/instances', icon: <Smartphone className="h-5 w-5" /> },
  ];

  const toolsNavItems: NavItem[] = [
    { titleKey: 'tools.automation', href: '/automation', icon: <Zap className="h-5 w-5" /> },
    { titleKey: 'tools.workflows', href: '/workflows', icon: <GitBranch className="h-5 w-5" /> },
    { titleKey: 'tools.aiAgent', href: '/ai-agent', icon: <Bot className="h-5 w-5" /> },
    { titleKey: 'tools.analytics', href: '/analytics', icon: <BarChart3 className="h-5 w-5" /> },
  ];

  const settingsNavItems: NavItem[] = [
    { titleKey: 'teamWork.teamChat', href: '/internal-chat', icon: <MessagesSquare className="h-5 w-5" /> },
    { titleKey: 'teamWork.team', href: '/team', icon: <Building2 className="h-5 w-5" /> },
    { titleKey: 'main.billing', href: '/billing', icon: <CreditCard className="h-5 w-5" /> },
    { titleKey: 'settings.settings', href: '/settings', icon: <Settings className="h-5 w-5" /> },
  ];

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth/login');
  };

  const handleNavClick = (href: string) => {
    setMenuOpen(false);
    navigate(href);
  };

  const NavSection = ({ items, titleKey }: { items: NavItem[]; titleKey?: string }) => (
    <div className="space-y-1">
      {titleKey && (
        <p className="px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {t(titleKey)}
        </p>
      )}
      {items.map((item) => {
        const isActive = location.pathname === item.href;
        return (
          <button
            key={item.href}
            onClick={() => handleNavClick(item.href)}
            className={cn(
              'w-full flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all touch-manipulation',
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'text-foreground hover:bg-accent'
            )}
          >
            <span className={cn(
              "transition-transform",
              isActive && "scale-110"
            )}>
              {item.icon}
            </span>
            <span className="flex-1 text-left">{t(item.titleKey)}</span>
            {item.badge && (
              <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-brand px-1.5 text-xs font-medium text-brand-foreground">
                {item.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );

  return (
    <header className="sticky top-0 z-40 md:hidden bg-card border-b border-border safe-top">
      <div className="flex items-center justify-between h-14 px-4">
        {/* Hamburger Menu */}
        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="h-10 w-10">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[300px] p-0">
            <SheetHeader className="p-4 border-b">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10 rounded-lg flex-shrink-0">
                  <AvatarImage src={currentTenant?.logo_url || undefined} alt={currentTenant?.name} />
                  <AvatarFallback className="rounded-lg bg-brand text-brand-foreground p-1">
                    <img src={logoImage} alt="Ecomex" className="h-full w-full object-contain" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <SheetTitle className="text-left truncate">{currentTenant?.name || t('workspace.selectWorkspace')}</SheetTitle>
                  <p className="text-xs text-muted-foreground">{t('workspace.freeTrial')}</p>
                </div>
              </div>
            </SheetHeader>
            
            <ScrollArea className="h-[calc(100vh-180px)]">
              <nav className="p-3 space-y-6">
                <NavSection items={mainNavItems} />
                <NavSection items={toolsNavItems} titleKey="tools.title" />
                <NavSection items={settingsNavItems} titleKey="settings.title" />
                
                {/* Theme & Language Switchers */}
                <div className="px-3 flex items-center gap-2">
                  <ThemeToggle variant="dropdown" size="sm" showLabel />
                  <LanguageSwitcher variant="outline" size="sm" showLabel className="flex-1 justify-start" />
                </div>
                
                {isAdmin && (
                  <>
                    <Separator />
                    <button
                      onClick={() => handleNavClick('/admin')}
                      className="w-full flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-destructive hover:bg-destructive/10 touch-manipulation"
                    >
                      <Shield className="h-5 w-5" />
                      <span>{t('user.adminPanel')}</span>
                    </button>
                  </>
                )}
              </nav>
            </ScrollArea>
            
            {/* Workspace Switcher at Bottom */}
            <div className="absolute bottom-0 left-0 right-0 border-t bg-card safe-bottom">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="w-full flex items-center gap-3 p-4 hover:bg-accent touch-manipulation">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.full_name || 'User'} />
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                        {profile?.full_name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 text-left min-w-0">
                      <p className="text-sm font-medium truncate">
                        {profile?.full_name || user?.user_metadata?.full_name || 'User'}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {user?.email}
                      </p>
                    </div>
                    <ChevronsUpDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-[268px]">
                  <DropdownMenuLabel>{t('workspace.switchWorkspace')}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {tenants.map((tenant) => (
                    <DropdownMenuItem
                      key={tenant.tenant_id}
                      onClick={() => {
                        switchTenant(tenant.tenant_id);
                        setMenuOpen(false);
                      }}
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
                  <DropdownMenuItem
                    onClick={() => {
                      setMenuOpen(false);
                      navigate('/onboarding');
                    }}
                    className="cursor-pointer"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {t('workspace.createWorkspace')}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="text-destructive cursor-pointer">
                    <LogOut className="h-4 w-4 mr-2" />
                    {t('user.signOut')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </SheetContent>
        </Sheet>

        {/* Center - Workspace Name */}
        <div className="flex items-center gap-2">
          <Avatar className="h-7 w-7 rounded-lg flex-shrink-0">
            <AvatarImage src={currentTenant?.logo_url || undefined} alt={currentTenant?.name} />
            <AvatarFallback className="rounded-lg bg-brand text-brand-foreground p-0.5">
              <img src={logoImage} alt="Ecomex" className="h-full w-full object-contain" />
            </AvatarFallback>
          </Avatar>
          <span className="font-semibold text-sm max-w-[140px] truncate">
            {currentTenant?.name || t('workspace.selectWorkspace')}
          </span>
        </div>

        {/* User Avatar */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-10 w-10">
              <Avatar className="h-8 w-8">
                <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.full_name || 'User'} />
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                  {profile?.full_name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span>{profile?.full_name || 'User'}</span>
                <span className="text-xs font-normal text-muted-foreground">{user?.email}</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/settings">
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
    </header>
  );
}
