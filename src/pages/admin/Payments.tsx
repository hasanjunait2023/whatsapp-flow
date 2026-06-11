import { useState } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import { useAdminPayments } from '@/hooks/useAdminPayments';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Check, X, RefreshCw, Receipt } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { ResponsivePageHeader } from '@/components/admin/ResponsivePageHeader';
import { MobileDataCard } from '@/components/admin/MobileDataCard';
import { useIsMobile } from '@/hooks/use-mobile';

export default function AdminPayments() {
  const { payments, pendingPayments, loading, refetch, verifyPayment, rejectPayment } = useAdminPayments();
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const isMobile = useIsMobile();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return <Badge className="bg-green-500/10 text-green-500 border-green-500/20">Verified</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">Pending</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500/10 text-red-500 border-red-500/20">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
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
            <span className="font-semibold">
              {payment.currency} {payment.amount.toLocaleString()}
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
            <span className="font-mono text-xs">{payment.transaction_id || '-'}</span>
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
              variant="outline"
              className="flex-1 text-green-500 hover:text-green-600"
              onClick={() => handleVerify(payment.id)}
              disabled={processing}
            >
              <Check className="h-4 w-4 mr-1" />
              Verify
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex-1 text-red-500 hover:text-red-600"
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

  const PaymentsTable = ({ data, showActions = false }: { data: typeof payments; showActions?: boolean }) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Tenant</TableHead>
          <TableHead>Amount</TableHead>
          <TableHead>Method</TableHead>
          <TableHead>Transaction ID</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Date</TableHead>
          {showActions && <TableHead className="text-right">Actions</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.length === 0 ? (
          <TableRow>
            <TableCell colSpan={showActions ? 7 : 6} className="text-center text-muted-foreground py-8">
              No payments found
            </TableCell>
          </TableRow>
        ) : (
          data.map((payment) => (
            <TableRow key={payment.id}>
              <TableCell className="font-medium">{payment.tenant_name}</TableCell>
              <TableCell>
                {payment.currency} {payment.amount.toLocaleString()}
              </TableCell>
              <TableCell className="capitalize">{payment.payment_method}</TableCell>
              <TableCell className="font-mono text-sm">
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
                      variant="outline"
                      className="text-green-500 hover:text-green-600"
                      onClick={() => handleVerify(payment.id)}
                      disabled={processing}
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Verify
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-500 hover:text-red-600"
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
          ))
        )}
      </TableBody>
    </Table>
  );

  const PaymentsList = ({ data, showActions = false }: { data: typeof payments; showActions?: boolean }) => {
    if (data.length === 0) {
      return (
        <div className="text-center text-muted-foreground py-8">
          No payments found
        </div>
      );
    }

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
      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        <ResponsivePageHeader
          title="Payments"
          description="Verify and manage payment transactions"
          actions={
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          }
        />

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base md:text-lg">
              <Receipt className="h-5 w-5" />
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
      </div>
    </AdminLayout>
  );
}
