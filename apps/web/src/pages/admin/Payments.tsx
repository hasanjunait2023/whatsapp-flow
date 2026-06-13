import { useState, useMemo } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import { useAdminPayments } from '@/hooks/useAdminPayments';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { EmptyState } from '@/components/ui/empty-state';
import { KpiCard } from '@/components/dashboard/bento/KpiCard';
import { PaymentsRevenueTile } from '@/components/admin/payments/PaymentsRevenueTile';
import { m, pageEnter, staggerContainer, staggerItem } from '@/lib/motion';
import { formatCurrency } from '@/lib/currency';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Check, X, RefreshCw, Receipt, Clock, CheckCircle2, Inbox } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';
import { MobileDataCard } from '@/components/admin/MobileDataCard';
import type { BadgeProps } from '@/components/ui/badge';

type PaymentStatusTone = NonNullable<BadgeProps['variant']>;

const STATUS_META: Record<string, { label: string; variant: PaymentStatusTone; dot: string }> = {
  verified: { label: 'Verified', variant: 'success-soft', dot: 'bg-success' },
  pending: { label: 'Pending', variant: 'warning-soft', dot: 'bg-warning' },
  rejected: { label: 'Rejected', variant: 'destructive-soft', dot: 'bg-destructive' },
};

export default function AdminPayments() {
  const { payments, pendingPayments, loading, refetch, verifyPayment, rejectPayment } = useAdminPayments();
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const isMobile = useIsMobile();

  // KPI metrics derived from real payment data (presentation only).
  const metrics = useMemo(() => {
    const verified = payments.filter((p) => p.status === 'verified');
    const verifiedRevenue = verified.reduce((sum, p) => sum + p.amount, 0);
    const pendingRevenue = pendingPayments.reduce((sum, p) => sum + p.amount, 0);
    return {
      verifiedRevenue,
      pendingRevenue,
      pendingCount: pendingPayments.length,
      verifiedCount: verified.length,
    };
  }, [payments, pendingPayments]);

  const getStatusBadge = (status: string) => {
    const meta = STATUS_META[status];
    if (!meta) return <Badge variant="neutral-soft">{status}</Badge>;
    return (
      <Badge variant={meta.variant} className="gap-1.5">
        <span className={cn('h-1.5 w-1.5 rounded-full', meta.dot)} aria-hidden />
        {meta.label}
      </Badge>
    );
  };

  const handleVerify = async (paymentId: string) => {
    setProcessing(true);
    try {
      await verifyPayment(paymentId);
      toast.success('Payment verified successfully');
    } catch (error) {
      toast.error('Failed to verify payment');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedPaymentId || !rejectReason.trim()) return;
    setProcessing(true);
    try {
      await rejectPayment(selectedPaymentId, rejectReason);
      toast.success('Payment rejected');
      setRejectDialogOpen(false);
      setSelectedPaymentId(null);
      setRejectReason('');
    } catch (error) {
      toast.error('Failed to reject payment');
    } finally {
      setProcessing(false);
    }
  };

  // Mobile card view for payments
  const PaymentCard = ({ payment, showActions = false }: { payment: typeof payments[0]; showActions?: boolean }) => (
    <MobileDataCard
      data={payment}
      header={
        <div>
          <p className="font-medium">{payment.tenant_name}</p>
          <p className="text-xs text-muted-foreground">
            {format(new Date(payment.created_at), 'MMM d, yyyy h:mm a')}
          </p>
        </div>
      }
      fields={[
        {
          key: 'amount',
          label: 'Amount',
          render: () => (
            <span className="tabular-nums font-semibold text-foreground">
              {formatCurrency(payment.amount)}
            </span>
          ),
        },
        {
          key: 'method',
          label: 'Method',
          render: () => <span className="capitalize">{payment.payment_method}</span>,
        },
        {
          key: 'txn',
          label: 'Transaction',
          render: () => (
            <span className="font-mono text-xs text-muted-foreground">{payment.transaction_id || '-'}</span>
          ),
        },
        {
          key: 'status',
          label: 'Status',
          render: () => getStatusBadge(payment.status),
        },
      ]}
      footer={
        showActions ? (
          <div className="flex gap-2">
            <Button
              size="sm"
              className="min-h-11 flex-1"
              onClick={() => handleVerify(payment.id)}
              disabled={processing}
            >
              <Check className="h-4 w-4 mr-1" />
              Verify
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="min-h-11 flex-1 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => {
                setSelectedPaymentId(payment.id);
                setRejectDialogOpen(true);
              }}
              disabled={processing}
            >
              <X className="h-4 w-4 mr-1" />
              Reject
            </Button>
          </div>
        ) : undefined
      }
    />
  );

  const PaymentsEmpty = ({ showActions }: { showActions: boolean }) => (
    <EmptyState
      icon={showActions ? CheckCircle2 : Inbox}
      title={showActions ? 'Nothing to verify' : 'No payments yet'}
      description={
        showActions
          ? 'All caught up — there are no payments waiting for verification.'
          : 'Payments will appear here once tenants complete checkout.'
      }
      className="py-12"
    />
  );

  const PaymentsTable = ({ data, showActions = false }: { data: typeof payments; showActions?: boolean }) => {
    if (data.length === 0) return <PaymentsEmpty showActions={showActions} />;

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tenant</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead>Method</TableHead>
            <TableHead>Transaction ID</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Date</TableHead>
            {showActions && <TableHead className="text-right">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((payment) => (
            <TableRow key={payment.id}>
              <TableCell className="font-medium">{payment.tenant_name}</TableCell>
              <TableCell className="text-right tabular-nums font-semibold">
                {formatCurrency(payment.amount)}
              </TableCell>
              <TableCell className="capitalize">{payment.payment_method}</TableCell>
              <TableCell className="font-mono text-sm text-muted-foreground">
                {payment.transaction_id || '-'}
              </TableCell>
              <TableCell>{getStatusBadge(payment.status)}</TableCell>
              <TableCell className="text-muted-foreground text-sm">
                {format(new Date(payment.created_at), 'MMM d, yyyy h:mm a')}
              </TableCell>
              {showActions && (
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleVerify(payment.id)}
                      disabled={processing}
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Verify
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => {
                        setSelectedPaymentId(payment.id);
                        setRejectDialogOpen(true);
                      }}
                      disabled={processing}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Reject
                    </Button>
                  </div>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  const PaymentsList = ({ data, showActions = false }: { data: typeof payments; showActions?: boolean }) => {
    if (data.length === 0) return <PaymentsEmpty showActions={showActions} />;

    return (
      <div className="space-y-3">
        {data.map((payment) => (
          <PaymentCard key={payment.id} payment={payment} showActions={showActions} />
        ))}
      </div>
    );
  };

  return (
    <AdminLayout>
      <m.div
        variants={pageEnter}
        initial="hidden"
        animate="show"
        className="mx-auto w-full max-w-[1440px] space-y-6 p-4 md:p-6"
      >
        {/* Header */}
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Payments</h1>
            <p className="text-sm text-muted-foreground">
              Verify and manage tenant payment transactions
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={loading}
            className="min-h-[44px] self-start sm:min-h-0 sm:self-auto"
          >
            <RefreshCw className={cn('h-4 w-4 mr-2', loading && 'animate-spin')} aria-hidden />
            Refresh
          </Button>
        </header>

        {/* KPI strip — 3 stat cards + the ONE orange revenue tile */}
        <m.div
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="grid grid-cols-2 gap-4 lg:grid-cols-4 sm:gap-5"
        >
          <KpiCard
            title="Pending verification"
            value={metrics.pendingCount}
            icon={Clock}
            tone={metrics.pendingCount > 0 ? 'warning' : 'success'}
            loading={loading}
          />
          <KpiCard
            title="Verified payments"
            value={metrics.verifiedCount}
            icon={CheckCircle2}
            tone="success"
            loading={loading}
          />
          <KpiCard
            title="Pending revenue"
            value={metrics.pendingRevenue}
            format={formatCurrency}
            icon={Receipt}
            tone="info"
            loading={loading}
          />
          <m.div variants={staggerItem}>
            <PaymentsRevenueTile total={metrics.verifiedRevenue} loading={loading} />
          </m.div>
        </m.div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base md:text-lg">
              <Receipt className="h-5 w-5 text-primary" aria-hidden />
              Payment Management
            </CardTitle>
            <CardDescription>
              {pendingPayments.length} pending verification
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="pending" className="space-y-4">
              <ScrollArea className="w-full">
                <TabsList className="w-full justify-start">
                  <TabsTrigger value="pending" className="text-sm">
                    Pending ({pendingPayments.length})
                  </TabsTrigger>
                  <TabsTrigger value="all" className="text-sm">All Payments</TabsTrigger>
                </TabsList>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>

              <TabsContent value="pending">
                {loading ? (
                  <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <Skeleton key={i} className="h-24 md:h-12 w-full" />
                    ))}
                  </div>
                ) : isMobile ? (
                  <PaymentsList data={pendingPayments} showActions />
                ) : (
                  <PaymentsTable data={pendingPayments} showActions />
                )}
              </TabsContent>

              <TabsContent value="all">
                {loading ? (
                  <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-24 md:h-12 w-full" />
                    ))}
                  </div>
                ) : isMobile ? (
                  <PaymentsList data={payments} />
                ) : (
                  <PaymentsTable data={payments} />
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
          <DialogContent className="mx-4 max-w-[calc(100vw-2rem)] sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Reject Payment</DialogTitle>
              <DialogDescription>
                Please provide a reason for rejecting this payment.
              </DialogDescription>
            </DialogHeader>
            <Textarea
              placeholder="Enter rejection reason..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
            />
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={() => setRejectDialogOpen(false)} className="w-full sm:w-auto">
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={!rejectReason.trim() || processing}
                className="w-full sm:w-auto"
              >
                Reject Payment
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </m.div>
    </AdminLayout>
  );
}
