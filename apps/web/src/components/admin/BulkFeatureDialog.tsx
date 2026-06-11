import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
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
  AlertTriangle,
  Check,
  X,
  Minus,
} from 'lucide-react';
import { toast } from 'sonner';
import { FeatureFlag } from '@/hooks/useFeatureAccess';

interface BulkFeatureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCount: number;
  onApply: (overrides: Record<string, boolean>) => Promise<void>;
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

type FeatureState = 'enabled' | 'disabled' | 'unchanged';

export function BulkFeatureDialog({
  open,
  onOpenChange,
  selectedCount,
  onApply,
}: BulkFeatureDialogProps) {
  const [featureStates, setFeatureStates] = useState<Record<string, FeatureState>>({});
  const [saving, setSaving] = useState(false);

  // Count changes
  const changesCount = useMemo(() => {
    return Object.values(featureStates).filter((v) => v !== 'unchanged').length;
  }, [featureStates]);

  const handleFeatureChange = (featureKey: string, state: FeatureState) => {
    if (state === 'unchanged') {
      const newStates = { ...featureStates };
      delete newStates[featureKey];
      setFeatureStates(newStates);
    } else {
      setFeatureStates({ ...featureStates, [featureKey]: state });
    }
  };

  const handleApply = async () => {
    if (changesCount === 0) {
      toast.error('No changes to apply');
      return;
    }

    setSaving(true);
    try {
      // Convert feature states to overrides
      const overrides: Record<string, boolean> = {};
      Object.entries(featureStates).forEach(([key, state]) => {
        if (state === 'enabled') {
          overrides[key] = true;
        } else if (state === 'disabled') {
          overrides[key] = false;
        }
      });

      await onApply(overrides);
      toast.success(`Features updated for ${selectedCount} tenants`);
      onOpenChange(false);
      setFeatureStates({});
    } catch (error) {
      toast.error('Failed to update features');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setFeatureStates({});
  };

  const getStateIcon = (state: FeatureState | undefined) => {
    switch (state) {
      case 'enabled':
        return <Check className="h-4 w-4 text-green-500" />;
      case 'disabled':
        return <X className="h-4 w-4 text-red-500" />;
      default:
        return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Bulk Feature Override
          </DialogTitle>
          <DialogDescription>
            Apply feature changes to {selectedCount} selected tenant(s). Choose which features to enable, disable, or leave unchanged.
          </DialogDescription>
        </DialogHeader>

        {/* Warning Banner */}
        <Card className="border-amber-500/30 bg-amber-500/10">
          <CardContent className="p-3 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-amber-600">Bulk Override Warning</p>
              <p className="text-muted-foreground mt-1">
                These changes will be applied as overrides to all selected tenants, 
                regardless of their current plan settings. Existing overrides will be merged with new ones.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Feature List */}
        <ScrollArea className="flex-1 pr-4 -mr-4">
          <div className="space-y-3">
            {FEATURE_CONFIG.map(({ key, label, description, icon: Icon }) => {
              const currentState = featureStates[key] || 'unchanged';
              
              return (
                <div
                  key={key}
                  className={`p-4 rounded-lg border ${
                    currentState !== 'unchanged' ? 'border-primary/50 bg-primary/5' : 'border-border'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`p-2 rounded-md ${
                      currentState === 'enabled' ? 'bg-green-500/10 text-green-500' :
                      currentState === 'disabled' ? 'bg-red-500/10 text-red-500' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{label}</span>
                        {currentState !== 'unchanged' && (
                          <Badge variant={currentState === 'enabled' ? 'default' : 'destructive'} className="text-xs">
                            {currentState === 'enabled' ? 'Will Enable' : 'Will Disable'}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{description}</p>
                      
                      <RadioGroup
                        value={currentState}
                        onValueChange={(v) => handleFeatureChange(key, v as FeatureState)}
                        className="flex gap-4 pt-2"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="unchanged" id={`${key}-unchanged`} />
                          <Label htmlFor={`${key}-unchanged`} className="text-sm flex items-center gap-1.5 cursor-pointer">
                            <Minus className="h-3.5 w-3.5 text-muted-foreground" />
                            No Change
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="enabled" id={`${key}-enabled`} />
                          <Label htmlFor={`${key}-enabled`} className="text-sm flex items-center gap-1.5 cursor-pointer">
                            <Check className="h-3.5 w-3.5 text-green-500" />
                            Enable
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="disabled" id={`${key}-disabled`} />
                          <Label htmlFor={`${key}-disabled`} className="text-sm flex items-center gap-1.5 cursor-pointer">
                            <X className="h-3.5 w-3.5 text-red-500" />
                            Disable
                          </Label>
                        </div>
                      </RadioGroup>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>

        <DialogFooter className="mt-4 flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {changesCount > 0 ? (
              <span className="text-primary font-medium">{changesCount} feature(s) will be changed</span>
            ) : (
              <span>No changes selected</span>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button onClick={handleApply} disabled={saving || changesCount === 0}>
              {saving ? 'Applying...' : `Apply to ${selectedCount} Tenants`}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
