import { useMemo, useState } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import { useAdminAuditLogs, AuditLog } from '@/hooks/useAdminAuditLogs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { EmptyState } from '@/components/ui/empty-state';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { KpiCard } from '@/components/dashboard/bento/KpiCard';
import { m, pageEnter, staggerContainer, staggerItem } from '@/lib/motion';
// staggerContainer drives the KPI strip; staggerItem drives short-list table rows.
import { cn } from '@/lib/utils';
import { RefreshCw, Search, FileText, Download, Activity, PlusCircle, Pencil, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { useIsMobile } from '@/hooks/use-mobile';
import { MobileDataCard } from '@/components/admin/MobileDataCard';

// Animating more than this many rows hurts on long audit logs — fall back to a static list.
const MAX_STAGGER_ROWS = 20;

type SoftVariant = 'success-soft' | 'info-soft' | 'warning-soft' | 'destructive-soft' | 'neutral-soft';

// Map an action keyword to a calm status pill (soft tint + leading dot).
const ACTION_PILL: { key: string; variant: SoftVariant; dot: string }[] = [
  { key: 'delete', variant: 'destructive-soft', dot: 'bg-destructive' },
  { key: 'revoke', variant: 'destructive-soft', dot: 'bg-destructive' },
  { key: 'reject', variant: 'warning-soft', dot: 'bg-warning' },
  { key: 'suspend', variant: 'warning-soft', dot: 'bg-warning' },
  { key: 'create', variant: 'success-soft', dot: 'bg-success' },
  { key: 'activate', variant: 'success-soft', dot: 'bg-success' },
  { key: 'grant', variant: 'success-soft', dot: 'bg-success' },
  { key: 'verify', variant: 'info-soft', dot: 'bg-info' },
  { key: 'update', variant: 'info-soft', dot: 'bg-info' },
  { key: 'change', variant: 'info-soft', dot: 'bg-info' },
];

function actionMeta(action: string): { variant: SoftVariant; dot: string } {
  const lower = action.toLowerCase();
  const match = ACTION_PILL.find((m) => lower.includes(m.key));
  return match ?? { variant: 'neutral-soft', dot: 'bg-muted-foreground' };
}

function getInitials(name: string | null | undefined): string {
  if (!name) return '?';
  return (
    name
      .split(' ')
      .map((w) => w[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase() || '?'
  );
}

function ActionPill({ action }: { action: string }) {
  const meta = actionMeta(action);
  return (
    <Badge variant={meta.variant} className="gap-1.5">
      <span className={cn('h-1.5 w-1.5 rounded-full', meta.dot)} aria-hidden />
      {action}
    </Badge>
  );
}

export default function AdminAuditLogs() {
  const { logs, loading, refetch } = useAdminAuditLogs();
  const [searchQuery, setSearchQuery] = useState('');
  const [entityFilter, setEntityFilter] = useState<string>('all');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const isMobile = useIsMobile();

  const entityTypes = [...new Set(logs.map((l) => l.entity_type))];
  const actionTypes = [...new Set(logs.map((l) => l.action))];

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.admin_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.admin_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.entity_type.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesEntity = entityFilter === 'all' || log.entity_type === entityFilter;
    const matchesAction = actionFilter === 'all' || log.action === actionFilter;

    return matchesSearch && matchesEntity && matchesAction;
  });

  // Calm metrics derived from the full log list (presentation only — no orange tile here).
  const logStats = useMemo(() => {
    let creates = 0;
    let updates = 0;
    let removals = 0;
    for (const log of logs) {
      const a = log.action.toLowerCase();
      if (a.includes('create') || a.includes('activate') || a.includes('grant')) creates += 1;
      else if (a.includes('update') || a.includes('change') || a.includes('verify')) updates += 1;
      else if (a.includes('delete') || a.includes('revoke')) removals += 1;
    }
    return { total: logs.length, creates, updates, removals };
  }, [logs]);

  const exportToCSV = () => {
    const headers = ['Date', 'Admin', 'Action', 'Entity Type', 'Entity ID', 'Details'];
    const rows = filteredLogs.map((log) => [
      format(new Date(log.created_at), 'yyyy-MM-dd HH:mm:ss'),
      log.admin_email || 'Unknown',
      log.action,
      log.entity_type,
      log.entity_id || '',
      JSON.stringify(log.details),
    ]);

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  // Mobile log card renderer
  const renderLogCard = (log: AuditLog) => (
    <MobileDataCard
      key={log.id}
      data={log}
      header={
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarFallback className="bg-muted-soft text-xs font-semibold text-muted-foreground">
              {getInitials(log.admin_name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate font-medium text-sm">{log.admin_name || 'Unknown'}</p>
            <p className="truncate text-xs text-muted-foreground">{log.admin_email}</p>
          </div>
        </div>
      }
      fields={[
        {
          key: 'action',
          label: 'Action',
          render: (data) => <ActionPill action={data.action} />,
        },
        {
          key: 'entity_type',
          label: 'Entity',
          render: (data) => data.entity_type,
        },
        {
          key: 'created_at',
          label: 'Time',
          render: (data) => (
            <span className="tabular-nums">{format(new Date(data.created_at), 'MMM d, HH:mm')}</span>
          ),
        },
      ]}
    />
  );

  const canStagger = !isMobile && filteredLogs.length > 0 && filteredLogs.length <= MAX_STAGGER_ROWS;

  return (
    <AdminLayout>
      <m.div
        variants={pageEnter}
        initial="hidden"
        animate="show"
        className="mx-auto w-full max-w-[1440px] space-y-6 p-4 md:p-6"
      >
        {/* Header */}
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Audit Logs</h1>
            <p className="text-sm text-muted-foreground">
              Track every administrative action across the platform
            </p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={exportToCSV}
              disabled={filteredLogs.length === 0}
              className="min-h-[44px] sm:min-h-0"
            >
              <Download className="h-4 w-4 md:mr-2" />
              <span className="hidden md:inline">Export CSV</span>
            </Button>
            <Button variant="outline" size="sm" onClick={() => refetch()} className="min-h-[44px] sm:min-h-0">
              <RefreshCw className="h-4 w-4 md:mr-2" />
              <span className="hidden md:inline">Refresh</span>
            </Button>
          </div>
        </header>

        {/* KPI strip — calm neutral stat cards (audit is calm: zero orange tiles) */}
        <m.div
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4"
        >
          <KpiCard title="Total events" value={logStats.total} icon={Activity} tone="info" loading={loading} />
          <KpiCard title="Created" value={logStats.creates} icon={PlusCircle} tone="success" loading={loading} />
          <KpiCard title="Updated" value={logStats.updates} icon={Pencil} tone="info" loading={loading} />
          <KpiCard title="Removed" value={logStats.removals} icon={Trash2} tone="destructive" loading={loading} />
        </m.div>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                  <FileText className="h-5 w-5" />
                  Activity
                </CardTitle>
                <CardDescription className="tabular-nums">
                  {filteredLogs.length} of {logs.length} events
                </CardDescription>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by admin, action, or entity..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <Select value={entityFilter} onValueChange={setEntityFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Entity Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Entities</SelectItem>
                  {entityTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  {actionTypes.map((action) => (
                    <SelectItem key={action} value={action}>
                      {action}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : filteredLogs.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="No audit logs found"
                description={
                  searchQuery || entityFilter !== 'all' || actionFilter !== 'all'
                    ? 'No events match your search or filters. Try adjusting them.'
                    : 'Admin actions will appear here as they happen.'
                }
              />
            ) : isMobile ? (
              <div className="space-y-3">{filteredLogs.map(renderLogCard)}</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Admin</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log, i) => (
                    <m.tr
                      key={log.id}
                      // Stagger only short lists; long audit logs render static (no animation).
                      initial={canStagger ? 'hidden' : false}
                      animate={canStagger ? 'show' : undefined}
                      variants={canStagger ? staggerItem : undefined}
                      transition={canStagger ? { delay: i * 0.04 } : undefined}
                      className="border-b transition-colors hover:bg-muted-soft data-[state=selected]:bg-muted-soft"
                    >
                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground tabular-nums">
                        {format(new Date(log.created_at), 'MMM d, yyyy HH:mm')}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarFallback className="bg-muted-soft text-xs font-semibold text-muted-foreground">
                              {getInitials(log.admin_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{log.admin_name || 'Unknown'}</p>
                            <p className="truncate text-xs text-muted-foreground">{log.admin_email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <ActionPill action={log.action} />
                      </TableCell>
                      <TableCell>
                        <p className="text-sm font-medium">{log.entity_type}</p>
                        {log.entity_id && (
                          <p className="font-mono text-xs text-muted-foreground">
                            {log.entity_id.slice(0, 8)}…
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[220px]">
                        {Object.keys(log.details).length > 0 ? (
                          <pre className="overflow-hidden text-ellipsis text-xs text-muted-foreground">
                            {JSON.stringify(log.details, null, 0).slice(0, 50)}
                            {JSON.stringify(log.details).length > 50 ? '…' : ''}
                          </pre>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </m.tr>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </m.div>
    </AdminLayout>
  );
}
