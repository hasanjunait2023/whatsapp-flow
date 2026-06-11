import { useState, useEffect } from 'react';
import { useTeam } from '@/hooks/useTeam';
import { useManagePermissions, TeamPermissions, DEFAULT_PERMISSIONS } from '@/hooks/useTeamPermissions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { 
  Inbox, ShoppingCart, Package, Users, MessageSquare, 
  Settings, BarChart3, FileText, AlertCircle, Wallet,
  Bot, MessagesSquare, UserCheck, Shield, Save, RotateCcw, Smartphone
} from 'lucide-react';
import { ResourceAccessManager } from './ResourceAccessManager';

interface ModulePermission {
  key: keyof TeamPermissions;
  label: string;
  icon: React.ReactNode;
  description: string;
}

interface ActionPermission {
  key: keyof TeamPermissions;
  label: string;
}

const MODULE_PERMISSIONS: ModulePermission[] = [
  { key: 'can_access_inbox', label: 'Inbox', icon: <Inbox className="h-4 w-4" />, description: 'WhatsApp conversations' },
  { key: 'can_access_orders', label: 'Orders', icon: <ShoppingCart className="h-4 w-4" />, description: 'Order management' },
  { key: 'can_access_products', label: 'Products', icon: <Package className="h-4 w-4" />, description: 'Product catalog' },
  { key: 'can_access_contacts', label: 'Contacts', icon: <Users className="h-4 w-4" />, description: 'Customer contacts' },
  { key: 'can_access_groups', label: 'Groups', icon: <MessageSquare className="h-4 w-4" />, description: 'WhatsApp groups' },
  { key: 'can_access_automation', label: 'Automation', icon: <Bot className="h-4 w-4" />, description: 'Auto-reply rules' },
  { key: 'can_access_workflows', label: 'Workflows', icon: <BarChart3 className="h-4 w-4" />, description: 'Workflow builder' },
  { key: 'can_access_analytics', label: 'Analytics', icon: <BarChart3 className="h-4 w-4" />, description: 'Performance analytics' },
  { key: 'can_access_reports', label: 'Reports', icon: <FileText className="h-4 w-4" />, description: 'Business reports' },
  { key: 'can_access_complaints', label: 'Complaints', icon: <AlertCircle className="h-4 w-4" />, description: 'Customer complaints' },
  { key: 'can_access_accounts', label: 'Accounts', icon: <Wallet className="h-4 w-4" />, description: 'Financial accounts' },
  { key: 'can_access_team', label: 'Team', icon: <UserCheck className="h-4 w-4" />, description: 'Team management' },
  { key: 'can_access_settings', label: 'Settings', icon: <Settings className="h-4 w-4" />, description: 'App settings' },
  { key: 'can_access_fb_inbox', label: 'FB Inbox', icon: <MessagesSquare className="h-4 w-4" />, description: 'Facebook messages' },
  { key: 'can_access_ai_agent', label: 'AI Agent', icon: <Bot className="h-4 w-4" />, description: 'AI assistant config' },
  { key: 'can_access_internal_chat', label: 'Team Chat', icon: <MessagesSquare className="h-4 w-4" />, description: 'Internal messaging' },
];

const ORDER_ACTIONS: ActionPermission[] = [
  { key: 'can_create_orders', label: 'Create' },
  { key: 'can_edit_orders', label: 'Edit' },
  { key: 'can_delete_orders', label: 'Delete' },
  { key: 'can_update_order_status', label: 'Update Status' },
  { key: 'can_update_payment_status', label: 'Update Payment' },
];

const PRODUCT_ACTIONS: ActionPermission[] = [
  { key: 'can_create_products', label: 'Create' },
  { key: 'can_edit_products', label: 'Edit' },
  { key: 'can_delete_products', label: 'Delete' },
];

const CONTACT_ACTIONS: ActionPermission[] = [
  { key: 'can_create_contacts', label: 'Create' },
  { key: 'can_edit_contacts', label: 'Edit' },
  { key: 'can_delete_contacts', label: 'Delete' },
  { key: 'can_assign_contacts', label: 'Assign' },
];

const MESSAGE_ACTIONS: ActionPermission[] = [
  { key: 'can_send_messages', label: 'Send' },
  { key: 'can_delete_messages', label: 'Delete' },
  { key: 'can_send_bulk_messages', label: 'Bulk Send' },
];

const DATA_ACTIONS: ActionPermission[] = [
  { key: 'can_view_revenue', label: 'View Revenue' },
  { key: 'can_export_data', label: 'Export Data' },
];

export function PermissionManager() {
  const { members, loading: teamLoading } = useTeam();
  const { templates, loading: permLoading, getMemberPermissions, updateMemberPermissions, applyTemplate } = useManagePermissions();
  
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [permissions, setPermissions] = useState<TeamPermissions>(DEFAULT_PERMISSIONS);
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);

  // Filter to only show agents (not owners/managers)
  const editableMembers = members.filter(m => m.role === 'agent');

  useEffect(() => {
    if (selectedUserId) {
      loadMemberPermissions(selectedUserId);
    }
  }, [selectedUserId]);

  const loadMemberPermissions = async (userId: string) => {
    const perms = await getMemberPermissions(userId);
    if (perms) {
      setPermissions(perms);
      setHasChanges(false);
    }
  };

  const handleToggle = (key: keyof TeamPermissions) => {
    setPermissions(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
    setHasChanges(true);
  };

  const handleApplyTemplate = async (templateId: string) => {
    if (!selectedUserId) return;
    
    try {
      await applyTemplate(selectedUserId, templateId);
      await loadMemberPermissions(selectedUserId);
      toast.success('Template applied successfully');
    } catch (error) {
      toast.error('Failed to apply template');
    }
  };

  const handleSave = async () => {
    if (!selectedUserId) return;

    setSaving(true);
    try {
      await updateMemberPermissions(selectedUserId, permissions);
      setHasChanges(false);
      toast.success('Permissions saved successfully');
    } catch (error) {
      toast.error('Failed to save permissions');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (selectedUserId) {
      loadMemberPermissions(selectedUserId);
    }
  };

  if (teamLoading || permLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
        </CardContent>
      </Card>
    );
  }

  if (editableMembers.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Shield className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">No Team Agents</h3>
          <p className="text-muted-foreground text-sm mt-1">
            Add team members with "Agent" role to manage their permissions
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Member Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Member Permissions
          </CardTitle>
          <CardDescription>
            Configure what each team member can see and do
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger className="w-full sm:w-[280px]">
                <SelectValue placeholder="Select team member" />
              </SelectTrigger>
              <SelectContent>
                {editableMembers.map(member => (
                  <SelectItem key={member.user_id} value={member.user_id}>
                    {(member.profile as any)?.full_name || 'Unknown'} 
                    <Badge variant="secondary" className="ml-2 text-xs">
                      {member.role}
                    </Badge>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedUserId && (
              <Select onValueChange={handleApplyTemplate}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="Apply template" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map(template => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                      {template.is_system && (
                        <Badge variant="outline" className="ml-2 text-xs">System</Badge>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </CardContent>
      </Card>

      {selectedUserId && (
        <>
          {/* Module Access */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Module Access</CardTitle>
              <CardDescription>Which pages can this member access</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {MODULE_PERMISSIONS.map(module => (
                  <div 
                    key={module.key}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-md bg-primary/10 text-primary">
                        {module.icon}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{module.label}</p>
                        <p className="text-xs text-muted-foreground">{module.description}</p>
                      </div>
                    </div>
                    <Switch
                      checked={permissions[module.key] as boolean}
                      onCheckedChange={() => handleToggle(module.key)}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Action Permissions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Action Permissions</CardTitle>
              <CardDescription>What actions can this member perform</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Orders */}
              <div>
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4" />
                  Orders
                </h4>
                <div className="flex flex-wrap gap-3">
                  {ORDER_ACTIONS.map(action => (
                    <label 
                      key={action.key}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer hover:bg-accent/50"
                    >
                      <Switch
                        checked={permissions[action.key] as boolean}
                        onCheckedChange={() => handleToggle(action.key)}
                        className="scale-75"
                      />
                      <span className="text-sm">{action.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Products */}
              <div>
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Products
                </h4>
                <div className="flex flex-wrap gap-3">
                  {PRODUCT_ACTIONS.map(action => (
                    <label 
                      key={action.key}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer hover:bg-accent/50"
                    >
                      <Switch
                        checked={permissions[action.key] as boolean}
                        onCheckedChange={() => handleToggle(action.key)}
                        className="scale-75"
                      />
                      <span className="text-sm">{action.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Contacts */}
              <div>
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Contacts
                </h4>
                <div className="flex flex-wrap gap-3">
                  {CONTACT_ACTIONS.map(action => (
                    <label 
                      key={action.key}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer hover:bg-accent/50"
                    >
                      <Switch
                        checked={permissions[action.key] as boolean}
                        onCheckedChange={() => handleToggle(action.key)}
                        className="scale-75"
                      />
                      <span className="text-sm">{action.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Messages */}
              <div>
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Messages
                </h4>
                <div className="flex flex-wrap gap-3">
                  {MESSAGE_ACTIONS.map(action => (
                    <label 
                      key={action.key}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer hover:bg-accent/50"
                    >
                      <Switch
                        checked={permissions[action.key] as boolean}
                        onCheckedChange={() => handleToggle(action.key)}
                        className="scale-75"
                      />
                      <span className="text-sm">{action.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Data */}
              <div>
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Data Access
                </h4>
                <div className="flex flex-wrap gap-3">
                  {DATA_ACTIONS.map(action => (
                    <label 
                      key={action.key}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer hover:bg-accent/50"
                    >
                      <Switch
                        checked={permissions[action.key] as boolean}
                        onCheckedChange={() => handleToggle(action.key)}
                        className="scale-75"
                      />
                      <span className="text-sm">{action.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Resource Access */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Smartphone className="h-4 w-4" />
                Resource Access
              </CardTitle>
              <CardDescription>
                Which WhatsApp instances and Facebook pages can this member access
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResourceAccessManager 
                userId={selectedUserId}
                userName={editableMembers.find(m => m.user_id === selectedUserId)?.profile?.full_name || 'this member'}
              />
            </CardContent>
          </Card>

          {/* Save Actions */}
          {hasChanges && (
            <div className="flex items-center justify-end gap-3 p-4 bg-muted/50 rounded-lg border sticky bottom-4">
              <p className="text-sm text-muted-foreground mr-auto">
                You have unsaved changes
              </p>
              <Button variant="outline" onClick={handleReset} disabled={saving}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Saving...' : 'Save Permissions'}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
