import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, QrCode, CheckCircle2, AlertCircle, Phone, MessageSquare } from 'lucide-react';
import { useAdminInstanceQR } from '@/hooks/useAdminInstanceQR';

interface AdminAddInstanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateInstance: (name: string, phoneNumber: string) => Promise<string | null>;
  creating: boolean;
  onSuccess: () => void;
}

type DialogState = 'form' | 'creating' | 'qr' | 'connected' | 'error';

export default function AdminAddInstanceDialog({
  open,
  onOpenChange,
  onCreateInstance,
  creating,
  onSuccess,
}: AdminAddInstanceDialogProps) {
  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [dialogState, setDialogState] = useState<DialogState>('form');
  const [instanceId, setInstanceId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    qrCode,
    status: qrStatus,
    error: qrError,
    refreshQR,
  } = useAdminInstanceQR({
    instanceId: instanceId || '',
    enabled: !!instanceId && dialogState === 'qr',
  });

  // Watch for connection success
  useEffect(() => {
    if (qrStatus === 'connected') {
      setDialogState('connected');
      setTimeout(() => {
        onSuccess();
        handleClose();
      }, 2000);
    }
  }, [qrStatus, onSuccess]);

  // Once we have an instance id, move to QR/status watching immediately.
  // This prevents getting stuck in "creating" when the backend reports "Already connected"
  // (no QR will be generated in that case).
  useEffect(() => {
    if (instanceId && dialogState === 'creating') {
      setDialogState('qr');
    }
  }, [instanceId, dialogState]);

  // Surface QR/status errors
  useEffect(() => {
    if (qrStatus === 'error' && (dialogState === 'creating' || dialogState === 'qr')) {
      setDialogState('error');
      setErrorMessage(qrError || 'Failed to fetch QR/status');
    }
  }, [qrStatus, qrError, dialogState]);

  const handleClose = () => {
    setName('');
    setPhoneNumber('');
    setDialogState('form');
    setInstanceId(null);
    setErrorMessage(null);
    onOpenChange(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !phoneNumber.trim()) return;

    setDialogState('creating');
    setErrorMessage(null);

    try {
      // Step 1: Create the instance (returns instance_id, needs_connect: true)
      const newInstanceId = await onCreateInstance(name.trim(), phoneNumber.trim());

      if (newInstanceId) {
        setInstanceId(newInstanceId);
        // The useEffect will detect instanceId and transition to 'qr' state
        // which triggers the QR hook to call connect-session
      } else {
        setDialogState('error');
        setErrorMessage('Failed to create instance. Please try again.');
      }
    } catch (err) {
      setDialogState('error');
      setErrorMessage(err instanceof Error ? err.message : 'Failed to create instance');
    }
  };

  const renderContent = () => {
    switch (dialogState) {
      case 'form':
        return (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Instance Name</Label>
              <div className="relative">
                <MessageSquare className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="name"
                  placeholder="e.g., Marketing Line"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="phone"
                  placeholder="+880 1842 243 163"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Enter the phone number that will be connected to WhatsApp
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={creating || !name.trim() || !phoneNumber.trim()}>
                {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add Instance
              </Button>
            </div>
          </form>
        );

      case 'creating':
        return (
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-lg font-medium">Creating instance...</p>
            <p className="text-sm text-muted-foreground">Setting up WhatsApp session</p>
          </div>
        );

      case 'qr':
        return (
          <div className="flex flex-col items-center justify-center py-4">
            <div className="text-center mb-4">
              <p className="text-lg font-medium">Scan QR Code</p>
              <p className="text-sm text-muted-foreground">
                Open WhatsApp on your phone and scan this code
              </p>
            </div>

            {qrCode ? (
              <div className="bg-white p-4 rounded-lg shadow-inner">
                <img
                  src={qrCode.startsWith('data:') ? qrCode : `data:image/png;base64,${qrCode}`}
                  alt="WhatsApp QR Code"
                  className="w-64 h-64"
                />
              </div>
            ) : (
              <div className="w-64 h-64 bg-muted rounded-lg flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            )}

            <div className="flex gap-2 mt-4">
              <Button variant="outline" onClick={refreshQR} size="sm">
                Refresh QR
              </Button>
              <Button variant="ghost" onClick={handleClose} size="sm">
                Cancel
              </Button>
            </div>
          </div>
        );

      case 'connected':
        return (
          <div className="flex flex-col items-center justify-center py-8">
            <CheckCircle2 className="h-16 w-16 text-primary mb-4" />
            <p className="text-lg font-medium text-primary">Connected!</p>
            <p className="text-sm text-muted-foreground">
              WhatsApp instance is now active
            </p>
          </div>
        );

      case 'error':
        return (
          <div className="flex flex-col items-center justify-center py-8">
            <AlertCircle className="h-16 w-16 text-destructive mb-4" />
            <p className="text-lg font-medium text-destructive">Connection Failed</p>
            <p className="text-sm text-muted-foreground text-center mb-4">
              {errorMessage || qrError || 'Something went wrong'}
            </p>
            <div className="flex gap-2">
              <Button onClick={() => setDialogState('form')}>Try Again</Button>
              <Button variant="outline" onClick={handleClose}>
                Close
              </Button>
            </div>
          </div>
        );
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) handleClose();
        else onOpenChange(true);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            Add WhatsApp Instance
          </DialogTitle>
          <DialogDescription>
            Create a new WhatsApp instance for admin communication
          </DialogDescription>
        </DialogHeader>
        {renderContent()}
      </DialogContent>
    </Dialog>
  );
}
