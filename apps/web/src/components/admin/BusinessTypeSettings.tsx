import { useState } from 'react';
import { BusinessType, BusinessTypeFeature } from '@/hooks/useBusinessTypes';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Warehouse, ShoppingBag, Briefcase, Check, Zap, Crown, Rocket } from 'lucide-react';

interface BusinessTypeSettingsProps {
  businessTypes: BusinessType[];
  features: BusinessTypeFeature[];
  onRefetch: () => void;
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  warehouse: Warehouse,
  'shopping-bag': ShoppingBag,
  briefcase: Briefcase,
};

const TIER_BADGES = {
  starter: { label: 'Starter', icon: Rocket, className: 'bg-blue-500/10 text-blue-600' },
  growth: { label: 'Growth', icon: Zap, className: 'bg-emerald-500/10 text-emerald-600' },
  pro: { label: 'Pro', icon: Crown, className: 'bg-purple-500/10 text-purple-600' },
};

export function BusinessTypeSettings({
  businessTypes,
  features,
  onRefetch,
}: BusinessTypeSettingsProps) {
  const getFeaturesForType = (typeId: string) => {
    return features.filter((f) => f.business_type_id === typeId);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Business Types Configuration</CardTitle>
          <CardDescription>
            View and manage business types and their associated features
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            {businessTypes.map((type) => {
              const IconComponent = ICON_MAP[type.icon || ''] || Briefcase;
              const typeFeatures = getFeaturesForType(type.id);

              return (
                <AccordionItem key={type.id} value={type.id}>
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-3">
                      <div
                        className="p-2 rounded-lg"
                        style={{ backgroundColor: `${type.color}15` }}
                      >
                        <IconComponent
                          className="h-5 w-5"
                          style={{ color: type.color || undefined }}
                        />
                      </div>
                      <div className="text-left">
                        <p className="font-medium">{type.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {type.name_bn} • {typeFeatures.length} features
                        </p>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="pl-12 space-y-4">
                      <p className="text-sm text-muted-foreground">{type.description}</p>
                      
                      <Separator />
                      
                      <div className="space-y-3">
                        <h4 className="text-sm font-medium">Features by Tier</h4>
                        
                        {(['starter', 'growth', 'pro'] as const).map((tier) => {
                          const tierFeatures = typeFeatures.filter((f) => f.min_tier === tier);
                          const TierBadge = TIER_BADGES[tier];
                          const TierIcon = TierBadge.icon;

                          if (tierFeatures.length === 0) return null;

                          return (
                            <div key={tier} className="space-y-2">
                              <div className="flex items-center gap-2">
                                <Badge className={TierBadge.className}>
                                  <TierIcon className="h-3 w-3 mr-1" />
                                  {TierBadge.label}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  ({tierFeatures.length} features)
                                </span>
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                {tierFeatures.map((feature) => (
                                  <div
                                    key={feature.id}
                                    className="flex items-center gap-2 text-sm p-2 rounded-md bg-muted/50"
                                  >
                                    <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                                    <span>{feature.feature_label}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Feature Matrix</CardTitle>
          <CardDescription>
            Quick overview of features across all business types
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <div className="min-w-[600px]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 font-medium">Feature</th>
                    {businessTypes.map((type) => (
                      <th key={type.id} className="text-center py-2 font-medium">
                        {type.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {/* Get unique features across all types */}
                  {Array.from(new Set(features.map((f) => f.feature_key))).map((key) => {
                    const featuresByKey = features.filter((f) => f.feature_key === key);
                    const label = featuresByKey[0]?.feature_label || key;

                    return (
                      <tr key={key} className="border-b">
                        <td className="py-2">{label}</td>
                        {businessTypes.map((type) => {
                          const feature = featuresByKey.find(
                            (f) => f.business_type_id === type.id
                          );
                          return (
                            <td key={type.id} className="text-center py-2">
                              {feature ? (
                                <Badge
                                  variant="outline"
                                  className={TIER_BADGES[feature.min_tier as keyof typeof TIER_BADGES]?.className}
                                >
                                  {feature.min_tier}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
