import { useState, useEffect } from 'react';
import { ResponsiveDialog, ResponsiveDialogContent, ResponsiveDialogHeader, ResponsiveDialogTitle } from '@/components/ui/responsive-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, X, ImageIcon, Layers } from 'lucide-react';
import { Product, ProductFormData, useProducts } from '@/hooks/useProducts';
import { useCategories } from '@/hooks/useCategories';
import { useProductVariants, VariantOption, VariantFormData } from '@/hooks/useProductVariants';
import { VariantBuilder } from './VariantBuilder';

interface ProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: Product | null;
}

export function ProductDialog({ open, onOpenChange, product }: ProductDialogProps) {
  const { createProduct, updateProduct, uploadProductImage } = useProducts();
  const { categories } = useCategories();
  const { variants, bulkCreateVariants, generateVariantCombinations } = useProductVariants(product?.id);
  
  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    description: '',
    sku: '',
    price: 0,
    compare_at_price: undefined,
    cost_price: undefined,
    category_id: undefined,
    stock_quantity: 0,
    track_inventory: true,
    low_stock_threshold: 5,
    images: [],
    tags: [],
    is_active: true,
  });
  
  const [hasVariants, setHasVariants] = useState(false);
  const [variantOptions, setVariantOptions] = useState<VariantOption[]>([]);
  const [variantList, setVariantList] = useState<VariantFormData[]>([]);
  
  const [isUploading, setIsUploading] = useState(false);
  const isEditing = !!product;
  const isLoading = createProduct.isPending || updateProduct.isPending;

  // Only reset form when dialog opens or product changes, NOT when variants change
  useEffect(() => {
    if (!open) return; // Don't reset when closed
    
    if (product) {
      setFormData({
        name: product.name,
        description: product.description || '',
        sku: product.sku || '',
        price: product.price,
        compare_at_price: product.compare_at_price || undefined,
        cost_price: product.cost_price || undefined,
        category_id: product.category_id || undefined,
        stock_quantity: product.stock_quantity,
        track_inventory: product.track_inventory,
        low_stock_threshold: product.low_stock_threshold,
        images: product.images || [],
        tags: product.tags || [],
        is_active: product.is_active,
      });
      
      // Load variant options from product
      const options = (product as any).variant_options || [];
      setVariantOptions(options);
      setHasVariants(options.length > 0);
    } else {
      setFormData({
        name: '',
        description: '',
        sku: '',
        price: 0,
        compare_at_price: undefined,
        cost_price: undefined,
        category_id: undefined,
        stock_quantity: 0,
        track_inventory: true,
        low_stock_threshold: 5,
        images: [],
        tags: [],
        is_active: true,
      });
      setHasVariants(false);
      setVariantOptions([]);
      setVariantList([]);
    }
  }, [product?.id, open]);
  
  // Sync variant list when variants are loaded (only for editing existing products)
  useEffect(() => {
    if (product && variants.length > 0 && open) {
      setVariantList(variants.map(v => ({
        name: v.name,
        sku: v.sku || undefined,
        price: v.price || undefined,
        stock_quantity: v.stock_quantity,
        options: v.options,
        is_active: v.is_active,
      })));
      if (!hasVariants && variants.length > 0) {
        setHasVariants(true);
      }
    }
  }, [variants, product?.id, open]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;

    setIsUploading(true);
    try {
      const uploadPromises = Array.from(files).map(file => uploadProductImage(file));
      const urls = await Promise.all(uploadPromises);
      setFormData(prev => ({
        ...prev,
        images: [...(prev.images || []), ...urls],
      }));
    } catch (error) {
      console.error('Failed to upload images:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const removeImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images?.filter((_, i) => i !== index) || [],
    }));
  };

  const handleGenerateVariants = () => {
    const combinations = generateVariantCombinations(variantOptions);
    setVariantList(combinations);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const productData = {
        ...formData,
        variant_options: hasVariants ? variantOptions : [],
      } as any;

      let savedProduct;
      if (isEditing && product) {
        savedProduct = await updateProduct.mutateAsync({ id: product.id, ...productData });
      } else {
        savedProduct = await createProduct.mutateAsync(productData);
      }

      // Create variants if this is a new product with variants
      if (!isEditing && hasVariants && variantList.length > 0 && savedProduct) {
        await bulkCreateVariants.mutateAsync({
          product_id: savedProduct.id,
          variants: variantList,
        });
      }

      onOpenChange(false);
    } catch (error) {
      // Error handled in mutation
    }
  };

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="max-w-3xl">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>{isEditing ? 'Edit Product' : 'Add Product'}</ResponsiveDialogTitle>
        </ResponsiveDialogHeader>

        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="variants" className="gap-2">
              <Layers className="h-4 w-4" />
              Variants
              {hasVariants && variantList.length > 0 && (
                <span className="ml-1 text-xs bg-primary text-primary-foreground rounded-full px-1.5">
                  {variantList.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <form onSubmit={handleSubmit}>
            <TabsContent value="basic" className="space-y-6">
              {/* Images */}
              <div className="space-y-2">
                <Label>Product Images</Label>
                <div className="flex flex-wrap gap-2">
                  {formData.images?.map((url, index) => (
                    <div key={index} className="relative w-20 h-20 rounded-lg overflow-hidden border">
                      <img src={url} alt="" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute top-1 right-1 p-0.5 bg-background/80 rounded-full hover:bg-background"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  
                  <label className="w-20 h-20 border-2 border-dashed rounded-lg flex items-center justify-center cursor-pointer hover:border-primary transition-colors">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={handleImageUpload}
                      disabled={isUploading}
                    />
                    {isUploading ? (
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    ) : (
                      <ImageIcon className="h-5 w-5 text-muted-foreground" />
                    )}
                  </label>
                </div>
              </div>

              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="name">Product Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    required
                  />
                </div>
                
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="sku">SKU</Label>
                  <Input
                    id="sku"
                    value={formData.sku}
                    onChange={(e) => setFormData(prev => ({ ...prev, sku: e.target.value }))}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={formData.category_id || 'none'}
                    onValueChange={(value) => setFormData(prev => ({ 
                      ...prev, 
                      category_id: value === 'none' ? undefined : value 
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No category</SelectItem>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Pricing */}
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">Price *</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.price}
                    onChange={(e) => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="compare_at_price">Compare at Price</Label>
                  <Input
                    id="compare_at_price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.compare_at_price || ''}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      compare_at_price: e.target.value ? parseFloat(e.target.value) : undefined 
                    }))}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="cost_price">Cost Price</Label>
                  <Input
                    id="cost_price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.cost_price || ''}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      cost_price: e.target.value ? parseFloat(e.target.value) : undefined 
                    }))}
                  />
                </div>
              </div>

              {/* Inventory - only show if no variants */}
              {!hasVariants && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Track Inventory</Label>
                      <p className="text-xs text-muted-foreground">Enable stock management</p>
                    </div>
                    <Switch
                      checked={formData.track_inventory}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, track_inventory: checked }))}
                    />
                  </div>
                  
                  {formData.track_inventory && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="stock_quantity">Stock Quantity</Label>
                        <Input
                          id="stock_quantity"
                          type="number"
                          min="0"
                          value={formData.stock_quantity}
                          onChange={(e) => setFormData(prev => ({ ...prev, stock_quantity: parseInt(e.target.value) || 0 }))}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="low_stock_threshold">Low Stock Alert</Label>
                        <Input
                          id="low_stock_threshold"
                          type="number"
                          min="0"
                          value={formData.low_stock_threshold}
                          onChange={(e) => setFormData(prev => ({ ...prev, low_stock_threshold: parseInt(e.target.value) || 5 }))}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Status */}
              <div className="flex items-center justify-between">
                <div>
                  <Label>Active</Label>
                  <p className="text-xs text-muted-foreground">Product is visible and can be sold</p>
                </div>
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                />
              </div>
            </TabsContent>

            <TabsContent value="variants" className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label>This product has variants</Label>
                  <p className="text-xs text-muted-foreground">
                    Add options like size, color, or material with individual SKUs and stock
                  </p>
                </div>
                <Switch
                  checked={hasVariants}
                  onCheckedChange={(checked) => {
                    setHasVariants(checked);
                    if (!checked) {
                      setVariantOptions([]);
                      setVariantList([]);
                    }
                  }}
                />
              </div>

              {hasVariants && (
                <VariantBuilder
                  options={variantOptions}
                  variants={variantList}
                  onOptionsChange={setVariantOptions}
                  onVariantsChange={setVariantList}
                  onGenerateVariants={handleGenerateVariants}
                  basePrice={formData.price}
                />
              )}
            </TabsContent>

            {/* Actions */}
            <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? 'Save Changes' : 'Create Product'}
              </Button>
            </div>
          </form>
        </Tabs>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
