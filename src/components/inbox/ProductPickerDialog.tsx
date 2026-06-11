import { useState, useMemo } from 'react';
import { Product, useProducts } from '@/hooks/useProducts';
import { useCategories, Category } from '@/hooks/useCategories';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Package, Folder, Loader2, ShoppingBag } from 'lucide-react';
import { formatCurrency } from '@/lib/currency';

interface ProductPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSendProducts: (products: Product[]) => void;
  onSendCategory: (categoryId: string, categoryName: string) => void;
  sending: boolean;
}

export default function ProductPickerDialog({
  open,
  onOpenChange,
  onSendProducts,
  onSendCategory,
  sending,
}: ProductPickerDialogProps) {
  const { products, isLoading: loadingProducts } = useProducts();
  const { categories, isLoading: loadingCategories } = useCategories();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());

  // Filter active products
  const activeProducts = useMemo(() => 
    products.filter(p => p.is_active),
    [products]
  );

  // Filter products based on search and category
  const filteredProducts = useMemo(() => {
    return activeProducts.filter(product => {
      const matchesSearch = search === '' || 
        product.name.toLowerCase().includes(search.toLowerCase()) ||
        product.sku?.toLowerCase().includes(search.toLowerCase());
      
      const matchesCategory = categoryFilter === 'all' || 
        product.category_id === categoryFilter;
      
      return matchesSearch && matchesCategory;
    });
  }, [activeProducts, search, categoryFilter]);

  // Active categories with product count
  const categoriesWithCount = useMemo(() => {
    return categories
      .filter(c => c.is_active)
      .map(cat => ({
        ...cat,
        productCount: activeProducts.filter(p => p.category_id === cat.id).length,
      }))
      .filter(c => c.productCount > 0);
  }, [categories, activeProducts]);

  const handleToggleProduct = (productId: string) => {
    const newSelected = new Set(selectedProducts);
    if (newSelected.has(productId)) {
      newSelected.delete(productId);
    } else {
      newSelected.add(productId);
    }
    setSelectedProducts(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedProducts.size === filteredProducts.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(filteredProducts.map(p => p.id)));
    }
  };

  const handleSendSelected = () => {
    const productsToSend = activeProducts.filter(p => selectedProducts.has(p.id));
    onSendProducts(productsToSend);
    setSelectedProducts(new Set());
    onOpenChange(false);
  };

  const handleSendCategory = (category: typeof categoriesWithCount[0]) => {
    onSendCategory(category.id, category.name);
    onOpenChange(false);
  };

  const getProductImage = (product: Product): string | null => {
    const images = product.images as string[] | null;
    return images?.[0] || null;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5" />
            Send Products to Customer
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="products" className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="products" className="gap-2">
              <Package className="h-4 w-4" />
              Products
            </TabsTrigger>
            <TabsTrigger value="categories" className="gap-2">
              <Folder className="h-4 w-4" />
              Categories
            </TabsTrigger>
          </TabsList>

          <TabsContent value="products" className="flex-1 flex flex-col min-h-0 mt-4">
            {/* Search and Filter */}
            <div className="flex gap-2 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search products..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {categoriesWithCount.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name} ({cat.productCount})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Select All */}
            {filteredProducts.length > 0 && (
              <div className="flex items-center justify-between mb-2 px-1">
                <button
                  onClick={handleSelectAll}
                  className="text-sm text-primary hover:underline"
                >
                  {selectedProducts.size === filteredProducts.length ? 'Deselect all' : 'Select all'}
                </button>
                <span className="text-sm text-muted-foreground">
                  {selectedProducts.size} selected
                </span>
              </div>
            )}

            {/* Product List */}
            <ScrollArea className="flex-1 -mx-6 px-6">
              {loadingProducts ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p>No products found</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredProducts.map((product) => {
                    const image = getProductImage(product);
                    return (
                      <div
                        key={product.id}
                        className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-accent/50 cursor-pointer transition-colors"
                        onClick={() => handleToggleProduct(product.id)}
                      >
                        <Checkbox
                          checked={selectedProducts.has(product.id)}
                          onCheckedChange={() => handleToggleProduct(product.id)}
                        />
                        <div className="h-12 w-12 rounded-md bg-muted flex items-center justify-center overflow-hidden shrink-0">
                          {image ? (
                            <img
                              src={image}
                              alt={product.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <Package className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{product.name}</p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span className="text-brand font-medium">
                              {formatCurrency(product.price)}
                            </span>
                            {product.compare_at_price && product.compare_at_price > product.price && (
                              <span className="line-through text-xs">
                                {formatCurrency(product.compare_at_price)}
                              </span>
                            )}
                            {product.category?.name && (
                              <Badge variant="secondary" className="text-xs">
                                {product.category.name}
                              </Badge>
                            )}
                          </div>
                        </div>
                        {product.stock_quantity !== null && product.stock_quantity <= (product.low_stock_threshold || 5) && (
                          <Badge variant="destructive" className="text-xs shrink-0">
                            Low stock
                          </Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>

            {/* Send Button */}
            {selectedProducts.size > 0 && (
              <div className="flex items-center justify-between pt-4 mt-4 border-t border-border">
                <p className="text-sm text-muted-foreground">
                  {selectedProducts.size > 1 && (
                    <span>Products will be sent with 5s delay between each</span>
                  )}
                </p>
                <Button onClick={handleSendSelected} disabled={sending}>
                  {sending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Send {selectedProducts.size} Product{selectedProducts.size > 1 ? 's' : ''}
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="categories" className="flex-1 min-h-0 mt-4">
            <ScrollArea className="h-[400px] -mx-6 px-6">
              {loadingCategories ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : categoriesWithCount.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Folder className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p>No categories with products</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {categoriesWithCount.map((category) => (
                    <div
                      key={category.id}
                      className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-md bg-brand/10 flex items-center justify-center">
                          <Folder className="h-5 w-5 text-brand" />
                        </div>
                        <div>
                          <p className="font-medium">{category.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {category.productCount} product{category.productCount > 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSendCategory(category)}
                        disabled={sending}
                      >
                        {sending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        Send All
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>

            <div className="pt-4 mt-4 border-t border-border">
              <p className="text-sm text-muted-foreground text-center">
                Sending a category will send all its products with 5s delay between each
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
