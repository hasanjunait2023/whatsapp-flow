import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/useTenant';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CalendarClock, Loader2, Save } from 'lucide-react';

// TODO i18n: hardcoded English strings

interface ScheduleRow {
  id: string;
  report_type: string;
  cadence: string;
  hour_utc: number;
  enabled: boolean;
}

interface ScheduleDraft {
  enabled: boolean;
  hourUtc: number;
}

const HOURS = Array.from({ length: 24 }, (_, hour) => hour);

const DEFAULT_DRAFTS: Record<'daily' | 'weekly', ScheduleDraft> = {
  daily: { enabled: false, hourUtc: 9 },
  weekly: { enabled: false, hourUtc: 9 },
};

export function CeoScheduleCard() {
  const { currentTenant } = useTenant();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [drafts, setDrafts] = useState(DEFAULT_DRAFTS);
  const [saving, setSaving] = useState(false);

  const queryKey = ['ceo-schedules', currentTenant?.id];

  const schedulesQuery = useQuery({
    queryKey,
    enabled: !!currentTenant?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agent_schedules')
        .select('*')
        .eq('agent', 'ceo');
      if (error) throw new Error(error.message);
      return (data ?? []) as ScheduleRow[];
    },
  });

  useEffect(() => {
    const rows = schedulesQuery.data;
    if (!rows) return;
    setDrafts((prev) => {
      const next = { ...prev };
      for (const type of ['daily', 'weekly'] as const) {
        const row = rows.find((r) => r.report_type === type);
        if (row) {
          next[type] = { enabled: row.enabled, hourUtc: row.hour_utc };
        }
      }
      return next;
    });
  }, [schedulesQuery.data]);

  const handleSave = async () => {
    setSaving(true);
    let failed = false;
    for (const type of ['daily', 'weekly'] as const) {
      const draft = drafts[type];
      const { error } = await supabase.from('agent_schedules').upsert(
        {
          agent: 'ceo',
          report_type: type,
          cadence: type,
          hour_utc: draft.hourUtc,
          enabled: draft.enabled,
        },
        { onConflict: 'tenant_id,agent,report_type' },
      );
      if (error) failed = true;
    }
    setSaving(false);

    if (failed) {
      toast({ title: 'Error', description: 'Failed to save schedule.', variant: 'destructive' });
    } else {
      toast({ title: 'Schedule saved', description: 'Report schedule has been updated.' });
      void queryClient.invalidateQueries({ queryKey });
    }
  };

  const renderRow = (type: 'daily' | 'weekly', label: string, description: string) => {
    const draft = drafts[type];
    return (
      <div className="flex items-center justify-between gap-4 p-4 border rounded-lg flex-wrap">
        <div className="space-y-0.5">
          <Label className="text-base">{label}</Label>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="flex items-center gap-3">
          <Select
            value={String(draft.hourUtc)}
            onValueChange={(value) =>
              setDrafts({ ...drafts, [type]: { ...draft, hourUtc: Number(value) } })
            }
            disabled={!draft.enabled}
          >
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {HOURS.map((hour) => (
                <SelectItem key={hour} value={String(hour)}>
                  {String(hour).padStart(2, '0')}:00 UTC
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Switch
            checked={draft.enabled}
            onCheckedChange={(checked) =>
              setDrafts({ ...drafts, [type]: { ...draft, enabled: checked } })
            }
          />
        </div>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarClock className="h-5 w-5 text-primary" />
          Report schedule
        </CardTitle>
        <CardDescription>When the CEO agent generates and sends reports</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {schedulesQuery.isLoading ? (
          <Skeleton className="h-32" />
        ) : (
          <>
            {renderRow('daily', 'Daily report', 'A snapshot of yesterday, every day')}
            {renderRow('weekly', 'Weekly report', 'A deeper review of the last 7 days')}
            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save Schedule
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
