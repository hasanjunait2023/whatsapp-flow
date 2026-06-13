import { Badge, type BadgeProps } from '@/components/ui/badge';
import { ORDER_STATUSES, PAYMENT_STATUSES } from '@/hooks/useOrders';

/**
 * Finexy status pills (DESIGN.md §2.7): soft tinted background + solid status text +
 * a leading dot. Maps order/payment statuses onto the design system's tones:
 *   paid / completed / delivered → success (green)
 *   pending / unpaid             → warning (amber)
 *   confirmed / processing /
 *     shipped / partial          → info (blue)
 *   cancelled / refunded / failed→ destructive (red)
 */
type SoftTone = 'success-soft' | 'warning-soft' | 'info-soft' | 'destructive-soft' | 'neutral-soft';

const ORDER_STATUS_TONE: Record<string, SoftTone> = {
  pending: 'warning-soft',
  confirmed: 'info-soft',
  processing: 'info-soft',
  shipped: 'info-soft',
  delivered: 'success-soft',
  cancelled: 'destructive-soft',
};

const PAYMENT_STATUS_TONE: Record<string, SoftTone> = {
  unpaid: 'warning-soft',
  partial: 'info-soft',
  paid: 'success-soft',
  refunded: 'destructive-soft',
};

const DOT_COLOR: Record<SoftTone, string> = {
  'success-soft': 'bg-success',
  'warning-soft': 'bg-warning',
  'info-soft': 'bg-info',
  'destructive-soft': 'bg-destructive',
  'neutral-soft': 'bg-muted-foreground',
};

interface StatusPillProps {
  label: string;
  tone: SoftTone;
  className?: string;
}

function StatusPill({ label, tone, className }: StatusPillProps) {
  return (
    <Badge variant={tone as BadgeProps['variant']} className={className}>
      <span className={`mr-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${DOT_COLOR[tone]}`} aria-hidden />
      {label}
    </Badge>
  );
}

export function OrderStatusPill({ status, className }: { status: string; className?: string }) {
  const config = ORDER_STATUSES.find((s) => s.value === status) || ORDER_STATUSES[0];
  const tone = ORDER_STATUS_TONE[status] ?? 'neutral-soft';
  return <StatusPill label={config.label} tone={tone} className={className} />;
}

export function PaymentStatusPill({ status, className }: { status: string; className?: string }) {
  const config = PAYMENT_STATUSES.find((s) => s.value === status) || PAYMENT_STATUSES[0];
  const tone = PAYMENT_STATUS_TONE[status] ?? 'neutral-soft';
  return <StatusPill label={config.label} tone={tone} className={className} />;
}
