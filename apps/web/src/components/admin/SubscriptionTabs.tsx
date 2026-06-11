import { useMemo } from 'react';
import { differenceInDays, isPast, isFuture } from 'date-fns';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, AlertTriangle, Snowflake, List } from 'lucide-react';

export type SubscriptionCategory = 'all' | 'active' | 'expiring' | 'redzone' | 'frozen';

// Define the minimal subscription type needed for categorization
export interface SubscriptionForTabs {
  id: string;
  status: string;
  current_period_end: string;
  [key: string]: any; // Allow additional properties
}

interface SubscriptionTabsProps {
  subscriptions: SubscriptionForTabs[];
  activeTab: SubscriptionCategory;
  onTabChange: (tab: SubscriptionCategory) => void;
}

export function useSubscriptionCategories(subscriptions: SubscriptionForTabs[]) {
  return useMemo(() => {
    const now = new Date();
    
    const categorized: Record<SubscriptionCategory, SubscriptionForTabs[]> = {
      all: subscriptions,
      active: [] as typeof subscriptions,
      expiring: [] as typeof subscriptions,
      redzone: [] as typeof subscriptions,
      frozen: [] as typeof subscriptions,
    };

    subscriptions.forEach((sub) => {
      const periodEnd = new Date(sub.current_period_end);
      const daysUntilExpiry = differenceInDays(periodEnd, now);

      // Frozen: Cancelled subscriptions
      if (sub.status === 'cancelled') {
        categorized.frozen.push(sub);
        return;
      }

      // Red Zone: Past due, suspended, or expired but not cancelled
      if (
        sub.status === 'past_due' ||
        sub.status === 'suspended' ||
        (sub.status === 'active' && isPast(periodEnd))
      ) {
        categorized.redzone.push(sub);
        return;
      }

      // Expiring Soon: 3 days or less until expiry
      if (
        (sub.status === 'active' || sub.status === 'trialing') &&
        isFuture(periodEnd) &&
        daysUntilExpiry <= 3
      ) {
        categorized.expiring.push(sub);
        return;
      }

      // Active: Healthy subscriptions with > 3 days left
      if (
        (sub.status === 'active' || sub.status === 'trialing') &&
        isFuture(periodEnd) &&
        daysUntilExpiry > 3
      ) {
        categorized.active.push(sub);
        return;
      }
    });

    return categorized;
  }, [subscriptions]);
}

export default function SubscriptionTabs({
  subscriptions,
  activeTab,
  onTabChange,
}: SubscriptionTabsProps) {
  const categories = useSubscriptionCategories(subscriptions);

  const tabs = [
    {
      value: 'all' as const,
      label: 'All',
      icon: <List className="h-4 w-4" />,
      count: categories.all.length,
      color: 'bg-muted text-muted-foreground',
    },
    {
      value: 'active' as const,
      label: 'Active',
      icon: <CheckCircle className="h-4 w-4" />,
      count: categories.active.length,
      color: 'bg-green-500/10 text-green-500',
    },
    {
      value: 'expiring' as const,
      label: 'Expiring Soon',
      icon: <Clock className="h-4 w-4" />,
      count: categories.expiring.length,
      color: 'bg-amber-500/10 text-amber-500',
    },
    {
      value: 'redzone' as const,
      label: 'Red Zone',
      icon: <AlertTriangle className="h-4 w-4" />,
      count: categories.redzone.length,
      color: 'bg-red-500/10 text-red-500',
    },
    {
      value: 'frozen' as const,
      label: 'Frozen',
      icon: <Snowflake className="h-4 w-4" />,
      count: categories.frozen.length,
      color: 'bg-gray-500/10 text-gray-500',
    },
  ];

  return (
    <Tabs value={activeTab} onValueChange={(v) => onTabChange(v as SubscriptionCategory)}>
      <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0 pb-2">
        <TabsList className="inline-flex min-w-max h-auto gap-2 bg-transparent p-0">
          {tabs.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-3 md:px-4 py-2 gap-1.5 md:gap-2 whitespace-nowrap"
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
              <Badge variant="secondary" className={tab.color}>
                {tab.count}
              </Badge>
            </TabsTrigger>
          ))}
        </TabsList>
      </div>
    </Tabs>
  );
}
