import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CheckCheck, Trash2, MoreVertical, Bell, BellRing, MailOpen, ArrowUpRight } from 'lucide-react';
import { NotificationFilters } from '@/components/notifications/NotificationFilters';
import { NotificationList } from '@/components/notifications/NotificationList';
import { KpiCard } from '@/components/dashboard/bento/KpiCard';
import { m, pageEnter, staggerContainer, staggerItem, useCountUp } from '@/lib/motion';
import {
  useRealtimeNotifications,
  NotificationFilterType,
  NotificationDateRange,
  InAppNotification,
} from '@/hooks/useRealtimeNotifications';

/**
 * The single full-orange surface on the Notifications page (DESIGN.md §2.2): the focal
 * KPI. Unread is the metric that matters most on a feed, so it owns `bg-primary`. Every
 * other stat uses a soft KpiCard; the feed itself stays calm with no orange flood.
 */
function UnreadHighlightTile({ count }: { count: number }) {
  const display = useCountUp(count);

  return (
    <m.div variants={staggerItem} whileHover={{ y: -2 }} transition={{ duration: 0.15 }} className="h-full">
      <div className="relative flex h-full min-h-[140px] flex-col overflow-hidden rounded-card bg-primary p-5 text-primary-foreground shadow-elevation-2">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/15 via-transparent to-black/10"
        />
        <div className="relative z-10 flex h-full flex-col">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-2 text-sm font-medium text-primary-foreground/85">
              <BellRing className="h-4 w-4" aria-hidden />
              Unread
            </span>
          </div>

          <p className="mt-2 tabular-nums text-3xl font-bold leading-none tracking-tight md:text-4xl">
            {display.toLocaleString('en-US')}
          </p>

          <span className="mt-auto inline-flex w-fit items-center gap-1 text-xs font-medium text-primary-foreground/80">
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
            {count > 0 ? 'Waiting for your attention' : 'You are all caught up'}
          </span>
        </div>
      </div>
    </m.div>
  );
}

export default function Notifications() {
  const { t } = useTranslation('common');
  const navigate = useNavigate();

  const [filters, setFilters] = useState({
    type: 'all' as NotificationFilterType,
    search: '',
    dateRange: '7days' as NotificationDateRange,
  });

  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllRead,
  } = useRealtimeNotifications(filters);

  const handleNotificationClick = (notification: InAppNotification) => {
    if (!notification.is_read) {
      markAsRead.mutate(notification.id);
    }

    // Navigate based on entity type
    if (notification.entity_type) {
      switch (notification.entity_type) {
        case 'order':
          navigate('/orders');
          break;
        case 'complaint':
          navigate('/complaints');
          break;
        case 'instance':
          navigate('/instances');
          break;
        case 'subscription':
        case 'payment':
          navigate('/billing');
          break;
        case 'team':
          navigate('/team');
          break;
      }
    }
  };

  const totalCount = notifications.length;
  const readCount = Math.max(totalCount - unreadCount, 0);

  return (
    <DashboardLayout>
      <m.div
        variants={pageEnter}
        initial="hidden"
        animate="show"
        className="mx-auto w-full max-w-[1440px] space-y-6 p-4 md:p-6"
      >
        <PageHeader
          title={t('notifications.title')}
          description={t('notifications.description')}
        >
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => markAllAsRead.mutate()}
                disabled={markAllAsRead.isPending}
              >
                <CheckCheck className="h-4 w-4 mr-2" />
                {t('notifications.markAllRead')}
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => deleteAllRead.mutate()}
                  disabled={deleteAllRead.isPending}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {t('notifications.deleteAllRead')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </PageHeader>

        {/* KPI strip — one orange focal tile (Unread) + soft stat cards. */}
        <m.div
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-3"
        >
          <div className="col-span-2 lg:col-span-1">
            <UnreadHighlightTile count={unreadCount} />
          </div>
          <m.div variants={staggerItem}>
            <KpiCard title={t('notifications.filters.all')} value={totalCount} icon={Bell} tone="info" loading={loading} />
          </m.div>
          <m.div variants={staggerItem}>
            <KpiCard title={t('notifications.markAllRead')} value={readCount} icon={MailOpen} tone="success" loading={loading} />
          </m.div>
        </m.div>

        <Card className="rounded-card shadow-elevation-1">
          <CardContent className="p-6">
            <NotificationFilters
              type={filters.type}
              search={filters.search}
              dateRange={filters.dateRange}
              unreadCount={unreadCount}
              onTypeChange={(type) => setFilters((f) => ({ ...f, type }))}
              onSearchChange={(search) => setFilters((f) => ({ ...f, search }))}
              onDateRangeChange={(dateRange) => setFilters((f) => ({ ...f, dateRange }))}
            />
          </CardContent>
        </Card>

        <Card className="rounded-card shadow-elevation-1">
          <CardContent className="p-0">
            <NotificationList
              notifications={notifications}
              loading={loading}
              onMarkRead={(id) => markAsRead.mutate(id)}
              onDelete={(id) => deleteNotification.mutate(id)}
              onNotificationClick={handleNotificationClick}
            />
          </CardContent>
        </Card>
      </m.div>
    </DashboardLayout>
  );
}
