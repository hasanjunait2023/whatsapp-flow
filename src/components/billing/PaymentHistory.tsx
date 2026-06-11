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
import { format } from 'date-fns';

interface PaymentHistoryProps {
  payments: Payment[];
  loading: boolean;
}

export function PaymentHistory({ payments, loading }: PaymentHistoryProps) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return <Badge variant="default" className="bg-green-500 hover:bg-green-600">Verified</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      case 'pending':
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  const getMethodLabel = (method: string, gateway?: string) => {
    if (gateway === 'uddoktapay') {
      return '💳 UddoktaPay';
    }
    switch (method) {
      case 'bkash':
        return '📱 bKash';
      case 'nagad':
        return '📱 Nagad';
      case 'bank_transfer':
        return '🏦 Bank Transfer';
      case 'uddoktapay':
        return '💳 UddoktaPay';
      default:
        return method;
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-12 bg-muted rounded" />
        ))}
      </div>
    );
  }

  if (payments.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No payment history yet
      </div>
    );
  }

  return (
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
            <TableCell className="font-medium">
              {format(new Date(payment.created_at), 'MMM d, yyyy')}
            </TableCell>
            <TableCell>{getMethodLabel(payment.payment_method, (payment as any).payment_gateway)}</TableCell>
            <TableCell className="font-mono text-sm">
              {payment.transaction_id || '-'}
            </TableCell>
            <TableCell className="text-right">
              ৳{payment.amount}
            </TableCell>
            <TableCell>{getStatusBadge(payment.status)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
