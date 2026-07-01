import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ActivityLog } from '@/hooks/useTeamReports';
import { formatDistanceToNow } from 'date-fns';
import { 
  MessageSquare, 
  ShoppingCart, 
  Users, 
  Package, 
  AlertCircle,
  Activity,
  Check
} from 'lucide-react';

interface TeamActivityTimelineProps {
  activities: ActivityLog[];
  isLoading: boolean;
}

const activityConfig: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  message_sent: { 
    icon: MessageSquare, 
    color: 'text-blue-500 bg-blue-500/10', 
    label: 'Sent a message' 
  },
  order_created: { 
    icon: ShoppingCart, 
    color: 'text-emerald-500 bg-emerald-500/10', 
    label: 'Created an order' 
  },
  order_updated: { 
    icon: ShoppingCart, 
    color: 'text-violet-500 bg-violet-500/10', 
    label: 'Updated an order' 
  },
  contact_assigned: { 
    icon: Users, 
    color: 'text-purple-500 bg-purple-500/10', 
    label: 'Assigned to customer' 
  },
  parcel_booked: { 
    icon: Package, 
    color: 'text-cyan-500 bg-cyan-500/10', 
    label: 'Booked a parcel' 
  },
  complaint_resolved: { 
    icon: Check, 
    color: 'text-green-500 bg-green-500/10', 
    label: 'Resolved a complaint' 
  },
};

export function TeamActivityTimeline({ activities, isLoading }: TeamActivityTimelineProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Activity Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Activity Timeline
        </CardTitle>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Activity className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No activity recorded yet</p>
            <p className="text-sm">Team activities will appear here</p>
          </div>
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-5 top-0 bottom-0 w-px bg-border" />

            <div className="space-y-4">
              {activities.map((activity) => {
                const config = activityConfig[activity.activityType] || {
                  icon: Activity,
                  color: 'text-muted-foreground bg-muted',
                  label: activity.activityType.replace(/_/g, ' '),
                };
                const Icon = config.icon;

                return (
                  <div key={activity.id} className="flex gap-4 relative">
                    {/* Icon */}
                    <div className={`z-10 flex h-10 w-10 items-center justify-center rounded-full ${config.color}`}>
                      <Icon className="h-5 w-5" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 pb-4">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="font-medium">{activity.userName}</span>
                          <span className="text-muted-foreground"> {config.label}</span>
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                        </span>
                      </div>

                      {/* Metadata */}
                      {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {activity.metadata.order_number && (
                            <Badge variant="outline" className="text-xs">
                              Order #{String(activity.metadata.order_number)}
                            </Badge>
                          )}
                          {activity.metadata.amount && (
                            <Badge variant="outline" className="text-xs">
                              ৳{Number(activity.metadata.amount).toLocaleString()}
                            </Badge>
                          )}
                          {activity.metadata.status && (
                            <Badge variant="secondary" className="text-xs capitalize">
                              {String(activity.metadata.status)}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
