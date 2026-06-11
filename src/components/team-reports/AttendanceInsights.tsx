import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Check, X, Zap, Trophy } from 'lucide-react';
import { useTeamWorkSessions, AttendanceRecord } from '@/hooks/useTeamWorkSessions';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';

interface AttendanceInsightsProps {
  className?: string;
}

function getStatusIcon(status: 'present' | 'late' | 'absent') {
  switch (status) {
    case 'present':
      return <Check className="h-4 w-4 text-green-500" />;
    case 'late':
      return <Zap className="h-4 w-4 text-yellow-500" />;
    case 'absent':
      return <X className="h-4 w-4 text-red-500" />;
  }
}

function getStatusClass(status: 'present' | 'late' | 'absent') {
  switch (status) {
    case 'present':
      return 'bg-green-500/20 text-green-600 dark:text-green-400';
    case 'late':
      return 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400';
    case 'absent':
      return 'bg-red-500/20 text-red-600 dark:text-red-400';
  }
}

function AttendanceRow({ record, dates }: { record: AttendanceRecord; dates: string[] }) {
  const initials = record.userName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="flex items-center gap-2 py-2">
      <div className="flex items-center gap-2 w-36 shrink-0">
        <Avatar className="h-7 w-7">
          <AvatarImage src={record.avatarUrl || undefined} />
          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
        </Avatar>
        <span className="text-sm truncate">{record.userName}</span>
      </div>
      
      <div className="flex gap-1 flex-1">
        {dates.map(dateStr => {
          const dayRecord = record.dates.find(d => d.date === dateStr);
          const status = dayRecord?.status || 'absent';
          
          return (
            <div
              key={dateStr}
              className={cn(
                'flex items-center justify-center w-10 h-7 rounded',
                getStatusClass(status)
              )}
              title={`${format(parseISO(dateStr), 'EEE, MMM d')}: ${status}`}
            >
              {getStatusIcon(status)}
            </div>
          );
        })}
      </div>

      <div className="w-20 text-right shrink-0">
        <Badge 
          variant={record.attendanceRate >= 90 ? 'default' : record.attendanceRate >= 70 ? 'secondary' : 'destructive'}
          className="gap-1"
        >
          {record.attendanceRate === 100 && <Trophy className="h-3 w-3" />}
          {record.attendanceRate}%
        </Badge>
      </div>
    </div>
  );
}

export function AttendanceInsights({ className }: AttendanceInsightsProps) {
  const { attendance, loading, error } = useTeamWorkSessions(7);

  // Get unique dates from attendance records
  const dates = attendance.length > 0 
    ? attendance[0].dates.map(d => d.date).slice(-7) 
    : [];

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Attendance This Week</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-base">Attendance This Week</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center gap-2">
                <Skeleton className="h-7 w-7 rounded-full" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-7 flex-1" />
                <Skeleton className="h-5 w-16" />
              </div>
            ))}
          </div>
        ) : attendance.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No attendance data available
          </p>
        ) : (
          <>
            {/* Date headers */}
            <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground">
              <div className="w-36 shrink-0" />
              <div className="flex gap-1 flex-1">
                {dates.map(dateStr => (
                  <div key={dateStr} className="w-10 text-center">
                    {format(parseISO(dateStr), 'EEE')}
                  </div>
                ))}
              </div>
              <div className="w-20 text-right shrink-0">Rate</div>
            </div>

            {/* Member rows */}
            <div className="divide-y">
              {attendance
                .sort((a, b) => b.attendanceRate - a.attendanceRate)
                .map(record => (
                  <AttendanceRow key={record.userId} record={record} dates={dates} />
                ))}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 mt-4 pt-4 border-t text-xs text-muted-foreground">
              <span>Legend:</span>
              <div className="flex items-center gap-1">
                <div className={cn('w-5 h-5 rounded flex items-center justify-center', getStatusClass('present'))}>
                  <Check className="h-3 w-3" />
                </div>
                <span>Present</span>
              </div>
              <div className="flex items-center gap-1">
                <div className={cn('w-5 h-5 rounded flex items-center justify-center', getStatusClass('late'))}>
                  <Zap className="h-3 w-3" />
                </div>
                <span>Late</span>
              </div>
              <div className="flex items-center gap-1">
                <div className={cn('w-5 h-5 rounded flex items-center justify-center', getStatusClass('absent'))}>
                  <X className="h-3 w-3" />
                </div>
                <span>Absent</span>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
