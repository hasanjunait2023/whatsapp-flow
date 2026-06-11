import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { LucideIcon } from "lucide-react";

interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: LucideIcon;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-16 px-4 text-center animate-fade-in",
        className
      )}
      {...props}
    >
      {/* Animated Icon Container */}
      <div className="relative mb-6">
        {/* Background glow */}
        <div className="absolute inset-0 bg-primary/10 rounded-full blur-2xl scale-150 animate-pulse-ring" />
        
        {/* Icon circle */}
        <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/10 shadow-premium">
          <Icon className="h-10 w-10 text-primary animate-float" />
        </div>
      </div>

      {/* Content */}
      <h3 className="text-xl font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-muted-foreground max-w-sm mb-6 leading-relaxed">
        {description}
      </p>

      {/* Actions */}
      <div className="flex items-center gap-3">
        {action && (
          <Button onClick={action.onClick} variant="premium" size="lg">
            {action.icon && <action.icon className="mr-2 h-4 w-4" />}
            {action.label}
          </Button>
        )}
        {secondaryAction && (
          <Button onClick={secondaryAction.onClick} variant="outline" size="lg">
            {secondaryAction.label}
          </Button>
        )}
      </div>
    </div>
  );
}
