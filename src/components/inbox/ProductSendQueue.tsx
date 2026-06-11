import { Product } from '@/hooks/useProducts';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Package, X } from 'lucide-react';

interface ProductSendQueueProps {
  queue: Product[];
  currentIndex: number;
  sending: boolean;
  onCancel: () => void;
}

export default function ProductSendQueue({
  queue,
  currentIndex,
  sending,
  onCancel,
}: ProductSendQueueProps) {
  if (!sending || queue.length === 0) return null;

  const progress = ((currentIndex + 1) / queue.length) * 100;
  const currentProduct = queue[currentIndex];
  const nextProduct = queue[currentIndex + 1];

  return (
    <div className="fixed bottom-24 right-4 z-50 bg-card border border-border rounded-lg shadow-lg p-4 w-80 animate-in slide-in-from-right-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-brand/10 flex items-center justify-center">
            <Package className="h-4 w-4 text-brand" />
          </div>
          <div>
            <p className="text-sm font-medium">Sending products</p>
            <p className="text-xs text-muted-foreground">
              {currentIndex + 1} of {queue.length}
            </p>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onCancel}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <Progress value={progress} className="h-2 mb-3" />

      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Sending:</span>
          <span className="font-medium truncate">{currentProduct?.name}</span>
        </div>
        
        {nextProduct && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Next:</span>
            <span className="truncate">{nextProduct.name}</span>
            <span>(in 5s)</span>
          </div>
        )}
      </div>
    </div>
  );
}
