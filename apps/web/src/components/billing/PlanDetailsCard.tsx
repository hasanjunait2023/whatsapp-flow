import { useSubscription } from '@/hooks/useSubscription';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Sparkles, 
  MessageSquare, 
  Users, 
  Smartphone, 
  Bot,
  Check,
  X
} from 'lucide-react';

export function PlanDetailsCard() {
  const { plan, loading } = useSubscription();

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!plan) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Plan Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            No active plan
          </p>
        </CardContent>
      </Card>
    );
  }

  const features = [
    {
      icon: <MessageSquare className="h-4 w-4" />,
      label: 'Messages/Month',
      value: plan.max_messages_per_month.toLocaleString(),
    },
    {
      icon: <Smartphone className="h-4 w-4" />,
      label: 'WhatsApp Instances',
      value: plan.max_instances.toString(),
    },
    {
      icon: <Users className="h-4 w-4" />,
      label: 'Team Members',
      value: plan.max_agents.toString(),
    },
    {
      icon: <Bot className="h-4 w-4" />,
      label: 'AI Assistant',
      value: plan.ai_enabled ? 'Enabled' : 'Disabled',
      isBoolean: true,
      enabled: plan.ai_enabled,
    },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Plan Details
          </CardTitle>
          <Badge variant="outline" className="font-semibold">
            {plan.name}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Pricing */}
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold">৳{plan.price_monthly.toLocaleString()}</span>
          <span className="text-muted-foreground">/month</span>
        </div>
        {plan.price_yearly && (
          <p className="text-sm text-muted-foreground">
            or ৳{plan.price_yearly.toLocaleString()}/year (save ৳{((plan.price_monthly * 12) - plan.price_yearly).toLocaleString()})
          </p>
        )}

        {/* Features */}
        <div className="space-y-3 pt-4 border-t">
          {features.map((feature, index) => (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {feature.icon}
                {feature.label}
              </div>
              {feature.isBoolean ? (
                feature.enabled ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <X className="h-4 w-4 text-muted-foreground" />
                )
              ) : (
                <span className="font-medium">{feature.value}</span>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
