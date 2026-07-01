import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Calendar, 
  CreditCard, 
  MessageSquare, 
  UserPlus, 
  CheckCircle2,
  Megaphone,
  HelpCircle,
  Zap,
  Filter
} from 'lucide-react';
import { format } from 'date-fns';
import type { CustomerActivity } from '@/hooks/useCustomerDetails';

interface ActivityLogTabProps {
  activities: CustomerActivity[];
}

const categoryFilters = [
  { value: 'all', label: 'All' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'payment', label: 'Payment' },
  { value: 'support', label: 'Support' },
  { value: 'engagement', label: 'Engagement' },
  { value: 'conversion', label: 'Conversion' },
];

const getEventIcon = (eventType: string, category: string | null) => {
  if (category === 'payment') return CreditCard;
  if (category === 'marketing') return Megaphone;
  if (category === 'support') return HelpCircle;
  if (category === 'engagement') return MessageSquare;
  
  switch (eventType) {
    case 'tenant_activated':
    case 'activation':
      return CheckCircle2;
    case 'first_message':
    case 'message':
      return MessageSquare;
    case 'payment_verified':
    case 'payment':
      return CreditCard;
    case 'marketing_auto_enrolled':
      return Megaphone;
    default:
      return Zap;
  }
};

const getCategoryColor = (category: string | null) => {
  switch (category) {
    case 'payment':
      return 'text-green-500 bg-green-500/10';
    case 'marketing':
      return 'text-purple-500 bg-purple-500/10';
    case 'support':
      return 'text-violet-500 bg-violet-500/10';
    case 'engagement':
      return 'text-blue-500 bg-blue-500/10';
    case 'conversion':
      return 'text-emerald-500 bg-emerald-500/10';
    default:
      return 'text-muted-foreground bg-muted';
  }
};

export function ActivityLogTab({ activities }: ActivityLogTabProps) {
  const [filter, setFilter] = useState('all');

  const filteredActivities = activities.filter(activity => {
    if (filter === 'all') return true;
    return activity.event_category === filter;
  });

  if (activities.length === 0) {
    return (
      <div className="text-center py-12">
        <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="font-medium text-lg">No Activity Yet</h3>
        <p className="text-muted-foreground">Activity will appear here as the customer uses the system.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="h-4 w-4 text-muted-foreground" />
        {categoryFilters.map((cat) => (
          <Button
            key={cat.value}
            variant={filter === cat.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(cat.value)}
          >
            {cat.label}
          </Button>
        ))}
      </div>

      {/* Timeline */}
      <ScrollArea className="h-[400px]">
        <div className="space-y-4">
          {filteredActivities.map((activity) => {
            const Icon = getEventIcon(activity.event_type, activity.event_category);
            const colorClass = getCategoryColor(activity.event_category);

            return (
              <div key={activity.id} className="flex gap-4">
                <div className={`p-2 rounded-full h-fit ${colorClass}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-sm">{activity.title_bn}</p>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(activity.created_at), 'MMM d, h:mm a')}
                    </span>
                  </div>
                  {activity.description_bn && (
                    <p className="text-sm text-muted-foreground">{activity.description_bn}</p>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    {activity.event_category && (
                      <Badge variant="outline" className="text-xs capitalize">
                        {activity.event_category}
                      </Badge>
                    )}
                    {activity.channel && (
                      <Badge variant="outline" className="text-xs">
                        {activity.channel}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
