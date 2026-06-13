import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Check, Bot, Users, MessageSquare, Smartphone, Sparkles, Crown, Rocket, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { m, staggerItem } from "@/lib/motion";
import { CURRENCY_SYMBOL } from "@/lib/currency";

type Tier = "starter" | "growth" | "pro";

interface AdminPlanCardProps {
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
  currentTier: Tier;
  onEdit: () => void;
  onToggleActive: (isActive: boolean) => void;
}

const TIER_META: Record<Tier, { icon: typeof Rocket; label: string }> = {
  starter: { icon: Rocket, label: "Starter" },
  growth: { icon: Sparkles, label: "Growth" },
  pro: { icon: Crown, label: "Pro" },
};

const TIER_ORDER: Record<Tier, number> = { starter: 1, growth: 2, pro: 3 };

export function AdminPlanCard({
  plan,
  features,
  currentTier,
  onEdit,
  onToggleActive,
}: AdminPlanCardProps) {
  const meta = TIER_META[currentTier] ?? TIER_META.starter;
  const TierIcon = meta.icon;
  // Growth is the recommended tier — gets the one accent-ring focal treatment.
  const isRecommended = currentTier === "growth";

  const availableFeatures = features.filter(
    (f) => TIER_ORDER[f.min_tier as Tier] <= TIER_ORDER[currentTier],
  );

  return (
    <m.div variants={staggerItem} whileHover={{ y: -2 }} transition={{ duration: 0.15 }} className="h-full">
      <Card
        className={cn(
          "relative flex h-full flex-col overflow-hidden rounded-card shadow-elevation-1 transition-shadow hover:shadow-elevation-2",
          isRecommended && "ring-1 ring-primary/40",
          !plan.is_active && "opacity-60",
        )}
      >
        {isRecommended && plan.is_active && (
          <div className="absolute right-4 top-4">
            <Badge variant="default" className="gap-1">
              <Star className="h-3 w-3" aria-hidden />
              Recommended
            </Badge>
          </div>
        )}

        <CardContent className="flex h-full flex-col gap-4 p-5">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <span
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-xl",
                  isRecommended ? "bg-accent text-primary" : "bg-muted-soft text-muted-foreground",
                )}
              >
                <TierIcon className="h-5 w-5" aria-hidden />
              </span>
              <div className="space-y-1">
                <h3 className="text-lg font-semibold leading-tight text-foreground">{plan.name}</h3>
                <Badge variant="neutral-soft" className="capitalize">
                  {meta.label}
                </Badge>
              </div>
            </div>
            <Switch
              checked={plan.is_active}
              onCheckedChange={onToggleActive}
              aria-label={`${plan.is_active ? "Deactivate" : "Activate"} ${plan.name}`}
            />
          </div>

          <p className="line-clamp-2 min-h-[2.5rem] text-sm text-muted-foreground">
            {plan.description || "No description"}
          </p>

          {/* Pricing */}
          <div>
            <div className="flex items-baseline gap-1">
              <span className="tabular-nums text-3xl font-bold tracking-tight text-foreground">
                {CURRENCY_SYMBOL}
                {plan.price_monthly.toLocaleString("en-US")}
              </span>
              <span className="text-sm text-muted-foreground">/month</span>
            </div>
            {plan.price_yearly ? (
              <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
                or {CURRENCY_SYMBOL}
                {plan.price_yearly.toLocaleString("en-US")}/year
              </p>
            ) : null}
          </div>

          {/* Limits */}
          <div className="grid grid-cols-3 gap-2 rounded-xl border border-border bg-muted/40 py-3">
            <LimitStat icon={Smartphone} value={plan.max_instances.toLocaleString("en-US")} label="Instances" />
            <LimitStat icon={Users} value={plan.max_agents.toLocaleString("en-US")} label="Agents" />
            <LimitStat
              icon={MessageSquare}
              value={`${(plan.max_messages_per_month / 1000).toFixed(0)}K`}
              label="Messages"
            />
          </div>

          {/* Features */}
          <ul className="space-y-2">
            {availableFeatures.slice(0, 6).map((feature) => (
              <li key={feature.feature_label} className="flex items-center gap-2 text-sm text-foreground">
                <Check className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                <span>{feature.feature_label}</span>
              </li>
            ))}
            {availableFeatures.length > 6 && (
              <li className="text-sm text-muted-foreground tabular-nums">
                +{availableFeatures.length - 6} more features
              </li>
            )}
          </ul>

          {plan.ai_enabled && (
            <div className="flex items-center gap-2 rounded-xl bg-info-soft px-3 py-2">
              <Bot className="h-4 w-4 text-info" aria-hidden />
              <span className="text-sm font-medium text-info">AI Agent enabled</span>
            </div>
          )}

          {/* Footer */}
          <div className="mt-auto flex items-center justify-between border-t border-border pt-4">
            <span className="text-sm text-muted-foreground tabular-nums">
              {plan.subscriber_count.toLocaleString("en-US")} subscriber{plan.subscriber_count !== 1 ? "s" : ""}
            </span>
            <Button variant="outline" size="sm" onClick={onEdit} className="min-h-[44px] sm:min-h-0">
              Edit Plan
            </Button>
          </div>
        </CardContent>
      </Card>
    </m.div>
  );
}

function LimitStat({
  icon: Icon,
  value,
  label,
}: {
  icon: typeof Smartphone;
  value: string;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center gap-0.5 text-center">
      <Icon className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
      <p className="tabular-nums font-semibold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
