import AdminLayout from '@/components/layout/AdminLayout';
import { useExternalSales } from '@/hooks/useExternalSales';
import { useSystemAdmin } from '@/hooks/useSystemAdmin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { KpiCard } from '@/components/dashboard/bento/KpiCard';
import { SalesHighlightTile } from '@/components/admin/external-sales/SalesHighlightTile';
import { m, pageEnter, staggerContainer } from '@/lib/motion';
import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  ShoppingCart,
  CheckCircle,
  RefreshCw,
  Search,
  ExternalLink,
  Copy,
  Check,
  Plus,
  Trash2,
  Eye,
  MoreHorizontal,
  Target
} from 'lucide-react';
import { format } from 'date-fns';
import { useState } from 'react';
import { toast } from 'sonner';
import CreateExternalOrderDialog from '@/components/admin/CreateExternalOrderDialog';
import NotificationStatusBadges from '@/components/admin/NotificationStatusBadges';
import OrderDetailsDialog from '@/components/admin/OrderDetailsDialog';
import { MobileDataCard } from '@/components/admin/MobileDataCard';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { ExternalSalesOrder } from '@/hooks/useExternalSales';

export default function ExternalSales() {
  const { orders, stats, loading, refetch, createOrder, isCreating, retryOrder, isRetrying, retryingOrderId, deleteOrder, isDeleting, deletingOrderId, resendNotification, isResendingNotification, resendingOrderId } = useExternalSales();
  const { isSuperAdmin } = useSystemAdmin();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<ExternalSalesOrder | null>(null);
  const [deleteDialogOrder, setDeleteDialogOrder] = useState<ExternalSalesOrder | null>(null);
  const isMobile = useIsMobile();

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.business_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.external_order_id.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    const map: Record<
      string,
      { label: string; variant: 'success-soft' | 'info-soft' | 'neutral-soft' | 'destructive-soft' | 'warning-soft'; dot: string }
    > = {
      completed: { label: 'Completed', variant: 'success-soft', dot: 'bg-success' },
      processing: { label: 'Processing', variant: 'info-soft', dot: 'bg-info' },
      pending: { label: 'Pending', variant: 'warning-soft', dot: 'bg-warning' },
      failed: { label: 'Failed', variant: 'destructive-soft', dot: 'bg-destructive' },
    };
    const meta = map[status] || {
      label: status,
      variant: 'neutral-soft' as const,
      dot: 'bg-muted-foreground',
    };
    return (
      <Badge variant={meta.variant} className="gap-1.5">
        <span className={cn('h-1.5 w-1.5 rounded-full', meta.dot)} aria-hidden />
        {meta.label}
      </Badge>
    );
  };

  const getInitials = (name: string) =>
    name
      .split(' ')
      .map((w) => w[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase() || '?';

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL || 'https://cdkrvztqeuflxilrtnws.supabase.co'}/functions/v1/sales-order-webhook`;

  const conversionPct = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  // Mobile order card
  const OrderCard = ({ order }: { order: ExternalSalesOrder }) => (
    <MobileDataCard
      data={order}
      onClick={() => setSelectedOrder(order)}
      header={
        <div>
          <p className="font-medium">{order.customer_name}</p>
          <p className="text-xs text-muted-foreground">{order.business_name}</p>
        </div>
      }
      fields={[
        {
          key: 'orderId',
          label: 'Order ID',
          render: () => <span className="font-mono text-xs">{order.external_order_id}</span>,
        },
        {
          key: 'amount',
          label: 'Amount',
          render: () => (
            <span className="font-semibold tabular-nums">
              ৳{order.amount.toLocaleString()}<span className="text-xs text-muted-foreground">/{order.billing_cycle}</span>
            </span>
          ),
        },
        {
          key: 'status',
          label: 'Status',
          render: () => getStatusBadge(order.status),
        },
        {
          key: 'date',
          label: 'Date',
          render: () => (
            <span className="text-xs text-muted-foreground">
              {format(new Date(order.created_at), 'MMM d, yyyy')}
            </span>
          ),
        },
      ]}
      actions={
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setSelectedOrder(order)}>
              <Eye className="h-4 w-4 mr-2" />
              View Details
            </DropdownMenuItem>
            {(order.status === 'failed' || order.status === 'pending') && (
              <DropdownMenuItem 
                onClick={() => retryOrder(order)}
                disabled={isRetrying && retryingOrderId === order.id}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </DropdownMenuItem>
            )}
            {isSuperAdmin && (
              <DropdownMenuItem 
                onClick={() => setDeleteDialogOrder(order)}
                className="text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      }
    />
  );

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
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">External Sales</h1>
            <p className="text-sm text-muted-foreground">
              Orders received from your external sales website
            </p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={loading}
              className="min-h-[44px] sm:min-h-0"
            >
              <RefreshCw className={cn('h-4 w-4 md:mr-2', loading && 'animate-spin')} />
              <span className="hidden md:inline">Refresh</span>
            </Button>
            <Button size="sm" onClick={() => setCreateDialogOpen(true)} className="min-h-[44px] sm:min-h-0">
              <Plus className="h-4 w-4 md:mr-2" />
              <span className="hidden md:inline">Create Order</span>
            </Button>
          </div>
        </header>

        {/* KPI strip — soft stat cards + the ONE orange highlight (total revenue) */}
        <m.div
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4"
        >
          <KpiCard title="Total orders" value={stats.total} icon={ShoppingCart} tone="primary" loading={loading} />
          <KpiCard title="Completed deals" value={stats.completed} icon={CheckCircle} tone="success" loading={loading} />
          <KpiCard
            title="Conversion"
            value={conversionPct}
            format={(v) => `${Math.round(v)}%`}
            icon={Target}
            tone="info"
            loading={loading}
          />
          <SalesHighlightTile revenue={stats.totalRevenue} completed={stats.completed} loading={loading} />
        </m.div>

        {/* Webhook URL Card */}
        <Card className="bg-muted/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm md:text-base flex items-center gap-2">
              <ExternalLink className="h-4 w-4" />
              Webhook Endpoint
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <code className="flex-1 p-2 bg-background rounded border text-xs md:text-sm overflow-x-auto">
                {webhookUrl}
              </code>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="icon"
                      className="shrink-0"
                      onClick={() => copyToClipboard(webhookUrl, 'webhook')}
                    >
                      {copiedId === 'webhook' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Copy URL</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Send POST requests with <code className="bg-muted px-1 rounded">X-Sales-Webhook-Secret</code> header
            </p>
          </CardContent>
        </Card>

        {/* Filters & Orders */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search orders..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-24 md:h-16 w-full" />
                ))}
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="text-center py-12">
                <ShoppingCart className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">No orders found</p>
                {searchTerm || statusFilter !== 'all' ? (
                  <Button variant="link" onClick={() => { setSearchTerm(''); setStatusFilter('all'); }}>
                    Clear filters
                  </Button>
                ) : (
                  <p className="text-sm text-muted-foreground mt-1">
                    Orders from your external website will appear here
                  </p>
                )}
              </div>
            ) : isMobile ? (
              <div className="space-y-3">
                {filteredOrders.map((order) => (
                  <OrderCard key={order.id} order={order} />
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order ID</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Business</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Notifications</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOrders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-mono text-sm">
                          {order.external_order_id}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9">
                              <AvatarFallback className="bg-muted-soft text-xs font-semibold text-muted-foreground">
                                {getInitials(order.customer_name)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="truncate font-medium">{order.customer_name}</p>
                              <p className="truncate text-xs text-muted-foreground">{order.customer_email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{order.business_name}</p>
                            <p className="text-xs text-muted-foreground capitalize">{order.business_type}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-semibold tabular-nums">৳{order.amount.toLocaleString()}</span>
                          <span className="text-xs text-muted-foreground ml-1">/{order.billing_cycle}</span>
                        </TableCell>
                        <TableCell>
                          {order.plan?.name || '-'}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {getStatusBadge(order.status)}
                            {order.error_message && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="text-xs text-destructive truncate max-w-[150px] block cursor-help">
                                      {order.error_message}
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-sm">
                                    {order.error_message}
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <NotificationStatusBadges
                            whatsappSent={order.whatsapp_sent}
                            whatsappSentAt={order.whatsapp_sent_at}
                            emailSent={order.email_sent}
                            emailSentAt={order.email_sent_at}
                            notificationErrors={order.notification_errors}
                            customerPhone={order.customer_phone}
                            status={order.status}
                            onResend={(type) => resendNotification({ orderId: order.id, notificationType: type })}
                            isResending={isResendingNotification && resendingOrderId === order.id}
                          />
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(order.created_at), 'MMM d, yyyy')}
                          <br />
                          <span className="text-xs">{format(new Date(order.created_at), 'h:mm a')}</span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => setSelectedOrder(order)}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>View details</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>

                            {(order.status === 'failed' || order.status === 'pending') && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => retryOrder(order)}
                                      disabled={isRetrying && retryingOrderId === order.id}
                                    >
                                      <RefreshCw className={`h-4 w-4 mr-1 ${isRetrying && retryingOrderId === order.id ? 'animate-spin' : ''}`} />
                                      Retry
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Retry processing</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                            {order.status === 'completed' && order.tenant_id && (
                              <Badge variant="success-soft" className="gap-1">
                                <CheckCircle className="h-3 w-3" />
                                Active
                              </Badge>
                            )}
                            {isSuperAdmin && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                disabled={isDeleting && deletingOrderId === order.id}
                                onClick={() => setDeleteDialogOrder(order)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <CreateExternalOrderDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          onSubmit={createOrder}
          isSubmitting={isCreating}
        />

        <OrderDetailsDialog
          order={selectedOrder}
          open={!!selectedOrder}
          onOpenChange={(open) => !open && setSelectedOrder(null)}
        />

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!deleteDialogOrder} onOpenChange={(open) => !open && setDeleteDialogOrder(null)}>
          <AlertDialogContent className="mx-4 max-w-[calc(100vw-2rem)] sm:max-w-lg">
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Order?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete order <strong>{deleteDialogOrder?.external_order_id}</strong>? 
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-col sm:flex-row gap-2">
              <AlertDialogCancel className="w-full sm:w-auto">Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (deleteDialogOrder) {
                    deleteOrder(deleteDialogOrder.id);
                    setDeleteDialogOrder(null);
                  }
                }}
                className="w-full sm:w-auto bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </m.div>
    </AdminLayout>
  );
}
