import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Loader2, Trash2 } from 'lucide-react';

interface AdminDeleteInstanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  instance: {
    id: string;
    name: string;
    phone_number?: string | null;
  } | null;
  onConfirm: (id: string) => Promise<boolean>;
  deleting: boolean;
}

export default function AdminDeleteInstanceDialog({
  open,
  onOpenChange,
  instance,
  onConfirm,
  deleting,
}: AdminDeleteInstanceDialogProps) {
  const handleConfirm = async () => {
    if (!instance) return;
    const success = await onConfirm(instance.id);
    if (success) {
      onOpenChange(false);
    }
  };

  if (!instance) return null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-destructive" />
            Remove WhatsApp Instance
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              Are you sure you want to remove <strong>{instance.name}</strong>
              {instance.phone_number && (
                <span className="text-muted-foreground"> ({instance.phone_number})</span>
              )}
              ?
            </p>
            <p className="text-sm">
              This will disconnect the WhatsApp session. Chat history will be preserved but
              you won't be able to send or receive messages on this instance.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={deleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Remove Instance
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
