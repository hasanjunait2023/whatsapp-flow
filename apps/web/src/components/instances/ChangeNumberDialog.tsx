import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Loader2, Phone, QrCode } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { WhatsAppInstance } from '@/hooks/useInstances';

interface ChangeNumberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  instance: WhatsAppInstance;
  onSuccess: () => void;
}

export default function ChangeNumberDialog({
  open,
  onOpenChange,
  instance,
  onSuccess,
}: ChangeNumberDialogProps) {
  const [newPhoneNumber, setNewPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!newPhoneNumber.trim()) {
      toast({
        title: 'Phone number required',
        description: 'Please enter a valid phone number.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('wasender-change-number', {
        body: {
          instance_id: instance.id,
          new_phone_number: newPhoneNumber.trim(),
        },
      });

      if (error) throw error;

      toast({
        title: 'Phone number updated',
        description: 'Please scan the QR code to connect with your new number.',
      });

      onOpenChange(false);
      setNewPhoneNumber('');
      onSuccess();
    } catch (err: any) {
      console.error('Change number error:', err);
      toast({
        title: 'Failed to change number',
        description: err.message || 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5 text-whatsapp" />
            Change WhatsApp Number
          </DialogTitle>
          <DialogDescription>
            Update the phone number for "{instance.name}"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Current number display */}
          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-xs">Current Number</Label>
            <div className="text-sm font-medium bg-muted/50 rounded-md px-3 py-2">
              {instance.phone_number || 'Not connected'}
            </div>
          </div>

          {/* New number input */}
          <div className="space-y-1.5">
            <Label htmlFor="new-phone">New Phone Number</Label>
            <Input
              id="new-phone"
              placeholder="+8801xxxxxxxxx"
              value={newPhoneNumber}
              onChange={(e) => setNewPhoneNumber(e.target.value)}
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">
              Enter the new WhatsApp number in international format
            </p>
          </div>

          {/* Warning */}
          <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
            <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
            <div className="text-xs text-amber-700 dark:text-amber-400 space-y-1">
              <p className="font-medium">Important:</p>
              <ul className="list-disc pl-3 space-y-0.5">
                <li>You'll need to scan a QR code with the new phone</li>
                <li>The same session will be used (no data loss)</li>
                <li>Current connection will be disconnected</li>
              </ul>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || !newPhoneNumber.trim()}
            className="bg-whatsapp hover:bg-whatsapp/90"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <QrCode className="h-4 w-4 mr-2" />
            )}
            Change & Get QR Code
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
