import { BusinessType } from '@/hooks/useBusinessTypes';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Warehouse, ShoppingBag, Briefcase, Settings } from 'lucide-react';

interface BusinessTypeTabsProps {
  businessTypes: BusinessType[];
  activeTab: string;
  onTabChange: (slug: string) => void;
  showSettings?: boolean;
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  warehouse: Warehouse,
  'shopping-bag': ShoppingBag,
  briefcase: Briefcase,
};

export function BusinessTypeTabs({
  businessTypes,
  activeTab,
  onTabChange,
  showSettings = true,
}: BusinessTypeTabsProps) {
  return (
    <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
      <TabsList className="w-full justify-start h-auto flex-wrap gap-1 bg-muted/50 p-1">
        {businessTypes.map((type) => {
          const IconComponent = ICON_MAP[type.icon || ''] || Briefcase;
          return (
            <TabsTrigger
              key={type.slug}
              value={type.slug}
              className="flex items-center gap-2 data-[state=active]:shadow-sm"
              style={{
                ['--tab-color' as string]: type.color,
              }}
            >
              <IconComponent className="h-4 w-4" />
              <span className="hidden sm:inline">{type.name}</span>
              <span className="sm:hidden">{type.name.split(' ')[0]}</span>
            </TabsTrigger>
          );
        })}
        {showSettings && (
          <TabsTrigger value="settings" className="flex items-center gap-2 ml-auto">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Settings</span>
          </TabsTrigger>
        )}
      </TabsList>
    </Tabs>
  );
}
