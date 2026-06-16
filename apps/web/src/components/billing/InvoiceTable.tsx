import { safeFormatDate } from '@/lib/date';
import { Receipt } from 'lucide-react';
import { Payment } from '@/hooks/usePayments';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';

interface InvoiceTableProps {
  payments: Payment[];
  loading: boolean;
  /** Optional CTA shown in the empty state. */
  onEmptyAction?: () => void;
}

type PillVariant = 'success-soft' | 'warning-soft' | 'destructive-soft' | 'neutral-soft';

function statusPill(status: Payment['status']): { variant: PillVariant; label: string; dot: string } {
  switch (status) {
    case 'verified':
      return { variant: 'success-soft', label: 'Paid', dot: 'bg-success' };
    case 'rejected':
      return { variant: 'destructive-soft', label: 'Failed', dot: 'bg-destructive' };
    case 'pending':
    default:
      return { variant: 'warning-soft', label: 'Pending', dot: 'bg-warning' };
  }
}

function methodLabel(method: string, gateway?: string): string {
  if (gateway === 'uddoktapay') return 'UddoktaPay';
  switch (method) {
    case 'bkash':
      return 'bKash';
    case 'nagad':
      return 'Nagad';
    case 'bank_transfer':
      return 'Bank Transfer';
    case 'uddoktapay':
      return 'UddoktaPay';
    default:
      return method;
  }
}

function StatusBadge({ status }: { status: Payment['status'] }) {
  const { variant, label, dot } = statusPill(status);
  return (
    <Badge variant={variant} className="gap-1.5">
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} aria-hidden />
      {label}
    </Badge>
  );
}

export function InvoiceTable({ payments, loading, onEmptyAction }: InvoiceTableProps) {
  if (loading) {
    return (
      <div className="space-y-2.5">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-12 w-full rounded-control" />
        ))}
      </div>
    );
  }

  if (payments.length === 0) {
    return (
      <EmptyState
        icon={Receipt}
        title="No payment history yet"
        description="Once you complete a payment, your invoices and their status will appear here."
        action={onEmptyAction ? { label: 'View plans', onClick: onEmptyAction } : undefined}
      />
    );
  }

  return (
    <>
      {/* Desktop / tablet — restyled table */}
      <div className="hidden sm:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Method</TableHead>
              <TableHead>Transaction ID</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.map((payment) => (
              <TableRow key={payment.id}>
                <TableCell className="whitespace-nowrap font-medium">
                  {safeFormatDate(payment.created_at, 'MMM d, yyyy')}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {methodLabel(payment.payment_method, (payment as unknown as { payment_gateway?: string }).payment_gateway)}
                </TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {payment.transaction_id || '—'}
                </TableCell>
                <TableCell className="text-right tabular-nums font-semibold">
                  ৳{payment.amount.toLocaleString('en-US')}
                </TableCell>
                <TableCell>
                  <StatusBadge status={payment.status} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile — card rows */}
      <ul className="space-y-2.5 sm:hidden">
        {payments.map((payment) => (
          <li
            key={payment.id}
            className="rounded-control border bg-card p-3.5"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold tabular-nums">
                  ৳{payment.amount.toLocaleString('en-US')}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {methodLabel(payment.payment_method, (payment as unknown as { payment_gateway?: string }).payment_gateway)}
                  {' · '}
                  {safeFormatDate(payment.created_at, 'MMM d, yyyy')}
                </p>
              </div>
              <StatusBadge status={payment.status} />
            </div>
            {payment.transaction_id && (
              <p className="mt-2 truncate font-mono text-[11px] text-muted-foreground">
                {payment.transaction_id}
              </p>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}
