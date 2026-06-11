import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search } from 'lucide-react';
import { NotificationFilterType, NotificationDateRange } from '@/hooks/useRealtimeNotifications';
import { cn } from '@/lib/utils';

interface NotificationFiltersProps {
  type: NotificationFilterType;
  search: string;
  dateRange: NotificationDateRange;
  unreadCount: number;
  onTypeChange: (type: NotificationFilterType) => void;
  onSearchChange: (search: string) => void;
  onDateRangeChange: (dateRange: NotificationDateRange) => void;
}

export function NotificationFilters({
  type,
  search,
  dateRange,
  unreadCount,
  onTypeChange,
  onSearchChange,
  onDateRangeChange,
}: NotificationFiltersProps) {
  const { t } = useTranslation('common');

  const tabs: { key: NotificationFilterType; labelKey: string; showCount?: boolean }[] = [
    { key: 'all', labelKey: 'notifications.filters.all' },
    { key: 'unread', labelKey: 'notifications.filters.unread', showCount: true },
    { key: 'orders', labelKey: 'notifications.filters.orders' },
    { key: 'complaints', labelKey: 'notifications.filters.complaints' },
    { key: 'instance', labelKey: 'notifications.filters.instance' },
    { key: 'system', labelKey: 'notifications.filters.system' },
  ];

  const dateRanges: { key: NotificationDateRange; labelKey: string }[] = [
    { key: 'today', labelKey: 'notifications.dateRange.today' },
    { key: '7days', labelKey: 'notifications.dateRange.last7Days' },
    { key: '30days', labelKey: 'notifications.dateRange.last30Days' },
    { key: 'all', labelKey: 'notifications.dateRange.allTime' },
  ];

  return (
    <div className="space-y-4">
      {/* Tab Filters */}
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <Button
            key={tab.key}
            variant={type === tab.key ? 'default' : 'outline'}
            size="sm"
            onClick={() => onTypeChange(tab.key)}
            className={cn(
              'transition-all',
              type === tab.key && 'shadow-md'
            )}
          >
            {t(tab.labelKey)}{tab.showCount ? ` (${unreadCount})` : ''}
          </Button>
        ))}
      </div>

      {/* Search and Date Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('notifications.searchPlaceholder')}
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={dateRange} onValueChange={(val) => onDateRangeChange(val as NotificationDateRange)}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {dateRanges.map((range) => (
              <SelectItem key={range.key} value={range.key}>
                {t(range.labelKey)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
