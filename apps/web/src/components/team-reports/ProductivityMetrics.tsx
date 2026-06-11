import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, TrendingDown, Minus, Trophy, MessageSquare, Clock, Users } from 'lucide-react';
import { useTeamProductivity, ProductivityMetrics, TeamProductivitySummary } from '@/hooks/useTeamProductivity';
import { cn } from '@/lib/utils';

interface ProductivityMetricsCardProps {
  className?: string;
}

function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

function TrendIndicator({ trend, percent }: { trend: 'up' | 'down' | 'stable'; percent: number }) {
  if (trend === 'stable') {
    return (
      <div className="flex items-center gap-1 text-muted-foreground">
        <Minus className="h-3 w-3" />
        <span className="text-xs">Stable</span>
      </div>
    );
  }
  
  const isUp = trend === 'up';
  return (
    <div className={cn('flex items-center gap-1', isUp ? 'text-green-500' : 'text-red-500')}>
      {isUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      <span className="text-xs">{Math.abs(percent)}%</span>
    </div>
  );
}

function SummaryCard({ summary, loading }: { summary: TeamProductivitySummary; loading: boolean }) {
  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-4">
        {[1, 2, 3, 4].map(i => (
          <Card key={i}>
            <CardContent className="pt-6">
              <Skeleton className="h-8 w-16 mb-2" />
              <Skeleton className="h-4 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-4">
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <div>
              <p className="text-2xl font-bold">{summary.totalActiveMembers}</p>
              <p className="text-xs text-muted-foreground">Active Members Today</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-green-500" />
            <div>
              <p className="text-2xl font-bold">{summary.avgMessagesPerHour}</p>
              <p className="text-xs text-muted-foreground">Avg Messages/Hour</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-500" />
            <div>
              <p className="text-2xl font-bold">{formatMinutes(summary.avgActiveMinutes)}</p>
              <p className="text-xs text-muted-foreground">Avg Active Time</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            <div>
              <p className="text-2xl font-bold truncate">
                {summary.topPerformer?.userName || '-'}
              </p>
              <p className="text-xs text-muted-foreground">Top Performer</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function MemberMetricsRow({ metrics }: { metrics: ProductivityMetrics }) {
  const initials = metrics.userName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors">
      <Avatar className="h-9 w-9">
        <AvatarImage src={metrics.avatarUrl || undefined} />
        <AvatarFallback>{initials}</AvatarFallback>
      </Avatar>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium truncate">{metrics.userName}</p>
          <Badge variant="outline" className="text-xs capitalize">
            {metrics.role}
          </Badge>
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground mt-0.5">
          <span>{formatMinutes(metrics.activeMinutes)} active</span>
          <span>{metrics.conversationsHandled} conversations</span>
        </div>
      </div>

      <div className="text-right">
        <div className="flex items-center justify-end gap-2">
          <p className="text-lg font-bold">{metrics.messagesPerHour}</p>
          <span className="text-xs text-muted-foreground">msg/hr</span>
        </div>
        <div className="flex items-center justify-end gap-2">
          <TrendIndicator trend={metrics.trend} percent={metrics.trendPercent} />
          {metrics.vsTeamAverage !== 0 && (
            <Badge 
              variant={metrics.vsTeamAverage > 0 ? 'default' : 'secondary'}
              className="text-[10px] h-4"
            >
              {metrics.vsTeamAverage > 0 ? '+' : ''}{metrics.vsTeamAverage}% avg
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}

export function ProductivityMetricsCard({ className }: ProductivityMetricsCardProps) {
  const { metrics, summary, loading, error } = useTeamProductivity();

  if (error) {
    return (
      <div className={className}>
        <Card>
          <CardHeader>
            <CardTitle>Productivity Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Sort by messages per hour (highest first)
  const sortedMetrics = [...metrics].sort((a, b) => b.messagesPerHour - a.messagesPerHour);

  return (
    <div className={cn('space-y-6', className)}>
      <SummaryCard summary={summary} loading={loading} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Individual Performance</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-9 w-9 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-6 w-16" />
                </div>
              ))}
            </div>
          ) : sortedMetrics.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm text-muted-foreground">No productivity data available</p>
            </div>
          ) : (
            <div className="divide-y">
              {sortedMetrics.map((m, idx) => (
                <MemberMetricsRow key={m.userId} metrics={m} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
