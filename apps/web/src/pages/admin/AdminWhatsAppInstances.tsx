import { useState } from 'react';
import { toast } from 'sonner';
import AdminLayout from '@/components/layout/AdminLayout';
import { useAdminOwnInstances, AdminWhatsAppInstance } from '@/hooks/useAdminOwnInstances';
import AdminInstanceCard from '@/components/admin-instances/AdminInstanceCard';
import AdminAddInstanceDialog from '@/components/admin-instances/AdminAddInstanceDialog';
import AdminConnectQRDialog from '@/components/admin-instances/AdminConnectQRDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { KpiCard } from '@/components/dashboard/bento/KpiCard';
import { m, pageEnter, staggerContainer, staggerItem, useCountUp } from '@/lib/motion';
import { Plus, Smartphone, MessageSquare, Wifi, WifiOff, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';

/**
 * The single full-orange surface on this page (DESIGN.md §2.2): the focal KPI.
 * Connected sessions are the metric that matters most across the admin's tenants —
 * orange stays rare; every other stat uses a soft KpiCard.
 */
function ConnectedHighlightTile({ connected, total }: { connected: number; total: number }) {
  const display = useCountUp(connected);

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
              <Wifi className="h-4 w-4" aria-hidden />
              Connected now
            </span>
            <span className="inline-flex items-center gap-0.5 rounded-full bg-white/20 px-2 py-0.5 text-xs font-semibold tabular-nums">
              {total.toLocaleString('en-US')} total
            </span>
          </div>

          <p className="mt-2 tabular-nums text-3xl font-bold leading-none tracking-tight md:text-4xl">
            {display.toLocaleString('en-US')}
          </p>

          <span className="mt-auto inline-flex w-fit items-center text-xs font-medium text-primary-foreground/80">
            Live WhatsApp sessions
          </span>
        </div>
      </div>
    </m.div>
  );
}

export default function AdminWhatsAppInstances() {
  const { instances, loading, deleteInstance, setDefaultInstance, refetch } = useAdminOwnInstances();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [connectingInstance, setConnectingInstance] = useState<AdminWhatsAppInstance | null>(null);

  const handleConnect = (instance: AdminWhatsAppInstance) => {
    setConnectingInstance(instance);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteInstance(id);
    } catch (error) {
      toast.error('Failed to delete instance');
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      await setDefaultInstance(id);
    } catch (error) {
      toast.error('Failed to set default instance');
    }
  };

  const connectedCount = instances.filter(i => i.status === 'active').length;
  const disconnectedCount = instances.filter(i => i.status !== 'active').length;

  // Session metrics derived from the loaded list (presentation only).
  const bannedCount = instances.filter(i => i.status === 'banned').length;

  return (
    <AdminLayout>
      <m.div
        variants={pageEnter}
        initial="hidden"
        animate="show"
        className="mx-auto w-full max-w-[1440px] space-y-6 p-4 md:p-6"
      >
        {/* Header — whatsapp channel chip keeps the accent on-brand. */}
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-card bg-whatsapp-light text-whatsapp">
              <Smartphone className="h-5 w-5" aria-hidden />
            </span>
            <div className="space-y-1">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">WhatsApp Instances</h1>
              <p className="text-sm text-muted-foreground">
                Manage WhatsApp connections for admin communication
              </p>
            </div>
          </div>
          <Button onClick={() => setShowAddDialog(true)} className="min-h-[44px]">
            <Plus className="h-4 w-4 mr-2" />
            Add Instance
          </Button>
        </header>

        {/* KPI strip — soft session stats + the ONE orange highlight (connected sessions). */}
        <m.div
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4"
        >
          <KpiCard title="Total instances" value={instances.length} icon={Smartphone} tone="primary" loading={loading} />
          <KpiCard title="Disconnected" value={disconnectedCount} icon={WifiOff} tone="warning" loading={loading} />
          <KpiCard title="Banned" value={bannedCount} icon={AlertTriangle} tone="destructive" loading={loading} />
          <ConnectedHighlightTile connected={connectedCount} total={instances.length} />
        </m.div>

        {/* Instances List */}
        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2">
            {[1, 2].map((i) => (
              <Card key={i} className="rounded-card shadow-elevation-1">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <Skeleton className="h-12 w-12 rounded-xl" />
                    <div className="flex-1">
                      <Skeleton className="h-5 w-32 mb-2" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : instances.length === 0 ? (
          <Card className="rounded-card border-2 border-dashed shadow-elevation-1">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-whatsapp/10">
                <Smartphone className="h-8 w-8 text-whatsapp" />
              </div>
              <h3 className="mb-1 text-lg font-semibold">No WhatsApp Instances</h3>
              <p className="mb-4 max-w-md text-center text-muted-foreground">
                Add a WhatsApp instance to start sending and receiving messages from the admin panel.
              </p>
              <Button onClick={() => setShowAddDialog(true)} className="min-h-[44px]">
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Instance
              </Button>
            </CardContent>
          </Card>
        ) : (
          <m.div
            variants={staggerContainer}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2"
          >
            {instances.map((instance) => (
              <AdminInstanceCard
                key={instance.id}
                instance={instance}
                onConnect={handleConnect}
                onDelete={handleDelete}
                onSetDefault={handleSetDefault}
              />
            ))}
          </m.div>
        )}

        {/* Quick Actions */}
        {instances.length > 0 && connectedCount > 0 && (
          <Card className="rounded-card shadow-elevation-1">
            <CardHeader>
              <CardTitle className="text-base">Quick Actions</CardTitle>
              <CardDescription>Use your connected instances</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              <Button asChild variant="outline" className="min-h-[44px]">
                <Link to="/admin/inbox">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Open Admin Inbox
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </m.div>

      {/* Dialogs */}
      <AdminAddInstanceDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
      />

      {connectingInstance && (
        <AdminConnectQRDialog
          open={!!connectingInstance}
          onOpenChange={(open) => !open && setConnectingInstance(null)}
          instance={connectingInstance}
          onConnected={refetch}
        />
      )}
    </AdminLayout>
  );
}
