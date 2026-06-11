import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useTeamActivityHeatmap, MemberHeatmapData } from '@/hooks/useTeamActivityHeatmap';
import { format } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState } from 'react';

interface ActivityHeatmapProps {
  className?: string;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const WORKING_HOURS = HOURS.filter(h => h >= 6 && h <= 22); // 6 AM to 10 PM

function getHourLabel(hour: number): string {
  if (hour === 0) return '12AM';
  if (hour === 12) return '12PM';
  if (hour < 12) return `${hour}AM`;
  return `${hour - 12}PM`;
}

function getStatusColor(status: string, count: number): string {
  if (status === 'none' || count === 0) return 'bg-muted/30';
  if (status === 'offline') return 'bg-muted/50';
  if (status === 'away') return 'bg-yellow-500/40';
  
  // Online - intensity based on count
  if (count >= 10) return 'bg-emerald-500';
  if (count >= 6) return 'bg-green-500';
  if (count >= 3) return 'bg-green-400';
  return 'bg-green-300';
}

function MemberHeatmapRow({ member }: { member: MemberHeatmapData }) {
  const initials = member.userName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-2 w-32 shrink-0">
        <Avatar className="h-6 w-6">
          <AvatarImage src={member.avatarUrl || undefined} />
          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
        </Avatar>
        <span className="text-sm truncate">{member.userName}</span>
      </div>
      <div className="flex gap-0.5 flex-1 overflow-x-auto">
        {WORKING_HOURS.map(hour => {
          const cell = member.cells.find(c => c.hour === hour);
          const status = cell?.status || 'none';
          const count = cell?.count || 0;
          
          return (
            <TooltipProvider key={hour}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className={cn(
                      'w-5 h-5 rounded-sm transition-colors cursor-default',
                      getStatusColor(status, count)
                    )}
                  />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-medium">{getHourLabel(hour)}</p>
                  <p className="text-xs text-muted-foreground">
                    {status === 'none' ? 'No activity' : 
                     status === 'offline' ? 'Offline' :
                     status === 'away' ? 'Away' :
                     `Active (${count} logs)`}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        })}
      </div>
    </div>
  );
}

export function ActivityHeatmap({ className }: ActivityHeatmapProps) {
  const [dateRange, setDateRange] = useState<'today' | 'yesterday' | 'week'>('today');
  const { heatmapData, loading, error } = useTeamActivityHeatmap(dateRange);

  // Get the latest day's data (for today/yesterday, there's only one)
  const displayData = useMemo(() => {
    if (heatmapData.length === 0) return null;
    return heatmapData[heatmapData.length - 1];
  }, [heatmapData]);

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Activity Heatmap</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center gap-2">
              <Skeleton className="h-6 w-6 rounded-full" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-5 flex-1" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Activity Heatmap</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-base">Activity Heatmap</CardTitle>
        <Select value={dateRange} onValueChange={(v) => setDateRange(v as typeof dateRange)}>
          <SelectTrigger className="w-32 h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="yesterday">Yesterday</SelectItem>
            <SelectItem value="week">This Week</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        {/* Hour labels */}
        <div className="flex items-center gap-2 mb-2">
          <div className="w-32 shrink-0" />
          <div className="flex gap-0.5 flex-1 overflow-x-auto">
            {WORKING_HOURS.filter((_, i) => i % 2 === 0).map(hour => (
              <div key={hour} className="w-10 text-[10px] text-muted-foreground">
                {getHourLabel(hour)}
              </div>
            ))}
          </div>
        </div>

        {/* Member rows */}
        <div className="space-y-1.5">
          {displayData?.members.map(member => (
            <MemberHeatmapRow key={member.userId} member={member} />
          ))}
          
          {(!displayData || displayData.members.length === 0) && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No activity data available
            </p>
          )}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-4 pt-4 border-t">
          <span className="text-xs text-muted-foreground">Legend:</span>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm bg-muted/30" />
            <span className="text-xs">No Data</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm bg-yellow-500/40" />
            <span className="text-xs">Away</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm bg-green-300" />
            <span className="text-xs">Low</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm bg-green-500" />
            <span className="text-xs">Medium</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm bg-emerald-500" />
            <span className="text-xs">High</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
