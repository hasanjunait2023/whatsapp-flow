import type { ReactNode } from 'react';
import { Circle, Clock, CheckCircle2 } from 'lucide-react';
import type { BadgeProps } from '@/components/ui/badge';

/**
 * Tokens-only design config for the Admin Team page (Warm Light Fintech).
 * No raw hex / no `bg-*-500` — status-soft pills + token icon colours only.
 */

type SoftVariant = NonNullable<BadgeProps['variant']>;

/** Task priority → soft pill variant + leading-dot token. */
export const priorityConfig: Record<
  string,
  { label: string; variant: SoftVariant; dot: string }
> = {
  low: { label: 'Low', variant: 'neutral-soft', dot: 'bg-muted-foreground' },
  medium: { label: 'Medium', variant: 'info-soft', dot: 'bg-info' },
  high: { label: 'High', variant: 'warning-soft', dot: 'bg-warning' },
  urgent: { label: 'Urgent', variant: 'destructive-soft', dot: 'bg-destructive' },
};

export function priorityMeta(priority: string) {
  return priorityConfig[priority] ?? priorityConfig.medium;
}

/** Task status → soft pill variant + leading-dot token. */
export const statusConfig: Record<
  string,
  { label: string; variant: SoftVariant; dot: string; icon: ReactNode }
> = {
  todo: {
    label: 'To Do',
    variant: 'neutral-soft',
    dot: 'bg-muted-foreground',
    icon: <Circle className="h-4 w-4 text-muted-foreground" aria-hidden />,
  },
  in_progress: {
    label: 'In Progress',
    variant: 'info-soft',
    dot: 'bg-info',
    icon: <Clock className="h-4 w-4 text-info" aria-hidden />,
  },
  done: {
    label: 'Done',
    variant: 'success-soft',
    dot: 'bg-success',
    icon: <CheckCircle2 className="h-4 w-4 text-success" aria-hidden />,
  },
};

export function statusMeta(status: string) {
  return statusConfig[status] ?? statusConfig.todo;
}

export function getInitials(name?: string): string {
  return (
    (name || '')
      .split(' ')
      .map((w) => w[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'A'
  );
}
