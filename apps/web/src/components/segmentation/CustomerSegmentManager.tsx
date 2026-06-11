import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Users,
  Plus,
  Trash2,
  Edit,
  Crown,
  Star,
  TrendingUp,
  ShoppingBag,
  MessageSquare,
  Loader2,
  Zap,
} from 'lucide-react';
import { useCustomerSegments, CustomerSegment, SegmentRule } from '@/hooks/useCustomerSegments';

const SEGMENT_ICONS = [
  { value: 'users', icon: Users, label: 'Users' },
  { value: 'crown', icon: Crown, label: 'Crown' },
  { value: 'star', icon: Star, label: 'Star' },
  { value: 'trending', icon: TrendingUp, label: 'Trending' },
  { value: 'shopping', icon: ShoppingBag, label: 'Shopping' },
  { value: 'message', icon: MessageSquare, label: 'Message' },
];

const RULE_FIELDS = [
  { value: 'total_orders', label: 'Total Orders' },
  { value: 'total_spent', label: 'Total Spent (BDT)' },
  { value: 'avg_order_value', label: 'Average Order Value' },
  { value: 'days_since_last_order', label: 'Days Since Last Order' },
  { value: 'message_count', label: 'Message Count' },
];

const OPERATORS = [
  { value: '>=', label: 'Greater or Equal (>=)' },
  { value: '<=', label: 'Less or Equal (<=)' },
  { value: '=', label: 'Equal (=)' },
  { value: '>', label: 'Greater (>)' },
  { value: '<', label: 'Less (<)' },
];

const COLOR_OPTIONS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899', '#6b7280',
];

export function CustomerSegmentManager() {
  const { segments, loading, createSegment, updateSegment, deleteSegment } = useCustomerSegments();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSegment, setEditingSegment] = useState<CustomerSegment | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [segmentToDelete, setSegmentToDelete] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#3b82f6',
    icon: 'users',
    is_auto: false,
    is_active: true,
    rules: [] as SegmentRule[],
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      color: '#3b82f6',
      icon: 'users',
      is_auto: false,
      is_active: true,
      rules: [],
    });
    setEditingSegment(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (segment: CustomerSegment) => {
    setEditingSegment(segment);
    setFormData({
      name: segment.name,
      description: segment.description || '',
      color: segment.color,
      icon: segment.icon,
      is_auto: segment.is_auto,
      is_active: segment.is_active,
      rules: segment.rules || [],
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) return;

    if (editingSegment) {
      await updateSegment.mutateAsync({ id: editingSegment.id, ...formData });
    } else {
      await createSegment.mutateAsync(formData);
    }
    
    setDialogOpen(false);
    resetForm();
  };

  const handleDelete = async () => {
    if (!segmentToDelete) return;
    await deleteSegment.mutateAsync(segmentToDelete);
    setDeleteDialogOpen(false);
    setSegmentToDelete(null);
  };

  const addRule = () => {
    setFormData(prev => ({
      ...prev,
      rules: [...prev.rules, { field: 'total_orders', operator: '>=', value: 0 }],
    }));
  };

  const updateRule = (index: number, updates: Partial<SegmentRule>) => {
    setFormData(prev => ({
      ...prev,
      rules: prev.rules.map((rule, i) => i === index ? { ...rule, ...updates } : rule),
    }));
  };

  const removeRule = (index: number) => {
    setFormData(prev => ({
      ...prev,
      rules: prev.rules.filter((_, i) => i !== index),
    }));
  };

  const getIconComponent = (iconName: string) => {
    const iconDef = SEGMENT_ICONS.find(i => i.value === iconName);
    return iconDef?.icon || Users;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Customer Segments
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-32 w-full" />
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
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Customer Segments
              </CardTitle>
              <CardDescription>
                Group customers by behavior and attributes for targeted marketing
              </CardDescription>
            </div>
            <Button onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Create Segment
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {segments.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 mx-auto text-muted-foreground/50" />
              <p className="mt-4 text-muted-foreground">No segments created yet</p>
              <Button className="mt-4" onClick={openCreateDialog}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Segment
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {segments.map((segment) => {
                const IconComponent = getIconComponent(segment.icon);
                return (
                  <Card key={segment.id} className="relative overflow-hidden">
                    <div
                      className="absolute top-0 left-0 right-0 h-1"
                      style={{ backgroundColor: segment.color }}
                    />
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className="p-2 rounded-lg"
                            style={{ backgroundColor: `${segment.color}20` }}
                          >
                            <IconComponent
                              className="h-5 w-5"
                              style={{ color: segment.color }}
                            />
                          </div>
                          <div>
                            <CardTitle className="text-base">{segment.name}</CardTitle>
                            <p className="text-xs text-muted-foreground">
                              {segment.contact_count} customers
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => openEditDialog(segment)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-destructive"
                            onClick={() => {
                              setSegmentToDelete(segment.id);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {segment.description && (
                        <p className="text-sm text-muted-foreground mb-2">
                          {segment.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 flex-wrap">
                        {segment.is_auto && (
                          <Badge variant="secondary" className="text-xs">
                            <Zap className="h-3 w-3 mr-1" />
                            Auto
                          </Badge>
                        )}
                        {!segment.is_active && (
                          <Badge variant="outline" className="text-xs">
                            Inactive
                          </Badge>
                        )}
                        {segment.rules.length > 0 && (
                          <Badge variant="outline" className="text-xs">
                            {segment.rules.length} rule{segment.rules.length > 1 ? 's' : ''}
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingSegment ? 'Edit Segment' : 'Create Segment'}
            </DialogTitle>
            <DialogDescription>
              Define customer groups based on behavior and attributes
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Segment Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., VIP Customers"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optional description..."
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Color</Label>
                <div className="flex flex-wrap gap-2">
                  {COLOR_OPTIONS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={`h-8 w-8 rounded-full border-2 ${
                        formData.color === color ? 'border-foreground' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => setFormData({ ...formData, color })}
                    />
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Icon</Label>
                <Select
                  value={formData.icon}
                  onValueChange={(v) => setFormData({ ...formData, icon: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SEGMENT_ICONS.map((icon) => {
                      const IconComp = icon.icon;
                      return (
                        <SelectItem key={icon.value} value={icon.value}>
                          <div className="flex items-center gap-2">
                            <IconComp className="h-4 w-4" />
                            {icon.label}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Auto-assign</Label>
                <p className="text-xs text-muted-foreground">
                  Automatically add matching customers
                </p>
              </div>
              <Switch
                checked={formData.is_auto}
                onCheckedChange={(v) => setFormData({ ...formData, is_auto: v })}
              />
            </div>

            {/* Rules Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Matching Rules</Label>
                <Button variant="outline" size="sm" onClick={addRule}>
                  <Plus className="h-3 w-3 mr-1" />
                  Add Rule
                </Button>
              </div>
              
              {formData.rules.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No rules defined. Add rules to auto-assign customers.
                </p>
              ) : (
                <div className="space-y-2">
                  {formData.rules.map((rule, index) => (
                    <div key={index} className="flex items-center gap-2 bg-muted/50 p-2 rounded-md">
                      <Select
                        value={rule.field}
                        onValueChange={(v) => updateRule(index, { field: v })}
                      >
                        <SelectTrigger className="w-[140px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {RULE_FIELDS.map((field) => (
                            <SelectItem key={field.value} value={field.value}>
                              {field.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      
                      <Select
                        value={rule.operator}
                        onValueChange={(v) => updateRule(index, { operator: v })}
                      >
                        <SelectTrigger className="w-[100px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {OPERATORS.map((op) => (
                            <SelectItem key={op.value} value={op.value}>
                              {op.value}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      
                      <Input
                        type="number"
                        value={rule.value as number}
                        onChange={(e) => updateRule(index, { value: parseFloat(e.target.value) || 0 })}
                        className="w-24"
                      />
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => removeRule(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!formData.name.trim() || createSegment.isPending || updateSegment.isPending}
            >
              {(createSegment.isPending || updateSegment.isPending) && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {editingSegment ? 'Save Changes' : 'Create Segment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Segment</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the segment and unassign all customers from it.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
