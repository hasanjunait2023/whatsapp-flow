import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/useTenant';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { FileText, Lightbulb, Loader2 } from 'lucide-react';

// TODO i18n: hardcoded English strings

interface CeoReportRow {
  id: string;
  type: string;
  status: string;
  content_md: string | null;
  error: string | null;
  created_at: string;
  sent_at: string | null;
}

const POLL_WINDOW_MS = 90_000;
const POLL_INTERVAL_MS = 5000;

const TYPE_LABELS: Record<string, string> = {
  daily: 'Daily report',
  weekly: 'Weekly report',
  marketing_ideas: 'Marketing ideas',
  adhoc: 'Ad-hoc report',
};

function statusVariant(status: string): 'default' | 'secondary' | 'outline' | 'destructive' {
  if (status === 'error') return 'destructive';
  if (status === 'generating' || status === 'pending') return 'outline';
  return 'default';
}

export function CeoReportsCard() {
  const { currentTenant } = useTenant();
  const { toast } = useToast();
  const [pollUntil, setPollUntil] = useState(0);

  const reportsQuery = useQuery({
    queryKey: ['ceo-reports', currentTenant?.id],
    enabled: !!currentTenant?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ceo_reports')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw new Error(error.message);
      return (data ?? []) as CeoReportRow[];
    },
    refetchInterval: (query) => {
      const hasGenerating = query.state.data?.some(
        (report) => report.status === 'generating' || report.status === 'pending',
      );
      if (hasGenerating || Date.now() < pollUntil) return POLL_INTERVAL_MS;
      return false;
    },
  });

  const runMutation = useMutation({
    mutationFn: async (type: 'daily' | 'weekly' | 'marketing_ideas' | 'adhoc') => {
      const { data, error } = await supabase.functions.invoke<{ job_id: string; status: string }>(
        'ceo-run-now',
        { body: { type } },
      );
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: 'Report queued',
        description: 'The report will appear below within about 30 seconds.',
      });
      setPollUntil(Date.now() + POLL_WINDOW_MS);
      void reportsQuery.refetch();
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to queue report', description: error.message, variant: 'destructive' });
    },
  });

  const reports = reportsQuery.data ?? [];

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 flex-wrap gap-3">
        <div>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Reports
          </CardTitle>
          <CardDescription>Generated business reports and marketing ideas</CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => runMutation.mutate('marketing_ideas')}
            disabled={runMutation.isPending}
          >
            <Lightbulb className="h-4 w-4 mr-2" />
            Marketing ideas
          </Button>
          <Button
            size="sm"
            onClick={() => runMutation.mutate('daily')}
            disabled={runMutation.isPending}
          >
            {runMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <FileText className="h-4 w-4 mr-2" />
            )}
            Generate report now
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {reportsQuery.isLoading ? (
          <Skeleton className="h-40" />
        ) : reports.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No reports yet. Generate your first report above.
          </p>
        ) : (
          <Accordion type="single" collapsible className="w-full">
            {reports.map((report) => (
              <AccordionItem key={report.id} value={report.id}>
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3 text-left">
                    <Badge variant={statusVariant(report.status)}>{report.status}</Badge>
                    <span className="font-medium">
                      {TYPE_LABELS[report.type] ?? report.type}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {new Date(report.created_at).toLocaleString()}
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  {report.status === 'error' ? (
                    <p className="text-sm text-destructive">{report.error || 'Generation failed.'}</p>
                  ) : report.content_md ? (
                    <pre className="whitespace-pre-wrap font-sans text-sm bg-muted/40 rounded-lg p-4 max-h-[400px] overflow-y-auto">
                      {report.content_md}
                    </pre>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 inline mr-2 animate-spin" />
                      Still generating...
                    </p>
                  )}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </CardContent>
    </Card>
  );
}
