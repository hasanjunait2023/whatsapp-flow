import { useState } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import { useAdminSettings } from '@/hooks/useAdminSettings';
import ReminderAutomationSettings from '@/components/admin/ReminderAutomationSettings';
import WebhookSecretManager from '@/components/admin/WebhookSecretManager';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, AlertTriangle, Megaphone, Bell, Cog, Webhook, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminSettings() {
  const { settings, loading, updateSetting } = useAdminSettings();
  const [saving, setSaving] = useState<string | null>(null);

  const handleToggle = async (key: string, currentValue: boolean) => {
    setSaving(key);
    try {
      await updateSetting(key, !currentValue);
      toast.success(`${key.replace(/_/g, ' ')} updated`);
    } catch {
      toast.error('Failed to update setting');
    } finally {
      setSaving(null);
    }
  };

  const handleSave = async (key: string, value: unknown) => {
    setSaving(key);
    try {
      await updateSetting(key, value);
      toast.success('Setting saved');
    } catch {
      toast.error('Failed to save setting');
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="p-6 space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-[200px] w-full" />
          <Skeleton className="h-[200px] w-full" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">System Settings</h1>
          <p className="text-muted-foreground">Configure global system settings and automated reminders</p>
        </div>

        <Tabs defaultValue="general" className="space-y-6">
          <TabsList>
            <TabsTrigger value="general">
              <Cog className="h-4 w-4 mr-2" />
              General
            </TabsTrigger>
            <TabsTrigger value="whatsapp">
              <MessageSquare className="h-4 w-4 mr-2" />
              WhatsApp
            </TabsTrigger>
            <TabsTrigger value="integrations">
              <Webhook className="h-4 w-4 mr-2" />
              Integrations
            </TabsTrigger>
            <TabsTrigger value="reminders">
              <Bell className="h-4 w-4 mr-2" />
              Automated Reminders
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-6">
            {/* Maintenance Mode */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  <div>
                    <CardTitle>Maintenance Mode</CardTitle>
                    <CardDescription>
                      When enabled, users will see a maintenance message
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Enable Maintenance Mode</Label>
                    <p className="text-sm text-muted-foreground">
                      Users will be unable to access the application
                    </p>
                  </div>
                  <Switch
                    checked={settings.maintenance_mode || false}
                    onCheckedChange={() => handleToggle('maintenance_mode', settings.maintenance_mode || false)}
                    disabled={saving === 'maintenance_mode'}
                  />
                </div>
                
                {settings.maintenance_mode && (
                  <Alert className="bg-yellow-500/10 border-yellow-500/20">
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    <AlertDescription className="text-yellow-600">
                      Maintenance mode is active. Users cannot access the application.
                    </AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label>Maintenance Message</Label>
                  <Textarea
                    placeholder="We're performing scheduled maintenance. Please check back soon."
                    defaultValue={settings.maintenance_message || ''}
                    onBlur={(e) => handleSave('maintenance_message', e.target.value)}
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Announcement Banner */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Megaphone className="h-5 w-5 text-primary" />
                  <div>
                    <CardTitle>Announcement Banner</CardTitle>
                    <CardDescription>
                      Display a global announcement to all users
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Show Announcement</Label>
                    <p className="text-sm text-muted-foreground">
                      Display announcement banner in the app
                    </p>
                  </div>
                  <Switch
                    checked={settings.announcement_enabled || false}
                    onCheckedChange={() => handleToggle('announcement_enabled', settings.announcement_enabled || false)}
                    disabled={saving === 'announcement_enabled'}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Announcement Message</Label>
                  <Textarea
                    placeholder="Enter your announcement message..."
                    defaultValue={settings.announcement_banner || ''}
                    onBlur={(e) => handleSave('announcement_banner', e.target.value)}
                    rows={2}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Default Settings */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Settings className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <CardTitle>Default Settings</CardTitle>
                    <CardDescription>
                      Configure defaults for new tenants
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Default Trial Days</Label>
                    <Input
                      type="number"
                      placeholder="14"
                      defaultValue={settings.default_trial_days || 14}
                      onBlur={(e) => handleSave('default_trial_days', parseInt(e.target.value) || 14)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Number of days for new tenant trials
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Grace Period Days</Label>
                    <Input
                      type="number"
                      placeholder="7"
                      defaultValue={settings.grace_period_days || 7}
                      onBlur={(e) => handleSave('grace_period_days', parseInt(e.target.value) || 7)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Days after payment due before suspension
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Support Email</Label>
                  <Input
                    type="email"
                    placeholder="support@example.com"
                    defaultValue={settings.support_email || ''}
                    onBlur={(e) => handleSave('support_email', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Contact email displayed to users for support
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="whatsapp" className="space-y-6">
            {/* WhatsApp Auto Messages Global Control */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-purple-500" />
                  <div>
                    <CardTitle>Follow-up Automation</CardTitle>
                    <CardDescription>
                      Control automated follow-up messages for Pro plan tenants
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Enable Follow-up System</Label>
                    <p className="text-sm text-muted-foreground">
                      When enabled, Pro plan tenants can send automated follow-up messages
                    </p>
                  </div>
                  <Switch
                    checked={settings.whatsapp_followup_enabled || false}
                    onCheckedChange={() => handleToggle('whatsapp_followup_enabled', settings.whatsapp_followup_enabled || false)}
                    disabled={saving === 'whatsapp_followup_enabled'}
                  />
                </div>
                
                {settings.whatsapp_followup_enabled && (
                  <Alert className="bg-green-500/10 border-green-500/20">
                    <MessageSquare className="h-4 w-4 text-green-500" />
                    <AlertDescription className="text-green-600">
                      Follow-up system is active. Pro plan tenants can configure follow-up messages.
                    </AlertDescription>
                  </Alert>
                )}

                {!settings.whatsapp_followup_enabled && (
                  <Alert className="bg-yellow-500/10 border-yellow-500/20">
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    <AlertDescription className="text-yellow-600">
                      Follow-up system is disabled. No follow-up messages will be sent.
                    </AlertDescription>
                  </Alert>
                )}

                <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
                  <strong>Note:</strong> Welcome and Away messages are always available to all tenants. This toggle only controls the follow-up automation feature.
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="integrations" className="space-y-6">
            <WebhookSecretManager />
          </TabsContent>

          <TabsContent value="reminders">
            <ReminderAutomationSettings />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
