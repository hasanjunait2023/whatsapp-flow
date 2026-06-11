import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Loader2, Plus, Pencil, Check, X, Rocket, Zap, Crown, RefreshCw, Star } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { BusinessType } from '@/hooks/useBusinessTypes';
import { useFeatureTemplates, FeatureTemplate, FeatureCategory, TierLevel } from '@/hooks/useFeatureTemplates';
import { FeatureEditDialog } from './FeatureEditDialog';
import { TierComparisonPreview } from './TierComparisonPreview';
import { supabase } from '@/integrations/supabase/client';

interface FeatureTemplateBuilderProps {
  businessTypes: BusinessType[];
  onTemplateChanged?: () => void;
}

const TIER_ORDER: Record<TierLevel, number> = {
  starter: 1,
  growth: 2,
  pro: 3,
};

const TIERS: { value: TierLevel; label: string; icon: typeof Rocket; color: string; bgColor: string }[] = [
  { value: 'starter', label: 'Starter', icon: Rocket, color: 'text-blue-600', bgColor: 'bg-blue-500/10' },
  { value: 'growth', label: 'Growth', icon: Zap, color: 'text-emerald-600', bgColor: 'bg-emerald-500/10' },
  { value: 'pro', label: 'Pro', icon: Crown, color: 'text-purple-600', bgColor: 'bg-purple-500/10' },
];

export function FeatureTemplateBuilder({
  businessTypes,
  onTemplateChanged,
}: FeatureTemplateBuilderProps) {
  const [selectedBusinessTypeId, setSelectedBusinessTypeId] = useState<string>('');
  const [features, setFeatures] = useState<FeatureTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [editingFeature, setEditingFeature] = useState<FeatureTemplate | null>(null);
  
  const {
    categories,
    fetchCategories,
    updateFeature,
    deleteFeature,
    syncPlansWithTemplates,
  } = useFeatureTemplates();

  // Fetch categories on mount
  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Set default business type
  useEffect(() => {
    if (businessTypes.length > 0 && !selectedBusinessTypeId) {
      setSelectedBusinessTypeId(businessTypes[0].id);
    }
  }, [businessTypes, selectedBusinessTypeId]);

  // Fetch features for selected business type
  const fetchFeatures = useCallback(async () => {
    if (!selectedBusinessTypeId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('business_type_features')
        .select('*')
        .eq('business_type_id', selectedBusinessTypeId)
        .order('display_order', { ascending: true });

      if (error) throw error;
      setFeatures(data as FeatureTemplate[] || []);
    } catch (err) {
      console.error('Error fetching features:', err);
      toast.error('Failed to load features');
    } finally {
      setLoading(false);
    }
  }, [selectedBusinessTypeId]);

  useEffect(() => {
    fetchFeatures();
  }, [fetchFeatures]);

  const handleTierChange = async (featureId: string, newTier: TierLevel) => {
    try {
      await updateFeature(featureId, { min_tier: newTier });
      setFeatures((prev) =>
        prev.map((f) => (f.id === featureId ? { ...f, min_tier: newTier } : f))
      );
      toast.success('Tier updated');
      onTemplateChanged?.();
    } catch (err) {
      toast.error('Failed to update tier');
    }
  };

  const handleHighlightChange = async (featureId: string, isHighlight: boolean) => {
    try {
      await updateFeature(featureId, { is_highlight: isHighlight });
      setFeatures((prev) =>
        prev.map((f) => (f.id === featureId ? { ...f, is_highlight: isHighlight } : f))
      );
    } catch (err) {
      toast.error('Failed to update highlight');
    }
  };

  const handleSaveFeature = async (featureId: string, updates: Partial<FeatureTemplate>) => {
    await updateFeature(featureId, updates);
    await fetchFeatures();
    toast.success('Feature updated');
    onTemplateChanged?.();
  };

  const handleDeleteFeature = async (featureId: string) => {
    await deleteFeature(featureId);
    await fetchFeatures();
    toast.success('Feature deleted');
    onTemplateChanged?.();
  };

  const handleSyncPlans = async () => {
    if (!selectedBusinessTypeId) return;
    
    setSyncing(true);
    try {
      const count = await syncPlansWithTemplates(selectedBusinessTypeId);
      toast.success(`Synced ${count} plan(s) with template`);
    } catch (err) {
      toast.error('Failed to sync plans');
    } finally {
      setSyncing(false);
    }
  };

  const isAvailable = (feature: FeatureTemplate, tier: TierLevel): boolean => {
    const featureTierOrder = TIER_ORDER[feature.min_tier] || 1;
    const targetTierOrder = TIER_ORDER[tier];
    return featureTierOrder <= targetTierOrder;
  };

  const getCategoryName = (categoryId: string | null): string => {
    if (!categoryId) return 'Uncategorized';
    return categories.find((c) => c.id === categoryId)?.name || 'Unknown';
  };

  const groupedFeatures = features.reduce((acc, feature) => {
    const categoryId = feature.category_id || 'uncategorized';
    if (!acc[categoryId]) {
      acc[categoryId] = [];
    }
    acc[categoryId].push(feature);
    return acc;
  }, {} as Record<string, FeatureTemplate[]>);

  const selectedBusinessType = businessTypes.find((bt) => bt.id === selectedBusinessTypeId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold">Feature Template Builder</h3>
          <p className="text-sm text-muted-foreground">
            Define which features are available per tier for each business type
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedBusinessTypeId} onValueChange={setSelectedBusinessTypeId}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select business type" />
            </SelectTrigger>
            <SelectContent>
              {businessTypes.map((bt) => (
                <SelectItem key={bt.id} value={bt.id}>
                  {bt.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSyncPlans}
            disabled={syncing || !selectedBusinessTypeId}
          >
            {syncing ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Sync Plans
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Feature Matrix */}
        <Card className="xl:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Feature Matrix</CardTitle>
                <CardDescription>{features.length} features configured</CardDescription>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>Legend:</span>
                <div className="flex items-center gap-1">
                  <div className="p-0.5 rounded bg-primary/10">
                    <Check className="h-3 w-3 text-primary" />
                  </div>
                  <span>Included</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="p-0.5 rounded bg-muted">
                    <X className="h-3 w-3 text-muted-foreground" />
                  </div>
                  <span>Not included</span>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <ScrollArea className="h-[500px]">
                <div className="space-y-6">
                  {Object.entries(groupedFeatures).map(([categoryId, categoryFeatures]) => (
                    <div key={categoryId}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          {getCategoryName(categoryId)}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {categoryFeatures.length}
                        </Badge>
                      </div>

                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[200px]">Feature</TableHead>
                            {TIERS.map(({ value, label, icon: Icon, color }) => (
                              <TableHead key={value} className="text-center w-[80px]">
                                <div className={cn('flex items-center justify-center gap-1', color)}>
                                  <Icon className="h-3.5 w-3.5" />
                                  <span className="text-xs">{label}</span>
                                </div>
                              </TableHead>
                            ))}
                            <TableHead className="text-center w-[80px]">Highlight</TableHead>
                            <TableHead className="w-[60px]"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {categoryFeatures.map((feature) => (
                            <TableRow key={feature.id}>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium">{feature.feature_label}</span>
                                  {feature.is_core && (
                                    <Badge variant="secondary" className="text-xs">
                                      Core
                                    </Badge>
                                  )}
                                </div>
                                {feature.feature_flag_key && (
                                  <code className="text-xs text-muted-foreground">
                                    {feature.feature_flag_key}
                                  </code>
                                )}
                              </TableCell>
                              {TIERS.map(({ value, bgColor }) => {
                                const available = isAvailable(feature, value);
                                const isMinTier = feature.min_tier === value;
                                return (
                                  <TableCell key={value} className="text-center">
                                    <button
                                      onClick={() => handleTierChange(feature.id, value)}
                                      className={cn(
                                        'p-1.5 rounded-md transition-all',
                                        available && bgColor,
                                        isMinTier && 'ring-2 ring-primary ring-offset-1',
                                        'hover:scale-110'
                                      )}
                                    >
                                      {available ? (
                                        <Check className="h-4 w-4 text-primary" />
                                      ) : (
                                        <X className="h-4 w-4 text-muted-foreground" />
                                      )}
                                    </button>
                                  </TableCell>
                                );
                              })}
                              <TableCell className="text-center">
                                <Switch
                                  checked={feature.is_highlight}
                                  onCheckedChange={(checked) =>
                                    handleHighlightChange(feature.id, checked)
                                  }
                                />
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => setEditingFeature(feature)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ))}

                  {features.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                      <p>No features configured for this business type.</p>
                      <Button variant="outline" className="mt-4">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Feature
                      </Button>
                    </div>
                  )}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Tier Comparison Preview */}
        <div className="xl:col-span-1">
          <TierComparisonPreview
            features={features}
            categories={categories}
            businessTypeName={selectedBusinessType?.name || 'Business Type'}
          />
        </div>
      </div>

      {/* Feature Edit Dialog */}
      <FeatureEditDialog
        open={!!editingFeature}
        onOpenChange={(open) => !open && setEditingFeature(null)}
        feature={editingFeature}
        categories={categories}
        onSave={handleSaveFeature}
        onDelete={handleDeleteFeature}
      />
    </div>
  );
}
