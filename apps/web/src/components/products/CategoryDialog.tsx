import { useState, useEffect } from 'react';
import { ResponsiveDialog, ResponsiveDialogContent, ResponsiveDialogHeader, ResponsiveDialogTitle } from '@/components/ui/responsive-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { Category, CategoryFormData, useCategories } from '@/hooks/useCategories';

interface CategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: Category | null;
}

export function CategoryDialog({ open, onOpenChange, category }: CategoryDialogProps) {
  const { categories, createCategory, updateCategory } = useCategories();
  
  const [formData, setFormData] = useState<CategoryFormData>({
    name: '',
    description: '',
    parent_id: undefined,
    sort_order: 0,
    is_active: true,
  });
  
  const isEditing = !!category;
  const isLoading = createCategory.isPending || updateCategory.isPending;

  // Filter out current category and its children from parent options
  const parentOptions = categories.filter(cat => {
    if (!category) return true;
    if (cat.id === category.id) return false;
    // Simple check - in production you'd check for circular references
    return cat.parent_id !== category.id;
  });

  useEffect(() => {
    if (category) {
      setFormData({
        name: category.name,
        description: category.description || '',
        parent_id: category.parent_id || undefined,
        sort_order: category.sort_order,
        is_active: category.is_active,
      });
    } else {
      setFormData({
        name: '',
        description: '',
        parent_id: undefined,
        sort_order: 0,
        is_active: true,
      });
    }
  }, [category, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (isEditing && category) {
        await updateCategory.mutateAsync({ id: category.id, ...formData });
      } else {
        await createCategory.mutateAsync(formData);
      }
      onOpenChange(false);
    } catch (error) {
      // Error handled in mutation
    }
  };

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="max-w-md">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>{isEditing ? 'Edit Category' : 'Add Category'}</ResponsiveDialogTitle>
        </ResponsiveDialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Category Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={2}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="parent">Parent Category</Label>
            <Select
              value={formData.parent_id || 'none'}
              onValueChange={(value) => setFormData(prev => ({ 
                ...prev, 
                parent_id: value === 'none' ? undefined : value 
              }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="No parent" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No parent (Top level)</SelectItem>
                {parentOptions.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="sort_order">Sort Order</Label>
            <Input
              id="sort_order"
              type="number"
              min="0"
              value={formData.sort_order}
              onChange={(e) => setFormData(prev => ({ ...prev, sort_order: parseInt(e.target.value) || 0 }))}
            />
            <p className="text-xs text-muted-foreground">Lower numbers appear first</p>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Active</Label>
              <p className="text-xs text-muted-foreground">Category is visible</p>
            </div>
            <Switch
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? 'Save Changes' : 'Create Category'}
            </Button>
          </div>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
