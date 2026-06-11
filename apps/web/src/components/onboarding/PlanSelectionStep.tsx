import { useState } from 'react';
import { Check, Crown, Zap, Rocket, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { usePlans, Plan } from '@/hooks/usePlans';
import { cn } from '@/lib/utils';

interface PlanSelectionStepProps {
  businessTypeId: string | null;
  selectedPlanId: string | null;
  onSelect: (planId: string) => void;
}

const TIER_ICONS: Record<string, React.ElementType> = {
  starter: Zap,
  growth: Crown,
  pro: Rocket,
};

const TIER_COLORS: Record<string, string> = {
  starter: 'text-blue-500',
  growth: 'text-amber-500',
  pro: 'text-purple-500',
};

function getTierFromName(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes('pro')) return 'pro';
  if (lower.includes('growth')) return 'growth';
  return 'starter';
}

export function PlanSelectionStep({ businessTypeId, selectedPlanId, onSelect }: PlanSelectionStepProps) {
  const { plans, loading } = usePlans(businessTypeId);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (plans.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No plans available for this business type.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold">আপনার প্ল্যান বেছে নিন</h2>
        <p className="text-muted-foreground mt-1">Select a plan that fits your business needs</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {plans.map((plan) => {
          const tier = getTierFromName(plan.name);
          const Icon = TIER_ICONS[tier] || Zap;
          const isSelected = selectedPlanId === plan.id;
          const isPopular = tier === 'growth';

          return (
            <Card
              key={plan.id}
              className={cn(
                'relative cursor-pointer transition-all hover:border-primary/50',
                isSelected && 'border-primary ring-2 ring-primary/20',
                isPopular && 'border-amber-500/50'
              )}
              onClick={() => onSelect(plan.id)}
            >
              {isPopular && (
                <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 bg-amber-500 text-white">
                  জনপ্রিয়
                </Badge>
              )}

              <CardHeader className="text-center pb-2">
                <div className={cn('mx-auto mb-2 h-12 w-12 rounded-xl bg-muted flex items-center justify-center', TIER_COLORS[tier])}>
                  <Icon className="h-6 w-6" />
                </div>
                <CardTitle className="text-lg">{plan.name}</CardTitle>
                <CardDescription className="text-xs">{plan.description}</CardDescription>
              </CardHeader>

              <CardContent className="text-center space-y-4">
                <div>
                  <span className="text-3xl font-bold">৳{plan.price_monthly.toLocaleString()}</span>
                  <span className="text-muted-foreground">/মাস</span>
                </div>

                <ul className="text-sm space-y-2 text-left">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>{plan.max_instances} WhatsApp Instance</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>{plan.max_agents} Team Members</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>{(plan.max_messages_per_month / 1000).toFixed(0)}K Messages/month</span>
                  </li>
                  {plan.ai_enabled && (
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500" />
                      <span>AI Features</span>
                    </li>
                  )}
                </ul>

                <Button
                  variant={isSelected ? 'default' : 'outline'}
                  className="w-full"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect(plan.id);
                  }}
                >
                  {isSelected ? (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Selected
                    </>
                  ) : (
                    'Select Plan'
                  )}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
