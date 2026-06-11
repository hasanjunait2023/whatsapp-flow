import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Bell } from 'lucide-react';
import { useRealtimeNotifications, InAppNotification } from '@/hooks/useRealtimeNotifications';
import { NotificationItem } from './NotificationItem';

export function NotificationCenter() {
  const navigate = useNavigate();
  const { t } = useTranslation('common');
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification } = useRealtimeNotifications();
  const [open, setOpen] = useState(false);

  // Show only latest 10 in dropdown
  const displayNotifications = notifications.slice(0, 10);

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
        case 'message':
          navigate('/inbox');
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

    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h4 className="font-semibold">{t('notifications.title')}</h4>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7"
              onClick={() => markAllAsRead.mutate()}
            >
              {t('notifications.markAllRead')}
            </Button>
          )}
        </div>

        <ScrollArea className="h-[400px]">
          {displayNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Bell className="h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4 text-sm text-muted-foreground">
                {t('notifications.noNotifications')}
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {displayNotifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onMarkRead={(id) => markAsRead.mutate(id)}
                  onDelete={(id) => deleteNotification.mutate(id)}
                  onClick={handleNotificationClick}
                />
              ))}
            </div>
          )}
        </ScrollArea>

        {notifications.length > 0 && (
          <div className="border-t p-2">
            <Button
              variant="ghost"
              className="w-full text-sm"
              asChild
              onClick={() => setOpen(false)}
            >
              <Link to="/notifications">
                {t('actions.viewAll')}
              </Link>
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
