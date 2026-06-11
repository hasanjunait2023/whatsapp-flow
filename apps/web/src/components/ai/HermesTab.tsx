import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/useTenant';
import { useToast } from '@/hooks/use-toast';
import { AgentPlayground } from '@/components/ai/AgentPlayground';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Activity, Loader2, Save, Settings2 } from 'lucide-react';

// TODO i18n: hardcoded English strings

interface HermesConfigRow {
  id: string;
  enabled: boolean;
  reply_delay_ms: number;
  escalation_keywords: string[] | null;
  max_turns_before_handoff: number | null;
}

interface AgentRunRow {
  id: string;
  agent: string;
  status: string;
  input_preview: string | null;
  output_preview: string | null;
  prompt_tokens: number;
  completion_tokens: number;
  latency_ms: number | null;
  error: string | null;
  created_at: string;
}

export function HermesTab() {
  const { currentTenant } = useTenant();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [enabled, setEnabled] = useState(false);
  const [replyDelaySeconds, setReplyDelaySeconds] = useState(8);
  const [keywords, setKeywords] = useState('');
  const [maxTurns, setMaxTurns] = useState(10);
  const [saving, setSaving] = useState(false);

  const configQuery = useQuery({
    queryKey: ['hermes-config', currentTenant?.id],
    enabled: !!currentTenant?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agent_configs')
        .select('*')
        .eq('agent', 'hermes')
        .maybeSingle();
      if (error) throw new Error(error.message);
      return (data ?? null) as HermesConfigRow | null;
    },
  });

  const runsQuery = useQuery({
    queryKey: ['hermes-runs', currentTenant?.id],
    enabled: !!currentTenant?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agent_runs')
        .select('*')
        .eq('agent', 'hermes')
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw new Error(error.message);
      return (data ?? []) as AgentRunRow[];
    },
  });

  // Seed local form state from the loaded config.
  useEffect(() => {
    const config = configQuery.data;
    if (config) {
      setEnabled(config.enabled);
      setReplyDelaySeconds(Math.round((config.reply_delay_ms ?? 8000) / 1000));
      setKeywords((config.escalation_keywords ?? []).join(', '));
      setMaxTurns(config.max_turns_before_handoff ?? 10);
    }
  }, [configQuery.data]);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('agent_configs')
      .upsert(
        {
          agent: 'hermes',
          enabled,
          reply_delay_ms: Math.max(0, replyDelaySeconds) * 1000,
          escalation_keywords: keywords
            .split(',')
            .map((k) => k.trim())
            .filter(Boolean),
          max_turns_before_handoff: maxTurns,
        },
        { onConflict: 'tenant_id,agent' },
      );
    setSaving(false);

    if (error) {
      toast({ title: 'Error', description: 'Failed to save Hermes settings.', variant: 'destructive' });
    } else {
      toast({ title: 'Settings saved', description: 'Hermes configuration has been updated.' });
      void queryClient.invalidateQueries({ queryKey: ['hermes-config', currentTenant?.id] });
    }
  };

  if (configQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-64" />
        <Skeleton className="h-72" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-primary" />
            Hermes Support Agent
          </CardTitle>
          <CardDescription>
            Hermes replies to customer messages automatically using your approved agent soul.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="space-y-0.5">
              <Label className="text-base">Enable Hermes</Label>
              <p className="text-sm text-muted-foreground">
                Automatically reply to incoming customer messages
              </p>
            </div>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="hermes-delay">Reply delay (seconds)</Label>
              <Input
                id="hermes-delay"
                type="number"
                min={0}
                max={120}
                value={replyDelaySeconds}
                onChange={(e) => setReplyDelaySeconds(Number(e.target.value) || 0)}
              />
              <p className="text-xs text-muted-foreground">
                Wait before replying so responses feel natural
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="hermes-max-turns">Max turns before handoff</Label>
              <Input
                id="hermes-max-turns"
                type="number"
                min={1}
                max={50}
                value={maxTurns}
                onChange={(e) => setMaxTurns(Number(e.target.value) || 1)}
              />
              <p className="text-xs text-muted-foreground">
                Hand off to a human after this many AI replies in one conversation
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="hermes-keywords">Escalation keywords</Label>
            <Input
              id="hermes-keywords"
              placeholder="refund, complaint, manager"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Comma-separated. Messages containing these are escalated to a human immediately.
            </p>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Hermes Settings
            </Button>
          </div>
        </CardContent>
      </Card>

      <AgentPlayground />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Recent runs
          </CardTitle>
          <CardDescription>The latest Hermes invocations and their outcomes</CardDescription>
        </CardHeader>
        <CardContent>
          {runsQuery.isLoading ? (
            <Skeleton className="h-32" />
          ) : !runsQuery.data || runsQuery.data.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No runs yet. Test the agent in the playground above.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Input</TableHead>
                  <TableHead>Output</TableHead>
                  <TableHead className="text-right">Tokens</TableHead>
                  <TableHead className="text-right">Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {runsQuery.data.map((run) => (
                  <TableRow key={run.id}>
                    <TableCell>
                      <Badge
                        variant={
                          run.status === 'error'
                            ? 'destructive'
                            : run.status === 'handoff'
                              ? 'outline'
                              : 'default'
                        }
                      >
                        {run.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-sm">
                      {run.input_preview || '—'}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-sm">
                      {run.error || run.output_preview || '—'}
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {run.prompt_tokens + run.completion_tokens}
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground whitespace-nowrap">
                      {new Date(run.created_at).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
