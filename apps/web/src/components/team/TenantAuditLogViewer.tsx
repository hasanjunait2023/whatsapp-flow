import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  ClipboardList,
  Filter,
  X,
  Calendar as CalendarIcon,
  RefreshCw,
  MessageSquare,
  ShoppingCart,
  Package,
  UserCheck,
  AlertCircle,
  Truck,
  Download,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { useTenantAuditLogs, TenantAuditLog } from '@/hooks/useTenantAuditLogs';
import { cn } from '@/lib/utils';

const activityIcons: Record<string, React.ReactNode> = {
  message_sent: <MessageSquare className="h-4 w-4" />,
  order_created: <ShoppingCart className="h-4 w-4" />,
  order_updated: <Package className="h-4 w-4" />,
  contact_assigned: <UserCheck className="h-4 w-4" />,
  complaint_resolved: <AlertCircle className="h-4 w-4" />,
  parcel_booked: <Truck className="h-4 w-4" />,
};

const activityColors: Record<string, string> = {
  message_sent: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30',
  order_created: 'bg-green-100 text-green-600 dark:bg-green-900/30',
  order_updated: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30',
  contact_assigned: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30',
  complaint_resolved: 'bg-red-100 text-red-600 dark:bg-red-900/30',
  parcel_booked: 'bg-violet-100 text-violet-600 dark:bg-violet-900/30',
};

export function TenantAuditLogViewer() {
  const {
    logs,
    loading,
    filters,
    activityTypes,
    entityTypes,
    users,
    updateFilters,
    clearFilters,
    refetch,
  } = useTenantAuditLogs();

  const [datePickerOpen, setDatePickerOpen] = useState(false);

  const hasActiveFilters = Object.values(filters).some(v => v !== undefined);

  const formatActivityType = (type: string) => {
    return type
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const exportToCSV = () => {
    const headers = ['Date', 'User', 'Activity', 'Entity Type', 'Details'];
    const rows = logs.map(log => [
      format(new Date(log.created_at), 'yyyy-MM-dd HH:mm:ss'),
      log.profile?.full_name || log.profile?.email || 'Unknown',
      formatActivityType(log.activity_type),
      log.entity_type || '-',
      JSON.stringify(log.metadata),
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-log-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              Activity Log
            </CardTitle>
            <CardDescription>
              Track all team member actions in your workspace
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={exportToCSV}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <Select
            value={filters.userId || 'all'}
            onValueChange={(v) => updateFilters({ userId: v === 'all' ? undefined : v })}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Users" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Users</SelectItem>
              {users.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filters.activityType || 'all'}
            onValueChange={(v) => updateFilters({ activityType: v === 'all' ? undefined : v })}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Activities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Activities</SelectItem>
              {activityTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {formatActivityType(type)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filters.entityType || 'all'}
            onValueChange={(v) => updateFilters({ entityType: v === 'all' ? undefined : v })}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Entity Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {entityTypes.map((type) => (
                <SelectItem key={type} value={type as string}>
                  {(type as string).charAt(0).toUpperCase() + (type as string).slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-[180px] justify-start text-left">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {filters.dateFrom
                  ? format(filters.dateFrom, 'MMM d, yyyy')
                  : 'Pick date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={filters.dateFrom}
                onSelect={(date) => {
                  updateFilters({ dateFrom: date || undefined });
                  setDatePickerOpen(false);
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="h-4 w-4 mr-1" />
              Clear
            </Button>
          )}
        </div>

        {/* Log List */}
        <ScrollArea className="h-[500px]">
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-start gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12">
              <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground/50" />
              <p className="mt-4 text-muted-foreground">No activity logs found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start gap-3 p-3 rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={log.profile?.avatar_url || ''} />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {(log.profile?.full_name || log.profile?.email || 'U').charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">
                        {log.profile?.full_name || log.profile?.email || 'Unknown User'}
                      </span>
                      <div className={cn(
                        'flex items-center gap-1 px-2 py-0.5 rounded-full text-xs',
                        activityColors[log.activity_type] || 'bg-muted text-muted-foreground'
                      )}>
                        {activityIcons[log.activity_type] || <ClipboardList className="h-3 w-3" />}
                        {formatActivityType(log.activity_type)}
                      </div>
                    </div>
                    {log.entity_type && (
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {log.entity_type.charAt(0).toUpperCase() + log.entity_type.slice(1)}
                        {log.metadata && Object.keys(log.metadata).length > 0 && (
                          <span className="ml-1">
                            • {Object.entries(log.metadata as Record<string, string | number>)
                              .slice(0, 2)
                              .map(([k, v]) => `${k}: ${v}`)
                              .join(', ')}
                          </span>
                        )}
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
