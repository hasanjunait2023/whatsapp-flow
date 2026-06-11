import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface DelayConfigFormProps {
  config: Record<string, any>;
  onChange: (config: Record<string, any>) => void;
}

const timeUnits = [
  { value: 'seconds', label: 'Seconds', max: 59 },
  { value: 'minutes', label: 'Minutes', max: 59 },
  { value: 'hours', label: 'Hours', max: 23 },
  { value: 'days', label: 'Days', max: 30 },
];

export default function DelayConfigForm({
  config,
  onChange,
}: DelayConfigFormProps) {
  const updateConfig = (key: string, value: any) => {
    onChange({ ...config, [key]: value });
  };

  const delay = config.delay || 1;
  const unit = config.unit || 'minutes';
  const currentUnit = timeUnits.find((u) => u.value === unit);

  const formatDuration = () => {
    if (!delay) return '';
    const unitLabel = delay === 1 ? unit.slice(0, -1) : unit;
    return `${delay} ${unitLabel}`;
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>
            Duration <span className="text-destructive">*</span>
          </Label>
          <Input
            type="number"
            min={1}
            max={currentUnit?.max || 60}
            value={delay}
            onChange={(e) => {
              const val = parseInt(e.target.value) || 1;
              updateConfig('delay', Math.max(1, Math.min(val, currentUnit?.max || 60)));
            }}
          />
        </div>
        <div className="space-y-2">
          <Label>Unit</Label>
          <Select
            value={unit}
            onValueChange={(v) => updateConfig('unit', v)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {timeUnits.map((u) => (
                <SelectItem key={u.value} value={u.value}>
                  {u.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="p-4 rounded-lg bg-muted text-center">
        <p className="text-sm text-muted-foreground">Workflow will wait for</p>
        <p className="text-2xl font-bold">{formatDuration()}</p>
        <p className="text-xs text-muted-foreground mt-1">before continuing to the next step</p>
      </div>
      
      <div className="text-xs text-muted-foreground space-y-1">
        <p>• Delays are processed in the background</p>
        <p>• Maximum delay: 30 days</p>
        <p>• Workflow continues automatically after the delay</p>
      </div>
    </div>
  );
}
