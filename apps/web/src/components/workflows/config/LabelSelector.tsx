import { useLabels } from '@/hooks/useLabels';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Tag, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface LabelSelectorProps {
  value?: string;
  onChange: (labelId: string, labelName?: string) => void;
  label?: string;
  required?: boolean;
  allowCreate?: boolean;
}

export default function LabelSelector({
  value,
  onChange,
  label = 'Label',
  required = false,
  allowCreate = false,
}: LabelSelectorProps) {
  const { labels, loading, createLabel } = useLabels();
  const [isCreating, setIsCreating] = useState(false);
  const [newLabelName, setNewLabelName] = useState('');
  const [creating, setCreating] = useState(false);

  const selectedLabel = labels.find((l) => l.id === value);

  const handleCreateLabel = async () => {
    if (!newLabelName.trim()) return;
    
    setCreating(true);
    try {
      const newLabel = await createLabel(newLabelName.trim());
      if (newLabel) {
        onChange(newLabel.id, newLabel.name);
        setNewLabelName('');
        setIsCreating(false);
      }
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      
      {isCreating ? (
        <div className="flex gap-2">
          <Input
            placeholder="Enter label name"
            value={newLabelName}
            onChange={(e) => setNewLabelName(e.target.value)}
            className="h-9"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreateLabel();
              if (e.key === 'Escape') setIsCreating(false);
            }}
          />
          <Button size="sm" onClick={handleCreateLabel} disabled={creating}>
            Add
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setIsCreating(false)}>
            Cancel
          </Button>
        </div>
      ) : (
        <div className="flex gap-2">
          <Select 
            value={value || ''} 
            onValueChange={(id) => {
              const labelItem = labels.find((l) => l.id === id);
              onChange(id, labelItem?.name);
            }} 
            disabled={loading}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={loading ? 'Loading...' : 'Select a label'}>
                {selectedLabel && (
                  <div className="flex items-center gap-2">
                    <div 
                      className="h-3 w-3 rounded-full" 
                      style={{ backgroundColor: selectedLabel.color }}
                    />
                    <span>{selectedLabel.name}</span>
                  </div>
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {labels.length === 0 ? (
                <div className="p-2 text-sm text-muted-foreground text-center">
                  No labels available
                </div>
              ) : (
                labels.map((labelItem) => (
                  <SelectItem key={labelItem.id} value={labelItem.id}>
                    <div className="flex items-center gap-2">
                      <div 
                        className="h-3 w-3 rounded-full" 
                        style={{ backgroundColor: labelItem.color }}
                      />
                      <span>{labelItem.name}</span>
                    </div>
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          
          {allowCreate && (
            <Button 
              size="icon" 
              variant="outline" 
              className="shrink-0"
              onClick={() => setIsCreating(true)}
            >
              <Plus className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
