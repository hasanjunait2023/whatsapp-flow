import { useState } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import { useAdminPlans, PlanInput } from '@/hooks/useAdminPlans';
import { useBusinessTypes } from '@/hooks/useBusinessTypes';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, RefreshCw, Bot, Settings2, Warehouse, ShoppingBag, Briefcase, Settings, Wand2, ArrowRightLeft, Layers, CheckCircle, Bot as BotIcon } from 'lucide-react';
import { toast } from 'sonner';
import FeatureToggles, { FeatureFlags } from '@/components/admin/FeatureToggles';
import { AdminPlanCard } from '@/components/admin/plans/AdminPlanCard';
import { PlansHighlightTile } from '@/components/admin/plans/PlansHighlightTile';
import { KpiCard } from '@/components/dashboard/bento/KpiCard';
import { BusinessTypeSettings } from '@/components/admin/BusinessTypeSettings';
import { FeatureTemplateBuilder } from '@/components/admin/FeatureTemplateBuilder';
import { useFeatureTemplates, TierLevel } from '@/hooks/useFeatureTemplates';
import { PlanMigrationDialog } from '@/components/admin/PlanMigrationDialog';
import { m, pageEnter, staggerContainer, staggerItem } from '@/lib/motion';

interface ExtendedPlanInput extends PlanInput {
  features?: FeatureFlags;
}

const DEFAULT_FEATURES: FeatureFlags = {
  orders_enabled: true,
  products_enabled: true,
  automation_enabled: true,
  workflows_enabled: true,
  analytics_enabled: true,
  team_enabled: true,
  ai_agent_enabled: false,
  quick_replies_enabled: true,
  invoice_generation: false,
  woocommerce_sync: false,
  contacts_enabled: true,
  fb_messenger_enabled: true,
  reports_enabled: true,
  followup_messages_enabled: false,
};

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  warehouse: Warehouse,
  'shopping-bag': ShoppingBag,
  briefcase: Briefcase,
};

export default function AdminPlans() {
  const { plans, loading, refetch, createPlan, updatePlan, togglePlanActive } = useAdminPlans();
  const { businessTypes, features: businessFeatures, loading: typesLoading, refetch: refetchTypes } = useBusinessTypes();
  const { getTemplateForTier } = useFeatureTemplates();
  const [activeTab, setActiveTab] = useState<string>('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [applyingTemplate, setApplyingTemplate] = useState(false);
  const [migrationDialogOpen, setMigrationDialogOpen] = useState(false);

  // Set initial tab when business types load
  if (!activeTab && businessTypes.length > 0) {
    setActiveTab(businessTypes[0].slug);
  }

  const [formData, setFormData] = useState<ExtendedPlanInput>({
    name: '',
    description: '',
    price_monthly: 0,
    price_yearly: 0,
    max_instances: 1,
    max_agents: 1,
    max_messages_per_month: 1000,
    ai_enabled: false,
    is_active: true,
    business_type_id: '',
    tier: 'starter',
    features: { ...DEFAULT_FEATURES },
  });

  const resetForm = () => {
    const currentType = businessTypes.find(t => t.slug === activeTab);
    setFormData({
      name: '',
      description: '',
      price_monthly: 0,
      price_yearly: 0,
      max_instances: 1,
      max_agents: 1,
      max_messages_per_month: 1000,
      ai_enabled: false,
      is_active: true,
      business_type_id: currentType?.id || '',
      tier: 'starter',
      features: { ...DEFAULT_FEATURES },
    });
  };

  const handleCreate = async () => {
    if (!formData.name) return;
    setProcessing(true);
    try {
      await createPlan(formData as any);
      toast.success('Plan created successfully');
      setCreateDialogOpen(false);
      resetForm();
    } catch (error) {
      toast.error('Failed to create plan');
    } finally {
      setProcessing(false);
    }
  };

  const handleEdit = async () => {
    if (!selectedPlanId || !formData.name) return;
    setProcessing(true);
    try {
      await updatePlan(selectedPlanId, formData as any);
      toast.success('Plan updated successfully');
      setEditDialogOpen(false);
      setSelectedPlanId(null);
      resetForm();
    } catch (error) {
      toast.error('Failed to update plan');
    } finally {
      setProcessing(false);
    }
  };

  const handleToggleActive = async (planId: string, isActive: boolean) => {
    try {
      await togglePlanActive(planId, isActive);
      toast.success(`Plan ${isActive ? 'activated' : 'deactivated'}`);
    } catch (error) {
      toast.error('Failed to update plan status');
    }
  };

  const openEditDialog = (plan: typeof plans[0]) => {
    setSelectedPlanId(plan.id);
    setFormData({
      name: plan.name,
      description: plan.description || '',
      price_monthly: plan.price_monthly,
      price_yearly: plan.price_yearly || 0,
      max_instances: plan.max_instances,
      max_agents: plan.max_agents,
      max_messages_per_month: plan.max_messages_per_month,
      ai_enabled: plan.ai_enabled,
      is_active: plan.is_active,
      business_type_id: plan.business_type_id || '',
      tier: plan.tier || 'starter',
      features: (plan as any).features || { ...DEFAULT_FEATURES },
    });
    setEditDialogOpen(true);
  };

  // Get plans for current business type
  const currentBusinessType = businessTypes.find(t => t.slug === activeTab);
  const filteredPlans = currentBusinessType
    ? plans.filter(p => p.business_type_id === currentBusinessType.id)
    : [];
  const currentFeatures = currentBusinessType
    ? businessFeatures.filter(f => f.business_type_id === currentBusinessType.id)
    : [];

  // KPI metrics for the current business type tab — presentation only, derived from loaded plans.
  const planMetrics = {
    total: filteredPlans.length,
    active: filteredPlans.filter((p) => p.is_active).length,
    aiPlans: filteredPlans.filter((p) => p.ai_enabled).length,
    subscribers: filteredPlans.reduce((sum, p) => sum + (p.subscriber_count || 0), 0),
  };

  const handleApplyTemplate = async () => {
    if (!formData.business_type_id || !formData.tier) return;
    
    setApplyingTemplate(true);
    try {
      const templateFeatures = await getTemplateForTier(formData.business_type_id, formData.tier as TierLevel);
      setFormData((prev) => ({
        ...prev,
        features: { ...prev.features, ...templateFeatures },
      }));
      toast.success('Template applied successfully');
    } catch (err) {
      toast.error('Failed to apply template');
    } finally {
      setApplyingTemplate(false);
    }
  };

  const PlanForm = ({ onSubmit, submitLabel }: { onSubmit: () => void; submitLabel: string }) => (
    <Tabs defaultValue="basic" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="basic">Basic Info</TabsTrigger>
        <TabsTrigger value="features" className="gap-2">
          <Settings2 className="h-4 w-4" />
          Features
        </TabsTrigger>
      </TabsList>

      <ScrollArea className="h-[400px] pr-4">
        <TabsContent value="basic" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Plan Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Professional"
              />
            </div>
            <div className="space-y-2">
              <Label>Tier</Label>
              <Select value={formData.tier} onValueChange={(v) => setFormData({ ...formData, tier: v as any })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="starter">Starter</SelectItem>
                  <SelectItem value="growth">Growth</SelectItem>
                  <SelectItem value="pro">Pro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Monthly Price (BDT)</Label>
              <Input
                type="number"
                value={formData.price_monthly}
                onChange={(e) => setFormData({ ...formData, price_monthly: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label>Yearly Price (BDT)</Label>
              <Input
                type="number"
                value={formData.price_yearly}
                onChange={(e) => setFormData({ ...formData, price_yearly: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Plan description..."
              rows={2}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Max Instances</Label>
              <Input
                type="number"
                value={formData.max_instances}
                onChange={(e) => setFormData({ ...formData, max_instances: parseInt(e.target.value) || 1 })}
                min="1"
              />
            </div>
            <div className="space-y-2">
              <Label>Max Agents</Label>
              <Input
                type="number"
                value={formData.max_agents}
                onChange={(e) => setFormData({ ...formData, max_agents: parseInt(e.target.value) || 1 })}
                min="1"
              />
            </div>
            <div className="space-y-2">
              <Label>Messages/Month</Label>
              <Input
                type="number"
                value={formData.max_messages_per_month}
                onChange={(e) => setFormData({ ...formData, max_messages_per_month: parseInt(e.target.value) || 1000 })}
                min="100"
                step="100"
              />
            </div>
          </div>

          <div className="flex items-center justify-between border rounded-lg p-3">
            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-muted-foreground" />
              <Label>AI Features Enabled</Label>
            </div>
            <Switch
              checked={formData.ai_enabled}
              onCheckedChange={(checked) => setFormData({ ...formData, ai_enabled: checked })}
            />
          </div>
        </TabsContent>

        <TabsContent value="features" className="mt-4 space-y-4">
          {/* Apply Template Button */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg border bg-muted/30">
            <div>
              <p className="text-sm font-medium">Apply Template</p>
              <p className="text-xs text-muted-foreground">
                Auto-fill features based on business type and tier
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleApplyTemplate}
              disabled={applyingTemplate || !formData.business_type_id}
              className="w-full sm:w-auto"
            >
              <Wand2 className="h-4 w-4 mr-2" />
              {applyingTemplate ? 'Applying...' : 'Apply'}
            </Button>
          </div>

          <FeatureToggles
            features={formData.features || DEFAULT_FEATURES}
            onChange={(features) => setFormData({ ...formData, features })}
          />
        </TabsContent>
      </ScrollArea>

      <DialogFooter className="mt-4 pt-4 border-t flex-col sm:flex-row gap-2">
        <Button variant="outline" onClick={() => { setCreateDialogOpen(false); setEditDialogOpen(false); resetForm(); }} className="w-full sm:w-auto">
          Cancel
        </Button>
        <Button onClick={onSubmit} disabled={!formData.name || processing} className="w-full sm:w-auto">
          {submitLabel}
        </Button>
      </DialogFooter>
    </Tabs>
  );

  const isLoading = loading || typesLoading;

  return (
    <AdminLayout>
      <m.div
        variants={pageEnter}
        initial="hidden"
        animate="show"
        className="mx-auto w-full max-w-[1440px] space-y-6 p-4 md:p-6"
      >
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Subscription Plans</h1>
            <p className="text-sm text-muted-foreground">Manage plans by business type</p>
          </div>
          <div className="flex flex-wrap gap-2 self-start sm:self-auto">
            <Button variant="outline" size="sm" onClick={() => setMigrationDialogOpen(true)} className="min-h-[44px] sm:min-h-0">
              <ArrowRightLeft className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Migrate Plans</span>
            </Button>
            <Button variant="outline" size="sm" onClick={() => { refetch(); refetchTypes(); }} className="min-h-[44px] sm:min-h-0">
              <RefreshCw className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            {activeTab !== 'settings' && (
              <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" onClick={resetForm}>
                    <Plus className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Add Plan</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Create New Plan</DialogTitle>
                    <DialogDescription>
                      Create a plan for {currentBusinessType?.name}
                    </DialogDescription>
                  </DialogHeader>
                  <PlanForm onSubmit={handleCreate} submitLabel="Create Plan" />
                </DialogContent>
              </Dialog>
            )}
          </div>
        </header>

        {/* KPI strip — 3 stat cards + the ONE orange subscribers tile */}
        {activeTab !== 'settings' && (
          <m.div
            variants={staggerContainer}
            initial="hidden"
            animate="show"
            className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4"
          >
            <KpiCard
              title="Plans"
              value={planMetrics.total}
              icon={Layers}
              tone="info"
              loading={isLoading}
            />
            <KpiCard
              title="Active"
              value={planMetrics.active}
              icon={CheckCircle}
              tone="success"
              loading={isLoading}
            />
            <KpiCard
              title="AI-enabled"
              value={planMetrics.aiPlans}
              icon={BotIcon}
              tone="primary"
              loading={isLoading}
            />
            <m.div variants={staggerItem}>
              <PlansHighlightTile
                subscribers={planMetrics.subscribers}
                livePlans={planMetrics.active}
                loading={isLoading}
              />
            </m.div>
          </m.div>
        )}

        {/* Business Type Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0 pb-2">
            <TabsList className="inline-flex min-w-max md:w-full md:min-w-0 h-auto flex-nowrap md:flex-wrap gap-1 bg-muted/50 p-1">
              {businessTypes.map((type) => {
                const IconComponent = ICON_MAP[type.icon || ''] || Briefcase;
                return (
                  <TabsTrigger key={type.slug} value={type.slug} className="flex items-center gap-2 whitespace-nowrap">
                    <IconComponent className="h-4 w-4" />
                    <span className="hidden sm:inline">{type.name}</span>
                  </TabsTrigger>
                );
              })}
              <TabsTrigger value="settings" className="flex items-center gap-2 md:ml-auto whitespace-nowrap">
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">Settings</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Business Type Plan Grids */}
          {businessTypes.map((type) => (
            <TabsContent key={type.slug} value={type.slug} className="mt-6">
              {isLoading ? (
                <div className="grid gap-4 md:gap-6 grid-cols-1 md:grid-cols-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-[400px] w-full" />
                  ))}
                </div>
              ) : filteredPlans.length === 0 ? (
                <Card className="rounded-card shadow-elevation-1">
                  <CardContent className="py-12 text-center">
                    <p className="text-muted-foreground">No plans configured for {type.name}</p>
                    <Button className="mt-4 min-h-[44px]" onClick={() => { resetForm(); setCreateDialogOpen(true); }}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create First Plan
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <m.div
                  variants={staggerContainer}
                  initial="hidden"
                  animate="show"
                  className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-6"
                >
                  {filteredPlans
                    .sort((a, b) => (a.tier_order || 0) - (b.tier_order || 0))
                    .map((plan) => (
                      <AdminPlanCard
                        key={plan.id}
                        plan={plan}
                        features={currentFeatures}
                        currentTier={(plan.tier || 'starter') as 'starter' | 'growth' | 'pro'}
                        onEdit={() => openEditDialog(plan)}
                        onToggleActive={(isActive) => handleToggleActive(plan.id, isActive)}
                      />
                    ))}
                </m.div>
              )}
            </TabsContent>
          ))}

          {/* Settings Tab */}
          <TabsContent value="settings" className="mt-6 space-y-8">
            {/* Feature Template Builder */}
            <FeatureTemplateBuilder
              businessTypes={businessTypes}
              onTemplateChanged={refetchTypes}
            />

            {/* Business Type Settings */}
            <BusinessTypeSettings
              businessTypes={businessTypes}
              features={businessFeatures}
              onRefetch={refetchTypes}
            />
          </TabsContent>
        </Tabs>

        {/* Edit Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Plan</DialogTitle>
              <DialogDescription>Update plan configuration</DialogDescription>
            </DialogHeader>
            <PlanForm onSubmit={handleEdit} submitLabel="Save Changes" />
          </DialogContent>
        </Dialog>

        {/* Plan Migration Dialog */}
        <PlanMigrationDialog
          open={migrationDialogOpen}
          onOpenChange={setMigrationDialogOpen}
          onMigrationComplete={refetch}
        />
      </m.div>
    </AdminLayout>
  );
}
