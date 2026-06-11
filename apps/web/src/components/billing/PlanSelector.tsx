import { Plan } from '@/hooks/usePlans';
import { BusinessTypeFeature } from '@/hooks/useBusinessTypes';
import { PlanCard } from '@/components/billing/PlanCard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Rocket, Sparkles, Crown } from 'lucide-react';

interface PlanSelectorProps {
  plans: Plan[];
  features: BusinessTypeFeature[];
  businessTypeName: string;
  currentPlanId?: string;
  onSelect: (plan: Plan) => void;
  onBack?: () => void;
}

const TIER_ORDER = ['starter', 'growth', 'pro'];

const TIER_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  starter: Rocket,
  growth: Sparkles,
  pro: Crown,
};

export function PlanSelector({
  plans,
  features,
  businessTypeName,
  currentPlanId,
  onSelect,
  onBack,
}: PlanSelectorProps) {
  // Sort plans by tier
  const sortedPlans = [...plans].sort((a, b) => {
    const aIndex = TIER_ORDER.indexOf((a as any).tier || 'starter');
    const bIndex = TIER_ORDER.indexOf((b as any).tier || 'starter');
    return aIndex - bIndex;
  });

  return (
    <div className="space-y-6">
      <div className="text-center">
        <Badge variant="secondary" className="mb-3">
          {businessTypeName}
        </Badge>
        <h2 className="text-2xl font-bold">Choose Your Plan</h2>
        <p className="text-muted-foreground mt-2">
          Select the plan that best fits your business needs
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {sortedPlans.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            isCurrentPlan={plan.id === currentPlanId}
            onSelect={onSelect}
          />
        ))}
      </div>

      {onBack && (
        <div className="flex justify-center pt-4">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Change Business Type
          </Button>
        </div>
      )}
    </div>
  );
}
