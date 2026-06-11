import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { apiRequest } from '@/lib/api';
import { useTenant } from '@/hooks/useTenant';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Cpu } from 'lucide-react';

// TODO i18n: hardcoded English strings

interface LlmSettings {
  provider: string | null;
  model: string | null;
  monthly_token_budget: number | null;
}

interface UsageEvent {
  id: string;
  feature: string;
  provider: string;
  model: string;
  prompt_tokens: number;
  completion_tokens: number;
  cost_usd: number;
  created_at: string;
}

function monthStartIso(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

export function AiUsageWidget() {
  const { currentTenant } = useTenant();

  const settingsQuery = useQuery({
    queryKey: ['llm-settings', currentTenant?.id],
    enabled: !!currentTenant?.id,
    queryFn: async () => {
      const { data, error } = await apiRequest<LlmSettings>('/llm-settings');
      if (error) throw new Error(error);
      return data;
    },
  });

  const usageQuery = useQuery({
    queryKey: ['llm-usage-month', currentTenant?.id],
    enabled: !!currentTenant?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('llm_usage_events')
        .select('*')
        .gte('created_at', monthStartIso())
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw new Error(error.message);
      return (data ?? []) as UsageEvent[];
    },
  });

  if (settingsQuery.isLoading || usageQuery.isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cpu className="h-5 w-5 text-primary" />
            AI Usage
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-24" />
        </CardContent>
      </Card>
    );
  }

  const events = usageQuery.data ?? [];
  const tokensUsed = events.reduce(
    (sum, event) => sum + event.prompt_tokens + event.completion_tokens,
    0,
  );
  const costUsd = events.reduce((sum, event) => sum + event.cost_usd, 0);
  const budget = settingsQuery.data?.monthly_token_budget ?? null;
  const percent = budget && budget > 0 ? Math.min(100, (tokensUsed / budget) * 100) : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Cpu className="h-5 w-5 text-primary" />
          AI Usage
        </CardTitle>
        <CardDescription>Token usage this month</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Tokens used</span>
            <span className="font-medium">
              {tokensUsed.toLocaleString()}
              {budget ? ` / ${budget.toLocaleString()}` : ''}
            </span>
          </div>
          {percent !== null ? (
            <Progress value={percent} />
          ) : (
            <p className="text-xs text-muted-foreground">No monthly budget set</p>
          )}
        </div>

        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Estimated cost</span>
          <span className="font-medium">${costUsd.toFixed(4)}</span>
        </div>

        {events.length > 0 && (
          <div className="space-y-1.5 pt-2 border-t">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Recent activity
            </p>
            {events.slice(0, 5).map((event) => (
              <div key={event.id} className="flex justify-between text-xs">
                <span className="truncate mr-2">{event.feature}</span>
                <span className="text-muted-foreground whitespace-nowrap">
                  {(event.prompt_tokens + event.completion_tokens).toLocaleString()} tok · $
                  {event.cost_usd.toFixed(4)}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
