import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface CreateListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateList: (name: string) => Promise<void>;
  isCreating: boolean;
}

export function CreateListDialog({
  open,
  onOpenChange,
  onCreateList,
  isCreating,
}: CreateListDialogProps) {
  const [name, setName] = useState('');

  const handleCreate = async () => {
    if (!name.trim()) return;
    await onCreateList(name.trim());
    setName('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add List</DialogTitle>
          <DialogDescription>
            Create a new list to organize your cards
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Label htmlFor="list-name">List Name</Label>
          <Input
            id="list-name"
            placeholder="e.g., Backlog, In Review"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            className="mt-2"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={!name.trim() || isCreating}>
            {isCreating && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Add List
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
