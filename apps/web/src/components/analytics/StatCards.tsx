import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare, Users, Clock, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: number;
  trendLabel?: string;
  className?: string;
}

export function StatCard({ title, value, icon, trend, trendLabel, className }: StatCardProps) {
  const isPositive = trend && trend > 0;
  const isNegative = trend && trend < 0;

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {trend !== undefined && (
          <div className={cn(
            'flex items-center gap-1 text-xs mt-1',
            isPositive && 'text-green-600',
            isNegative && 'text-red-600',
            !isPositive && !isNegative && 'text-muted-foreground'
          )}>
            {isPositive && <TrendingUp className="h-3 w-3" />}
            {isNegative && <TrendingDown className="h-3 w-3" />}
            <span>{isPositive ? '+' : ''}{trend}%</span>
            {trendLabel && <span className="text-muted-foreground">{trendLabel}</span>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface AnalyticsSummaryCardsProps {
  totalMessages: number;
  totalContacts: number;
  totalConversations: number;
  avgResponseTime: number;
  activeConversations: number;
  messagesTrend?: number;
  conversationsTrend?: number;
}

export function AnalyticsSummaryCards({
  totalMessages,
  totalContacts,
  totalConversations,
  avgResponseTime,
  activeConversations,
  messagesTrend,
  conversationsTrend,
}: AnalyticsSummaryCardsProps) {
  const formatResponseTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
      <StatCard
        title="Total Messages"
        value={totalMessages.toLocaleString()}
        icon={<MessageSquare className="h-4 w-4" />}
        trend={messagesTrend}
        trendLabel="vs last period"
      />
      <StatCard
        title="Total Contacts"
        value={totalContacts.toLocaleString()}
        icon={<Users className="h-4 w-4" />}
      />
      <StatCard
        title="Total Conversations"
        value={totalConversations.toLocaleString()}
        icon={<Users className="h-4 w-4" />}
        trend={conversationsTrend}
        trendLabel="vs last period"
      />
      <StatCard
        title="Avg Response Time"
        value={formatResponseTime(avgResponseTime)}
        icon={<Clock className="h-4 w-4" />}
      />
      <StatCard
        title="Active Conversations"
        value={activeConversations.toLocaleString()}
        icon={<MessageSquare className="h-4 w-4" />}
      />
    </div>
  );
}
