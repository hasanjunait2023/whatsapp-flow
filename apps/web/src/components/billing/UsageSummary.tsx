import { useSubscription } from '@/hooks/useSubscription';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Bot, Smartphone, Users, TrendingUp, AlertTriangle } from 'lucide-react';
import { useInstances } from '@/hooks/useInstances';
import { useTeam } from '@/hooks/useTeam';
import { format } from 'date-fns';
import { getProgressColorClass } from '@/hooks/usePlanLimits';

interface UsageSummaryProps {
  onUpgradeClick?: () => void;
}

export function UsageSummary({ onUpgradeClick }: UsageSummaryProps) {
  const { subscription, usage, loading, plan } = useSubscription();
  const { instances } = useInstances();
  const { members } = useTeam();

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

  const currentMonth = format(new Date(), 'MMMM yyyy');
  
  const usageItems = [
    {
      label: 'Messages Sent',
      icon: <MessageSquare className="h-4 w-4" />,
      current: usage?.messages_sent || 0,
      limit: plan?.max_messages_per_month || 1000,
    },
    {
      label: 'AI Conversations',
      icon: <Bot className="h-4 w-4" />,
      current: usage?.ai_messages || 0,
      limit: plan?.ai_enabled ? 500 : 0, // Placeholder limit for AI
      hidden: !plan?.ai_enabled,
    },
    {
      label: 'WhatsApp Instances',
      icon: <Smartphone className="h-4 w-4" />,
      current: instances?.length || 0,
      limit: plan?.max_instances || 1,
    },
    {
      label: 'Team Members',
      icon: <Users className="h-4 w-4" />,
      current: members?.length || 1,
      limit: plan?.max_agents || 1,
    },
  ].filter(item => !item.hidden);

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'destructive';
    if (percentage >= 75) return 'warning';
    return 'default';
  };

  const getUsageColorClass = (percentage: number) => {
    return getProgressColorClass(percentage);
  };

  const hasHighUsage = usageItems.some(item => {
    const percentage = item.limit > 0 ? (item.current / item.limit) * 100 : 0;
    return percentage >= 80;
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Current Usage
          </CardTitle>
          <p className="text-sm text-muted-foreground">{currentMonth}</p>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {usageItems.map((item, index) => {
          const percentage = item.limit > 0 ? Math.min(100, (item.current / item.limit) * 100) : 0;
          const colorVariant = getUsageColor(percentage);
          const colorClass = getUsageColorClass(percentage);
          const isAtLimit = percentage >= 100;
          const isNearLimit = percentage >= 80;

          return (
            <div key={index} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  {item.icon}
                  {item.label}
                </div>
                <div className="flex items-center gap-2">
                  {isAtLimit && (
                    <Badge variant="destructive" className="text-xs">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Limit Reached
                    </Badge>
                  )}
                  {!isAtLimit && isNearLimit && (
                    <Badge variant="outline" className="text-xs text-yellow-600 border-yellow-500/30 bg-yellow-500/10">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Near Limit
                    </Badge>
                  )}
                  <span className="font-medium">
                    {item.current.toLocaleString()} <span className="text-muted-foreground">/ {item.limit.toLocaleString()}</span>
                  </span>
                </div>
              </div>
              <div className="relative">
                <Progress 
                  value={percentage} 
                  className="h-2"
                />
                <div 
                  className={`absolute top-0 left-0 h-2 rounded-full transition-all ${colorClass}`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground text-right">
                {percentage.toFixed(1)}% used
              </p>
            </div>
          );
        })}

        {hasHighUsage && (
          <div className="pt-2 border-t">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Need more resources?</p>
              <Button variant="outline" size="sm" onClick={onUpgradeClick}>
                Upgrade Plan
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
