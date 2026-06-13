import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { LayoutDashboard, Inbox, Users, ShoppingCart, MoreHorizontal } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Package,
  AlertTriangle,
  Smartphone,
  Zap,
  GitBranch,
  Bot,
  BarChart3,
  MessagesSquare,
  Building2,
  CreditCard,
  Settings,
  Calculator,
} from 'lucide-react';

interface NavItem {
  title: string;
  href: string;
  icon: React.ReactNode;
  badge?: number;
}

const mainNavItems: NavItem[] = [
  { title: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard className="h-5 w-5" /> },
  { title: 'Inbox', href: '/inbox', icon: <Inbox className="h-5 w-5" />, badge: 12 },
  { title: 'Contacts', href: '/contacts', icon: <Users className="h-5 w-5" /> },
  { title: 'Orders', href: '/orders', icon: <ShoppingCart className="h-5 w-5" /> },
];

const moreNavItems: NavItem[] = [
  { title: 'Products', href: '/products', icon: <Package className="h-5 w-5" /> },
  { title: 'Accounts', href: '/accounts', icon: <Calculator className="h-5 w-5" /> },
  { title: 'Complaints', href: '/complaints', icon: <AlertTriangle className="h-5 w-5" /> },
  { title: 'Instances', href: '/instances', icon: <Smartphone className="h-5 w-5" /> },
  { title: 'Automation', href: '/automation', icon: <Zap className="h-5 w-5" /> },
  { title: 'Workflows', href: '/workflows', icon: <GitBranch className="h-5 w-5" /> },
  { title: 'AI Agent', href: '/ai-agent', icon: <Bot className="h-5 w-5" /> },
  { title: 'Analytics', href: '/analytics', icon: <BarChart3 className="h-5 w-5" /> },
  { title: 'Team Chat', href: '/internal-chat', icon: <MessagesSquare className="h-5 w-5" /> },
  { title: 'Team', href: '/team', icon: <Building2 className="h-5 w-5" /> },
  { title: 'Billing', href: '/billing', icon: <CreditCard className="h-5 w-5" /> },
  { title: 'Settings', href: '/settings', icon: <Settings className="h-5 w-5" /> },
];

export default function MobileBottomNav() {
  const location = useLocation();

  // Check if current path matches any "more" items
  const isMoreActive = moreNavItems.some(item => location.pathname === item.href);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden glass border-t border-border safe-bottom">
      <div className="flex items-center justify-around h-16 px-2">
        {mainNavItems.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                'flex flex-col items-center justify-center flex-1 h-full py-2 relative touch-manipulation',
                isActive ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              <div className="relative">
                {item.icon}
                {item.badge && item.badge > 0 && (
                  <span className="absolute -top-1 -right-2 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-brand px-1 text-[10px] font-medium text-white">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] mt-1 font-medium">{item.title}</span>
              {isActive && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full" />
              )}
            </Link>
          );
        })}

        {/* More Menu */}
        <Sheet>
          <SheetTrigger asChild>
            <button
              className={cn(
                'flex flex-col items-center justify-center flex-1 h-full py-2 relative touch-manipulation',
                isMoreActive ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              <MoreHorizontal className="h-5 w-5" />
              <span className="text-[10px] mt-1 font-medium">More</span>
              {isMoreActive && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full" />
              )}
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[70vh] rounded-t-3xl">
            <SheetHeader className="pb-4">
              <SheetTitle>More Options</SheetTitle>
            </SheetHeader>
            <ScrollArea className="h-full pb-8">
              <div className="grid grid-cols-3 gap-4 px-2">
                {moreNavItems.map((item) => {
                  const isActive = location.pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      to={item.href}
                      className={cn(
                        'flex flex-col items-center justify-center gap-2 p-4 rounded-xl transition-colors touch-manipulation',
                        isActive 
                          ? 'bg-primary/10 text-primary' 
                          : 'bg-muted/50 text-foreground hover:bg-muted'
                      )}
                    >
                      {item.icon}
                      <span className="text-xs font-medium text-center">{item.title}</span>
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
