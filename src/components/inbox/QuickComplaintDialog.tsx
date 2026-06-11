import { useState } from 'react';
import { useComplaints, ComplaintCategory, ComplaintPriority } from '@/hooks/useComplaints';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, AlertTriangle, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface QuickComplaintDialogProps {
  contactId: string;
  contactName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CATEGORIES: { value: ComplaintCategory; label: string }[] = [
  { value: 'product_issue', label: 'Product Issue' },
  { value: 'delivery', label: 'Delivery Problem' },
  { value: 'refund', label: 'Refund Request' },
  { value: 'other', label: 'Other' },
];

const PRIORITIES: { value: ComplaintPriority; label: string; color: string }[] = [
  { value: 'low', label: 'Low', color: 'bg-blue-100 text-blue-700' },
  { value: 'medium', label: 'Medium', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'high', label: 'High', color: 'bg-orange-100 text-orange-700' },
  { value: 'critical', label: 'Critical', color: 'bg-red-100 text-red-700' },
];

export function QuickComplaintDialog({
  contactId,
  contactName,
  open,
  onOpenChange,
}: QuickComplaintDialogProps) {
  const { createComplaint } = useComplaints();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<ComplaintCategory>('other');
  const [priority, setPriority] = useState<ComplaintPriority>('medium');

  const handleSubmit = async () => {
    if (!title.trim() || !description.trim()) return;

    await createComplaint.mutateAsync({
      title: title.trim(),
      description: description.trim(),
      category,
      priority,
      contact_id: contactId,
    });

    // Reset form and close
    setTitle('');
    setDescription('');
    setCategory('other');
    setPriority('medium');
    onOpenChange(false);
  };

  const handleClose = () => {
    setTitle('');
    setDescription('');
    setCategory('other');
    setPriority('medium');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Log Complaint
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Contact Badge */}
          <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-md">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Customer:</span>
            <Badge variant="secondary">{contactName}</Badge>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Brief complaint title"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the complaint details..."
              rows={3}
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as ComplaintCategory)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Priority */}
          <div className="space-y-2">
            <Label>Priority</Label>
            <RadioGroup
              value={priority}
              onValueChange={(v) => setPriority(v as ComplaintPriority)}
              className="flex flex-wrap gap-2"
            >
              {PRIORITIES.map((p) => (
                <div key={p.value} className="flex items-center">
                  <RadioGroupItem
                    value={p.value}
                    id={`priority-${p.value}`}
                    className="sr-only peer"
                  />
                  <Label
                    htmlFor={`priority-${p.value}`}
                    className={`cursor-pointer px-3 py-1.5 rounded-md border text-sm transition-colors
                      peer-data-[state=checked]:${p.color} peer-data-[state=checked]:border-transparent
                      ${priority === p.value ? p.color + ' border-transparent' : 'border-input hover:bg-muted'}`}
                  >
                    {p.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!title.trim() || !description.trim() || createComplaint.isPending}
          >
            {createComplaint.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Complaint'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
