import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { useToast } from '@/hooks/use-toast';

export interface Product {
  id: string;
  tenant_id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  sku: string | null;
  price: number;
  compare_at_price: number | null;
  cost_price: number | null;
  stock_quantity: number;
  track_inventory: boolean;
  low_stock_threshold: number;
  images: string[];
  variants: any[];
  tags: string[] | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  category?: {
    id: string;
    name: string;
  };
}

export interface ProductFormData {
  name: string;
  description?: string;
  sku?: string;
  price: number;
  compare_at_price?: number;
  cost_price?: number;
  category_id?: string;
  stock_quantity?: number;
  track_inventory?: boolean;
  low_stock_threshold?: number;
  images?: string[];
  tags?: string[];
  is_active?: boolean;
}

export function useProducts() {
  const { currentTenant } = useTenantContext();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const tenantId = currentTenant?.id;

  const { data: products = [], isLoading, error } = useQuery({
    queryKey: ['products', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          category:categories(id, name)
        `)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Product[];
    },
    enabled: !!tenantId,
  });

  const createProduct = useMutation({
    mutationFn: async (productData: ProductFormData) => {
      if (!tenantId) throw new Error('No tenant selected');

      const { data, error } = await supabase
        .from('products')
        .insert({
          tenant_id: tenantId,
          name: productData.name,
          description: productData.description || null,
          sku: productData.sku || null,
          price: productData.price,
          compare_at_price: productData.compare_at_price || null,
          cost_price: productData.cost_price || null,
          category_id: productData.category_id || null,
          stock_quantity: productData.stock_quantity || 0,
          track_inventory: productData.track_inventory ?? true,
          low_stock_threshold: productData.low_stock_threshold || 5,
          images: productData.images || [],
          tags: productData.tags || null,
          is_active: productData.is_active ?? true,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products', tenantId] });
      toast({ title: 'Product created successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to create product', description: error.message, variant: 'destructive' });
    },
  });

  const updateProduct = useMutation({
    mutationFn: async ({ id, ...productData }: ProductFormData & { id: string }) => {
      const { data, error } = await supabase
        .from('products')
        .update({
          name: productData.name,
          description: productData.description || null,
          sku: productData.sku || null,
          price: productData.price,
          compare_at_price: productData.compare_at_price || null,
          cost_price: productData.cost_price || null,
          category_id: productData.category_id || null,
          stock_quantity: productData.stock_quantity,
          track_inventory: productData.track_inventory,
          low_stock_threshold: productData.low_stock_threshold,
          images: productData.images || [],
          tags: productData.tags || null,
          is_active: productData.is_active,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products', tenantId] });
      toast({ title: 'Product updated successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to update product', description: error.message, variant: 'destructive' });
    },
  });

  const deleteProduct = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products', tenantId] });
      toast({ title: 'Product deleted successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to delete product', description: error.message, variant: 'destructive' });
    },
  });

  const uploadProductImage = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${tenantId}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(fileName, file);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from('product-images')
      .getPublicUrl(fileName);

    return data.publicUrl;
  };

  return {
    products,
    isLoading,
    error,
    createProduct,
    updateProduct,
    deleteProduct,
    uploadProductImage,
  };
}
