import { Button } from '@/components/ui/button';
import { Forward, X } from 'lucide-react';

interface SelectionToolbarProps {
  selectedCount: number;
  onCancel: () => void;
  onForward: () => void;
}

export default function SelectionToolbar({
  selectedCount,
  onCancel,
  onForward,
}: SelectionToolbarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="absolute top-0 left-0 right-0 z-20 bg-primary text-primary-foreground px-4 py-2 flex items-center justify-between shadow-lg animate-in slide-in-from-top duration-200">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/10"
          onClick={onCancel}
        >
          <X className="h-5 w-5" />
        </Button>
        <span className="font-medium">
          {selectedCount} selected
        </span>
      </div>
      
      <Button
        variant="secondary"
        size="sm"
        onClick={onForward}
        className="gap-2"
      >
        <Forward className="h-4 w-4" />
        Forward
      </Button>
    </div>
  );
}
