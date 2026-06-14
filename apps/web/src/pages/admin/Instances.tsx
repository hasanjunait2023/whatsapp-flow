import { useState, useMemo } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import { useAdminInstances, AdminInstance } from '@/hooks/useAdminInstances';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { KpiCard } from '@/components/dashboard/bento/KpiCard';
import { ConnectedHighlightTile } from '@/components/admin/instances/ConnectedHighlightTile';
import { MobileDataCard } from '@/components/admin/MobileDataCard';
import { m, pageEnter, staggerContainer, staggerItem } from '@/lib/motion';
import { cn } from '@/lib/utils';
import { RefreshCw, Search, Smartphone, MessageSquare, Wifi, WifiOff, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { useIsMobile } from '@/hooks/use-mobile';

type StatusTone = NonNullable<BadgeProps['variant']>;

// Cross-tenant session status → soft pill (DESIGN.md §2.7). Connected uses the
// success tone; the WhatsApp channel token is reserved for the connected row accent.
const STATUS_META: Record<string, { label: string; variant: StatusTone; dot: string }> = {
  active: { label: 'Connected', variant: 'success-soft', dot: 'bg-success' },
  disconnected: { label: 'Disconnected', variant: 'neutral-soft', dot: 'bg-muted-foreground' },
  pending: { label: 'Pending', variant: 'warning-soft', dot: 'bg-warning' },
  error: { label: 'Error', variant: 'destructive-soft', dot: 'bg-destructive' },
  banned: { label: 'Banned', variant: 'destructive-soft', dot: 'bg-destructive' },
};

function StatusPill({ status }: { status: string }) {
  const meta = STATUS_META[status] ?? {
    label: status,
    variant: 'neutral-soft' as const,
    dot: 'bg-muted-foreground',
  };
  return (
    <Badge variant={meta.variant} className="gap-1.5 capitalize">
      <span className={cn('h-1.5 w-1.5 rounded-full', meta.dot)} aria-hidden />
      {meta.label}
    </Badge>
  );
}

export default function AdminInstances() {
  const { instances, loading, refetch } = useAdminInstances();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const isMobile = useIsMobile();

  const filteredInstances = instances.filter((instance) => {
    const matchesSearch =
      instance.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      instance.phone_number?.includes(searchQuery) ||
      instance.tenant_name.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || instance.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const statuses = [...new Set(instances.map((i) => i.status))];

  // KPI metrics derived from real data (presentation only).
  const metrics = useMemo(() => {
    const connected = instances.filter((i) => i.status === 'active').length;
    const disconnected = instances.filter((i) => i.status === 'disconnected').length;
    const issues = instances.filter((i) => i.status === 'pending' || i.status === 'error' || i.status === 'banned').length;
    return { total: instances.length, connected, disconnected, issues };
  }, [instances]);

  // Mobile instance card renderer
  const renderInstanceCard = (instance: AdminInstance) => {
    const isConnected = instance.status === 'active';
    return (
      <MobileDataCard
        key={instance.id}
        data={instance}
        header={
          <div className="flex items-start gap-3">
            <div
              className={cn(
                'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                isConnected ? 'bg-whatsapp/10 text-whatsapp' : 'bg-muted text-muted-foreground',
              )}
            >
              <Smartphone className="h-5 w-5" />
            </div>
            <div className="space-y-0.5">
              <p className="font-medium leading-tight">{instance.name}</p>
              <p className="text-xs text-muted-foreground">
                {instance.phone_number || 'No phone connected'}
              </p>
            </div>
          </div>
        }
        fields={[
          {
            key: 'tenant_name',
            label: 'Tenant',
            render: (data) => data.tenant_name,
          },
          {
            key: 'status',
            label: 'Status',
            render: (data) => <StatusPill status={data.status} />,
          },
          {
            key: 'message_count',
            label: 'Messages',
            render: (data) => (
              <div className="flex items-center gap-1">
                <MessageSquare className="h-3 w-3 text-muted-foreground" />
                <span className="tabular-nums">{data.message_count.toLocaleString()}</span>
              </div>
            ),
          },
        ]}
      />
    );
  };

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
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">WhatsApp</h1>
            <p className="text-sm text-muted-foreground">
              Monitor all WhatsApp connections across tenants
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={loading}
            className="min-h-[44px] self-start sm:min-h-0 sm:self-auto"
          >
            <RefreshCw className={cn('h-4 w-4 md:mr-2', loading && 'animate-spin')} aria-hidden />
            <span className="hidden md:inline">Refresh</span>
          </Button>
        </header>

        {/* KPI strip — 3 stat cards + the ONE orange Connected tile */}
        <m.div
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="grid grid-cols-2 gap-4 lg:grid-cols-4 sm:gap-5"
        >
          <KpiCard title="Total WhatsApp" value={metrics.total} icon={Smartphone} tone="info" loading={loading} />
          <KpiCard
            title="Disconnected"
            value={metrics.disconnected}
            icon={WifiOff}
            tone="warning"
            loading={loading}
          />
          <KpiCard
            title="Issues"
            value={metrics.issues}
            icon={AlertTriangle}
            tone={metrics.issues > 0 ? 'destructive' : 'success'}
            loading={loading}
          />
          <m.div variants={staggerItem}>
            <ConnectedHighlightTile connected={metrics.connected} total={metrics.total} loading={loading} />
          </m.div>
        </m.div>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by name, phone, or tenant..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {statuses.map((status) => (
                    <SelectItem key={status} value={status} className="capitalize">
                      {status}
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
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : filteredInstances.length === 0 ? (
              <EmptyState
                icon={Smartphone}
                title="No WhatsApp found"
                description={
                  searchQuery || statusFilter !== 'all'
                    ? 'Try adjusting your filters to see more connections.'
                    : 'No WhatsApp connections in the system yet.'
                }
                className="py-12"
              />
            ) : isMobile ? (
              // Mobile: Card-based list
              <div className="space-y-3">{filteredInstances.map(renderInstanceCard)}</div>
            ) : (
              // Desktop: Table
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>WhatsApp</TableHead>
                    <TableHead>Tenant</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Messages</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInstances.map((instance) => {
                    const isConnected = instance.status === 'active';
                    return (
                      <TableRow key={instance.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div
                              className={cn(
                                'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
                                // Connected rows carry the WhatsApp channel token; everything
                                // else stays neutral so a live session reads at a glance.
                                isConnected ? 'bg-whatsapp/10 text-whatsapp' : 'bg-muted text-muted-foreground',
                              )}
                            >
                              {isConnected ? <Wifi className="h-4 w-4" /> : <Smartphone className="h-4 w-4" />}
                            </div>
                            <div>
                              <p className="font-medium leading-tight">{instance.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {instance.phone_number || 'No phone connected'}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{instance.tenant_name}</TableCell>
                        <TableCell>
                          <StatusPill status={instance.status} />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <MessageSquare className="h-3 w-3 text-muted-foreground" />
                            <span className="tabular-nums">{instance.message_count.toLocaleString()}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(instance.created_at), 'MMM d, yyyy')}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </m.div>
    </AdminLayout>
  );
}
