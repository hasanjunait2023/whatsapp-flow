import { useTranslation } from 'react-i18next';
import { Bell } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { InAppNotification } from '@/hooks/useRealtimeNotifications';
import { NotificationItem } from './NotificationItem';

interface NotificationListProps {
  notifications: InAppNotification[];
  loading: boolean;
  onMarkRead: (id: string) => void;
  onDelete: (id: string) => void;
  onNotificationClick?: (notification: InAppNotification) => void;
}

export function NotificationList({
  notifications,
  loading,
  onMarkRead,
  onDelete,
  onNotificationClick,
}: NotificationListProps) {
  const { t } = useTranslation('common');

  if (loading) {
    return (
      <div className="space-y-4 p-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-start gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-3 w-1/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="rounded-full bg-muted p-4 mb-4">
          <Bell className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="font-medium text-lg mb-1">
          {t('notifications.noNotifications')}
        </h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          {t('notifications.emptyMessage')}
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[calc(100vh-300px)]">
      <div className="divide-y">
        {notifications.map((notification) => (
          <NotificationItem
            key={notification.id}
            notification={notification}
            onMarkRead={onMarkRead}
            onDelete={onDelete}
            onClick={onNotificationClick}
            showDeleteButton
          />
        ))}
      </div>
    </ScrollArea>
  );
}
