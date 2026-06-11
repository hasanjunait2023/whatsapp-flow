import { useInstances } from '@/hooks/useInstances';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Smartphone, CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InstanceSelectorProps {
  value?: string;
  onChange: (instanceId: string) => void;
  label?: string;
  required?: boolean;
}

export default function InstanceSelector({
  value,
  onChange,
  label = 'WhatsApp Instance',
  required = false,
}: InstanceSelectorProps) {
  const { instances, loading } = useInstances();

  const connectedInstances = instances.filter((i) => i.status === 'active');

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      <Select value={value || ''} onValueChange={onChange} disabled={loading}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder={loading ? 'Loading...' : 'Select an instance'} />
        </SelectTrigger>
        <SelectContent>
          {instances.length === 0 ? (
            <div className="p-2 text-sm text-muted-foreground text-center">
              No instances available
            </div>
          ) : (
            instances.map((instance) => (
              <SelectItem key={instance.id} value={instance.id}>
                <div className="flex items-center gap-2">
                  <Smartphone className="h-4 w-4" />
                  <span>{instance.name}</span>
                  {instance.status === 'active' ? (
                    <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                  ) : (
                    <XCircle className="h-3 w-3 text-destructive" />
                  )}
                </div>
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
      {connectedInstances.length === 0 && !loading && (
        <p className="text-xs text-amber-500">
          No connected instances. Connect a WhatsApp instance first.
        </p>
      )}
    </div>
  );
}
