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
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Shield, Crown, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
  AdminPermissions,
  DEFAULT_PERMISSIONS,
  FULL_PERMISSIONS,
  PERMISSION_LABELS,
} from '@/hooks/useAdminPermissions';

interface AdminPermissionEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userEmail: string | null;
  userName: string | null;
  currentPermissions: AdminPermissions;
  isSuperAdmin: boolean;
  onSaved: () => void;
}

type PermissionTemplate = 'standard' | 'full' | 'custom';

export function AdminPermissionEditor({
  open,
  onOpenChange,
  userId,
  userEmail,
  userName,
  currentPermissions,
  isSuperAdmin: currentIsSuperAdmin,
  onSaved,
}: AdminPermissionEditorProps) {
  const [permissions, setPermissions] = useState<AdminPermissions>(currentPermissions);
  const [isSuperAdmin, setIsSuperAdmin] = useState(currentIsSuperAdmin);
  const [template, setTemplate] = useState<PermissionTemplate>('custom');
  const [saving, setSaving] = useState(false);

  const handleTemplateChange = (value: PermissionTemplate) => {
    setTemplate(value);
    if (value === 'standard') {
      setPermissions(DEFAULT_PERMISSIONS);
    } else if (value === 'full') {
      setPermissions(FULL_PERMISSIONS);
    }
  };

  const handlePermissionChange = (key: keyof AdminPermissions, checked: boolean) => {
    setTemplate('custom');
    setPermissions(prev => ({ ...prev, [key]: checked }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const finalPermissions = isSuperAdmin ? FULL_PERMISSIONS : permissions;

      const { error } = await supabase
        .from('system_roles')
        .update({
          is_super_admin: isSuperAdmin,
          permissions: finalPermissions,
        } as any)
        .eq('user_id', userId)
        .eq('role', 'admin');

      if (error) throw error;

      // Log to audit
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('admin_audit_logs').insert([{
          admin_id: user.id,
          action: 'admin_permissions_updated',
          entity_type: 'system_role',
          entity_id: userId,
          details: {
            is_super_admin: isSuperAdmin,
            permissions: finalPermissions,
          },
        }] as any);
      }

      toast.success('Permissions updated');
      onSaved();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update permissions');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Edit Admin Permissions
          </DialogTitle>
          <DialogDescription>
            Configure module access for this administrator
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-muted-foreground">Administrator</Label>
            <p className="font-medium">{userName || userEmail || 'Unknown User'}</p>
            {userName && userEmail && (
              <p className="text-sm text-muted-foreground">{userEmail}</p>
            )}
          </div>

          <Separator />

          <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
            <div className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-amber-500" />
              <div>
                <p className="font-medium">Super Admin</p>
                <p className="text-sm text-muted-foreground">Full access, can approve requests</p>
              </div>
            </div>
            <Switch
              checked={isSuperAdmin}
              onCheckedChange={setIsSuperAdmin}
            />
          </div>

          {isSuperAdmin && (
            <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-sm text-muted-foreground">
                Super Admins have full access to all modules and can approve/reject admin requests.
                Individual permission settings below will be ignored.
              </p>
            </div>
          )}

          {!isSuperAdmin && (
            <>
              <div className="space-y-2">
                <Label>Permission Template</Label>
                <Select value={template} onValueChange={handleTemplateChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">Standard (Basic access)</SelectItem>
                    <SelectItem value="full">Full (All permissions)</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Module Access</Label>
                <div className="grid grid-cols-2 gap-2 p-3 border rounded-lg bg-muted/30">
                  {(Object.keys(PERMISSION_LABELS) as Array<keyof AdminPermissions>).map((key) => (
                    <div key={key} className="flex items-center gap-2">
                      <Checkbox
                        id={`edit-${key}`}
                        checked={permissions[key]}
                        onCheckedChange={(checked) => handlePermissionChange(key, checked === true)}
                      />
                      <label htmlFor={`edit-${key}`} className="text-sm cursor-pointer">
                        {PERMISSION_LABELS[key]}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Permissions'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
