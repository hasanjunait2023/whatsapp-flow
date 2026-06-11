import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Pencil, Server, Users, Megaphone, Package, Building2, CreditCard, MoreHorizontal } from 'lucide-react';
import { ExpenseCategory } from '@/hooks/useAccounts';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

interface ExpenseCategoryManagerProps {
  categories: ExpenseCategory[];
  loading: boolean;
  onAddCategory: (data: { name: string; description?: string; icon?: string; color?: string }) => Promise<any>;
  onUpdateCategory: (id: string, data: Partial<{ name: string; description: string; icon: string; color: string; is_active: boolean }>) => Promise<any>;
}

const ICON_OPTIONS = [
  { value: 'Server', label: 'Server', icon: <Server className="h-4 w-4" /> },
  { value: 'Users', label: 'Users', icon: <Users className="h-4 w-4" /> },
  { value: 'Megaphone', label: 'Megaphone', icon: <Megaphone className="h-4 w-4" /> },
  { value: 'Package', label: 'Package', icon: <Package className="h-4 w-4" /> },
  { value: 'Building2', label: 'Building', icon: <Building2 className="h-4 w-4" /> },
  { value: 'CreditCard', label: 'Credit Card', icon: <CreditCard className="h-4 w-4" /> },
  { value: 'MoreHorizontal', label: 'Other', icon: <MoreHorizontal className="h-4 w-4" /> },
];

const COLOR_OPTIONS = [
  { value: 'blue', label: 'Blue', className: 'bg-blue-500' },
  { value: 'green', label: 'Green', className: 'bg-green-500' },
  { value: 'purple', label: 'Purple', className: 'bg-purple-500' },
  { value: 'orange', label: 'Orange', className: 'bg-orange-500' },
  { value: 'yellow', label: 'Yellow', className: 'bg-yellow-500' },
  { value: 'red', label: 'Red', className: 'bg-red-500' },
  { value: 'gray', label: 'Gray', className: 'bg-gray-500' },
];

const getIconComponent = (iconName: string | null) => {
  switch (iconName) {
    case 'Server': return <Server className="h-5 w-5" />;
    case 'Users': return <Users className="h-5 w-5" />;
    case 'Megaphone': return <Megaphone className="h-5 w-5" />;
    case 'Package': return <Package className="h-5 w-5" />;
    case 'Building2': return <Building2 className="h-5 w-5" />;
    case 'CreditCard': return <CreditCard className="h-5 w-5" />;
    default: return <MoreHorizontal className="h-5 w-5" />;
  }
};

const getCategoryBadgeColor = (color: string | null) => {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    green: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    purple: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
    orange: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
    yellow: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    red: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    gray: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
  };
  return colorMap[color || 'gray'] || colorMap.gray;
};

export function ExpenseCategoryManager({
  categories,
  loading,
  onAddCategory,
  onUpdateCategory
}: ExpenseCategoryManagerProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ExpenseCategory | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    icon: 'MoreHorizontal',
    color: 'gray'
  });
  const [saving, setSaving] = useState(false);

  const handleOpenDialog = (category?: ExpenseCategory) => {
    if (category) {
      setEditingCategory(category);
      setFormData({
        name: category.name,
        description: category.description || '',
        icon: category.icon || 'MoreHorizontal',
        color: category.color || 'gray'
      });
    } else {
      setEditingCategory(null);
      setFormData({
        name: '',
        description: '',
        icon: 'MoreHorizontal',
        color: 'gray'
      });
    }
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error('Category name is required');
      return;
    }

    try {
      setSaving(true);
      if (editingCategory) {
        await onUpdateCategory(editingCategory.id, formData);
        toast.success('Category updated');
      } else {
        await onAddCategory(formData);
        toast.success('Category added');
      }
      setDialogOpen(false);
    } catch (error) {
      toast.error('Failed to save category');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Expense Categories</CardTitle>
              <CardDescription>Organize your expenses by category</CardDescription>
            </div>
            <Button size="sm" onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Category
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {categories.map((category) => (
              <div
                key={category.id}
                className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${getCategoryBadgeColor(category.color)}`}>
                      {getIconComponent(category.icon)}
                    </div>
                    <div>
                      <h4 className="font-medium">{category.name}</h4>
                      {category.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {category.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleOpenDialog(category)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {categories.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No categories yet. Add your first category to organize expenses.
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingCategory ? 'Edit Category' : 'Add Category'}</DialogTitle>
            <DialogDescription>
              {editingCategory ? 'Update category details' : 'Create a new expense category'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Office Supplies"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of this category"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Icon</Label>
                <Select
                  value={formData.icon}
                  onValueChange={(value) => setFormData({ ...formData, icon: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ICON_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex items-center gap-2">
                          {option.icon}
                          <span>{option.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Color</Label>
                <Select
                  value={formData.color}
                  onValueChange={(value) => setFormData({ ...formData, color: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COLOR_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex items-center gap-2">
                          <div className={`h-3 w-3 rounded-full ${option.className}`} />
                          <span>{option.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Preview */}
            <div className="pt-4 border-t">
              <Label className="text-muted-foreground">Preview</Label>
              <div className="mt-2 p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${getCategoryBadgeColor(formData.color)}`}>
                    {getIconComponent(formData.icon)}
                  </div>
                  <div>
                    <h4 className="font-medium">{formData.name || 'Category Name'}</h4>
                    <p className="text-sm text-muted-foreground">
                      {formData.description || 'Category description'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving ? 'Saving...' : editingCategory ? 'Update' : 'Add Category'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
