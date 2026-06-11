import { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, History, AlertTriangle, Package } from 'lucide-react';
import { InventoryDashboard } from '@/components/inventory/InventoryDashboard';
import { StockMovementsList } from '@/components/inventory/StockMovementsList';
import { LowStockAlerts } from '@/components/inventory/LowStockAlerts';
import { StockAdjustmentDialog } from '@/components/inventory/StockAdjustmentDialog';

export default function Inventory() {
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

  return (
    <DashboardLayout>
      <div className="container py-6 space-y-6">
      <PageHeader
        title="Inventory"
        description="Track and manage your product stock levels"
      >
        <Button onClick={() => setAdjustDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Adjust Stock
        </Button>
      </PageHeader>

      {/* KPI Dashboard */}
      <InventoryDashboard />

      {/* Tabs for different views */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
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
          <div className="grid gap-4 lg:grid-cols-2">
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

      {/* Stock Adjustment Dialog */}
      <StockAdjustmentDialog
        open={adjustDialogOpen}
        onOpenChange={handleAdjustDialogClose}
        preselectedProductId={selectedProduct?.id}
        preselectedProductName={selectedProduct?.name}
        preselectedCurrentStock={selectedProduct?.currentStock}
      />
      </div>
    </DashboardLayout>
  );
}
