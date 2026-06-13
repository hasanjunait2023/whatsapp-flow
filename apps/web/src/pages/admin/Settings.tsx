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
import { m, pageEnter } from '@/lib/motion';
import { Settings, AlertTriangle, Megaphone, Bell, Cog, Webhook, MessageSquare } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { toast } from 'sonner';

const ADMIN_SETTINGS_TABS = [
  { value: 'general', label: 'General', icon: Cog },
  { value: 'whatsapp', label: 'WhatsApp', icon: MessageSquare },
  { value: 'integrations', label: 'Integrations', icon: Webhook },
  { value: 'reminders', label: 'Automated Reminders', icon: Bell },
] as const;

/** Calm tokenised section header — soft icon chip + title/description, no orange focal. */
function SectionHeader({
  icon: Icon,
  tone,
  title,
  description,
}: {
  icon: LucideIcon;
  tone: 'warning' | 'info' | 'neutral';
  title: string;
  description: string;
}) {
  const toneClass: Record<typeof tone, string> = {
    warning: 'bg-warning-soft text-warning',
    info: 'bg-info-soft text-info',
    neutral: 'bg-muted-soft text-muted-foreground',
  };

  return (
    <CardHeader>
      <div className="flex items-start gap-3">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${toneClass[tone]}`}>
          <Icon className="h-5 w-5" aria-hidden />
        </span>
        <div className="space-y-1">
          <CardTitle className="text-base">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
      </div>
    </CardHeader>
  );
}

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
        <div className="mx-auto w-full max-w-[1440px] space-y-6 p-4 md:p-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-full max-w-md rounded-full" />
          <Skeleton className="h-[200px] w-full rounded-card" />
          <Skeleton className="h-[200px] w-full rounded-card" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <m.div
        variants={pageEnter}
        initial="hidden"
        animate="show"
        className="mx-auto w-full max-w-[1440px] space-y-6 p-4 md:p-6"
      >
        {/* Header */}
        <header className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">System Settings</h1>
          <p className="text-sm text-muted-foreground">
            Configure global system settings and automated reminders
          </p>
        </header>

        <Tabs defaultValue="general" className="space-y-6">
          {/* Pill tab-track — horizontal scroll on small screens, no wrap, no page overflow. */}
          <div className="-mx-4 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:px-0">
            <TabsList className="w-max">
              {ADMIN_SETTINGS_TABS.map(({ value, label, icon: Icon }) => (
                <TabsTrigger key={value} value={value} className="h-11 gap-2 sm:h-9">
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{label}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <TabsContent value="general" className="space-y-6">
            {/* Maintenance Mode */}
            <Card className="shadow-elevation-1">
              <SectionHeader
                icon={AlertTriangle}
                tone="warning"
                title="Maintenance Mode"
                description="When enabled, users will see a maintenance message"
              />
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between gap-4">
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
                  <Alert className="border-transparent bg-warning-soft">
                    <AlertTriangle className="h-4 w-4 text-warning" />
                    <AlertDescription className="text-warning">
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
            <Card className="shadow-elevation-1">
              <SectionHeader
                icon={Megaphone}
                tone="info"
                title="Announcement Banner"
                description="Display a global announcement to all users"
              />
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between gap-4">
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
            <Card className="shadow-elevation-1">
              <SectionHeader
                icon={Settings}
                tone="neutral"
                title="Default Settings"
                description="Configure defaults for new tenants"
              />
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Default Trial Days</Label>
                    <Input
                      type="number"
                      placeholder="14"
                      defaultValue={settings.default_trial_days || 14}
                      onBlur={(e) => handleSave('default_trial_days', parseInt(e.target.value) || 14)}
                      className="tabular-nums"
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
                      className="tabular-nums"
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
            <Card className="shadow-elevation-1">
              <SectionHeader
                icon={MessageSquare}
                tone="info"
                title="Follow-up Automation"
                description="Control automated follow-up messages for Pro plan tenants"
              />
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between gap-4">
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
                  <Alert className="border-transparent bg-success-soft">
                    <MessageSquare className="h-4 w-4 text-success" />
                    <AlertDescription className="text-success">
                      Follow-up system is active. Pro plan tenants can configure follow-up messages.
                    </AlertDescription>
                  </Alert>
                )}

                {!settings.whatsapp_followup_enabled && (
                  <Alert className="border-transparent bg-warning-soft">
                    <AlertTriangle className="h-4 w-4 text-warning" />
                    <AlertDescription className="text-warning">
                      Follow-up system is disabled. No follow-up messages will be sent.
                    </AlertDescription>
                  </Alert>
                )}

                <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
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
      </m.div>
    </AdminLayout>
  );
}
