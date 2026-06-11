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
import { CheckCheck, Trash2, MoreVertical } from 'lucide-react';
import { NotificationFilters } from '@/components/notifications/NotificationFilters';
import { NotificationList } from '@/components/notifications/NotificationList';
import {
  useRealtimeNotifications,
  NotificationFilterType,
  NotificationDateRange,
  InAppNotification,
} from '@/hooks/useRealtimeNotifications';

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

  return (
    <DashboardLayout>
      <div className="container mx-auto py-6 px-4 space-y-6">
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

        <Card>
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

        <Card>
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
      </div>
    </DashboardLayout>
  );
}
