import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { useToast } from '@/hooks/use-toast';

export interface Category {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  parent_id: string | null;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  parent?: {
    id: string;
    name: string;
  };
  product_count?: number;
}

export interface CategoryFormData {
  name: string;
  description?: string;
  parent_id?: string;
  image_url?: string;
  sort_order?: number;
  is_active?: boolean;
}

export function useCategories() {
  const { currentTenant } = useTenantContext();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const tenantId = currentTenant?.id;

  const { data: categories = [], isLoading, error } = useQuery({
    queryKey: ['categories', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      
      const { data, error } = await supabase
        .from('categories')
        .select(`
          *,
          parent:categories!parent_id(id, name)
        `)
        .eq('tenant_id', tenantId)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data as Category[];
    },
    enabled: !!tenantId,
  });

  const createCategory = useMutation({
    mutationFn: async (categoryData: CategoryFormData) => {
      if (!tenantId) throw new Error('No tenant selected');

      const { data, error } = await supabase
        .from('categories')
        .insert({
          tenant_id: tenantId,
          name: categoryData.name,
          description: categoryData.description || null,
          parent_id: categoryData.parent_id || null,
          image_url: categoryData.image_url || null,
          sort_order: categoryData.sort_order || 0,
          is_active: categoryData.is_active ?? true,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories', tenantId] });
      toast({ title: 'Category created successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to create category', description: error.message, variant: 'destructive' });
    },
  });

  const updateCategory = useMutation({
    mutationFn: async ({ id, ...categoryData }: CategoryFormData & { id: string }) => {
      const { data, error } = await supabase
        .from('categories')
        .update({
          name: categoryData.name,
          description: categoryData.description || null,
          parent_id: categoryData.parent_id || null,
          image_url: categoryData.image_url || null,
          sort_order: categoryData.sort_order,
          is_active: categoryData.is_active,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories', tenantId] });
      toast({ title: 'Category updated successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to update category', description: error.message, variant: 'destructive' });
    },
  });

  const deleteCategory = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories', tenantId] });
      toast({ title: 'Category deleted successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to delete category', description: error.message, variant: 'destructive' });
    },
  });

  return {
    categories,
    isLoading,
    error,
    createCategory,
    updateCategory,
    deleteCategory,
  };
}
