import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { useToast } from '@/hooks/use-toast';

export interface StockMovement {
  id: string;
  tenant_id: string;
  product_id: string;
  variant_id: string | null;
  movement_type: 'in' | 'out' | 'adjustment' | 'return' | 'damaged' | 'transfer';
  quantity: number;
  previous_quantity: number;
  new_quantity: number;
  reason: string | null;
  reference_type: string | null;
  reference_id: string | null;
  notes: string | null;
  recorded_by: string | null;
  created_at: string;
  product?: {
    name: string;
    sku: string | null;
    images: string[] | null;
  };
}

export interface StockSummary {
  totalProducts: number;
  totalStockValue: number;
  lowStockCount: number;
  outOfStockCount: number;
  movementsToday: number;
}

export interface StockAdjustmentData {
  productId: string;
  variantId?: string;
  adjustmentType: 'add' | 'remove' | 'set';
  quantity: number;
  reason: string;
  notes?: string;
}

export const MOVEMENT_TYPES = [
  { value: 'in', label: 'Stock In', color: 'bg-green-500' },
  { value: 'out', label: 'Stock Out', color: 'bg-red-500' },
  { value: 'adjustment', label: 'Adjustment', color: 'bg-blue-500' },
  { value: 'return', label: 'Return', color: 'bg-purple-500' },
  { value: 'damaged', label: 'Damaged', color: 'bg-amber-500' },
  { value: 'transfer', label: 'Transfer', color: 'bg-cyan-500' },
];

export const ADJUSTMENT_REASONS = [
  { value: 'purchase', label: 'Purchase/Restock' },
  { value: 'manual_adjustment', label: 'Manual Adjustment' },
  { value: 'inventory_count', label: 'Inventory Count' },
  { value: 'damage', label: 'Damaged Goods' },
  { value: 'expired', label: 'Expired' },
  { value: 'return', label: 'Customer Return' },
  { value: 'transfer', label: 'Transfer' },
  { value: 'other', label: 'Other' },
];

export function useInventory() {
  const { currentTenant } = useTenantContext();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const tenantId = currentTenant?.id;

  // Get stock summary/KPIs
  const { data: stockSummary, isLoading: isLoadingSummary } = useQuery({
    queryKey: ['stock-summary', tenantId],
    queryFn: async (): Promise<StockSummary> => {
      if (!tenantId) return {
        totalProducts: 0,
        totalStockValue: 0,
        lowStockCount: 0,
        outOfStockCount: 0,
        movementsToday: 0,
      };

      // Get products with tracking enabled
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('id, price, stock_quantity, low_stock_threshold, track_inventory')
        .eq('tenant_id', tenantId)
        .eq('track_inventory', true);

      if (productsError) throw productsError;

      // Calculate summary
      const totalProducts = products?.length || 0;
      const totalStockValue = products?.reduce((sum, p) => sum + (p.price * p.stock_quantity), 0) || 0;
      const lowStockCount = products?.filter(p => p.stock_quantity > 0 && p.stock_quantity <= p.low_stock_threshold).length || 0;
      const outOfStockCount = products?.filter(p => p.stock_quantity === 0).length || 0;

      // Get today's movements count
      const today = new Date().toISOString().split('T')[0];
      const { count: movementsToday } = await supabase
        .from('stock_movements')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .gte('created_at', `${today}T00:00:00`)
        .lte('created_at', `${today}T23:59:59`);

      return {
        totalProducts,
        totalStockValue,
        lowStockCount,
        outOfStockCount,
        movementsToday: movementsToday || 0,
      };
    },
    enabled: !!tenantId,
  });

  // Get stock movements
  const { data: stockMovements = [], isLoading: isLoadingMovements } = useQuery({
    queryKey: ['stock-movements', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      const { data, error } = await supabase
        .from('stock_movements')
        .select(`
          *,
          product:products(name, sku, images)
        `)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data as unknown as StockMovement[];
    },
    enabled: !!tenantId,
  });

  // Get low stock products
  const { data: lowStockProducts = [], isLoading: isLoadingLowStock } = useQuery({
    queryKey: ['low-stock-products', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      const { data, error } = await supabase
        .from('products')
        .select('id, name, sku, images, stock_quantity, low_stock_threshold, price, category:categories(name)')
        .eq('tenant_id', tenantId)
        .eq('track_inventory', true)
        .eq('is_active', true)
        .order('stock_quantity', { ascending: true });

      if (error) throw error;

      // Filter to only low stock items (stock <= threshold)
      return (data || []).filter(p => p.stock_quantity <= p.low_stock_threshold);
    },
    enabled: !!tenantId,
  });

  // Adjust stock mutation
  const adjustStock = useMutation({
    mutationFn: async (data: StockAdjustmentData) => {
      if (!tenantId) throw new Error('No tenant selected');

      const { data: result, error } = await supabase.rpc('adjust_product_stock', {
        p_product_id: data.productId,
        p_tenant_id: tenantId,
        p_adjustment_type: data.adjustmentType,
        p_quantity: data.quantity,
        p_reason: data.reason,
        p_notes: data.notes || null,
        p_user_id: (await supabase.auth.getUser()).data.user?.id || null,
      });

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-summary', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['stock-movements', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['low-stock-products', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['products', tenantId] });
      toast({ title: 'Stock adjusted successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to adjust stock', description: error.message, variant: 'destructive' });
    },
  });

  // Bulk adjust stock mutation
  const bulkAdjustStock = useMutation({
    mutationFn: async (items: StockAdjustmentData[]) => {
      if (!tenantId) throw new Error('No tenant selected');
      const userId = (await supabase.auth.getUser()).data.user?.id || null;

      for (const item of items) {
        const { error } = await supabase.rpc('adjust_product_stock', {
          p_product_id: item.productId,
          p_tenant_id: tenantId,
          p_adjustment_type: item.adjustmentType,
          p_quantity: item.quantity,
          p_reason: item.reason,
          p_notes: item.notes || null,
          p_user_id: userId,
        });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-summary', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['stock-movements', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['low-stock-products', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['products', tenantId] });
      toast({ title: 'Bulk stock update completed' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to update stock', description: error.message, variant: 'destructive' });
    },
  });

  return {
    stockSummary,
    stockMovements,
    lowStockProducts,
    isLoadingSummary,
    isLoadingMovements,
    isLoadingLowStock,
    adjustStock,
    bulkAdjustStock,
  };
}
