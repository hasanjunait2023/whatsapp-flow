import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import LabelSelector from './LabelSelector';

interface ConditionConfigFormProps {
  conditionType: string;
  config: Record<string, any>;
  onChange: (config: Record<string, any>) => void;
}

const conditionFields = [
  { value: 'contact.name', label: 'Contact Name' },
  { value: 'contact.phone', label: 'Phone Number' },
  { value: 'message.content', label: 'Message Content' },
  { value: 'order.status', label: 'Order Status' },
  { value: 'order.total', label: 'Order Total' },
];

const operators = [
  { value: 'equals', label: 'Equals' },
  { value: 'not_equals', label: 'Not Equals' },
  { value: 'contains', label: 'Contains' },
  { value: 'not_contains', label: 'Does Not Contain' },
  { value: 'starts_with', label: 'Starts With' },
  { value: 'ends_with', label: 'Ends With' },
  { value: 'greater_than', label: 'Greater Than' },
  { value: 'less_than', label: 'Less Than' },
  { value: 'is_empty', label: 'Is Empty' },
  { value: 'is_not_empty', label: 'Is Not Empty' },
];

export default function ConditionConfigForm({
  conditionType,
  config,
  onChange,
}: ConditionConfigFormProps) {
  const updateConfig = (key: string, value: any) => {
    onChange({ ...config, [key]: value });
  };

  switch (conditionType) {
    case 'if_else':
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>
              Field <span className="text-destructive">*</span>
            </Label>
            <Select
              value={config.field || ''}
              onValueChange={(v) => updateConfig('field', v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select field to check" />
              </SelectTrigger>
              <SelectContent>
                {conditionFields.map((field) => (
                  <SelectItem key={field.value} value={field.value}>
                    {field.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label>
              Operator <span className="text-destructive">*</span>
            </Label>
            <Select
              value={config.operator || ''}
              onValueChange={(v) => updateConfig('operator', v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select operator" />
              </SelectTrigger>
              <SelectContent>
                {operators.map((op) => (
                  <SelectItem key={op.value} value={op.value}>
                    {op.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {config.operator && !['is_empty', 'is_not_empty'].includes(config.operator) && (
            <div className="space-y-2">
              <Label>
                Value <span className="text-destructive">*</span>
              </Label>
              <Input
                placeholder="Enter comparison value"
                value={config.value || ''}
                onChange={(e) => updateConfig('value', e.target.value)}
              />
            </div>
          )}
          
          {config.field && config.operator && (
            <div className="p-3 rounded-lg bg-muted text-sm">
              <span className="text-muted-foreground">Condition: </span>
              <span className="font-medium">
                If {conditionFields.find((f) => f.value === config.field)?.label || config.field}{' '}
                {operators.find((o) => o.value === config.operator)?.label.toLowerCase() || config.operator}
                {config.value ? ` "${config.value}"` : ''}
              </span>
            </div>
          )}
        </div>
      );

    case 'has_label':
      return (
        <div className="space-y-4">
          <LabelSelector
            value={config.label_id}
            onChange={(id, name) => {
              updateConfig('label_id', id);
              updateConfig('label_name', name);
            }}
            label="Check for Label"
            required
          />
          <div className="p-3 rounded-lg bg-muted text-sm">
            <p className="text-muted-foreground">
              <strong>Yes:</strong> Contact has this label
            </p>
            <p className="text-muted-foreground">
              <strong>No:</strong> Contact does not have this label
            </p>
          </div>
        </div>
      );

    default:
      return (
        <div className="p-4 text-center text-muted-foreground">
          <p>No configuration available for this condition type.</p>
        </div>
      );
  }
}
