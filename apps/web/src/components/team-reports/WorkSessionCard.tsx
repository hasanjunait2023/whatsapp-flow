import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Clock, Coffee, Zap, Timer } from 'lucide-react';
import { WorkSession } from '@/hooks/useTeamWorkSessions';
import { format } from 'date-fns';

interface WorkSessionCardProps {
  session: WorkSession;
  className?: string;
}

function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

function formatTime(date: Date | null): string {
  if (!date) return '-';
  return format(date, 'h:mm a');
}

export function WorkSessionCard({ session, className }: WorkSessionCardProps) {
  const initials = session.userName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const totalMinutes = session.totalActiveMinutes + session.totalAwayMinutes;
  const activePercent = totalMinutes > 0 
    ? Math.round((session.totalActiveMinutes / totalMinutes) * 100) 
    : 0;

  // Calculate page activity percentages
  const pageEntries = Object.entries(session.pageActivity);
  const totalPageMinutes = pageEntries.reduce((sum, [_, mins]) => sum + mins, 0);
  const topPages = pageEntries
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([page, mins]) => ({
      page: page.replace('/', '').replace(/-/g, ' ') || 'Dashboard',
      mins,
      percent: totalPageMinutes > 0 ? Math.round((mins / totalPageMinutes) * 100) : 0,
    }));

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarImage src={session.avatarUrl || undefined} />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-base">{session.userName}</CardTitle>
              <p className="text-xs text-muted-foreground">
                {format(new Date(session.sessionDate), 'EEEE, MMM d')}
              </p>
            </div>
          </div>
          <Badge variant={activePercent >= 80 ? 'default' : activePercent >= 50 ? 'secondary' : 'outline'}>
            {activePercent}% Active
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Time Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
            <Clock className="h-4 w-4 text-green-500" />
            <div>
              <p className="text-xs text-muted-foreground">First Login</p>
              <p className="text-sm font-medium">{formatTime(session.firstSeenAt)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
            <Timer className="h-4 w-4 text-red-500" />
            <div>
              <p className="text-xs text-muted-foreground">Last Activity</p>
              <p className="text-sm font-medium">{formatTime(session.lastSeenAt)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
            <Zap className="h-4 w-4 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Total Active</p>
              <p className="text-sm font-medium">{formatMinutes(session.totalActiveMinutes)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
            <Coffee className="h-4 w-4 text-violet-500" />
            <div>
              <p className="text-xs text-muted-foreground">Breaks</p>
              <p className="text-sm font-medium">
                {session.breakCount} ({formatMinutes(session.totalAwayMinutes)})
              </p>
            </div>
          </div>
        </div>

        {/* Longest Session */}
        {session.longestSessionMinutes > 0 && (
          <div className="text-sm">
            <span className="text-muted-foreground">Longest Session: </span>
            <span className="font-medium">{formatMinutes(session.longestSessionMinutes)}</span>
          </div>
        )}

        {/* Page Activity */}
        {topPages.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Page Activity</p>
            {topPages.map(({ page, mins, percent }) => (
              <div key={page} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="capitalize">{page}</span>
                  <span className="text-muted-foreground">{formatMinutes(mins)} ({percent}%)</span>
                </div>
                <Progress value={percent} className="h-1.5" />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface WorkSessionListProps {
  sessions: WorkSession[];
  loading?: boolean;
}

export function WorkSessionList({ sessions, loading }: WorkSessionListProps) {
  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map(i => (
          <Card key={i}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-sm text-muted-foreground">No work session data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {sessions.map(session => (
        <WorkSessionCard key={session.id} session={session} />
      ))}
    </div>
  );
}
