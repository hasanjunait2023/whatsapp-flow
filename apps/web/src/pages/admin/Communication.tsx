import { useMemo, useState } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { EmptyState } from '@/components/ui/empty-state';
import { KpiCard } from '@/components/dashboard/bento/KpiCard';
import { m, pageEnter, staggerContainer, staggerItem, useCountUp } from '@/lib/motion';
import { cn } from '@/lib/utils';
import {
  MessageSquare,
  Phone,
  RefreshCw,
  ExternalLink,
  Inbox,
  Users,
  Workflow,
  Zap,
  Link2,
  Plus,
  Trash2,
  Wifi,
  Radio,
} from 'lucide-react';
import { useAdminCommunication } from '@/hooks/useAdminCommunication';
import { Link } from 'react-router-dom';
import AdminConnectQRDialog from '@/components/admin/AdminConnectQRDialog';
import AdminAddInstanceDialog from '@/components/admin/AdminAddInstanceDialog';
import AdminDeleteInstanceDialog from '@/components/admin/AdminDeleteInstanceDialog';

interface AdminInstance {
  id: string;
  name: string;
  status: string;
  phone_number?: string | null;
}

type StatusVariant = 'success-soft' | 'info-soft' | 'neutral-soft' | 'destructive-soft';

const STATUS_META: Record<string, { label: string; variant: StatusVariant; dot: string }> = {
  connected: { label: 'Connected', variant: 'success-soft', dot: 'bg-success' },
  active: { label: 'Active', variant: 'success-soft', dot: 'bg-success' },
  connecting: { label: 'Connecting', variant: 'info-soft', dot: 'bg-info' },
  disconnected: { label: 'Disconnected', variant: 'neutral-soft', dot: 'bg-muted-foreground' },
  banned: { label: 'Banned', variant: 'destructive-soft', dot: 'bg-destructive' },
};

function getStatusMeta(status: string) {
  return (
    STATUS_META[status] || {
      label: status || 'Unknown',
      variant: 'destructive-soft' as const,
      dot: 'bg-destructive',
    }
  );
}

function getInitials(name: string) {
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

const QUICK_LINKS = [
  { to: '/admin/inbox', icon: Inbox, title: 'Admin Inbox', description: 'View and respond to messages' },
  { to: '/admin/whatsapp-functions', icon: Zap, title: 'WA Functions', description: 'Quick replies & auto messages' },
  { to: '/contacts', icon: Users, title: 'Admin Contacts', description: 'Manage leads and contacts' },
  { to: '/workflows', icon: Workflow, title: 'Automation', description: 'Auto-replies and workflows' },
] as const;

/**
 * The single full-orange surface on this page (DESIGN.md §2.2): the focal KPI.
 * Active (live) WhatsApp channels is the page's most important metric — orange stays
 * rare, so this is the only `bg-primary` tile; every other stat uses a soft KpiCard.
 */
function ChannelsHighlightTile({ active, total }: { active: number; total: number }) {
  const display = useCountUp(active);

  return (
    <m.div variants={staggerItem} whileHover={{ y: -2 }} transition={{ duration: 0.15 }} className="h-full">
      <div className="relative flex h-full min-h-[140px] flex-col overflow-hidden rounded-card bg-primary p-5 text-primary-foreground shadow-elevation-accent">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/15 via-transparent to-black/10"
        />
        <div className="relative z-10 flex h-full flex-col">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-2 text-sm font-medium text-primary-foreground/85">
              <Radio className="h-4 w-4" aria-hidden />
              Live channels
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 text-xs font-semibold tabular-nums">
              {total.toLocaleString('en-US')} total
            </span>
          </div>

          <p className="mt-2 tabular-nums text-3xl font-bold leading-none tracking-tight md:text-4xl">
            {display.toLocaleString('en-US')}
          </p>

          <span className="mt-auto inline-flex w-fit items-center gap-1 text-xs font-medium text-primary-foreground/80">
            <Wifi className="h-3.5 w-3.5" aria-hidden />
            Connected and ready to message
          </span>
        </div>
      </div>
    </m.div>
  );
}

export default function Communication() {
  const [connectingInstance, setConnectingInstance] = useState<AdminInstance | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [deletingInstance, setDeletingInstance] = useState<AdminInstance | null>(null);

  const {
    systemTenant,
    instances,
    loading,
    creating,
    deleting,
    fetchAll,
    createInstance,
    deleteInstance,
  } = useAdminCommunication();

  const stats = useMemo(() => {
    let active = 0;
    let connecting = 0;
    let offline = 0;
    for (const instance of instances) {
      const status = instance.status;
      if (status === 'connected' || status === 'active') active += 1;
      else if (status === 'connecting') connecting += 1;
      else offline += 1;
    }
    return { total: instances.length, active, connecting, offline };
  }, [instances]);

  const webhookUrl = (instanceId: string) => {
    const base = import.meta.env.VITE_API_URL || window.location.origin;
    return `${base}/api/waha/webhook/${instanceId}`;
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
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Communication</h1>
            <p className="text-sm text-muted-foreground">
              Manage the platform WhatsApp channels used for lead communication
            </p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <Button onClick={() => setShowAddDialog(true)} disabled={loading} className="min-h-[44px] sm:min-h-0">
              <Plus className="h-4 w-4 md:mr-2" />
              <span className="hidden md:inline">Add Instance</span>
            </Button>
            <Button
              variant="outline"
              onClick={fetchAll}
              disabled={loading}
              className="min-h-[44px] sm:min-h-0"
            >
              <RefreshCw className={cn('h-4 w-4 md:mr-2', loading && 'animate-spin')} />
              <span className="hidden md:inline">Refresh</span>
            </Button>
          </div>
        </header>

        {/* KPI strip — soft stat cards + the ONE orange highlight (live channels) */}
        <m.div
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4"
        >
          <KpiCard title="Total channels" value={stats.total} icon={MessageSquare} tone="primary" loading={loading} />
          <KpiCard title="Connecting" value={stats.connecting} icon={Radio} tone="info" loading={loading} />
          <KpiCard title="Offline" value={stats.offline} icon={Phone} tone="destructive" loading={loading} />
          <ChannelsHighlightTile active={stats.active} total={stats.total} />
        </m.div>

        {/* Quick access */}
        {systemTenant && (
          <m.div
            variants={staggerContainer}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
          >
            {QUICK_LINKS.map((quick) => (
              <m.div key={quick.to} variants={staggerItem} whileHover={{ y: -2 }} transition={{ duration: 0.15 }}>
                <Link to={quick.to} className="block h-full">
                  <Card className="h-full transition-shadow hover:shadow-elevation-2">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-primary">
                          <quick.icon className="h-5 w-5" aria-hidden />
                        </span>
                        {quick.title}
                      </CardTitle>
                      <CardDescription>{quick.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-primary">
                        Open
                        <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                      </span>
                    </CardContent>
                  </Card>
                </Link>
              </m.div>
            ))}
          </m.div>
        )}

        {/* WhatsApp Instances */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col gap-1">
              <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                <MessageSquare className="h-5 w-5" />
                WhatsApp Instances
              </CardTitle>
              <CardDescription className="tabular-nums">
                {instances.length} {instances.length === 1 ? 'channel' : 'channels'} configured
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="grid gap-4 md:grid-cols-2">
                {[...Array(2)].map((_, i) => (
                  <Skeleton key={i} className="h-40 w-full rounded-card" />
                ))}
              </div>
            ) : !systemTenant ? (
              <EmptyState
                icon={MessageSquare}
                title="No system tenant found"
                description="The system tenant is not configured. Please contact support."
              />
            ) : instances.length === 0 ? (
              <EmptyState
                icon={MessageSquare}
                title="No WhatsApp instances"
                description="Add your first WhatsApp instance to start communicating with leads."
                action={{
                  label: 'Add Instance',
                  onClick: () => setShowAddDialog(true),
                  icon: Plus,
                }}
              />
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {instances.map((instance) => {
                  const meta = getStatusMeta(instance.status);
                  const isActive = instance.status === 'active' || instance.status === 'connected';
                  return (
                    <div
                      key={instance.id}
                      className="flex flex-col gap-3 rounded-card border border-border bg-card p-5 shadow-elevation-1"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="bg-muted-soft text-xs font-semibold text-muted-foreground">
                              {getInitials(instance.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="truncate font-medium">{instance.name}</p>
                            {instance.phone_number && (
                              <p className="flex items-center gap-1 truncate text-xs text-muted-foreground tabular-nums">
                                <Phone className="h-3 w-3" aria-hidden />
                                {instance.phone_number}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Badge variant={meta.variant} className="gap-1.5">
                            <span className={cn('h-1.5 w-1.5 rounded-full', meta.dot)} aria-hidden />
                            {meta.label}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => setDeletingInstance(instance)}
                            aria-label={`Delete ${instance.name}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="text-xs text-muted-foreground">
                        <p className="mb-1 font-medium">Webhook URL</p>
                        <code className="block break-all rounded-md bg-muted px-2 py-1 text-xs">
                          {webhookUrl(instance.id)}
                        </code>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant={isActive ? 'outline' : 'default'}
                          size="sm"
                          onClick={() => setConnectingInstance(instance)}
                        >
                          {isActive ? (
                            <RefreshCw className="mr-2 h-4 w-4" />
                          ) : (
                            <Link2 className="mr-2 h-4 w-4" />
                          )}
                          {isActive ? 'Reconnect' : 'Connect'}
                        </Button>
                        <Button variant="outline" size="sm" asChild>
                          <Link to="/admin/inbox">
                            <Inbox className="mr-2 h-4 w-4" />
                            Inbox
                          </Link>
                        </Button>
                        <Button variant="outline" size="sm" asChild>
                          <Link to="/contacts">
                            <Users className="mr-2 h-4 w-4" />
                            Contacts
                          </Link>
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* System Tenant Info */}
        {systemTenant && (
          <Card className="bg-muted/40">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">System Tenant</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p>
                <span className="font-medium">Name:</span> {systemTenant.name}
              </p>
              <p className="flex items-center gap-1">
                <span className="font-medium">ID:</span>
                <code className="rounded bg-background px-1 py-0.5 text-xs">{systemTenant.id}</code>
              </p>
            </CardContent>
          </Card>
        )}

        {/* Connect QR Dialog */}
        {connectingInstance && (
          <AdminConnectQRDialog
            open={!!connectingInstance}
            onOpenChange={(open) => !open && setConnectingInstance(null)}
            instance={connectingInstance}
            onConnected={() => {
              setConnectingInstance(null);
              fetchAll();
            }}
          />
        )}

        {/* Add Instance Dialog */}
        <AdminAddInstanceDialog
          open={showAddDialog}
          onOpenChange={setShowAddDialog}
          onCreateInstance={createInstance}
          creating={creating}
          onSuccess={fetchAll}
        />

        {/* Delete Instance Dialog */}
        <AdminDeleteInstanceDialog
          open={!!deletingInstance}
          onOpenChange={(open) => !open && setDeletingInstance(null)}
          instance={deletingInstance}
          onConfirm={deleteInstance}
          deleting={deleting}
        />
      </m.div>
    </AdminLayout>
  );
}
