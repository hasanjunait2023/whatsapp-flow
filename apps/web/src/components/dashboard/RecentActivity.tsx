import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/useTenant';
import { ShoppingCart, MessageSquare, AlertCircle, User, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Activity {
  id: string;
  type: 'order' | 'message' | 'complaint' | 'contact';
  title: string;
  subtitle: string;
  time: Date;
}

interface RecentActivityProps {
  loading?: boolean;
}

export function RecentActivity({ loading: externalLoading }: RecentActivityProps) {
  const { currentTenant } = useTenant();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentTenant?.id) {
      fetchRecentActivity();
    }
  }, [currentTenant?.id]);

  const fetchRecentActivity = async () => {
    if (!currentTenant?.id) return;

    try {
      // Fetch recent orders
      const { data: orders } = await supabase
        .from('orders')
        .select('id, order_number, status, created_at')
        .eq('tenant_id', currentTenant.id)
        .order('created_at', { ascending: false })
        .limit(3);

      // Fetch recent messages
      const { data: messages } = await supabase
        .from('messages')
        .select('id, content, direction, sent_at, contact:contacts(name, phone_number)')
        .eq('tenant_id', currentTenant.id)
        .eq('direction', 'inbound')
        .order('sent_at', { ascending: false })
        .limit(3);

      // Fetch recent complaints
      const { data: complaints } = await supabase
        .from('complaints')
        .select('id, title, status, created_at')
        .eq('tenant_id', currentTenant.id)
        .order('created_at', { ascending: false })
        .limit(2);

      const allActivities: Activity[] = [];

      orders?.forEach(order => {
        allActivities.push({
          id: `order-${order.id}`,
          type: 'order',
          title: `New order #${order.order_number}`,
          subtitle: order.status,
          time: new Date(order.created_at),
        });
      });

      messages?.forEach(msg => {
        const contact = msg.contact as any;
        allActivities.push({
          id: `msg-${msg.id}`,
          type: 'message',
          title: `Message from ${contact?.name || contact?.phone_number || 'Unknown'}`,
          subtitle: (msg.content || '').slice(0, 50) + ((msg.content?.length || 0) > 50 ? '...' : ''),
          time: new Date(msg.sent_at),
        });
      });

      complaints?.forEach(complaint => {
        allActivities.push({
          id: `complaint-${complaint.id}`,
          type: 'complaint',
          title: complaint.title,
          subtitle: complaint.status,
          time: new Date(complaint.created_at),
        });
      });

      // Sort by time and take top 6
      allActivities.sort((a, b) => b.time.getTime() - a.time.getTime());
      setActivities(allActivities.slice(0, 6));
    } catch (error) {
      console.error('Error fetching activity:', error);
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (type: Activity['type']) => {
    switch (type) {
      case 'order':
        return <ShoppingCart className="h-4 w-4" />;
      case 'message':
        return <MessageSquare className="h-4 w-4" />;
      case 'complaint':
        return <AlertCircle className="h-4 w-4" />;
      case 'contact':
        return <User className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: Activity['type']) => {
    switch (type) {
      case 'order':
        return 'bg-blue-100 text-blue-600 dark:bg-blue-900/30';
      case 'message':
        return 'bg-green-100 text-green-600 dark:bg-green-900/30';
      case 'complaint':
        return 'bg-red-100 text-red-600 dark:bg-red-900/30';
      case 'contact':
        return 'bg-purple-100 text-purple-600 dark:bg-purple-900/30';
    }
  };

  if (loading || externalLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="flex items-center gap-3">
                <div className="h-8 w-8 bg-muted rounded-full" />
                <div className="flex-1">
                  <div className="h-4 bg-muted rounded w-3/4 mb-1" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (activities.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-5 w-5 text-primary" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-6">
            No recent activity
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Clock className="h-5 w-5 text-primary" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {activities.map(activity => (
          <div 
            key={activity.id}
            className="flex items-start gap-3 p-2 rounded-lg hover:bg-accent/50 transition-colors"
          >
            <div className={`p-1.5 rounded-md ${getTypeColor(activity.type)}`}>
              {getIcon(activity.type)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{activity.title}</p>
              <p className="text-xs text-muted-foreground truncate">{activity.subtitle}</p>
            </div>
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {formatDistanceToNow(activity.time, { addSuffix: true })}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
