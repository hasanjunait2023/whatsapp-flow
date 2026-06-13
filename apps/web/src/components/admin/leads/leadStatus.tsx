import { Badge, type BadgeProps } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { MarketingLead } from "@/hooks/useAdminLeads";

type LeadStatus = MarketingLead["status"];
type StatusVariant = NonNullable<BadgeProps["variant"]>;

const LEAD_STATUS_META: Record<LeadStatus, { label: string; variant: StatusVariant; dot: string }> = {
  warm: { label: "Warm", variant: "warning-soft", dot: "bg-warning" },
  hot: { label: "Hot", variant: "destructive-soft", dot: "bg-primary" },
  contacted: { label: "Contacted", variant: "info-soft", dot: "bg-info" },
  converted: { label: "Converted", variant: "success-soft", dot: "bg-success" },
  lost: { label: "Lost", variant: "neutral-soft", dot: "bg-muted-foreground" },
};

/** Soft status pill with a leading dot (DESIGN.md §2.7). */
export function LeadStatusBadge({ status }: { status: LeadStatus }) {
  const meta = LEAD_STATUS_META[status] ?? {
    label: status,
    variant: "neutral-soft" as const,
    dot: "bg-muted-foreground",
  };
  return (
    <Badge variant={meta.variant} className="gap-1.5">
      <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} aria-hidden />
      {meta.label}
    </Badge>
  );
}

/** Deterministic 2-letter avatar from a name. Tokens-only tinted chip. */
export function LeadAvatar({ name }: { name: string }) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-semibold text-primary">
      {initials || "?"}
    </span>
  );
}
