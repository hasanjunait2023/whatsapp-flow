import { useBillingTimeline, TimelineEvent } from '@/hooks/useBillingTimeline';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  CheckCircle2, 
  Clock, 
  XCircle, 
  CalendarPlus, 
  CreditCard, 
  Sparkles,
  CalendarClock
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export function BillingTimeline() {
  const { timeline, loading } = useBillingTimeline();

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>
    );
  }

  const getEventConfig = (event: TimelineEvent) => {
    const baseConfig = {
      account_created: {
        icon: <CalendarPlus className="h-4 w-4" />,
        color: 'text-blue-500',
        bgColor: 'bg-blue-500',
      },
      subscription_started: {
        icon: <Sparkles className="h-4 w-4" />,
        color: 'text-purple-500',
        bgColor: 'bg-purple-500',
      },
      payment: {
        icon: <CreditCard className="h-4 w-4" />,
        color: 'text-green-500',
        bgColor: 'bg-green-500',
      },
      plan_change: {
        icon: <Sparkles className="h-4 w-4" />,
        color: 'text-primary',
        bgColor: 'bg-primary',
      },
      upcoming_renewal: {
        icon: <CalendarClock className="h-4 w-4" />,
        color: 'text-yellow-500',
        bgColor: 'bg-yellow-500',
      },
    };

    const config = baseConfig[event.type];

    // Override for status
    if (event.status === 'pending') {
      return {
        ...config,
        icon: <Clock className="h-4 w-4" />,
        color: 'text-yellow-500',
        bgColor: 'bg-yellow-500',
      };
    }
    if (event.status === 'rejected') {
      return {
        ...config,
        icon: <XCircle className="h-4 w-4" />,
        color: 'text-destructive',
        bgColor: 'bg-destructive',
      };
    }
    if (event.status === 'upcoming') {
      return {
        ...config,
        icon: <Clock className="h-4 w-4" />,
        color: 'text-muted-foreground',
        bgColor: 'bg-muted-foreground',
      };
    }

    return config;
  };

  const getStatusIcon = (event: TimelineEvent) => {
    if (event.status === 'completed') {
      return <CheckCircle2 className="h-3 w-3 text-green-500" />;
    }
    if (event.status === 'pending') {
      return <Clock className="h-3 w-3 text-yellow-500" />;
    }
    if (event.status === 'rejected') {
      return <XCircle className="h-3 w-3 text-destructive" />;
    }
    return null;
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Billing Journey</CardTitle>
      </CardHeader>
      <CardContent>
        {timeline.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No billing history yet
          </p>
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-3 top-2 bottom-2 w-px bg-border" />

            <div className="space-y-4">
              {timeline.slice(0, 8).map((event, index) => {
                const config = getEventConfig(event);
                const isUpcoming = event.status === 'upcoming';

                return (
                  <div key={event.id} className="relative flex gap-3">
                    {/* Timeline dot */}
                    <div 
                      className={cn(
                        "relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-background",
                        config.bgColor,
                        isUpcoming && "border-dashed bg-transparent border-muted-foreground"
                      )}
                    >
                      <span className={cn("text-white", isUpcoming && config.color)}>
                        {config.icon}
                      </span>
                    </div>

                    {/* Content */}
                    <div className={cn("flex-1 pb-2", isUpcoming && "opacity-70")}>
                      <div className="flex items-center gap-2">
                        <p className={cn("font-medium text-sm", config.color)}>
                          {event.title}
                        </p>
                        {getStatusIcon(event)}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {event.description}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {format(new Date(event.date), 'MMM d, yyyy')}
                        {event.metadata?.transactionId && (
                          <span className="ml-2 font-mono">
                            #{event.metadata.transactionId.slice(-6)}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {timeline.length > 8 && (
              <p className="text-xs text-muted-foreground text-center mt-4">
                +{timeline.length - 8} more events
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
