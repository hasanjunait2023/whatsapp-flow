import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Inbox,
  ShoppingCart,
  Receipt,
  MoreHorizontal,
  Building2,
  Settings,
  Facebook,
  UsersRound,
  Users,
  Package,
  Warehouse,
  AlertTriangle,
  CreditCard,
  FileBarChart,
  MessagesSquare,
  Kanban,
  Zap,
  BarChart3,
  Smartphone,
  Bot,
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TENANT_SECTIONS, getActiveSection } from './shell/sections';

interface TabItem {
  id: string;
  title: string;
  href: string;
  icon: React.ReactNode;
}

/**
 * Primary tabs mirror the top pill-nav's first 4 sections (DESIGN.md §4): Overview,
 * Inbox, Sales, Finance — then "More" opens the rest. Bottom tab bar replaces the
 * pill-nav + icon rail on mobile.
 */
const PRIMARY_TABS: TabItem[] = [
  { id: 'overview', title: 'Overview', href: '/dashboard', icon: <LayoutDashboard className="h-5 w-5" /> },
  { id: 'inbox', title: 'Inbox', href: '/inbox', icon: <Inbox className="h-5 w-5" /> },
  { id: 'sales', title: 'Sales', href: '/orders', icon: <ShoppingCart className="h-5 w-5" /> },
  { id: 'finance', title: 'Finance', href: '/accounts', icon: <Receipt className="h-5 w-5" /> },
];

/** Everything reachable from the icon rail + remaining section pages. */
const MORE_ITEMS: { title: string; href: string; icon: React.ReactNode }[] = [
  { title: 'Team', href: '/team', icon: <Building2 className="h-5 w-5" /> },
  { title: 'Settings', href: '/settings', icon: <Settings className="h-5 w-5" /> },
  { title: 'Facebook', href: '/fb-inbox', icon: <Facebook className="h-5 w-5" /> },
  { title: 'Groups', href: '/groups', icon: <UsersRound className="h-5 w-5" /> },
  { title: 'Contacts', href: '/contacts', icon: <Users className="h-5 w-5" /> },
  { title: 'WA Functions', href: '/whatsapp-functions', icon: <Zap className="h-5 w-5" /> },
  { title: 'Products', href: '/products', icon: <Package className="h-5 w-5" /> },
  { title: 'Inventory', href: '/inventory', icon: <Warehouse className="h-5 w-5" /> },
  { title: 'Complaints', href: '/complaints', icon: <AlertTriangle className="h-5 w-5" /> },
  { title: 'Billing', href: '/billing', icon: <CreditCard className="h-5 w-5" /> },
  { title: 'Reports', href: '/reports', icon: <FileBarChart className="h-5 w-5" /> },
  { title: 'Team Chat', href: '/internal-chat', icon: <MessagesSquare className="h-5 w-5" /> },
  { title: 'Service Boards', href: '/service/boards', icon: <Kanban className="h-5 w-5" /> },
  { title: 'Team Reports', href: '/team-reports', icon: <BarChart3 className="h-5 w-5" /> },
  { title: 'Automation', href: '/automation', icon: <Zap className="h-5 w-5" /> },
  { title: 'Workflows', href: '/workflows', icon: <Kanban className="h-5 w-5" /> },
  { title: 'AI Agent', href: '/ai-agent', icon: <Bot className="h-5 w-5" /> },
  { title: 'Analytics', href: '/analytics', icon: <BarChart3 className="h-5 w-5" /> },
  { title: 'Segmentation', href: '/segmentation', icon: <UsersRound className="h-5 w-5" /> },
  { title: 'Instances', href: '/instances', icon: <Smartphone className="h-5 w-5" /> },
  { title: 'Notifications', href: '/notifications', icon: <MessagesSquare className="h-5 w-5" /> },
];

export default function MobileBottomNav() {
  const { t } = useTranslation('nav');
  const location = useLocation();
  const activeSectionId = getActiveSection(TENANT_SECTIONS, location.pathname).id;
  const isMoreActive = !PRIMARY_TABS.some((tab) => tab.id === activeSectionId);

  return (
    <nav className="glass safe-bottom fixed bottom-0 left-0 right-0 z-50 border-t border-border md:hidden">
      <div className="flex h-16 items-center justify-around px-2">
        {PRIMARY_TABS.map((tab) => {
          const isActive = tab.id === activeSectionId;
          return (
            <Link
              key={tab.id}
              to={tab.href}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'relative flex h-full flex-1 touch-manipulation flex-col items-center justify-center py-2',
                isActive ? 'text-primary' : 'text-muted-foreground',
              )}
            >
              {tab.icon}
              <span className="mt-1 text-[10px] font-medium">{tab.title}</span>
              {isActive && (
                <span className="absolute top-0 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full bg-primary" />
              )}
            </Link>
          );
        })}

        <Sheet>
          <SheetTrigger asChild>
            <button
              type="button"
              className={cn(
                'relative flex h-full flex-1 touch-manipulation flex-col items-center justify-center py-2',
                isMoreActive ? 'text-primary' : 'text-muted-foreground',
              )}
            >
              <MoreHorizontal className="h-5 w-5" />
              <span className="mt-1 text-[10px] font-medium">{t('actions.more', { defaultValue: 'More' })}</span>
              {isMoreActive && (
                <span className="absolute top-0 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full bg-primary" />
              )}
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[70vh] rounded-t-card">
            <SheetHeader className="pb-4">
              <SheetTitle>{t('actions.more', { defaultValue: 'More' })}</SheetTitle>
            </SheetHeader>
            <ScrollArea className="h-full pb-8">
              <div className="grid grid-cols-3 gap-4 px-2">
                {MORE_ITEMS.map((item) => {
                  const isActive =
                    location.pathname === item.href ||
                    location.pathname.startsWith(item.href + '/');
                  return (
                    <Link
                      key={item.href}
                      to={item.href}
                      className={cn(
                        'flex touch-manipulation flex-col items-center justify-center gap-2 rounded-control p-4 transition-colors',
                        isActive
                          ? 'bg-primary/10 text-primary'
                          : 'bg-muted/50 text-foreground hover:bg-muted',
                      )}
                    >
                      {item.icon}
                      <span className="text-center text-xs font-medium">{item.title}</span>
                    </Link>
                  );
                })}
              </div>
            </ScrollArea>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}
