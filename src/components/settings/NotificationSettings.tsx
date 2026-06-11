import { useState, useEffect } from 'react';
import { useTenantContext } from '@/contexts/TenantContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Send, Bell, Calendar, BarChart3, FileText, Loader2, CheckCircle, AlertTriangle, Info } from 'lucide-react';
import { toast } from 'sonner';

interface ReportSettings {
  daily_enabled: boolean;
  weekly_enabled: boolean;
  monthly_enabled: boolean;
  send_time: string;
  timezone: string;
}

interface ReportLog {
  id: string;
  report_type: string;
  status: string;
  sent_at: string | null;
  error_message: string | null;
}

export function NotificationSettings() {
  const { currentTenant, refetch } = useTenantContext();
  const [telegramChatId, setTelegramChatId] = useState('');
  const [settings, setSettings] = useState<ReportSettings>({
    daily_enabled: true,
    weekly_enabled: true,
    monthly_enabled: true,
    send_time: '20:00:00',
    timezone: 'Asia/Dhaka',
  });
  const [recentLogs, setRecentLogs] = useState<ReportLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sendingTest, setSendingTest] = useState<string | null>(null);

  useEffect(() => {
    if (currentTenant) {
      loadSettings();
    }
  }, [currentTenant?.id]);

  const loadSettings = async () => {
    if (!currentTenant) return;
    
    setLoading(true);
    try {
      // Fetch tenant settings from database to get telegram_chat_id
      const { data: tenantData } = await supabase
        .from('tenants')
        .select('settings')
        .eq('id', currentTenant.id)
        .single();
      
      const tenantSettings = (tenantData?.settings as Record<string, unknown>) || {};
      setTelegramChatId((tenantSettings.telegram_chat_id as string) || '');

      // Load report settings
      const { data: reportSettings } = await supabase
        .from('scheduled_report_settings')
        .select('*')
        .eq('tenant_id', currentTenant.id)
        .single();

      if (reportSettings) {
        setSettings({
          daily_enabled: reportSettings.daily_enabled,
          weekly_enabled: reportSettings.weekly_enabled,
          monthly_enabled: reportSettings.monthly_enabled,
          send_time: reportSettings.send_time,
          timezone: reportSettings.timezone,
        });
      }

      // Load recent logs
      const { data: logs } = await supabase
        .from('scheduled_report_logs')
        .select('id, report_type, status, sent_at, error_message')
        .eq('tenant_id', currentTenant.id)
        .order('created_at', { ascending: false })
        .limit(5);

      setRecentLogs(logs || []);
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveTelegramChatId = async () => {
    if (!currentTenant) return;
    
    setSaving(true);
    try {
      // First fetch current settings from DB
      const { data: tenantData } = await supabase
        .from('tenants')
        .select('settings')
        .eq('id', currentTenant.id)
        .single();
      
      const currentSettings = (tenantData?.settings as Record<string, unknown>) || {};
      const newSettings = { ...currentSettings, telegram_chat_id: telegramChatId };

      const { error } = await supabase
        .from('tenants')
        .update({ settings: newSettings })
        .eq('id', currentTenant.id);

      if (error) throw error;

      // Upsert report settings
      const { error: settingsError } = await supabase
        .from('scheduled_report_settings')
        .upsert({
          tenant_id: currentTenant.id,
          ...settings,
        }, { onConflict: 'tenant_id' });

      if (settingsError) throw settingsError;

      await refetch?.();
      toast.success('সেটিংস সংরক্ষিত হয়েছে');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('সেটিংস সংরক্ষণে সমস্যা হয়েছে');
    } finally {
      setSaving(false);
    }
  };

  const toggleReport = async (type: 'daily' | 'weekly' | 'monthly') => {
    const newSettings = {
      ...settings,
      [`${type}_enabled`]: !settings[`${type}_enabled`],
    };
    setSettings(newSettings);

    if (!currentTenant) return;

    try {
      const { error } = await supabase
        .from('scheduled_report_settings')
        .upsert({
          tenant_id: currentTenant.id,
          ...newSettings,
        }, { onConflict: 'tenant_id' });

      if (error) throw error;
      toast.success(`${type === 'daily' ? 'দৈনিক' : type === 'weekly' ? 'সাপ্তাহিক' : 'মাসিক'} রিপোর্ট ${newSettings[`${type}_enabled`] ? 'চালু' : 'বন্ধ'} করা হয়েছে`);
    } catch (error) {
      console.error('Error toggling report:', error);
      setSettings(settings); // Revert
      toast.error('সমস্যা হয়েছে');
    }
  };

  const sendTestReport = async (type: 'daily' | 'weekly' | 'monthly') => {
    if (!telegramChatId) {
      toast.error('প্রথমে Telegram Chat ID সেভ করুন');
      return;
    }

    setSendingTest(type);
    try {
      const functionName = `send-${type}-report`;
      const { data, error } = await supabase.functions.invoke(functionName, {
        body: { test: true, tenant_id: currentTenant?.id }
      });

      if (error) throw error;

      toast.success(`${type === 'daily' ? 'দৈনিক' : type === 'weekly' ? 'সাপ্তাহিক' : 'মাসিক'} টেস্ট রিপোর্ট পাঠানো হয়েছে`);
      loadSettings(); // Refresh logs
    } catch (error) {
      console.error('Error sending test report:', error);
      toast.error('রিপোর্ট পাঠাতে সমস্যা হয়েছে');
    } finally {
      setSendingTest(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return <Badge variant="default" className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" /> পাঠানো হয়েছে</Badge>;
      case 'failed':
        return <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" /> ব্যর্থ</Badge>;
      case 'skipped':
        return <Badge variant="secondary">স্কিপ</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getReportTypeName = (type: string) => {
    switch (type) {
      case 'daily': return 'দৈনিক';
      case 'weekly': return 'সাপ্তাহিক';
      case 'monthly': return 'মাসিক';
      default: return type;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-[200px] w-full" />
        <Skeleton className="h-[300px] w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Telegram Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5 text-blue-500" />
            Telegram নোটিফিকেশন
          </CardTitle>
          <CardDescription>
            আপনার ব্যবসার দৈনিক/সাপ্তাহিক/মাসিক রিপোর্ট Telegram এ পেতে Chat ID দিন
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>Chat ID কিভাবে পাবেন:</strong>
              <ol className="list-decimal ml-4 mt-2 space-y-1">
                <li>Telegram এ @userinfobot কে মেসেজ করুন</li>
                <li>আপনার Chat ID কপি করুন</li>
                <li>গ্রুপের জন্য @RawDataBot ব্যবহার করুন</li>
              </ol>
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label>Telegram Chat ID</Label>
            <div className="flex gap-2">
              <Input
                placeholder="123456789"
                value={telegramChatId}
                onChange={(e) => setTelegramChatId(e.target.value)}
              />
              <Button onClick={saveTelegramChatId} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'সেভ করুন'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Report Toggles */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            স্বয়ংক্রিয় রিপোর্ট
          </CardTitle>
          <CardDescription>
            প্রতিদিন রাত ৮:০০ টায় (BST) রিপোর্ট পাঠানো হবে
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Daily Report */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-green-500" />
              <div>
                <p className="font-medium">দৈনিক রিপোর্ট</p>
                <p className="text-sm text-muted-foreground">প্রতিদিন রাত ৮টায় সংক্ষিপ্ত সারসংক্ষেপ</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => sendTestReport('daily')}
                disabled={sendingTest === 'daily' || !telegramChatId}
              >
                {sendingTest === 'daily' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'টেস্ট'}
              </Button>
              <Switch
                checked={settings.daily_enabled}
                onCheckedChange={() => toggleReport('daily')}
              />
            </div>
          </div>

          {/* Weekly Report */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <BarChart3 className="h-5 w-5 text-blue-500" />
              <div>
                <p className="font-medium">সাপ্তাহিক রিপোর্ট</p>
                <p className="text-sm text-muted-foreground">প্রতি রবিবার রাত ৮টায় বিস্তারিত বিশ্লেষণ</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => sendTestReport('weekly')}
                disabled={sendingTest === 'weekly' || !telegramChatId}
              >
                {sendingTest === 'weekly' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'টেস্ট'}
              </Button>
              <Switch
                checked={settings.weekly_enabled}
                onCheckedChange={() => toggleReport('weekly')}
              />
            </div>
          </div>

          {/* Monthly Report */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-purple-500" />
              <div>
                <p className="font-medium">মাসিক রিপোর্ট</p>
                <p className="text-sm text-muted-foreground">প্রতি মাসের ১ তারিখে পূর্ণ আর্থিক বিশ্লেষণ</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => sendTestReport('monthly')}
                disabled={sendingTest === 'monthly' || !telegramChatId}
              >
                {sendingTest === 'monthly' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'টেস্ট'}
              </Button>
              <Switch
                checked={settings.monthly_enabled}
                onCheckedChange={() => toggleReport('monthly')}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Reports Log */}
      {recentLogs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">সাম্প্রতিক রিপোর্ট</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentLogs.map((log) => (
                <div key={log.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">{getReportTypeName(log.report_type)}</Badge>
                    {log.sent_at && (
                      <span className="text-sm text-muted-foreground">
                        {new Date(log.sent_at).toLocaleString('bn-BD')}
                      </span>
                    )}
                  </div>
                  {getStatusBadge(log.status)}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
