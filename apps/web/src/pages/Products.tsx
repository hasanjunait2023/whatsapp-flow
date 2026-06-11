import { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';
import { EmptyState } from '@/components/ui/empty-state';
import { Plus, Search, Package, FolderTree, MoreVertical, Edit, Trash2, Loader2, ToggleLeft, ToggleRight, AlertTriangle } from 'lucide-react';
import { useProducts, Product } from '@/hooks/useProducts';
import { useCategories, Category } from '@/hooks/useCategories';
import { useSelection } from '@/hooks/useSelection';
import { ProductCard } from '@/components/products/ProductCard';
import { ProductDialog } from '@/components/products/ProductDialog';
import { CategoryDialog } from '@/components/products/CategoryDialog';
import { BulkActionsBar } from '@/components/admin/BulkActionsBar';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export default function Products() {
  const { products, isLoading: productsLoading, deleteProduct } = useProducts();
  const { categories, isLoading: categoriesLoading, deleteCategory } = useCategories();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         product.sku?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || product.category_id === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const selection = useSelection(filteredProducts);

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setProductDialogOpen(true);
  };

  const handleDeleteProduct = async () => {
    if (deletingProduct) {
      await deleteProduct.mutateAsync(deletingProduct.id);
      setDeletingProduct(null);
    }
  };

  const handleBulkDelete = async () => {
    try {
      for (const product of selection.selectedItems) {
        await deleteProduct.mutateAsync(product.id);
      }
      toast.success(`${selection.selectedCount} products deleted`);
      selection.clearSelection();
      setBulkDeleteOpen(false);
    } catch (error) {
      toast.error('Failed to delete some products');
    }
  };

  const handleBulkToggleActive = async (active: boolean) => {
    try {
      const ids = selection.selectedItems.map(p => p.id);
      await supabase
        .from('products')
        .update({ is_active: active })
        .in('id', ids);
      
      toast.success(`${selection.selectedCount} products ${active ? 'activated' : 'deactivated'}`);
      selection.clearSelection();
      window.location.reload();
    } catch (error) {
      toast.error('Failed to update products');
    }
  };

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category);
    setCategoryDialogOpen(true);
  };

  const handleDeleteCategory = async () => {
    if (deletingCategory) {
      await deleteCategory.mutateAsync(deletingCategory.id);
      setDeletingCategory(null);
    }
  };

  const stats = {
    totalProducts: products.length,
    activeProducts: products.filter(p => p.is_active).length,
    lowStock: products.filter(p => p.track_inventory && p.stock_quantity !== null && p.stock_quantity <= (p.low_stock_threshold || 5)).length,
    totalCategories: categories.length,
  };

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        {/* Header */}
        <PageHeader
          title="Products"
          description="Manage your product catalog"
        />

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 stagger-animation">
          <StatCard
            title="Total Products"
            value={stats.totalProducts}
            icon={Package}
            iconColor="text-primary"
          />
          <StatCard
            title="Active"
            value={stats.activeProducts}
            icon={Package}
            iconColor="text-success"
          />
          <StatCard
            title="Low Stock"
            value={stats.lowStock}
            icon={AlertTriangle}
            iconColor="text-warning"
          />
          <StatCard
            title="Categories"
            value={stats.totalCategories}
            icon={FolderTree}
            iconColor="text-info"
          />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="products">
          <div className="flex items-center justify-between">
            <TabsList className="bg-muted/50">
              <TabsTrigger value="products">Products</TabsTrigger>
              <TabsTrigger value="categories">Categories</TabsTrigger>
            </TabsList>
          </div>

          {/* Products Tab */}
          <TabsContent value="products" className="space-y-4 mt-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search products..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  
                  {categories.length > 0 && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline">
                          {selectedCategory 
                            ? categories.find(c => c.id === selectedCategory)?.name 
                            : 'All Categories'}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => setSelectedCategory(null)}>
                          All Categories
                        </DropdownMenuItem>
                        {categories.map((cat) => (
                          <DropdownMenuItem 
                            key={cat.id}
                            onClick={() => setSelectedCategory(cat.id)}
                          >
                            {cat.name}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                  
                  <Button variant="premium" onClick={() => { setEditingProduct(null); setProductDialogOpen(true); }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Product
                  </Button>
                </div>
              </CardContent>
            </Card>

            {productsLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Loading products...</p>
                </div>
              </div>
            ) : filteredProducts.length === 0 ? (
              <Card>
                <EmptyState
                  icon={Package}
                  title="No products yet"
                  description="Add your first product to start building your catalog and manage your inventory."
                  action={{
                    label: "Add Product",
                    onClick: () => { setEditingProduct(null); setProductDialogOpen(true); },
                    icon: Plus,
                  }}
                />
              </Card>
            ) : (
              <>
                {/* Select All Header */}
                <Card>
                  <CardContent className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={selection.isAllSelected}
                        onCheckedChange={selection.toggleAll}
                      />
                      <span className="text-sm text-muted-foreground">
                        {selection.isAllSelected ? 'Deselect all' : 'Select all'} ({filteredProducts.length} products)
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <div data-tour="products-grid" className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 stagger-animation">
                  {filteredProducts.map((product) => (
                    <div key={product.id} className="relative">
                      <div className="absolute top-2 left-2 z-10">
                        <Checkbox
                          checked={selection.isSelected(product.id)}
                          onCheckedChange={() => selection.toggle(product.id)}
                          className="bg-background shadow-sm"
                        />
                      </div>
                      <ProductCard
                        product={product}
                        onEdit={handleEditProduct}
                        onDelete={setDeletingProduct}
                      />
                    </div>
                  ))}
                </div>
              </>
            )}
          </TabsContent>

          {/* Categories Tab */}
          <TabsContent value="categories" className="space-y-4 mt-4">
            <div className="flex justify-end">
              <Button variant="premium" onClick={() => { setEditingCategory(null); setCategoryDialogOpen(true); }}>
                <Plus className="h-4 w-4 mr-2" />
                Add Category
              </Button>
            </div>

            {categoriesLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Loading categories...</p>
                </div>
              </div>
            ) : categories.length === 0 ? (
              <Card>
                <EmptyState
                  icon={FolderTree}
                  title="No categories yet"
                  description="Organize your products with categories to make them easier to find and manage."
                  action={{
                    label: "Add Category",
                    onClick: () => { setEditingCategory(null); setCategoryDialogOpen(true); },
                    icon: Plus,
                  }}
                />
              </Card>
            ) : (
              <div className="grid gap-3 stagger-animation">
                {categories.map((category) => (
                  <Card key={category.id} hover="lift">
                    <CardContent className="flex items-center justify-between py-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-primary/10">
                          <FolderTree className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium">{category.name}</h3>
                            {!category.is_active && (
                              <Badge variant="secondary">Inactive</Badge>
                            )}
                          </div>
                          {category.description && (
                            <p className="text-sm text-muted-foreground">{category.description}</p>
                          )}
                          {category.parent && (
                            <p className="text-xs text-muted-foreground">
                              Parent: {category.parent.name}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEditCategory(category)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => setDeletingCategory(category)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Bulk Actions Bar */}
      <BulkActionsBar
        selectedCount={selection.selectedCount}
        onClearSelection={selection.clearSelection}
        actions={[
          {
            label: 'Activate',
            icon: <ToggleRight className="h-4 w-4" />,
            onClick: () => handleBulkToggleActive(true),
          },
          {
            label: 'Deactivate',
            icon: <ToggleLeft className="h-4 w-4" />,
            onClick: () => handleBulkToggleActive(false),
          },
          {
            label: 'Delete',
            icon: <Trash2 className="h-4 w-4" />,
            onClick: () => setBulkDeleteOpen(true),
            variant: 'destructive',
          },
        ]}
      />

      {/* Product Dialog */}
      <ProductDialog
        open={productDialogOpen}
        onOpenChange={setProductDialogOpen}
        product={editingProduct}
      />

      {/* Category Dialog */}
      <CategoryDialog
        open={categoryDialogOpen}
        onOpenChange={setCategoryDialogOpen}
        category={editingCategory}
      />

      {/* Delete Product Confirmation */}
      <AlertDialog open={!!deletingProduct} onOpenChange={() => setDeletingProduct(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingProduct?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteProduct} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Confirmation */}
      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selection.selectedCount} Products</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete these products? This action cannot be undone.
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

      {/* Delete Category Confirmation */}
      <AlertDialog open={!!deletingCategory} onOpenChange={() => setDeletingCategory(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingCategory?.name}"? Products in this category will become uncategorized.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCategory} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
