import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { RotateCcw, Save, MessageSquare, Users, Smartphone, Globe, CreditCard } from 'lucide-react';
import { formatCurrency } from '@/lib/currency';
import type { ResourceOverrides } from '@/hooks/useAdminTenants';

interface TenantForResources {
  id: string;
  name: string;
  plan_name: string | null;
  resource_overrides: ResourceOverrides | null;
  plan_defaults: {
    max_instances?: number;
    max_agents?: number;
    max_messages_per_month?: number;
    price_monthly?: number;
  } | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenant: TenantForResources | null;
  onSave: (tenantId: string, overrides: ResourceOverrides | null) => Promise<void>;
}

interface FieldConfig {
  key: keyof ResourceOverrides;
  label: string;
  icon: React.ReactNode;
  defaultKey: string;
  format?: (v: number) => string;
}

const FIELDS: FieldConfig[] = [
  { key: 'max_instances', label: 'WhatsApp Instances', icon: <Smartphone className="h-4 w-4" />, defaultKey: 'max_instances' },
  { key: 'max_fb_pages', label: 'Facebook Pages', icon: <Globe className="h-4 w-4" />, defaultKey: 'max_fb_pages' },
  { key: 'max_agents', label: 'Team Members', icon: <Users className="h-4 w-4" />, defaultKey: 'max_agents' },
  { key: 'max_messages_per_month', label: 'Messages / Month', icon: <MessageSquare className="h-4 w-4" />, defaultKey: 'max_messages_per_month' },
  { key: 'custom_price_monthly', label: 'Monthly Price (BDT)', icon: <CreditCard className="h-4 w-4" />, defaultKey: 'price_monthly', format: formatCurrency },
];

export function TenantResourceOverridesDialog({ open, onOpenChange, tenant, onSave }: Props) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (tenant && open) {
      const initial: Record<string, string> = {};
      FIELDS.forEach((f) => {
        const override = tenant.resource_overrides?.[f.key];
        initial[f.key] = override != null ? String(override) : '';
      });
      setValues(initial);
    }
  }, [tenant, open]);

  if (!tenant) return null;

  const defaults = tenant.plan_defaults || {};
  const hasOverrides = Object.values(values).some((v) => v !== '');

  const handleSave = async () => {
    setSaving(true);
    try {
      const overrides: ResourceOverrides = {};
      let hasAny = false;
      FIELDS.forEach((f) => {
        const v = values[f.key];
        if (v !== '') {
          const num = Number(v);
          if (!isNaN(num) && num >= 0) {
            (overrides as any)[f.key] = num;
            hasAny = true;
          }
        }
      });
      await onSave(tenant.id, hasAny ? overrides : null);
      toast.success('Resource limits updated');
      onOpenChange(false);
    } catch {
      toast.error('Failed to update resource limits');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    setSaving(true);
    try {
      await onSave(tenant.id, null);
      setValues({});
      toast.success('Reset to plan defaults');
      onOpenChange(false);
    } catch {
      toast.error('Failed to reset');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Resource Limits</DialogTitle>
          <DialogDescription>
            Customize limits for <span className="font-medium">{tenant.name}</span>
            {tenant.plan_name && (
              <Badge variant="outline" className="ml-2">{tenant.plan_name}</Badge>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {FIELDS.map((field) => {
            const defaultVal = (defaults as any)[field.defaultKey];
            const currentValue = values[field.key] || '';
            const isOverridden = currentValue !== '';

            return (
              <div key={field.key} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2 text-sm">
                    {field.icon}
                    {field.label}
                  </Label>
                  <span className="text-xs text-muted-foreground">
                    Default: {defaultVal != null ? (field.format ? field.format(defaultVal) : defaultVal) : '—'}
                  </span>
                </div>
                <div className="relative">
                  <Input
                    type="number"
                    min={0}
                    placeholder={defaultVal != null ? String(defaultVal) : 'Not set'}
                    value={currentValue}
                    onChange={(e) => setValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
                    className={isOverridden ? 'border-primary/50 bg-primary/5' : ''}
                  />
                  {isOverridden && (
                    <Badge variant="secondary" className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] px-1.5 py-0">
                      Custom
                    </Badge>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <Separator />

        <DialogFooter className="flex-row justify-between sm:justify-between gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            disabled={saving || !tenant.resource_overrides}
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
            Reset to Defaults
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            <Save className="h-3.5 w-3.5 mr-1.5" />
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
