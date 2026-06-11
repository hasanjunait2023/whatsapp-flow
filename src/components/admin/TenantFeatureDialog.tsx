import { useState, useMemo, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Package,
  Bot,
  BarChart3,
  Users,
  Zap,
  GitBranch,
  Reply,
  FileText,
  ShoppingCart,
  MessageSquare,
  RotateCcw,
  AlertTriangle,
  Check,
  X,
  Minus,
} from 'lucide-react';
import { toast } from 'sonner';
import { FEATURE_FLAGS, FeatureFlag } from '@/hooks/useFeatureAccess';

export interface TenantForFeatures {
  id: string;
  name: string;
  subscription_id: string | null;
  plan_id: string | null;
  plan_name: string | null;
  plan_features: Record<string, boolean> | null;
  feature_overrides: Record<string, boolean> | null;
}

interface Plan {
  id: string;
  name: string;
  features?: Record<string, boolean>;
}

interface TenantFeatureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenant: TenantForFeatures | null;
  plans: Plan[];
  onUpdatePlan: (tenantId: string, planId: string) => Promise<void>;
  onUpdateFeatureOverrides: (tenantId: string, overrides: Record<string, boolean> | null) => Promise<void>;
}

// Feature configuration with icons and descriptions
const FEATURE_CONFIG: { key: FeatureFlag; label: string; description: string; icon: React.ElementType }[] = [
  { key: 'orders_enabled', label: 'Orders', description: 'Create and manage customer orders', icon: ShoppingCart },
  { key: 'products_enabled', label: 'Products', description: 'Product catalog management', icon: Package },
  { key: 'contacts_enabled', label: 'Contacts', description: 'Contact management and CRM', icon: Users },
  { key: 'automation_enabled', label: 'Automation', description: 'Automated message responses', icon: Zap },
  { key: 'workflows_enabled', label: 'Workflows', description: 'Visual workflow builder', icon: GitBranch },
  { key: 'analytics_enabled', label: 'Analytics', description: 'Advanced analytics dashboard', icon: BarChart3 },
  { key: 'team_enabled', label: 'Team', description: 'Team member management', icon: Users },
  { key: 'ai_agent_enabled', label: 'AI Agent', description: 'AI-powered chat assistant', icon: Bot },
  { key: 'quick_replies_enabled', label: 'Quick Replies', description: 'Saved message templates', icon: Reply },
  { key: 'invoice_generation', label: 'Invoice Generation', description: 'Generate PDF invoices', icon: FileText },
  { key: 'woocommerce_sync', label: 'WooCommerce Sync', description: 'Sync with WooCommerce stores', icon: MessageSquare },
];

// Default features when no plan features available
const DEFAULT_FEATURES: Record<FeatureFlag, boolean> = {
  orders_enabled: true,
  products_enabled: true,
  automation_enabled: false,
  workflows_enabled: false,
  analytics_enabled: false,
  team_enabled: true,
  ai_agent_enabled: false,
  quick_replies_enabled: true,
  invoice_generation: false,
  woocommerce_sync: false,
  contacts_enabled: true,
  followup_messages_enabled: false,
};

export function TenantFeatureDialog({
  open,
  onOpenChange,
  tenant,
  plans,
  onUpdatePlan,
  onUpdateFeatureOverrides,
}: TenantFeatureDialogProps) {
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [localOverrides, setLocalOverrides] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize state when tenant changes
  useEffect(() => {
    if (tenant) {
      setSelectedPlanId(tenant.plan_id || '');
      setLocalOverrides(tenant.feature_overrides || {});
      setHasChanges(false);
    }
  }, [tenant]);

  // Get effective plan features based on selected plan
  const selectedPlanFeatures = useMemo(() => {
    if (!selectedPlanId) return DEFAULT_FEATURES;
    const plan = plans.find((p) => p.id === selectedPlanId);
    return { ...DEFAULT_FEATURES, ...(plan?.features || {}) };
  }, [selectedPlanId, plans]);

  // Calculate effective features (plan + overrides)
  const effectiveFeatures = useMemo(() => {
    const result: Record<string, boolean> = { ...selectedPlanFeatures };
    Object.entries(localOverrides).forEach(([key, value]) => {
      result[key] = value;
    });
    return result;
  }, [selectedPlanFeatures, localOverrides]);

  // Count enabled features
  const enabledCount = Object.values(effectiveFeatures).filter(Boolean).length;
  const totalCount = Object.keys(FEATURE_FLAGS).length;
  const overrideCount = Object.keys(localOverrides).length;

  const handlePlanChange = (planId: string) => {
    setSelectedPlanId(planId);
    setHasChanges(true);
  };

  const handleFeatureToggle = (featureKey: string, currentValue: boolean) => {
    const planDefault = selectedPlanFeatures[featureKey as FeatureFlag];
    const newValue = !currentValue;
    
    // If toggling back to plan default, remove the override
    if (newValue === planDefault) {
      const newOverrides = { ...localOverrides };
      delete newOverrides[featureKey];
      setLocalOverrides(newOverrides);
    } else {
      setLocalOverrides({ ...localOverrides, [featureKey]: newValue });
    }
    setHasChanges(true);
  };

  const handleResetOverrides = () => {
    setLocalOverrides({});
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!tenant) return;
    setSaving(true);
    try {
      // Update plan if changed
      if (selectedPlanId && selectedPlanId !== tenant.plan_id) {
        await onUpdatePlan(tenant.id, selectedPlanId);
      }
      // Update feature overrides
      const overridesToSave = Object.keys(localOverrides).length > 0 ? localOverrides : null;
      if (JSON.stringify(overridesToSave) !== JSON.stringify(tenant.feature_overrides)) {
        await onUpdateFeatureOverrides(tenant.id, overridesToSave);
      }
      toast.success('Tenant features updated successfully');
      onOpenChange(false);
    } catch (error) {
      toast.error('Failed to update tenant features');
    } finally {
      setSaving(false);
    }
  };

  const getFeatureStatus = (featureKey: string) => {
    const planValue = selectedPlanFeatures[featureKey as FeatureFlag];
    const hasOverride = featureKey in localOverrides;
    const effectiveValue = effectiveFeatures[featureKey];

    return { planValue, hasOverride, effectiveValue };
  };

  if (!tenant) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Manage Features: {tenant.name}
          </DialogTitle>
          <DialogDescription>
            Configure plan and feature access for this tenant. Overrides take precedence over plan defaults.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="plan" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="plan">Plan & Summary</TabsTrigger>
            <TabsTrigger value="features">
              Feature Overrides
              {overrideCount > 0 && (
                <Badge variant="secondary" className="ml-2 text-xs">
                  {overrideCount}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="plan" className="mt-4 space-y-4 flex-1 overflow-auto">
            {/* Plan Selection */}
            <div className="space-y-2">
              <Label>Subscription Plan</Label>
              <Select value={selectedPlanId} onValueChange={handlePlanChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a plan" />
                </SelectTrigger>
                <SelectContent>
                  {plans.map((plan) => (
                    <SelectItem key={plan.id} value={plan.id}>
                      {plan.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Changing the plan will update the base features available to this tenant.
              </p>
            </div>

            {/* Feature Summary */}
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-medium">Feature Summary</h4>
                  <Badge variant="outline">
                    {enabledCount}/{totalCount} enabled
                  </Badge>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {FEATURE_CONFIG.map(({ key, label, icon: Icon }) => {
                    const { effectiveValue, hasOverride } = getFeatureStatus(key);
                    return (
                      <div
                        key={key}
                        className={`flex items-center justify-between p-2 rounded-md text-sm ${
                          hasOverride ? 'bg-primary/5 border border-primary/20' : 'bg-muted/50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Icon className={`h-4 w-4 ${effectiveValue ? 'text-primary' : 'text-muted-foreground'}`} />
                          <span className={effectiveValue ? 'text-foreground' : 'text-muted-foreground'}>{label}</span>
                          {hasOverride && (
                            <Badge variant="secondary" className="text-xs px-1.5 py-0">
                              Override
                            </Badge>
                          )}
                        </div>
                        <Switch
                          checked={effectiveValue}
                          onCheckedChange={() => handleFeatureToggle(key, effectiveValue)}
                        />
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="features" className="mt-4 flex-1 overflow-hidden flex flex-col">
            {/* Reset Button */}
            {overrideCount > 0 && (
              <div className="flex items-center justify-between mb-4 p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
                <div className="flex items-center gap-2 text-amber-600">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-sm font-medium">{overrideCount} feature override(s) active</span>
                </div>
                <Button variant="outline" size="sm" onClick={handleResetOverrides}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset to Plan Defaults
                </Button>
              </div>
            )}

            {/* Feature List */}
            <ScrollArea className="flex-1 pr-4">
              <div className="space-y-3">
                {FEATURE_CONFIG.map(({ key, label, description, icon: Icon }) => {
                  const { planValue, hasOverride, effectiveValue } = getFeatureStatus(key);
                  
                  return (
                    <div
                      key={key}
                      className={`p-4 rounded-lg border ${
                        hasOverride ? 'border-primary/50 bg-primary/5' : 'border-border'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-md ${effectiveValue ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{label}</span>
                              {hasOverride && (
                                <Badge variant="secondary" className="text-xs">
                                  Overridden
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">{description}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                Plan default:
                                {planValue ? (
                                  <Check className="h-3 w-3 text-green-500" />
                                ) : (
                                  <Minus className="h-3 w-3" />
                                )}
                              </span>
                            </div>
                          </div>
                        </div>
                        <Switch
                          checked={effectiveValue}
                          onCheckedChange={() => handleFeatureToggle(key, effectiveValue)}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !hasChanges}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
