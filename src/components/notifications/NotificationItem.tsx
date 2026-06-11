import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import {
  ShoppingCart,
  MessageSquare,
  AlertCircle,
  CheckCircle,
  Bell,
  WifiOff,
  Clock,
  AlertTriangle,
  CreditCard,
  UserPlus,
  Package,
  Trash2,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { InAppNotification } from '@/hooks/useRealtimeNotifications';
import { cn } from '@/lib/utils';

interface NotificationItemProps {
  notification: InAppNotification;
  onMarkRead: (id: string) => void;
  onDelete: (id: string) => void;
  onClick?: (notification: InAppNotification) => void;
  showDeleteButton?: boolean;
}

const notificationConfig: Record<string, { icon: React.ReactNode; color: string; route: string | null }> = {
  new_order: {
    icon: <ShoppingCart className="h-4 w-4" />,
    color: 'bg-green-100 text-green-600 dark:bg-green-900/30',
    route: '/orders',
  },
  order_status: {
    icon: <Package className="h-4 w-4" />,
    color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30',
    route: '/orders',
  },
  new_message: {
    icon: <MessageSquare className="h-4 w-4" />,
    color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30',
    route: '/inbox',
  },
  new_complaint: {
    icon: <AlertCircle className="h-4 w-4" />,
    color: 'bg-red-100 text-red-600 dark:bg-red-900/30',
    route: '/complaints',
  },
  complaint_resolved: {
    icon: <CheckCircle className="h-4 w-4" />,
    color: 'bg-green-100 text-green-600 dark:bg-green-900/30',
    route: '/complaints',
  },
  instance_disconnected: {
    icon: <WifiOff className="h-4 w-4" />,
    color: 'bg-red-100 text-red-600 dark:bg-red-900/30',
    route: '/instances',
  },
  instance_deleted: {
    icon: <Trash2 className="h-4 w-4" />,
    color: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30',
    route: '/instances',
  },
  instance_banned: {
    icon: <AlertTriangle className="h-4 w-4" />,
    color: 'bg-red-100 text-red-600 dark:bg-red-900/30',
    route: '/instances',
  },
  subscription_expiring: {
    icon: <Clock className="h-4 w-4" />,
    color: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30',
    route: '/billing',
  },
  subscription_expired: {
    icon: <AlertTriangle className="h-4 w-4" />,
    color: 'bg-red-100 text-red-600 dark:bg-red-900/30',
    route: '/billing',
  },
  payment_received: {
    icon: <CreditCard className="h-4 w-4" />,
    color: 'bg-green-100 text-green-600 dark:bg-green-900/30',
    route: '/billing',
  },
  team_member_added: {
    icon: <UserPlus className="h-4 w-4" />,
    color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30',
    route: '/team',
  },
  low_message_quota: {
    icon: <MessageSquare className="h-4 w-4" />,
    color: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30',
    route: '/billing',
  },
  system: {
    icon: <Bell className="h-4 w-4" />,
    color: 'bg-gray-100 text-gray-600 dark:bg-gray-900/30',
    route: null,
  },
};

export function NotificationItem({
  notification,
  onMarkRead,
  onDelete,
  onClick,
  showDeleteButton = false,
}: NotificationItemProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [reconnecting, setReconnecting] = useState(false);
  const config = notificationConfig[notification.type] || notificationConfig.system;

  const handleReconnect = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    const metadata = notification.metadata as { instance_id?: string } | null;
    if (!metadata?.instance_id) {
      toast({
        title: 'Cannot reconnect',
        description: 'Instance information not available.',
        variant: 'destructive',
      });
      return;
    }
    
    setReconnecting(true);
    try {
      const { error } = await supabase.functions.invoke('wasender-connect-session', {
        body: { instance_id: metadata.instance_id }
      });
      
      if (error) throw error;
      
      toast({
        title: 'Reconnecting...',
        description: 'Check your Instances page to scan the QR code.',
      });
      
      // Navigate to instances page
      navigate('/instances');
    } catch (err) {
      console.error('Reconnection failed:', err);
      toast({
        title: 'Reconnection failed',
        description: 'Please try again from the Instances page.',
        variant: 'destructive',
      });
    } finally {
      setReconnecting(false);
    }
  };

  const handleClick = () => {
    if (!notification.is_read) {
      onMarkRead(notification.id);
    }

    if (onClick) {
      onClick(notification);
    } else if (config.route) {
      navigate(config.route);
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(notification.id);
  };

  return (
    <div
      className={cn(
        'group flex items-start gap-3 p-4 text-left transition-colors cursor-pointer hover:bg-accent/50',
        !notification.is_read && 'bg-accent/30'
      )}
      onClick={handleClick}
    >
      <div className={cn('p-2 rounded-full flex-shrink-0', config.color)}>
        {config.icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={cn('text-sm', !notification.is_read && 'font-medium')}>
            {notification.title}
          </p>
          <div className="flex items-center gap-1 flex-shrink-0">
            {!notification.is_read && (
              <div className="h-2 w-2 rounded-full bg-primary" />
            )}
            {showDeleteButton && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={handleDelete}
              >
                <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
              </Button>
            )}
          </div>
        </div>
        {notification.message && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
            {notification.message}
          </p>
        )}
        
        {/* Reconnect button for instance disconnected notifications */}
        {notification.type === 'instance_disconnected' && (notification.metadata as { instance_id?: string } | null)?.instance_id && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleReconnect}
            disabled={reconnecting}
            className="mt-2 h-7 text-xs"
          >
            {reconnecting ? (
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            ) : (
              <RefreshCw className="h-3 w-3 mr-1" />
            )}
            Reconnect
          </Button>
        )}
        
        <p className="text-xs text-muted-foreground mt-1">
          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
        </p>
      </div>
    </div>
  );
}
