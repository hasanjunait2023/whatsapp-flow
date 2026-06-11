import { Plan } from '@/hooks/usePlans';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Smartphone, Users, MessageSquare, Bot } from 'lucide-react';

interface PlanCardProps {
  plan: Plan;
  isCurrentPlan?: boolean;
  onSelect: (plan: Plan) => void;
}

export function PlanCard({ plan, isCurrentPlan, onSelect }: PlanCardProps) {
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
    <Card className={isCurrentPlan ? 'border-primary ring-2 ring-primary/20' : ''}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl">{plan.name}</CardTitle>
          {isCurrentPlan && (
            <Badge variant="default">Current Plan</Badge>
          )}
        </div>
        <CardDescription>{plan.description}</CardDescription>
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
          {features.map((feature, index) => (
            <li key={index} className="flex items-center gap-3">
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
          className="w-full"
          variant={isCurrentPlan ? 'outline' : 'default'}
          disabled={isCurrentPlan}
          onClick={() => onSelect(plan)}
        >
          {isCurrentPlan ? 'Current Plan' : 'Select Plan'}
        </Button>
      </CardFooter>
    </Card>
  );
}
