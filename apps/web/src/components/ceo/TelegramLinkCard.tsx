import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/useTenant';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle2, ExternalLink, Loader2, Send, Unlink } from 'lucide-react';

// TODO i18n: hardcoded English strings

interface LinkStatus {
  linked: boolean;
  pending: boolean;
}

interface LinkStart {
  link_code: string;
  deep_link: string;
  expires_at: string;
}

export function TelegramLinkCard() {
  const { currentTenant } = useTenant();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [pendingLink, setPendingLink] = useState<LinkStart | null>(null);

  const queryKey = ['telegram-link-status', currentTenant?.id];

  const statusQuery = useQuery({
    queryKey,
    enabled: !!currentTenant?.id,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke<LinkStatus>('telegram-link-status', {
        body: {},
      });
      if (error) throw error;
      return data as LinkStatus;
    },
    // Poll while a link attempt is outstanding so the card flips to "linked".
    refetchInterval: () => (pendingLink ? 3000 : false),
  });

  const status = statusQuery.data;
  if (status?.linked && pendingLink) {
    setPendingLink(null);
  }

  const startMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke<LinkStart>('telegram-link-start', {
        body: {},
      });
      if (error) throw error;
      return data as LinkStart;
    },
    onSuccess: (data) => setPendingLink(data),
    onError: (error: Error) => {
      toast({ title: 'Failed to start linking', description: error.message, variant: 'destructive' });
    },
  });

  const unlinkMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.functions.invoke('telegram-unlink', { body: {} });
      if (error) throw error;
    },
    onSuccess: () => {
      setPendingLink(null);
      toast({ title: 'Telegram unlinked', description: 'Reports will no longer be sent to Telegram.' });
      void queryClient.invalidateQueries({ queryKey });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to unlink', description: error.message, variant: 'destructive' });
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Send className="h-5 w-5 text-primary" />
          Telegram
        </CardTitle>
        <CardDescription>
          Link your Telegram account to receive CEO reports and chat with the agent.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {statusQuery.isLoading ? (
          <Skeleton className="h-20" />
        ) : status?.linked ? (
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-success" />
              <div>
                <p className="font-medium">Connected</p>
                <p className="text-sm text-muted-foreground">Reports are delivered to your Telegram</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => unlinkMutation.mutate()}
              disabled={unlinkMutation.isPending}
            >
              <Unlink className="h-4 w-4 mr-2" />
              Unlink
            </Button>
          </div>
        ) : pendingLink ? (
          <div className="flex flex-col items-center gap-4 py-2">
            <div className="rounded-lg bg-white p-3">
              <QRCodeSVG value={pendingLink.deep_link} size={160} />
            </div>
            <p className="text-sm text-muted-foreground text-center">
              Scan the QR code or open the link below, then press <span className="font-medium">Start</span> in
              Telegram. This page updates automatically.
            </p>
            <div className="flex items-center gap-2">
              <Button asChild>
                <a href={pendingLink.deep_link} target="_blank" rel="noopener noreferrer">
                  Open Telegram
                  <ExternalLink className="h-4 w-4 ml-2" />
                </a>
              </Button>
              <Button variant="ghost" onClick={() => setPendingLink(null)}>
                Cancel
              </Button>
            </div>
            <Badge variant="outline" className="text-xs">
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              Waiting for confirmation...
            </Badge>
          </div>
        ) : (
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <p className="font-medium">Not connected</p>
              <p className="text-sm text-muted-foreground">
                Connect Telegram to receive reports outside the app
              </p>
            </div>
            <Button onClick={() => startMutation.mutate()} disabled={startMutation.isPending}>
              {startMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Connect Telegram
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
