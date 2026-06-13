import { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, History, AlertTriangle, Package, PackageX, Boxes, Activity } from 'lucide-react';
import { StockMovementsList } from '@/components/inventory/StockMovementsList';
import { LowStockAlerts } from '@/components/inventory/LowStockAlerts';
import { StockAdjustmentDialog } from '@/components/inventory/StockAdjustmentDialog';
import { InventoryValueTile } from '@/components/products/InventoryValueTile';
import { KpiCard } from '@/components/dashboard/bento/KpiCard';
import { useInventory } from '@/hooks/useInventory';
import { m, pageEnter, staggerContainer, staggerItem } from '@/lib/motion';

export default function Inventory() {
  const { stockSummary, isLoadingSummary } = useInventory();

  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<{
    id: string;
    name: string;
    currentStock: number;
  } | null>(null);

  const handleRestock = (productId: string, productName: string, currentStock: number) => {
    setSelectedProduct({ id: productId, name: productName, currentStock });
    setAdjustDialogOpen(true);
  };

  const handleAdjustDialogClose = (open: boolean) => {
    setAdjustDialogOpen(open);
    if (!open) {
      setSelectedProduct(null);
    }
  };

  const summary = stockSummary ?? {
    totalProducts: 0,
    totalStockValue: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
    movementsToday: 0,
  };

  return (
    <DashboardLayout>
      <m.div
        variants={pageEnter}
        initial="hidden"
        animate="show"
        className="mx-auto w-full max-w-[1440px] px-4 py-5 sm:px-6 lg:px-8 space-y-6"
      >
        {/* Header */}
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Inventory</h1>
            <p className="text-sm text-muted-foreground">
              Track and manage your product stock levels.
            </p>
          </div>
          <Button onClick={() => setAdjustDialogOpen(true)} className="min-h-11">
            <Plus className="h-4 w-4 mr-2" />
            Adjust Stock
          </Button>
        </header>

        {/* KPI strip — stat cards + the ONE orange inventory-value tile */}
        <m.div
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-3 xl:grid-cols-5"
        >
          <m.div variants={staggerItem}>
            <KpiCard
              title="Tracked SKUs"
              value={summary.totalProducts}
              icon={Boxes}
              tone="info"
              loading={isLoadingSummary}
            />
          </m.div>
          <m.div variants={staggerItem}>
            <KpiCard
              title="Low Stock"
              value={summary.lowStockCount}
              icon={AlertTriangle}
              tone="warning"
              loading={isLoadingSummary}
            />
          </m.div>
          <m.div variants={staggerItem}>
            <KpiCard
              title="Out of Stock"
              value={summary.outOfStockCount}
              icon={PackageX}
              tone="destructive"
              loading={isLoadingSummary}
            />
          </m.div>
          <m.div variants={staggerItem}>
            <KpiCard
              title="Movements Today"
              value={summary.movementsToday}
              icon={Activity}
              tone="primary"
              loading={isLoadingSummary}
            />
          </m.div>
          {/* The single orange surface on this page */}
          <InventoryValueTile
            value={summary.totalStockValue}
            productCount={summary.totalProducts}
            loading={isLoadingSummary}
          />
        </m.div>

        {/* Tabs for different views */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="bg-muted/50">
            <TabsTrigger value="overview" className="gap-2">
              <Package className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="movements" className="gap-2">
              <History className="h-4 w-4" />
              Stock Movements
            </TabsTrigger>
            <TabsTrigger value="alerts" className="gap-2">
              <AlertTriangle className="h-4 w-4" />
              Alerts
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-5 lg:grid-cols-2">
              <LowStockAlerts onRestock={handleRestock} />
              <StockMovementsList limit={5} showHeader={true} />
            </div>
          </TabsContent>

          <TabsContent value="movements">
            <StockMovementsList showHeader={false} />
          </TabsContent>

          <TabsContent value="alerts">
            <LowStockAlerts onRestock={handleRestock} />
          </TabsContent>
        </Tabs>
      </m.div>

      {/* Stock Adjustment Dialog */}
      <StockAdjustmentDialog
        open={adjustDialogOpen}
        onOpenChange={handleAdjustDialogClose}
        preselectedProductId={selectedProduct?.id}
        preselectedProductName={selectedProduct?.name}
        preselectedCurrentStock={selectedProduct?.currentStock}
      />
    </DashboardLayout>
  );
}
