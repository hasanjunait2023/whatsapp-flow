import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Rocket, Zap, Crown } from 'lucide-react';
import { FeatureTemplate, FeatureCategory, TierLevel } from '@/hooks/useFeatureTemplates';
import { FEATURE_FLAGS } from '@/hooks/useFeatureAccess';

interface FeatureEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feature: FeatureTemplate | null;
  categories: FeatureCategory[];
  onSave: (featureId: string, updates: Partial<FeatureTemplate>) => Promise<void>;
  onDelete?: (featureId: string) => Promise<void>;
}

const TIER_OPTIONS: { value: TierLevel; label: string; icon: typeof Rocket; description: string }[] = [
  { value: 'starter', label: 'Starter', icon: Rocket, description: 'Included in all tiers' },
  { value: 'growth', label: 'Growth', icon: Zap, description: 'Growth + Pro only' },
  { value: 'pro', label: 'Pro', icon: Crown, description: 'Pro tier exclusive' },
];

export function FeatureEditDialog({
  open,
  onOpenChange,
  feature,
  categories,
  onSave,
  onDelete,
}: FeatureEditDialogProps) {
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [formData, setFormData] = useState({
    feature_label: '',
    feature_label_bn: '',
    feature_description: '',
    feature_flag_key: '',
    category_id: '',
    min_tier: 'starter' as TierLevel,
    is_highlight: false,
    is_core: false,
    tooltip: '',
    icon: '',
  });

  useEffect(() => {
    if (feature) {
      setFormData({
        feature_label: feature.feature_label || '',
        feature_label_bn: feature.feature_label_bn || '',
        feature_description: feature.feature_description || '',
        feature_flag_key: feature.feature_flag_key || '',
        category_id: feature.category_id || '',
        min_tier: feature.min_tier || 'starter',
        is_highlight: feature.is_highlight || false,
        is_core: feature.is_core || false,
        tooltip: feature.tooltip || '',
        icon: feature.icon || '',
      });
    }
  }, [feature]);

  const handleSave = async () => {
    if (!feature) return;
    
    setSaving(true);
    try {
      await onSave(feature.id, {
        feature_label: formData.feature_label,
        feature_label_bn: formData.feature_label_bn || null,
        feature_description: formData.feature_description || null,
        feature_flag_key: formData.feature_flag_key || null,
        category_id: formData.category_id || null,
        min_tier: formData.min_tier,
        is_highlight: formData.is_highlight,
        is_core: formData.is_core,
        tooltip: formData.tooltip || null,
        icon: formData.icon || null,
      });
      onOpenChange(false);
    } catch (err) {
      console.error('Error saving feature:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!feature || !onDelete) return;
    
    setDeleting(true);
    try {
      await onDelete(feature.id);
      onOpenChange(false);
    } catch (err) {
      console.error('Error deleting feature:', err);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Feature</DialogTitle>
          <DialogDescription>
            Configure feature settings and tier requirements
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Feature Label */}
          <div className="space-y-2">
            <Label htmlFor="feature_label">Feature Label</Label>
            <Input
              id="feature_label"
              value={formData.feature_label}
              onChange={(e) => setFormData((prev) => ({ ...prev, feature_label: e.target.value }))}
              placeholder="e.g., Orders & Invoicing"
            />
          </div>

          {/* Feature Label Bengali */}
          <div className="space-y-2">
            <Label htmlFor="feature_label_bn">Label (Bengali)</Label>
            <Input
              id="feature_label_bn"
              value={formData.feature_label_bn}
              onChange={(e) => setFormData((prev) => ({ ...prev, feature_label_bn: e.target.value }))}
              placeholder="বাংলা লেবেল"
            />
          </div>

          {/* Feature Flag Key */}
          <div className="space-y-2">
            <Label htmlFor="feature_flag_key">Feature Flag Key</Label>
            <Select
              value={formData.feature_flag_key}
              onValueChange={(value) => setFormData((prev) => ({ ...prev, feature_flag_key: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a feature flag" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">None</SelectItem>
                {Object.keys(FEATURE_FLAGS).map((key) => (
                  <SelectItem key={key} value={key}>
                    {key}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Maps to the feature flag in code for access control
            </p>
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="category_id">Category</Label>
            <Select
              value={formData.category_id}
              onValueChange={(value) => setFormData((prev) => ({ ...prev, category_id: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Uncategorized</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Minimum Tier */}
          <div className="space-y-3">
            <Label>Minimum Tier Required</Label>
            <RadioGroup
              value={formData.min_tier}
              onValueChange={(value) => setFormData((prev) => ({ ...prev, min_tier: value as TierLevel }))}
              className="space-y-2"
            >
              {TIER_OPTIONS.map((option) => {
                const Icon = option.icon;
                return (
                  <div
                    key={option.value}
                    className="flex items-center space-x-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/50"
                  >
                    <RadioGroupItem value={option.value} id={option.value} />
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1">
                      <Label htmlFor={option.value} className="cursor-pointer font-medium">
                        {option.label}
                      </Label>
                      <p className="text-xs text-muted-foreground">{option.description}</p>
                    </div>
                  </div>
                );
              })}
            </RadioGroup>
          </div>

          {/* Switches */}
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label htmlFor="is_highlight" className="cursor-pointer">
                  Highlight Feature
                </Label>
                <p className="text-xs text-muted-foreground">Show prominently on plan cards</p>
              </div>
              <Switch
                id="is_highlight"
                checked={formData.is_highlight}
                onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, is_highlight: checked }))}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label htmlFor="is_core" className="cursor-pointer">
                  Core Feature
                </Label>
                <p className="text-xs text-muted-foreground">Cannot be disabled via overrides</p>
              </div>
              <Switch
                id="is_core"
                checked={formData.is_core}
                onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, is_core: checked }))}
              />
            </div>
          </div>

          {/* Tooltip */}
          <div className="space-y-2">
            <Label htmlFor="tooltip">Tooltip / Help Text</Label>
            <Textarea
              id="tooltip"
              value={formData.tooltip}
              onChange={(e) => setFormData((prev) => ({ ...prev, tooltip: e.target.value }))}
              placeholder="Describe what this feature does..."
              rows={2}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="feature_description">Full Description</Label>
            <Textarea
              id="feature_description"
              value={formData.feature_description}
              onChange={(e) => setFormData((prev) => ({ ...prev, feature_description: e.target.value }))}
              placeholder="Detailed feature description..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          {onDelete && (
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting || saving}
              className="mr-auto"
            >
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </Button>
          )}
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Feature
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
