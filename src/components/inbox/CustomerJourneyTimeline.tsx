import { useState } from 'react';
import { JourneyEvent, EVENT_ICONS } from '@/hooks/useCustomerJourney';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns';
import {
  MessageCirclePlus,
  MessageSquare,
  ShoppingBag,
  CheckCircle,
  Package,
  Truck,
  PackageCheck,
  PackageX,
  CreditCard,
  UserRound,
  UserCheck,
  UserRoundCheck,
  AlertTriangle,
  Star,
  ChevronRight,
  Filter,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  MessageCirclePlus,
  MessageSquare,
  ShoppingBag,
  CheckCircle,
  Package,
  Truck,
  PackageCheck,
  PackageX,
  CreditCard,
  UserRound,
  UserCheck,
  UserRoundCheck,
  AlertTriangle,
  Star,
};

interface CustomerJourneyTimelineProps {
  events: JourneyEvent[];
  isLoading: boolean;
  onViewOrder?: (orderId: string) => void;
}

const CATEGORIES = [
  { value: 'communication', label: 'Communication' },
  { value: 'order', label: 'Orders' },
  { value: 'payment', label: 'Payments' },
  { value: 'support', label: 'Support' },
];

export default function CustomerJourneyTimeline({ 
  events, 
  isLoading,
  onViewOrder 
}: CustomerJourneyTimelineProps) {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  const filteredEvents = selectedCategories.length > 0
    ? events.filter(e => selectedCategories.includes(e.event_category))
    : events;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return 'Today';
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'MMM d, yyyy');
  };

  const formatTime = (dateStr: string) => {
    return format(new Date(dateStr), 'h:mm a');
  };

  const formatRelative = (dateStr: string) => {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
  };

  const getEventIcon = (eventType: string) => {
    const iconInfo = EVENT_ICONS[eventType] || { icon: 'MessageSquare', color: 'text-muted-foreground' };
    const IconComponent = iconMap[iconInfo.icon] || MessageSquare;
    return { Icon: IconComponent, color: iconInfo.color };
  };

  const getCategoryBgColor = (category: string) => {
    switch (category) {
      case 'communication': return 'bg-blue-500/10';
      case 'order': return 'bg-violet-500/10';
      case 'payment': return 'bg-green-500/10';
      case 'system': return 'bg-amber-500/10';
      default: return 'bg-muted';
    }
  };

  const toggleCategory = (category: string) => {
    setSelectedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="h-8 w-8 rounded-full shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <MessageCirclePlus className="h-8 w-8 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium text-foreground">No journey events yet</p>
        <p className="text-xs text-muted-foreground mt-1">
          Customer interactions will appear here
        </p>
      </div>
    );
  }

  // Group events by date
  const eventsByDate: Record<string, JourneyEvent[]> = {};
  filteredEvents.forEach(event => {
    const dateKey = new Date(event.created_at).toDateString();
    if (!eventsByDate[dateKey]) eventsByDate[dateKey] = [];
    eventsByDate[dateKey].push(event);
  });

  return (
    <div className="flex flex-col h-full">
      {/* Filter Header */}
      <div className="p-3 border-b border-border flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">
          {filteredEvents.length} events
        </span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8">
              <Filter className="h-3.5 w-3.5 mr-1.5" />
              Filter
              {selectedCategories.length > 0 && (
                <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-xs">
                  {selectedCategories.length}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            {CATEGORIES.map(cat => (
              <DropdownMenuCheckboxItem
                key={cat.value}
                checked={selectedCategories.includes(cat.value)}
                onCheckedChange={() => toggleCategory(cat.value)}
              >
                {cat.label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Timeline */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          {Object.entries(eventsByDate).map(([dateKey, dateEvents]) => (
            <div key={dateKey} className="mb-6">
              {/* Date Header */}
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {formatDate(dateEvents[0].created_at)}
                </span>
                <div className="flex-1 h-px bg-border" />
              </div>

              {/* Events for this date */}
              <div className="space-y-0">
                {dateEvents.map((event, index) => {
                  const { Icon, color } = getEventIcon(event.event_type);
                  const isLast = index === dateEvents.length - 1;
                  const hasOrderId = event.metadata?.order_id;

                  return (
                    <div key={event.id} className="flex gap-3 group">
                      {/* Timeline line and icon */}
                      <div className="flex flex-col items-center">
                        <div className={`h-8 w-8 rounded-full ${getCategoryBgColor(event.event_category)} flex items-center justify-center shrink-0 ring-2 ring-background`}>
                          <Icon className={`h-4 w-4 ${color}`} />
                        </div>
                        {!isLast && (
                          <div className="w-0.5 flex-1 bg-border min-h-[24px]" />
                        )}
                      </div>

                      {/* Event content */}
                      <div className={`flex-1 ${!isLast ? 'pb-4' : ''}`}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground leading-tight">
                              {event.title}
                            </p>
                            {event.description && (
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                                {event.description}
                              </p>
                            )}
                            
                            {/* Metadata display */}
                            {event.metadata && (
                              <div className="mt-1.5 flex flex-wrap gap-1.5">
                                {event.metadata.order_number && (
                                  <Badge variant="secondary" className="text-xs h-5 font-normal">
                                    {event.metadata.order_number}
                                  </Badge>
                                )}
                                {event.metadata.total && event.metadata.currency && (
                                  <Badge variant="outline" className="text-xs h-5 font-normal">
                                    {event.metadata.currency} {event.metadata.total}
                                  </Badge>
                                )}
                                {event.metadata.tracking_number && (
                                  <Badge variant="outline" className="text-xs h-5 font-normal">
                                    📦 {event.metadata.tracking_number}
                                  </Badge>
                                )}
                              </div>
                            )}

                            {/* View Order Button */}
                            {hasOrderId && onViewOrder && (
                              <Button
                                variant="link"
                                size="sm"
                                className="h-auto p-0 mt-1 text-xs text-primary"
                                onClick={() => onViewOrder(event.metadata!.order_id)}
                              >
                                View Order
                                <ChevronRight className="h-3 w-3 ml-0.5" />
                              </Button>
                            )}
                          </div>

                          {/* Time */}
                          <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                            {formatTime(event.created_at)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
