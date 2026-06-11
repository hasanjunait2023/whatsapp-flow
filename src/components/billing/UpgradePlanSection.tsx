import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plan, usePlans } from '@/hooks/usePlans';
import { useSubscription } from '@/hooks/useSubscription';
import { useTenant } from '@/hooks/useTenant';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Check, Smartphone, Users, MessageSquare, Bot, ArrowUp, ArrowDown, Minus, Building2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface UpgradePlanSectionProps {
  onSelectPlan: (plan: Plan) => void;
}

export function UpgradePlanSection({ onSelectPlan }: UpgradePlanSectionProps) {
  const navigate = useNavigate();
  const { currentTenant } = useTenant();
  const { plans, loading } = usePlans(currentTenant?.business_type_id);
  const { subscription, plan: currentPlan } = useSubscription();
  const [downgradeWarning, setDowngradeWarning] = useState<Plan | null>(null);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-80 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  // If tenant doesn't have a business type selected, prompt them to select one
  if (!currentTenant?.business_type_id) {
    return (
      <Card className="border-dashed">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>Select Your Business Type</CardTitle>
          <CardDescription className="max-w-md mx-auto">
            Please select your business type to see plans tailored for your industry. 
            This helps us show you the most relevant features and pricing.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center pb-6">
          <Button onClick={() => navigate('/settings')} size="lg">
            Go to Settings
          </Button>
        </CardContent>
      </Card>
    );
  }

  const sortedPlans = [...plans].sort((a, b) => a.price_monthly - b.price_monthly);
  const currentPlanIndex = sortedPlans.findIndex(p => p.id === subscription?.plan_id);

  const getPlanAction = (plan: Plan, planIndex: number) => {
    if (subscription?.plan_id === plan.id) {
      return { type: 'current' as const, label: 'Current Plan' };
    }
    if (planIndex > currentPlanIndex) {
      return { type: 'upgrade' as const, label: 'Upgrade' };
    }
    return { type: 'downgrade' as const, label: 'Downgrade' };
  };

  const handlePlanSelect = (plan: Plan, action: ReturnType<typeof getPlanAction>) => {
    if (action.type === 'downgrade') {
      setDowngradeWarning(plan);
    } else {
      onSelectPlan(plan);
    }
  };

  const confirmDowngrade = () => {
    if (downgradeWarning) {
      onSelectPlan(downgradeWarning);
      setDowngradeWarning(null);
    }
  };

  const getComparisonBadge = (plan: Plan, planIndex: number) => {
    if (!currentPlan || subscription?.plan_id === plan.id) return null;

    const differences: string[] = [];
    
    if (plan.max_instances > currentPlan.max_instances) {
      differences.push(`+${plan.max_instances - currentPlan.max_instances} instance${plan.max_instances - currentPlan.max_instances > 1 ? 's' : ''}`);
    } else if (plan.max_instances < currentPlan.max_instances) {
      differences.push(`${plan.max_instances - currentPlan.max_instances} instance${Math.abs(plan.max_instances - currentPlan.max_instances) > 1 ? 's' : ''}`);
    }

    if (plan.max_messages_per_month > currentPlan.max_messages_per_month) {
      const diff = plan.max_messages_per_month - currentPlan.max_messages_per_month;
      differences.push(`+${diff.toLocaleString()} msgs`);
    }

    if (plan.ai_enabled && !currentPlan.ai_enabled) {
      differences.push('+AI');
    } else if (!plan.ai_enabled && currentPlan.ai_enabled) {
      differences.push('-AI');
    }

    if (differences.length === 0) return null;

    return (
      <div className="flex flex-wrap gap-1 mt-2">
        {differences.map((diff, i) => (
          <Badge 
            key={i} 
            variant="outline" 
            className={diff.startsWith('+') ? 'text-green-600 border-green-300' : 'text-destructive border-destructive/30'}
          >
            {diff}
          </Badge>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Available Plans</h2>
        <p className="text-sm text-muted-foreground">
          {currentPlan 
            ? 'Compare plans and upgrade or downgrade as needed'
            : 'Choose a plan to get started'}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {sortedPlans.map((plan, index) => {
          const action = getPlanAction(plan, index);
          const isCurrentPlan = action.type === 'current';

          const features = [
            {
              icon: <Smartphone className="h-4 w-4" />,
              label: `${plan.max_instances} WhatsApp Instance${plan.max_instances > 1 ? 's' : ''}`,
            },
            {
              icon: <Users className="h-4 w-4" />,
              label: `${plan.max_agents} Team Member${plan.max_agents > 1 ? 's' : ''}`,
            },
            {
              icon: <MessageSquare className="h-4 w-4" />,
              label: `${plan.max_messages_per_month.toLocaleString()} Messages/month`,
            },
            ...(plan.ai_enabled
              ? [{ icon: <Bot className="h-4 w-4" />, label: 'AI Agent Enabled' }]
              : []),
          ];

          return (
            <Card 
              key={plan.id} 
              className={isCurrentPlan ? 'border-primary ring-2 ring-primary/20' : ''}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  {isCurrentPlan && <Badge variant="default">Current</Badge>}
                </div>
                <CardDescription>{plan.description}</CardDescription>
                {getComparisonBadge(plan, index)}
              </CardHeader>
              <CardContent>
                <div className="mb-6">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold">৳{plan.price_monthly}</span>
                    <span className="text-muted-foreground">/month</span>
                  </div>
                  {plan.price_yearly && (
                    <p className="text-sm text-muted-foreground mt-1">
                      or ৳{plan.price_yearly}/year (save {Math.round((1 - plan.price_yearly / (plan.price_monthly * 12)) * 100)}%)
                    </p>
                  )}
                </div>
                <ul className="space-y-3">
                  {features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-3">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <Check className="h-3.5 w-3.5" />
                      </div>
                      <span className="text-sm">{feature.label}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Button
                  className="w-full gap-2"
                  variant={isCurrentPlan ? 'outline' : action.type === 'downgrade' ? 'secondary' : 'default'}
                  disabled={isCurrentPlan}
                  onClick={() => handlePlanSelect(plan, action)}
                >
                  {action.type === 'upgrade' && <ArrowUp className="h-4 w-4" />}
                  {action.type === 'downgrade' && <ArrowDown className="h-4 w-4" />}
                  {action.type === 'current' && <Minus className="h-4 w-4" />}
                  {action.label}
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>

      <AlertDialog open={!!downgradeWarning} onOpenChange={() => setDowngradeWarning(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Downgrade</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Are you sure you want to downgrade to {downgradeWarning?.name}? 
                This change will take effect at the end of your current billing period.
              </p>
              {currentPlan && downgradeWarning && (
                <div className="p-3 bg-muted rounded-lg mt-3">
                  <p className="font-medium text-sm mb-2">You may lose access to:</p>
                  <ul className="text-sm space-y-1">
                    {downgradeWarning.max_instances < currentPlan.max_instances && (
                      <li>• {currentPlan.max_instances - downgradeWarning.max_instances} WhatsApp instance(s)</li>
                    )}
                    {downgradeWarning.max_agents < currentPlan.max_agents && (
                      <li>• {currentPlan.max_agents - downgradeWarning.max_agents} team member slot(s)</li>
                    )}
                    {downgradeWarning.max_messages_per_month < currentPlan.max_messages_per_month && (
                      <li>• {(currentPlan.max_messages_per_month - downgradeWarning.max_messages_per_month).toLocaleString()} messages/month</li>
                    )}
                    {!downgradeWarning.ai_enabled && currentPlan.ai_enabled && (
                      <li>• AI Agent feature</li>
                    )}
                  </ul>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDowngrade}>
              Confirm Downgrade
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
