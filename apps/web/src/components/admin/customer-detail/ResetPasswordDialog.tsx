import { useState } from 'react';
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Copy, Check, Key, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ResetPasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string | null;
  userEmail: string | null;
  userName: string | null;
}

export function ResetPasswordDialog({
  open,
  onOpenChange,
  userId,
  userEmail,
  userName,
}: ResetPasswordDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [newPassword, setNewPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleReset = async () => {
    if (!userId) return;

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(
        `https://cdkrvztqeuflxilrtnws.supabase.co/functions/v1/admin-reset-user-password`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ user_id: userId }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to reset password');
      }

      setNewPassword(result.temp_password);
      toast({
        title: 'Password Reset Successful',
        description: 'Copy the new password and share it with the customer.',
      });
    } catch (error) {
      console.error('Password reset error:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to reset password',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!newPassword) return;
    
    try {
      await navigator.clipboard.writeText(newPassword);
      setCopied(true);
      toast({
        title: 'Copied!',
        description: 'Password copied to clipboard',
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({
        title: 'Copy failed',
        description: 'Please copy the password manually',
        variant: 'destructive',
      });
    }
  };

  const handleClose = () => {
    setNewPassword(null);
    setCopied(false);
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={handleClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            {newPassword ? 'New Password Generated' : 'Reset User Password'}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {newPassword ? (
              <div className="space-y-4 pt-2">
                <p className="text-sm">
                  Password has been reset for <strong>{userName || userEmail}</strong>. 
                  Copy the new temporary password and share it with the customer.
                </p>
                <div className="space-y-2">
                  <Label>New Temporary Password</Label>
                  <div className="flex gap-2">
                    <Input
                      value={newPassword}
                      readOnly
                      className="font-mono text-lg"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleCopy}
                      className="shrink-0"
                    >
                      {copied ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  ⚠️ The customer should change this password after logging in.
                </p>
              </div>
            ) : (
              <div className="space-y-2 pt-2">
                <p>
                  Are you sure you want to reset the password for{' '}
                  <strong>{userName || userEmail}</strong>?
                </p>
                <p className="text-sm text-muted-foreground">
                  A new temporary password will be generated. You'll need to share it 
                  with the customer via WhatsApp or call.
                </p>
              </div>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          {newPassword ? (
            <AlertDialogAction onClick={handleClose}>Done</AlertDialogAction>
          ) : (
            <>
              <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleReset}
                disabled={loading}
                className="bg-primary"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Resetting...
                  </>
                ) : (
                  'Reset Password'
                )}
              </AlertDialogAction>
            </>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
