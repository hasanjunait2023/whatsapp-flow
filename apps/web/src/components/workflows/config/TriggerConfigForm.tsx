import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import InstanceSelector from './InstanceSelector';
import LabelSelector from './LabelSelector';
import { Badge } from '@/components/ui/badge';

interface TriggerConfigFormProps {
  triggerType: string;
  config: Record<string, any>;
  onChange: (config: Record<string, any>) => void;
}

const orderStatuses = [
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'processing', label: 'Processing' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
];

export default function TriggerConfigForm({
  triggerType,
  config,
  onChange,
}: TriggerConfigFormProps) {
  const updateConfig = (key: string, value: any) => {
    onChange({ ...config, [key]: value });
  };

  switch (triggerType) {
    case 'message_received':
      return (
        <div className="space-y-4">
          <InstanceSelector
            value={config.instance_id}
            onChange={(id) => updateConfig('instance_id', id)}
            label="Listen on Instance"
          />
          <div className="space-y-2">
            <Label>Filter Keywords (optional)</Label>
            <Input
              placeholder="e.g., hello, hi, hey (comma-separated)"
              value={config.filter_keywords || ''}
              onChange={(e) => updateConfig('filter_keywords', e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Leave empty to trigger on any message
            </p>
          </div>
        </div>
      );

    case 'keyword':
      return (
        <div className="space-y-4">
          <InstanceSelector
            value={config.instance_id}
            onChange={(id) => updateConfig('instance_id', id)}
            label="Listen on Instance"
          />
          <div className="space-y-2">
            <Label>
              Keywords <span className="text-destructive">*</span>
            </Label>
            <Textarea
              placeholder="Enter keywords, one per line or comma-separated"
              value={Array.isArray(config.keywords) ? config.keywords.join(', ') : (config.keywords || '')}
              onChange={(e) => {
                const keywords = e.target.value
                  .split(/[,\n]/)
                  .map((k) => k.trim())
                  .filter(Boolean);
                updateConfig('keywords', keywords);
              }}
              rows={3}
            />
            {config.keywords?.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {config.keywords.map((kw: string, i: number) => (
                  <Badge key={i} variant="secondary" className="text-xs">
                    {kw}
                  </Badge>
                ))}
              </div>
            )}
          </div>
          <div className="space-y-2">
            <Label>Match Type</Label>
            <Select
              value={config.match_type || 'contains'}
              onValueChange={(v) => updateConfig('match_type', v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="exact">Exact Match</SelectItem>
                <SelectItem value="contains">Contains</SelectItem>
                <SelectItem value="starts_with">Starts With</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      );

    case 'webhook':
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Webhook URL</Label>
            <div className="flex gap-2">
              <Input
                value={config.webhook_url || 'Will be generated on save'}
                readOnly
                className="bg-muted font-mono text-xs"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Send POST requests to this URL to trigger the workflow
            </p>
          </div>
          <div className="space-y-2">
            <Label>Secret Token (optional)</Label>
            <Input
              placeholder="Enter a secret for validation"
              value={config.secret_token || ''}
              onChange={(e) => updateConfig('secret_token', e.target.value)}
            />
          </div>
        </div>
      );

    case 'contact_label_added':
      return (
        <div className="space-y-4">
          <LabelSelector
            value={config.label_id}
            onChange={(id, name) => {
              updateConfig('label_id', id);
              updateConfig('label_name', name);
            }}
            label="When Label is Added"
            required
          />
          <p className="text-xs text-muted-foreground">
            Workflow will trigger when this label is added to a contact
          </p>
        </div>
      );

    case 'order_status_changed':
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>
              When Status Changes To <span className="text-destructive">*</span>
            </Label>
            <Select
              value={config.order_status || ''}
              onValueChange={(v) => updateConfig('order_status', v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select order status" />
              </SelectTrigger>
              <SelectContent>
                {orderStatuses.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="text-xs text-muted-foreground">
            Workflow will trigger when an order status changes to the selected value
          </p>
        </div>
      );

    default:
      return (
        <div className="p-4 text-center text-muted-foreground">
          <p>No configuration available for this trigger type.</p>
        </div>
      );
  }
}
