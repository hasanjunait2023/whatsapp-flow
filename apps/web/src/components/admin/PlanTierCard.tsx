import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Check, Bot, Users, MessageSquare, Smartphone, Sparkles, Crown, Rocket } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PlanTierCardProps {
  plan: {
    id: string;
    name: string;
    description: string | null;
    price_monthly: number;
    price_yearly: number | null;
    max_instances: number;
    max_agents: number;
    max_messages_per_month: number;
    ai_enabled: boolean;
    is_active: boolean;
    tier: string | null;
    subscriber_count: number;
  };
  features: Array<{
    feature_label: string;
    icon: string | null;
    min_tier: string;
  }>;
  currentTier: 'starter' | 'growth' | 'pro';
  onEdit: () => void;
  onToggleActive: (isActive: boolean) => void;
}

const TIER_CONFIG: Record<string, {
  icon: typeof Rocket;
  gradient: string;
  border: string;
  badge: string;
  iconColor: string;
  popular?: boolean;
}> = {
  starter: {
    icon: Rocket,
    gradient: 'from-blue-500/10 to-cyan-500/10',
    border: 'border-blue-500/20',
    badge: 'bg-blue-500/10 text-blue-600',
    iconColor: 'text-blue-500',
  },
  growth: {
    icon: Sparkles,
    gradient: 'from-emerald-500/10 to-teal-500/10',
    border: 'border-emerald-500/20',
    badge: 'bg-emerald-500/10 text-emerald-600',
    iconColor: 'text-emerald-500',
    popular: true,
  },
  pro: {
    icon: Crown,
    gradient: 'from-purple-500/10 to-pink-500/10',
    border: 'border-purple-500/20',
    badge: 'bg-purple-500/10 text-purple-600',
    iconColor: 'text-purple-500',
  },
};

export function PlanTierCard({
  plan,
  features,
  currentTier,
  onEdit,
  onToggleActive,
}: PlanTierCardProps) {
  const tierConfig = TIER_CONFIG[currentTier] || TIER_CONFIG.starter;
  const TierIcon = tierConfig.icon;
  const tierOrder = { starter: 1, growth: 2, pro: 3 };

  // Filter features available for this tier
  const availableFeatures = features.filter(
    (f) => tierOrder[f.min_tier as keyof typeof tierOrder] <= tierOrder[currentTier]
  );

  return (
    <Card
      className={cn(
        'relative overflow-hidden transition-all hover:shadow-lg',
        tierConfig.border,
        !plan.is_active && 'opacity-60'
      )}
    >
      {/* Gradient background */}
      <div
        className={cn(
          'absolute inset-0 bg-gradient-to-br opacity-50',
          tierConfig.gradient
        )}
      />

      {/* Popular badge */}
      {tierConfig.popular && plan.is_active && (
        <div className="absolute -right-8 top-6 rotate-45 bg-primary px-8 py-1 text-xs font-semibold text-primary-foreground shadow-sm">
          Popular
        </div>
      )}

      <CardHeader className="relative pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className={cn('p-2 rounded-lg', tierConfig.badge)}>
              <TierIcon className={cn('h-5 w-5', tierConfig.iconColor)} />
            </div>
            <div>
              <CardTitle className="text-lg">{plan.name}</CardTitle>
              <Badge variant="outline" className="mt-1 text-xs capitalize">
                {currentTier}
              </Badge>
            </div>
          </div>
          <Switch
            checked={plan.is_active}
            onCheckedChange={onToggleActive}
            className="data-[state=checked]:bg-primary"
          />
        </div>
        <CardDescription className="mt-2 line-clamp-2">
          {plan.description || 'No description'}
        </CardDescription>
      </CardHeader>

      <CardContent className="relative space-y-4">
        {/* Pricing */}
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-bold">৳{plan.price_monthly.toLocaleString()}</span>
          <span className="text-muted-foreground">/month</span>
        </div>
        {plan.price_yearly && (
          <p className="text-sm text-muted-foreground">
            or ৳{plan.price_yearly.toLocaleString()}/year
          </p>
        )}

        {/* Limits */}
        <div className="grid grid-cols-3 gap-2 py-3 border-y">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-muted-foreground">
              <Smartphone className="h-3.5 w-3.5" />
            </div>
            <p className="font-semibold">{plan.max_instances}</p>
            <p className="text-xs text-muted-foreground">Instances</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-muted-foreground">
              <Users className="h-3.5 w-3.5" />
            </div>
            <p className="font-semibold">{plan.max_agents}</p>
            <p className="text-xs text-muted-foreground">Agents</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-muted-foreground">
              <MessageSquare className="h-3.5 w-3.5" />
            </div>
            <p className="font-semibold">{(plan.max_messages_per_month / 1000).toFixed(0)}K</p>
            <p className="text-xs text-muted-foreground">Messages</p>
          </div>
        </div>

        {/* Features */}
        <ul className="space-y-2">
          {availableFeatures.slice(0, 6).map((feature) => (
            <li key={feature.feature_label} className="flex items-center gap-2 text-sm">
              <Check className="h-4 w-4 text-primary shrink-0" />
              <span>{feature.feature_label}</span>
            </li>
          ))}
          {availableFeatures.length > 6 && (
            <li className="text-sm text-muted-foreground">
              +{availableFeatures.length - 6} more features
            </li>
          )}
        </ul>

        {/* AI Badge */}
        {plan.ai_enabled && (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-purple-500/10">
            <Bot className="h-4 w-4 text-purple-500" />
            <span className="text-sm font-medium text-purple-600">AI Agent Enabled</span>
          </div>
        )}
      </CardContent>

      <CardFooter className="relative flex items-center justify-between pt-0">
        <div className="text-sm text-muted-foreground">
          {plan.subscriber_count} subscriber{plan.subscriber_count !== 1 ? 's' : ''}
        </div>
        <Button variant="outline" size="sm" onClick={onEdit}>
          Edit Plan
        </Button>
      </CardFooter>
    </Card>
  );
}
