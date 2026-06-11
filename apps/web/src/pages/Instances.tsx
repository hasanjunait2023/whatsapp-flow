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
import { Plus, Smartphone, AlertCircle } from 'lucide-react';

export default function Instances() {
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const { instances, loading, setDefaultInstance, deleteInstance, refetch } = useInstances();
  const { currentTenant, isOwner, isManager } = useTenant();
  const { instances: instanceLimits, planName, isLoading: limitsLoading } = usePlanLimits();
  const { toast } = useToast();
  
  const canAddInstance = instanceLimits.canAdd;

  const canManageInstances = isOwner || isManager;

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
      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">WhatsApp Connections</h1>
            <p className="text-muted-foreground">
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
        </div>

        {/* Info Card */}
        <Card className="border-info/20 bg-info/5">
          <CardContent className="flex items-start gap-3 py-4">
            <AlertCircle className="h-5 w-5 text-info mt-0.5" />
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
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="border-border/50">
                <CardHeader className="pb-2">
                  <div className="flex items-start gap-3">
                    <Skeleton className="h-10 w-10 rounded-lg" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-6 w-24" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && instances.length === 0 && (
          <Card className="border-dashed border-2">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="h-16 w-16 rounded-2xl bg-whatsapp/10 flex items-center justify-center mb-4">
                <Smartphone className="h-8 w-8 text-whatsapp" />
              </div>
              <CardTitle className="text-xl mb-2">No WhatsApp connected</CardTitle>
              <CardDescription className="text-center max-w-sm mb-6">
                Connect your first WhatsApp account to start managing conversations.
              </CardDescription>
              {canManageInstances && (
                <Button onClick={() => setAddDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First WhatsApp
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Instances Grid */}
        {!loading && instances.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {instances.map((instance) => (
              <InstanceCard
                key={instance.id}
                instance={instance}
                onSetDefault={handleSetDefault}
                onDelete={handleDelete}
                onRefresh={refetch}
              />
            ))}
          </div>
        )}
      </div>

      <AddInstanceDialog open={addDialogOpen} onOpenChange={setAddDialogOpen} />
    </DashboardLayout>
  );
}
