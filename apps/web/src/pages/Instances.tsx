import { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useInstances } from '@/hooks/useInstances';
import { useTenant } from '@/hooks/useTenant';
import { usePlanLimits } from '@/hooks/usePlanLimits';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import AddInstanceDialog from '@/components/instances/AddInstanceDialog';
import InstanceCard from '@/components/instances/InstanceCard';
import { LimitReachedCard, UsageBadge } from '@/components/billing/LimitReachedCard';
import { KpiCard } from '@/components/dashboard/bento/KpiCard';
import { m, pageEnter, staggerContainer, staggerItem, useCountUp } from '@/lib/motion';
import { Plus, Smartphone, AlertCircle, Wifi, WifiOff, AlertTriangle } from 'lucide-react';

/**
 * The single full-orange surface on the Instances page (DESIGN.md §2.2): the focal KPI.
 * Connected sessions are the metric that matters most here — orange stays rare, every other
 * stat uses a soft KpiCard.
 */
function ConnectedHighlightTile({ connected, total }: { connected: number; total: number }) {
  const display = useCountUp(connected);

  return (
    <m.div variants={staggerItem} whileHover={{ y: -2 }} transition={{ duration: 0.15 }} className="h-full">
      <div className="relative flex h-full min-h-[140px] flex-col overflow-hidden rounded-card bg-primary p-5 text-primary-foreground shadow-elevation-2">
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

export default function Instances() {
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const { instances, loading, error: instancesError, setDefaultInstance, deleteInstance, refetch } = useInstances();
  const { currentTenant, isOwner, isManager } = useTenant();
  const { instances: instanceLimits, planName, isLoading: limitsLoading } = usePlanLimits();
  const { toast } = useToast();
  
  const canAddInstance = instanceLimits.canAdd;

  const canManageInstances = isOwner || isManager;

  // Session metrics derived from the loaded list (presentation only).
  const stats = {
    total: instances.length,
    connected: instances.filter((i) => i.status === 'active').length,
    disconnected: instances.filter((i) => i.status === 'disconnected').length,
    banned: instances.filter((i) => i.status === 'banned').length,
  };

  const handleSetDefault = async (id: string) => {
    try {
      await setDefaultInstance(id);
      toast({
        title: 'Default WhatsApp updated',
        description: 'The default WhatsApp has been changed.',
      });
    } catch (error: any) {
      toast({
        title: 'Failed to update default',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteInstance(id);
      toast({
        title: 'WhatsApp deleted',
        description: 'The WhatsApp connection has been removed.',
      });
    } catch (error: any) {
      toast({
        title: 'Failed to delete instance',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  return (
    <DashboardLayout>
      <m.div
        variants={pageEnter}
        initial="hidden"
        animate="show"
        className="mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-8 py-5 space-y-6"
      >
        {/* Header */}
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">WhatsApp Connections</h1>
            <p className="text-sm text-muted-foreground">
              Manage your connected WhatsApp accounts
            </p>
          </div>
          <div className="flex items-center gap-3">
            <UsageBadge 
              current={instanceLimits.current} 
              max={instanceLimits.max} 
              resourceType="instance" 
            />
            {canManageInstances && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button
                      onClick={() => setAddDialogOpen(true)}
                      disabled={!canAddInstance}
                      className="min-h-[44px]"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Instance
                    </Button>
                  </span>
                </TooltipTrigger>
                {!canAddInstance && (
                  <TooltipContent>
                    <p>WhatsApp limit reached. Upgrade your plan to add more.</p>
                  </TooltipContent>
                )}
              </Tooltip>
            )}
          </div>
        </header>

        {/* KPI strip — soft session stats + the ONE orange highlight (connected sessions) */}
        <m.div
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4"
        >
          <KpiCard title="Total instances" value={stats.total} icon={Smartphone} tone="primary" loading={loading} />
          <KpiCard title="Disconnected" value={stats.disconnected} icon={WifiOff} tone="warning" loading={loading} />
          <KpiCard title="Banned" value={stats.banned} icon={AlertTriangle} tone="destructive" loading={loading} />
          <ConnectedHighlightTile connected={stats.connected} total={stats.total} />
        </m.div>

        {/* Info Card */}
        <Card className="rounded-card border-info/20 bg-info-soft shadow-elevation-1">
          <CardContent className="flex items-start gap-3 py-4">
            <AlertCircle className="h-5 w-5 text-info mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">
                WhatsApp Integration
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Connect your WhatsApp instances to start managing conversations. You'll need
                your API credentials to get started.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Limit Reached Warning */}
        {instanceLimits.isAtLimit && !loading && instances.length > 0 && (
          <LimitReachedCard
            resourceType="instance"
            current={instanceLimits.current}
            max={instanceLimits.max}
            currentPlanName={planName || undefined}
          />
        )}

        {/* Loading State */}
        {loading && (
          <div className="grid gap-4 sm:gap-5 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="rounded-card shadow-elevation-1">
                <CardHeader className="pb-2">
                  <div className="flex items-start gap-3">
                    <Skeleton className="h-11 w-11 rounded-xl" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Skeleton className="h-6 w-24 rounded-full" />
                  <Skeleton className="h-8 w-full rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Error State */}
        {!loading && instancesError && (
          <Card className="rounded-card border-destructive/30 shadow-elevation-1">
            <CardContent className="py-6 text-center text-sm text-destructive">
              Failed to load instances. Please refresh the page.
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {!loading && !instancesError && instances.length === 0 && (
          <Card className="rounded-card border-2 border-dashed shadow-elevation-1">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="h-16 w-16 rounded-2xl bg-whatsapp/10 flex items-center justify-center mb-4">
                <Smartphone className="h-8 w-8 text-whatsapp" />
              </div>
              <CardTitle className="text-xl mb-2">No WhatsApp connected</CardTitle>
              <CardDescription className="text-center max-w-sm mb-6">
                Connect your first WhatsApp account to start managing conversations.
              </CardDescription>
              {canManageInstances && (
                <Button onClick={() => setAddDialogOpen(true)} className="min-h-[44px]">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First WhatsApp
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Instances Grid */}
        {!loading && instances.length > 0 && (
          <m.div
            variants={staggerContainer}
            initial="hidden"
            animate="show"
            className="grid gap-4 sm:gap-5 md:grid-cols-2 lg:grid-cols-3"
          >
            {instances.map((instance) => (
              <InstanceCard
                key={instance.id}
                instance={instance}
                onSetDefault={handleSetDefault}
                onDelete={handleDelete}
                onRefresh={refetch}
              />
            ))}
          </m.div>
        )}
      </m.div>

      <AddInstanceDialog open={addDialogOpen} onOpenChange={setAddDialogOpen} />
    </DashboardLayout>
  );
}
