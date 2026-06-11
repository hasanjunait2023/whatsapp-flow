import * as React from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowUpRight, ArrowDownRight, LucideIcon } from "lucide-react";

interface StatCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  value: string | number;
  description?: string;
  icon?: LucideIcon;
  iconColor?: string;
  trend?: {
    value: string;
    direction: "up" | "down" | "neutral";
  };
}

export function StatCard({
  title,
  value,
  description,
  icon: Icon,
  iconColor = "text-primary",
  trend,
  className,
  ...props
}: StatCardProps) {
  return (
    <Card
      hover="lift"
      className={cn("overflow-hidden", className)}
      {...props}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-bold tracking-tight">{value}</p>
              {trend && (
                <span
                  className={cn(
                    "inline-flex items-center text-xs font-medium",
                    trend.direction === "up" && "text-success",
                    trend.direction === "down" && "text-destructive",
                    trend.direction === "neutral" && "text-muted-foreground"
                  )}
                >
                  {trend.direction === "up" && <ArrowUpRight className="h-3 w-3 mr-0.5" />}
                  {trend.direction === "down" && <ArrowDownRight className="h-3 w-3 mr-0.5" />}
                  {trend.value}
                </span>
              )}
            </div>
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </div>
          {Icon && (
            <div className={cn("p-2.5 rounded-xl bg-muted/50", iconColor.replace("text-", "bg-") + "/10")}>
              <Icon className={cn("h-5 w-5", iconColor)} />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
