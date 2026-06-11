import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { useToast } from '@/hooks/use-toast';

export interface VariantOption {
  name: string;
  values: string[];
}

export interface ProductVariant {
  id: string;
  product_id: string;
  tenant_id: string;
  name: string;
  sku: string | null;
  price: number | null;
  compare_at_price: number | null;
  cost_price: number | null;
  stock_quantity: number;
  low_stock_threshold: number;
  options: Record<string, string>;
  images: string[];
  is_active: boolean;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface VariantFormData {
  name: string;
  sku?: string;
  price?: number;
  compare_at_price?: number;
  cost_price?: number;
  stock_quantity?: number;
  low_stock_threshold?: number;
  options?: Record<string, string>;
  images?: string[];
  is_active?: boolean;
  position?: number;
}

export function useProductVariants(productId?: string) {
  const { currentTenant } = useTenantContext();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const tenantId = currentTenant?.id;

  const { data: variants = [], isLoading, error } = useQuery({
    queryKey: ['product-variants', productId],
    queryFn: async () => {
      if (!productId) return [];
      
      const { data, error } = await supabase
        .from('product_variants')
        .select('*')
        .eq('product_id', productId)
        .order('position', { ascending: true });

      if (error) throw error;
      return data as ProductVariant[];
    },
    enabled: !!productId,
  });

  const createVariant = useMutation({
    mutationFn: async (data: VariantFormData & { product_id: string }) => {
      if (!tenantId) throw new Error('No tenant selected');

      const { data: variant, error } = await supabase
        .from('product_variants')
        .insert({
          tenant_id: tenantId,
          product_id: data.product_id,
          name: data.name,
          sku: data.sku || null,
          price: data.price || null,
          compare_at_price: data.compare_at_price || null,
          cost_price: data.cost_price || null,
          stock_quantity: data.stock_quantity || 0,
          low_stock_threshold: data.low_stock_threshold || 5,
          options: data.options || {},
          images: data.images || [],
          is_active: data.is_active ?? true,
          position: data.position || 0,
        })
        .select()
        .single();

      if (error) throw error;
      return variant;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['product-variants', variables.product_id] });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to create variant', description: error.message, variant: 'destructive' });
    },
  });

  const updateVariant = useMutation({
    mutationFn: async ({ id, ...data }: VariantFormData & { id: string }) => {
      const { data: variant, error } = await supabase
        .from('product_variants')
        .update({
          name: data.name,
          sku: data.sku || null,
          price: data.price,
          compare_at_price: data.compare_at_price || null,
          cost_price: data.cost_price || null,
          stock_quantity: data.stock_quantity,
          low_stock_threshold: data.low_stock_threshold,
          options: data.options,
          images: data.images || [],
          is_active: data.is_active,
          position: data.position,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return variant;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-variants', productId] });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to update variant', description: error.message, variant: 'destructive' });
    },
  });

  const deleteVariant = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('product_variants')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-variants', productId] });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to delete variant', description: error.message, variant: 'destructive' });
    },
  });

  const bulkCreateVariants = useMutation({
    mutationFn: async ({ product_id, variants: variantData }: { product_id: string; variants: VariantFormData[] }) => {
      if (!tenantId) throw new Error('No tenant selected');

      const { data, error } = await supabase
        .from('product_variants')
        .insert(
          variantData.map((v, index) => ({
            tenant_id: tenantId,
            product_id,
            name: v.name,
            sku: v.sku || null,
            price: v.price || null,
            stock_quantity: v.stock_quantity || 0,
            low_stock_threshold: v.low_stock_threshold || 5,
            options: v.options || {},
            images: v.images || [],
            is_active: v.is_active ?? true,
            position: index,
          }))
        )
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['product-variants', variables.product_id] });
      toast({ title: 'Variants created successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to create variants', description: error.message, variant: 'destructive' });
    },
  });

  const generateVariantCombinations = (options: VariantOption[]): VariantFormData[] => {
    if (options.length === 0) return [];

    const combinations: Record<string, string>[][] = options.reduce<Record<string, string>[][]>(
      (acc, option) => {
        if (acc.length === 0) {
          return option.values.map((value) => [{ [option.name]: value }]);
        }
        return acc.flatMap((combo) =>
          option.values.map((value) => [...combo, { [option.name]: value }])
        );
      },
      []
    );

    return combinations.map((combo) => {
      const mergedOptions = combo.reduce((acc, curr) => ({ ...acc, ...curr }), {});
      return {
        name: Object.values(mergedOptions).join(' / '),
        options: mergedOptions,
        stock_quantity: 0,
        is_active: true,
      };
    });
  };

  return {
    variants,
    isLoading,
    error,
    createVariant,
    updateVariant,
    deleteVariant,
    bulkCreateVariants,
    generateVariantCombinations,
  };
}
