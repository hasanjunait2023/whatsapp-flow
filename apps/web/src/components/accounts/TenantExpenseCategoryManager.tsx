import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Pencil, Building2, Truck, Megaphone, Users, Zap, Package, MoreHorizontal, Wrench, CreditCard, Shield } from 'lucide-react';
import { TenantExpenseCategory } from '@/hooks/useTenantAccounts';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
} from '@/components/ui/responsive-dialog';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface TenantExpenseCategoryManagerProps {
  categories: TenantExpenseCategory[];
  loading: boolean;
  onAddCategory: (category: { name: string; description?: string; icon?: string; color?: string }) => Promise<any>;
  onUpdateCategory: (category: { id: string; name?: string; description?: string; icon?: string; color?: string }) => Promise<any>;
}

const ICON_OPTIONS = [
  { name: 'Building2', icon: Building2 },
  { name: 'Truck', icon: Truck },
  { name: 'Megaphone', icon: Megaphone },
  { name: 'Users', icon: Users },
  { name: 'Zap', icon: Zap },
  { name: 'Package', icon: Package },
  { name: 'Wrench', icon: Wrench },
  { name: 'CreditCard', icon: CreditCard },
  { name: 'Shield', icon: Shield },
  { name: 'MoreHorizontal', icon: MoreHorizontal },
];

const COLOR_OPTIONS = [
  { name: 'gray', class: 'bg-gray-500' },
  { name: 'red', class: 'bg-red-500' },
  { name: 'green', class: 'bg-green-500' },
  { name: 'blue', class: 'bg-blue-500' },
  { name: 'yellow', class: 'bg-yellow-500' },
  { name: 'purple', class: 'bg-purple-500' },
  { name: 'orange', class: 'bg-violet-500' },
];

const getIconComponent = (iconName: string | null) => {
  const found = ICON_OPTIONS.find((opt) => opt.name === iconName);
  const IconComponent = found?.icon || MoreHorizontal;
  return <IconComponent className="h-5 w-5" />;
};

const getCategoryBadgeColor = (color: string | null) => {
  const colorMap: Record<string, string> = {
    red: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    green: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    blue: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    yellow: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    purple: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
    orange: 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400',
    gray: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
  };
  return colorMap[color || 'gray'] || colorMap.gray;
};

export function TenantExpenseCategoryManager({
  categories,
  loading,
  onAddCategory,
  onUpdateCategory,
}: TenantExpenseCategoryManagerProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<TenantExpenseCategory | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    icon: 'MoreHorizontal',
    color: 'gray',
  });

  const handleOpenDialog = (category?: TenantExpenseCategory) => {
    if (category) {
      setEditingCategory(category);
      setFormData({
        name: category.name,
        description: category.description || '',
        icon: category.icon || 'MoreHorizontal',
        color: category.color || 'gray',
      });
    } else {
      setEditingCategory(null);
      setFormData({
        name: '',
        description: '',
        icon: 'MoreHorizontal',
        color: 'gray',
      });
    }
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) return;

    if (editingCategory) {
      await onUpdateCategory({
        id: editingCategory.id,
        ...formData,
      });
    } else {
      await onAddCategory(formData);
    }

    setDialogOpen(false);
    setEditingCategory(null);
    setFormData({ name: '', description: '', icon: 'MoreHorizontal', color: 'gray' });
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-48" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
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
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Expense Categories</CardTitle>
            <CardDescription>Organize your expenses by category</CardDescription>
          </div>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            Add Category
          </Button>
        </CardHeader>
        <CardContent>
          {categories.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No categories created yet</p>
              <Button className="mt-4" onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Create your first category
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {categories.map((category) => (
                <div
                  key={category.id}
                  className={cn(
                    'p-4 rounded-lg border cursor-pointer hover:shadow-md transition-shadow',
                    getCategoryBadgeColor(category.color)
                  )}
                  onClick={() => handleOpenDialog(category)}
                >
                  <div className="flex items-center justify-between mb-2">
                    {getIconComponent(category.icon)}
                    <Pencil className="h-4 w-4 opacity-50" />
                  </div>
                  <h4 className="font-medium">{category.name}</h4>
                  {category.description && (
                    <p className="text-xs opacity-75 mt-1 line-clamp-2">{category.description}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <ResponsiveDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <ResponsiveDialogContent className="max-w-md">
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>
              {editingCategory ? 'Edit Category' : 'Add Category'}
            </ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              {editingCategory ? 'Update the category details.' : 'Create a new expense category.'}
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Marketing"
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optional description"
              />
            </div>

            <div className="space-y-2">
              <Label>Icon</Label>
              <div className="flex flex-wrap gap-2">
                {ICON_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  return (
                    <button
                      key={opt.name}
                      type="button"
                      onClick={() => setFormData({ ...formData, icon: opt.name })}
                      className={cn(
                        'p-2 rounded-lg border transition-colors',
                        formData.icon === opt.name
                          ? 'border-primary bg-primary/10'
                          : 'border-muted hover:border-primary/50'
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex flex-wrap gap-2">
                {COLOR_OPTIONS.map((opt) => (
                  <button
                    key={opt.name}
                    type="button"
                    onClick={() => setFormData({ ...formData, color: opt.name })}
                    className={cn(
                      'w-8 h-8 rounded-full transition-transform',
                      opt.class,
                      formData.color === opt.name && 'ring-2 ring-offset-2 ring-primary scale-110'
                    )}
                  />
                ))}
              </div>
            </div>
          </div>

          <ResponsiveDialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={!formData.name.trim()}>
              {editingCategory ? 'Update' : 'Create'}
            </Button>
          </ResponsiveDialogFooter>
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    </>
  );
}
