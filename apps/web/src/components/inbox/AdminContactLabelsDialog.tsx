import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Check, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface LabelType {
  id: string;
  tenant_id: string;
  name: string;
  color: string;
  created_at: string;
}

interface AdminContactLabelsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactId: string;
  contactName: string;
  tenantId: string;
}

const PRESET_COLORS = [
  '#6366f1', // Indigo
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#ef4444', // Red
  '#f97316', // Orange
  '#eab308', // Yellow
  '#22c55e', // Green
  '#14b8a6', // Teal
  '#06b6d4', // Cyan
  '#3b82f6', // Blue
];

export default function AdminContactLabelsDialog({
  open,
  onOpenChange,
  contactId,
  contactName,
  tenantId,
}: AdminContactLabelsDialogProps) {
  const [labels, setLabels] = useState<LabelType[]>([]);
  const [contactLabels, setContactLabels] = useState<LabelType[]>([]);
  const [labelsLoading, setLabelsLoading] = useState(true);
  const [newLabelName, setNewLabelName] = useState('');
  const [newLabelColor, setNewLabelColor] = useState('#6366f1');
  const [showNewLabel, setShowNewLabel] = useState(false);
  const [processing, setProcessing] = useState(false);

  // Fetch all labels for the tenant
  const fetchLabels = useCallback(async () => {
    if (!tenantId) return;
    
    try {
      const { data, error } = await supabase
        .from('labels')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('name');

      if (error) throw error;
      setLabels(data || []);
    } catch (err) {
      console.error('Error fetching labels:', err);
    }
  }, [tenantId]);

  // Fetch labels assigned to this contact
  const fetchContactLabels = useCallback(async () => {
    if (!contactId) return;

    try {
      const { data, error } = await supabase
        .from('contact_labels')
        .select('*, label:labels(*)')
        .eq('contact_id', contactId);

      if (error) throw error;
      setContactLabels((data || []).map((cl: any) => cl.label).filter(Boolean));
    } catch (err) {
      console.error('Error fetching contact labels:', err);
      toast.error('Failed to load labels');
    }
  }, [contactId]);

  useEffect(() => {
    if (open && contactId && tenantId) {
      setLabelsLoading(true);
      Promise.all([fetchLabels(), fetchContactLabels()])
        .finally(() => setLabelsLoading(false));
    }
  }, [open, contactId, tenantId, fetchLabels, fetchContactLabels]);

  const handleToggleLabel = async (labelId: string) => {
    const hasLabel = contactLabels.some((l) => l.id === labelId);
    setProcessing(true);

    try {
      if (hasLabel) {
        const { error } = await supabase
          .from('contact_labels')
          .delete()
          .eq('contact_id', contactId)
          .eq('label_id', labelId);
        
        if (error) throw error;
        setContactLabels((prev) => prev.filter((l) => l.id !== labelId));
      } else {
        const { error } = await supabase
          .from('contact_labels')
          .insert({ contact_id: contactId, label_id: labelId });
        
        if (error) throw error;
        const label = labels.find((l) => l.id === labelId);
        if (label) setContactLabels((prev) => [...prev, label]);
      }
    } catch {
      toast.error('Failed to update label');
    } finally {
      setProcessing(false);
    }
  };

  const handleCreateLabel = async () => {
    if (!newLabelName.trim() || !tenantId) return;
    setProcessing(true);

    try {
      const { data: newLabel, error: createError } = await supabase
        .from('labels')
        .insert({ tenant_id: tenantId, name: newLabelName.trim(), color: newLabelColor })
        .select()
        .single();

      if (createError) throw createError;

      // Add to labels list
      setLabels((prev) => [...prev, newLabel]);

      // Auto-add the new label to the contact
      const { error: assignError } = await supabase
        .from('contact_labels')
        .insert({ contact_id: contactId, label_id: newLabel.id });

      if (assignError) throw assignError;

      setContactLabels((prev) => [...prev, newLabel]);
      setNewLabelName('');
      setShowNewLabel(false);
      toast.success('Label created and added');
    } catch {
      toast.error('Failed to create label');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Manage Labels</DialogTitle>
          <DialogDescription>
            Add or remove labels for {contactName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current Labels */}
          {contactLabels.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {contactLabels.map((label) => (
                <Badge
                  key={label.id}
                  style={{ backgroundColor: label.color }}
                  className="text-white"
                >
                  {label.name}
                </Badge>
              ))}
            </div>
          )}

          {/* All Labels */}
          <div>
            <Label className="text-sm font-medium mb-2 block">All Labels</Label>
            {labelsLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : (
              <ScrollArea className="max-h-[200px]">
                <div className="space-y-1">
                  {labels.map((label) => {
                    const hasLabel = contactLabels.some((l) => l.id === label.id);
                    return (
                      <button
                        key={label.id}
                        onClick={() => handleToggleLabel(label.id)}
                        disabled={processing}
                        className={cn(
                          "w-full flex items-center justify-between px-3 py-2 rounded-md transition-colors",
                          "hover:bg-accent disabled:opacity-50"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: label.color }}
                          />
                          <span className="text-sm">{label.name}</span>
                        </div>
                        {hasLabel && (
                          <Check className="h-4 w-4 text-primary" />
                        )}
                      </button>
                    );
                  })}
                  {labels.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No labels created yet
                    </p>
                  )}
                </div>
              </ScrollArea>
            )}
          </div>

          {/* Create New Label */}
          {showNewLabel ? (
            <div className="space-y-3 p-3 border border-border rounded-lg bg-muted/50">
              <div className="flex gap-2">
                <Input
                  placeholder="Label name..."
                  value={newLabelName}
                  onChange={(e) => setNewLabelName(e.target.value)}
                  className="flex-1"
                  autoFocus
                />
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="icon">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: newLabelColor }}
                      />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-2" align="end">
                    <div className="grid grid-cols-5 gap-1">
                      {PRESET_COLORS.map((color) => (
                        <button
                          key={color}
                          className={cn(
                            "w-6 h-6 rounded-full transition-transform hover:scale-110",
                            newLabelColor === color && "ring-2 ring-offset-2 ring-primary"
                          )}
                          style={{ backgroundColor: color }}
                          onClick={() => setNewLabelColor(color)}
                        />
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => {
                    setShowNewLabel(false);
                    setNewLabelName('');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={handleCreateLabel}
                  disabled={!newLabelName.trim() || processing}
                >
                  Create & Add
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setShowNewLabel(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create New Label
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
