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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertTriangle, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { useAdminRequests } from '@/hooks/useAdminRequests';
import {
  AdminPermissions,
  DEFAULT_PERMISSIONS,
  FULL_PERMISSIONS,
  PERMISSION_LABELS,
} from '@/hooks/useAdminPermissions';

interface AdminRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userEmail: string | null;
  userName: string | null;
}

type PermissionTemplate = 'standard' | 'full' | 'custom';

const TEMPLATE_PERMISSIONS: Record<PermissionTemplate, AdminPermissions> = {
  standard: DEFAULT_PERMISSIONS,
  full: FULL_PERMISSIONS,
  custom: DEFAULT_PERMISSIONS,
};

export function AdminRequestDialog({
  open,
  onOpenChange,
  userId,
  userEmail,
  userName,
}: AdminRequestDialogProps) {
  const { submitRequest } = useAdminRequests();
  const [template, setTemplate] = useState<PermissionTemplate>('standard');
  const [permissions, setPermissions] = useState<AdminPermissions>(DEFAULT_PERMISSIONS);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleTemplateChange = (value: PermissionTemplate) => {
    setTemplate(value);
    if (value !== 'custom') {
      setPermissions(TEMPLATE_PERMISSIONS[value]);
    }
  };

  const handlePermissionChange = (key: keyof AdminPermissions, checked: boolean) => {
    setTemplate('custom');
    setPermissions(prev => ({ ...prev, [key]: checked }));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await submitRequest(userId, permissions, reason);
      toast.success('Admin access request submitted');
      onOpenChange(false);
      setReason('');
      setTemplate('standard');
      setPermissions(DEFAULT_PERMISSIONS);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Request Admin Access
          </DialogTitle>
          <DialogDescription>
            Submit a request to grant admin access. This requires approval from a Super Admin.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-muted-foreground">User</Label>
            <p className="font-medium">{userName || userEmail || 'Unknown User'}</p>
            {userName && userEmail && (
              <p className="text-sm text-muted-foreground">{userEmail}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Permission Template</Label>
            <Select value={template} onValueChange={handleTemplateChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="standard">
                  Standard Admin (Basic access)
                </SelectItem>
                <SelectItem value="full">
                  Full Admin (All permissions)
                </SelectItem>
                <SelectItem value="custom">
                  Custom (Select individual permissions)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Module Access</Label>
            <div className="grid grid-cols-2 gap-2 p-3 border rounded-lg bg-muted/30">
              {(Object.keys(PERMISSION_LABELS) as Array<keyof AdminPermissions>).map((key) => (
                <div key={key} className="flex items-center gap-2">
                  <Checkbox
                    id={key}
                    checked={permissions[key]}
                    onCheckedChange={(checked) => handlePermissionChange(key, checked === true)}
                  />
                  <label htmlFor={key} className="text-sm cursor-pointer">
                    {PERMISSION_LABELS[key]}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Request</Label>
            <Textarea
              id="reason"
              placeholder="Explain why this user needs admin access..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>

          <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-sm text-muted-foreground">
              This request will be sent to Super Admins for review. The user will not have
              access until the request is approved.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Submitting...' : 'Submit Request'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
