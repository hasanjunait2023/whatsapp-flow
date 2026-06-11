import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Check, X, Rocket, Zap, Crown, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FeatureTemplate, FeatureCategory, TierLevel } from '@/hooks/useFeatureTemplates';

interface TierComparisonPreviewProps {
  features: FeatureTemplate[];
  categories: FeatureCategory[];
  businessTypeName: string;
}

const TIERS: { value: TierLevel; label: string; icon: typeof Rocket; color: string }[] = [
  { value: 'starter', label: 'Starter', icon: Rocket, color: 'text-blue-500' },
  { value: 'growth', label: 'Growth', icon: Zap, color: 'text-emerald-500' },
  { value: 'pro', label: 'Pro', icon: Crown, color: 'text-purple-500' },
];

const TIER_ORDER: Record<TierLevel, number> = {
  starter: 1,
  growth: 2,
  pro: 3,
};

export function TierComparisonPreview({
  features,
  categories,
  businessTypeName,
}: TierComparisonPreviewProps) {
  const isAvailable = (feature: FeatureTemplate, tier: TierLevel): boolean => {
    const featureTierOrder = TIER_ORDER[feature.min_tier] || 1;
    const targetTierOrder = TIER_ORDER[tier];
    return featureTierOrder <= targetTierOrder;
  };

  const featureCountByTier = useMemo(() => {
    const counts: Record<TierLevel, number> = { starter: 0, growth: 0, pro: 0 };
    
    features.forEach((feature) => {
      TIERS.forEach(({ value }) => {
        if (isAvailable(feature, value)) {
          counts[value]++;
        }
      });
    });

    return counts;
  }, [features]);

  const groupedFeatures = useMemo(() => {
    const grouped: Map<string, FeatureTemplate[]> = new Map();
    
    categories.forEach((cat) => {
      grouped.set(cat.id, []);
    });
    grouped.set('uncategorized', []);

    features.forEach((feature) => {
      const categoryId = feature.category_id || 'uncategorized';
      const group = grouped.get(categoryId) || [];
      group.push(feature);
      grouped.set(categoryId, group);
    });

    return grouped;
  }, [features, categories]);

  const getCategoryName = (categoryId: string): string => {
    if (categoryId === 'uncategorized') return 'Other Features';
    return categories.find((c) => c.id === categoryId)?.name || 'Unknown';
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Tier Comparison</CardTitle>
            <CardDescription>{businessTypeName}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[500px] pr-4">
          <div className="min-w-[400px]">
            {/* Header */}
            <div className="grid grid-cols-4 gap-2 sticky top-0 bg-background pb-3 border-b mb-3">
              <div className="font-medium text-sm">Feature</div>
              {TIERS.map(({ value, label, icon: Icon, color }) => (
                <div key={value} className="text-center">
                  <div className={cn('flex items-center justify-center gap-1', color)}>
                    <Icon className="h-4 w-4" />
                    <span className="font-medium text-sm">{label}</span>
                  </div>
                  <Badge variant="outline" className="mt-1 text-xs">
                    {featureCountByTier[value]} features
                  </Badge>
                </div>
              ))}
            </div>

            {/* Feature rows grouped by category */}
            {Array.from(groupedFeatures.entries()).map(([categoryId, categoryFeatures]) => {
              if (categoryFeatures.length === 0) return null;

              return (
                <div key={categoryId} className="mb-4">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    {getCategoryName(categoryId)}
                  </div>
                  
                  {categoryFeatures.map((feature) => (
                    <div
                      key={feature.id}
                      className="grid grid-cols-4 gap-2 py-2 border-b border-dashed last:border-0 hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{feature.feature_label}</span>
                        {feature.is_highlight && (
                          <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                        )}
                      </div>
                      {TIERS.map(({ value }) => {
                        const available = isAvailable(feature, value);
                        return (
                          <div key={value} className="flex items-center justify-center">
                            {available ? (
                              <div className="p-1 rounded-full bg-primary/10">
                                <Check className="h-4 w-4 text-primary" />
                              </div>
                            ) : (
                              <div className="p-1 rounded-full bg-muted">
                                <X className="h-4 w-4 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              );
            })}

            {/* Summary */}
            <div className="grid grid-cols-4 gap-2 pt-3 border-t mt-4 bg-muted/30 -mx-4 px-4 py-3 rounded-lg">
              <div className="font-semibold text-sm">Total Features</div>
              {TIERS.map(({ value }) => (
                <div key={value} className="text-center">
                  <span className="font-bold text-lg">{featureCountByTier[value]}</span>
                </div>
              ))}
            </div>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
