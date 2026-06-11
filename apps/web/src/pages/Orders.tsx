import { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';
import { EmptyState } from '@/components/ui/empty-state';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { Plus, Search, ShoppingCart, Loader2, Trash2, FileText, Printer, Package, DollarSign, Truck, CalendarIcon, X, Download } from 'lucide-react';
import { useOrders, Order, ORDER_STATUSES } from '@/hooks/useOrders';
import { useSelection } from '@/hooks/useSelection';
import { useInvoices } from '@/hooks/useInvoices';
import { useIsMobile } from '@/hooks/use-mobile';
import { OrdersTable } from '@/components/orders/OrdersTable';
import { OrderCard } from '@/components/orders/OrderCard';
import { CreateOrderDialog } from '@/components/orders/CreateOrderDialog';
import { OrderDetailsDialog } from '@/components/orders/OrderDetailsDialog';
import { BulkBookParcelDialog } from '@/components/orders/BulkBookParcelDialog';
import { BulkActionsBar } from '@/components/admin/BulkActionsBar';
import { toast } from 'sonner';
import { exportToCSV } from '@/lib/csv-export';
import { format, startOfDay, endOfDay, isWithinInterval } from 'date-fns';
import { cn } from '@/lib/utils';
import { DateRange } from 'react-day-picker';

const ORDERS_PER_PAGE = 20;

export default function Orders() {
  const { orders, isLoading, deleteOrder, purchaseBehavior } = useOrders();
  const { bulkGenerateInvoices, printInvoices } = useInvoices();
  const isMobile = useIsMobile();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [viewingOrder, setViewingOrder] = useState<Order | null>(null);
  const [deletingOrder, setDeletingOrder] = useState<Order | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkBookOpen, setBulkBookOpen] = useState(false);

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customer_phone?.includes(searchQuery);
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    
    // Date range filter
    let matchesDateRange = true;
    if (dateRange?.from) {
      const orderDate = new Date(order.created_at);
      const fromDate = startOfDay(dateRange.from);
      const toDate = dateRange.to ? endOfDay(dateRange.to) : endOfDay(dateRange.from);
      matchesDateRange = isWithinInterval(orderDate, { start: fromDate, end: toDate });
    }
    
    return matchesSearch && matchesStatus && matchesDateRange;
  });

  // Pagination
  const totalPages = Math.ceil(filteredOrders.length / ORDERS_PER_PAGE);
  const startIndex = (currentPage - 1) * ORDERS_PER_PAGE;
  const endIndex = startIndex + ORDERS_PER_PAGE;
  const paginatedOrders = filteredOrders.slice(startIndex, endIndex);

  const selection = useSelection(filteredOrders);

  const handleDelete = async () => {
    if (deletingOrder) {
      await deleteOrder.mutateAsync(deletingOrder.id);
      setDeletingOrder(null);
    }
  };

  const handleBulkDelete = async () => {
    try {
      for (const order of selection.selectedItems) {
        await deleteOrder.mutateAsync(order.id);
      }
      toast.success(`${selection.selectedCount} orders deleted`);
      selection.clearSelection();
      setBulkDeleteOpen(false);
    } catch (error) {
      toast.error('Failed to delete some orders');
    }
  };

  const handleBulkGenerateInvoices = async () => {
    const orderIds = selection.selectedItems.map(o => o.id);
    await bulkGenerateInvoices.mutateAsync(orderIds);
  };

  const handleBulkPrintInvoices = async () => {
    const orderIds = selection.selectedItems.map(o => o.id);
    await printInvoices(orderIds);
  };

  // Reset to page 1 when filters change
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const handleStatusChange = (value: string) => {
    setStatusFilter(value);
    setCurrentPage(1);
  };

  const handleDateRangeChange = (range: DateRange | undefined) => {
    setDateRange(range);
    setCurrentPage(1);
  };

  const clearDateRange = () => {
    setDateRange(undefined);
    setCurrentPage(1);
  };

  const handleExportCSV = () => {
    if (filteredOrders.length === 0) {
      toast.error('No orders to export');
      return;
    }

    const columns = [
      { key: 'order_number', header: 'Order Number' },
      { key: 'created_at', header: 'Date', formatter: (v: unknown) => v ? format(new Date(v as string), 'dd/MM/yyyy HH:mm') : '' },
      { key: 'customer_name', header: 'Customer Name' },
      { key: 'customer_phone', header: 'Phone' },
      { key: 'source', header: 'Source', formatter: (v: unknown) => String(v || 'manual') },
      { key: 'status', header: 'Status' },
      { key: 'payment_status', header: 'Payment Status' },
      { key: 'subtotal', header: 'Subtotal', formatter: (v: unknown) => String(v || 0) },
      { key: 'discount_amount', header: 'Discount', formatter: (v: unknown) => String(v || 0) },
      { key: 'shipping_amount', header: 'Shipping', formatter: (v: unknown) => String(v || 0) },
      { key: 'total', header: 'Total', formatter: (v: unknown) => String(v || 0) },
      { key: 'currency', header: 'Currency' },
      { key: 'tracking_number', header: 'Tracking Number' },
      { key: 'courier', header: 'Courier' },
      { key: 'notes', header: 'Notes' },
    ];

    const dateStr = dateRange?.from 
      ? `_${format(dateRange.from, 'yyyyMMdd')}${dateRange.to ? '-' + format(dateRange.to, 'yyyyMMdd') : ''}`
      : '';
    const filename = `orders${dateStr}_${format(new Date(), 'yyyyMMdd_HHmm')}`;

    exportToCSV(filteredOrders, columns, filename);
    toast.success(`Exported ${filteredOrders.length} orders`);
  };

  const stats = {
    total: orders.length,
    pending: orders.filter(o => o.status === 'pending').length,
    processing: orders.filter(o => o.status === 'processing' || o.status === 'confirmed').length,
    shipped: orders.filter(o => o.status === 'shipped').length,
    delivered: orders.filter(o => o.status === 'delivered').length,
    totalRevenue: orders.filter(o => o.payment_status === 'paid').reduce((sum, o) => sum + o.total, 0),
  };

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        {/* Header */}
        <PageHeader
          title="Orders"
          description="Manage customer orders and fulfillment"
        >
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              onClick={handleExportCSV}
              disabled={filteredOrders.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Export
              {filteredOrders.length > 0 && (
                <span className="ml-1 text-xs text-muted-foreground">({filteredOrders.length})</span>
              )}
            </Button>
            <Button onClick={() => setCreateDialogOpen(true)} variant="premium">
              <Plus className="h-4 w-4 mr-2" />
              Create Order
            </Button>
          </div>
        </PageHeader>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 stagger-animation">
          <StatCard
            title="Total Orders"
            value={stats.total}
            icon={Package}
            iconColor="text-primary"
          />
          <StatCard
            title="Pending"
            value={stats.pending}
            icon={ShoppingCart}
            iconColor="text-warning"
          />
          <StatCard
            title="Processing"
            value={stats.processing}
            icon={Package}
            iconColor="text-info"
          />
          <StatCard
            title="Shipped"
            value={stats.shipped}
            icon={Truck}
            iconColor="text-primary"
          />
          <StatCard
            title="Revenue"
            value={`৳${stats.totalRevenue.toFixed(0)}`}
            icon={DollarSign}
            iconColor="text-success"
          />
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search orders..."
                    value={searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="pl-9"
                  />
                </div>

                {/* Date Range Picker */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "justify-start text-left font-normal min-w-[200px]",
                        !dateRange && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange?.from ? (
                        dateRange.to ? (
                          <>
                            {format(dateRange.from, "dd MMM")} - {format(dateRange.to, "dd MMM")}
                          </>
                        ) : (
                          format(dateRange.from, "dd MMM yyyy")
                        )
                      ) : (
                        <span>Filter by date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      initialFocus
                      mode="range"
                      defaultMonth={dateRange?.from}
                      selected={dateRange}
                      onSelect={handleDateRangeChange}
                      numberOfMonths={isMobile ? 1 : 2}
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>

                {dateRange && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearDateRange}
                    className="h-9 px-2"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Clear
                  </Button>
                )}
              </div>
              
              <Tabs value={statusFilter} onValueChange={handleStatusChange}>
                <TabsList className="bg-muted/50">
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="pending">Pending</TabsTrigger>
                  <TabsTrigger value="processing">Processing</TabsTrigger>
                  <TabsTrigger value="shipped">Shipped</TabsTrigger>
                  <TabsTrigger value="delivered">Delivered</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardContent>
        </Card>

        {/* Orders List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Loading orders...</p>
            </div>
          </div>
        ) : filteredOrders.length === 0 ? (
          <Card>
            <EmptyState
              icon={ShoppingCart}
              title="No orders yet"
              description="Create your first order to start managing your sales and track customer purchases."
              action={{
                label: "Create Order",
                onClick: () => setCreateDialogOpen(true),
                icon: Plus,
              }}
            />
          </Card>
        ) : isMobile ? (
          // Mobile: Card layout
          <div className="space-y-3">
            <div className="grid gap-3 stagger-animation">
              {paginatedOrders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onView={setViewingOrder}
                  onUpdateStatus={setViewingOrder}
                  onUpdatePayment={setViewingOrder}
                  onDelete={setDeletingOrder}
                />
              ))}
            </div>
          </div>
        ) : (
          // Desktop: Table layout
          <div data-tour="orders-table" className="space-y-4">
            <OrdersTable
              orders={paginatedOrders}
              purchaseBehavior={purchaseBehavior}
              selection={selection}
              onView={setViewingOrder}
              onEdit={setViewingOrder}
              onPrint={(order) => printInvoices([order.id])}
              onUpdateStatus={setViewingOrder}
              onUpdatePayment={setViewingOrder}
              onDelete={setDeletingOrder}
            />

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-2">
                <p className="text-sm text-muted-foreground">
                  Showing {startIndex + 1} to {Math.min(endIndex, filteredOrders.length)} of {filteredOrders.length} orders
                </p>
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious 
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                      />
                    </PaginationItem>
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      return (
                        <PaginationItem key={pageNum}>
                          <PaginationLink
                            onClick={() => setCurrentPage(pageNum)}
                            isActive={currentPage === pageNum}
                            className="cursor-pointer"
                          >
                            {pageNum}
                          </PaginationLink>
                        </PaginationItem>
                      );
                    })}
                    <PaginationItem>
                      <PaginationNext 
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bulk Actions Bar */}
      <BulkActionsBar
        selectedCount={selection.selectedCount}
        onClearSelection={selection.clearSelection}
        actions={[
          {
            label: 'Book Courier',
            icon: <Truck className="h-4 w-4" />,
            onClick: () => setBulkBookOpen(true),
          },
          {
            label: 'Generate Invoices',
            icon: <FileText className="h-4 w-4" />,
            onClick: handleBulkGenerateInvoices,
            disabled: bulkGenerateInvoices.isPending,
          },
          {
            label: 'Print Invoices',
            icon: <Printer className="h-4 w-4" />,
            onClick: handleBulkPrintInvoices,
          },
          {
            label: 'Delete',
            icon: <Trash2 className="h-4 w-4" />,
            onClick: () => setBulkDeleteOpen(true),
            variant: 'destructive',
          },
        ]}
      />

      {/* Create Order Dialog */}
      <CreateOrderDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />

      {/* Order Details Dialog */}
      <OrderDetailsDialog
        open={!!viewingOrder}
        onOpenChange={(open) => !open && setViewingOrder(null)}
        order={viewingOrder}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingOrder} onOpenChange={() => setDeletingOrder(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Order</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete order {deletingOrder?.order_number}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Confirmation */}
      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selection.selectedCount} Orders</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete these orders? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive text-destructive-foreground">
              Delete All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Book Parcel Dialog */}
      <BulkBookParcelDialog
        open={bulkBookOpen}
        onOpenChange={setBulkBookOpen}
        orders={selection.selectedItems}
        onComplete={() => {
          toast.success('Parcels booked successfully');
          selection.clearSelection();
        }}
      />
    </DashboardLayout>
  );
}
