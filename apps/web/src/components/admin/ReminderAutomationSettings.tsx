import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Clock, Mail, MessageSquare, Bell, Save, RefreshCw } from 'lucide-react';
import { useReminderSettings, ReminderSetting } from '@/hooks/useReminderSettings';
import { useMessageTemplates } from '@/hooks/useMessageTemplates';
import { toast } from 'sonner';

const REMINDER_TYPE_LABELS: Record<string, { label: string; description: string; icon: typeof Clock }> = {
  expiry_warning: {
    label: 'Subscription Expiring',
    description: 'Send reminders before subscription expires',
    icon: Clock,
  },
  payment_overdue: {
    label: 'Payment Overdue',
    description: 'Send reminders after payment is overdue',
    icon: Bell,
  },
  trial_ending: {
    label: 'Trial Ending',
    description: 'Send reminders before trial expires',
    icon: Clock,
  },
};

export default function ReminderAutomationSettings() {
  const { settings, loading, updateSetting, toggleActive, refetch } = useReminderSettings();
  const { templates } = useMessageTemplates();
  const [saving, setSaving] = useState<string | null>(null);
  const [editingDays, setEditingDays] = useState<Record<string, string>>({});

  const whatsappTemplates = templates.filter(
    (t) => t.channel === 'whatsapp' || t.channel === 'both'
  );

  const handleToggle = async (setting: ReminderSetting) => {
    setSaving(setting.id);
    try {
      await toggleActive(setting.id, !setting.is_active);
      toast.success(`Reminder ${setting.is_active ? 'disabled' : 'enabled'}`);
    } catch {
      toast.error('Failed to update setting');
    } finally {
      setSaving(null);
    }
  };

  const handleChannelChange = async (setting: ReminderSetting, channel: string) => {
    setSaving(setting.id);
    try {
      await updateSetting(setting.id, { channel: channel as 'email' | 'whatsapp' | 'both' });
      toast.success('Channel updated');
    } catch {
      toast.error('Failed to update channel');
    } finally {
      setSaving(null);
    }
  };

  const handleTemplateChange = async (setting: ReminderSetting, templateId: string) => {
    setSaving(setting.id);
    try {
      await updateSetting(setting.id, { template_id: templateId === 'none' ? null : templateId });
      toast.success('Template updated');
    } catch {
      toast.error('Failed to update template');
    } finally {
      setSaving(null);
    }
  };

  const handleDaysChange = async (setting: ReminderSetting) => {
    const daysString = editingDays[setting.id];
    if (!daysString) return;

    const days = daysString
      .split(',')
      .map((d) => parseInt(d.trim()))
      .filter((d) => !isNaN(d) && d > 0);

    if (days.length === 0) {
      toast.error('Please enter valid day numbers');
      return;
    }

    setSaving(setting.id);
    try {
      await updateSetting(setting.id, { days_offset: days });
      toast.success('Days updated');
      setEditingDays((prev) => ({ ...prev, [setting.id]: '' }));
    } catch {
      toast.error('Failed to update days');
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>Automated Reminders</CardTitle>
              <CardDescription>
                Configure automatic email and WhatsApp reminders for subscriptions
              </CardDescription>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {settings.map((setting) => {
          const config = REMINDER_TYPE_LABELS[setting.reminder_type] || {
            label: setting.reminder_type,
            description: '',
            icon: Clock,
          };
          const Icon = config.icon;

          return (
            <Card key={setting.id} className={setting.is_active ? 'border-primary/20' : 'opacity-60'}>
              <CardContent className="p-4 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-medium">{config.label}</h4>
                      <p className="text-sm text-muted-foreground">{config.description}</p>
                    </div>
                  </div>
                  <Switch
                    checked={setting.is_active}
                    onCheckedChange={() => handleToggle(setting)}
                    disabled={saving === setting.id}
                  />
                </div>

                {setting.is_active && (
                  <div className="grid gap-4 sm:grid-cols-3 pt-2 border-t">
                    {/* Channel */}
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Channel</Label>
                      <Select
                        value={setting.channel}
                        onValueChange={(v) => handleChannelChange(setting, v)}
                        disabled={saving === setting.id}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="email">
                            <div className="flex items-center gap-2">
                              <Mail className="h-4 w-4" />
                              Email Only
                            </div>
                          </SelectItem>
                          <SelectItem value="whatsapp">
                            <div className="flex items-center gap-2">
                              <MessageSquare className="h-4 w-4" />
                              WhatsApp Only
                            </div>
                          </SelectItem>
                          <SelectItem value="both">
                            <div className="flex items-center gap-2">
                              <Bell className="h-4 w-4" />
                              Both
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Template */}
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">WhatsApp Template</Label>
                      <Select
                        value={setting.template_id || 'none'}
                        onValueChange={(v) => handleTemplateChange(setting, v)}
                        disabled={saving === setting.id}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select template" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Default</SelectItem>
                          {whatsappTemplates.map((t) => (
                            <SelectItem key={t.id} value={t.id}>
                              {t.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Days */}
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Days (comma separated)</Label>
                      <div className="flex gap-2">
                        <Input
                          placeholder={setting.days_offset.join(', ')}
                          value={editingDays[setting.id] || ''}
                          onChange={(e) =>
                            setEditingDays((prev) => ({
                              ...prev,
                              [setting.id]: e.target.value,
                            }))
                          }
                          disabled={saving === setting.id}
                        />
                        {editingDays[setting.id] && (
                          <Button
                            size="icon"
                            variant="outline"
                            onClick={() => handleDaysChange(setting)}
                            disabled={saving === setting.id}
                          >
                            <Save className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {setting.days_offset.map((d) => (
                          <Badge key={d} variant="secondary" className="text-xs">
                            {d} days
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </CardContent>
    </Card>
  );
}
