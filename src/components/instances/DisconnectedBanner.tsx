import { useState } from 'react';
import { AlertTriangle, RefreshCw, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useInstances } from '@/hooks/useInstances';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface DisconnectedBannerProps {
  onDismiss?: () => void;
}

export default function DisconnectedBanner({ onDismiss }: DisconnectedBannerProps) {
  const { instances } = useInstances();
  const { toast } = useToast();
  const [reconnecting, setReconnecting] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  const disconnectedInstances = instances.filter(
    (inst) => inst.status === 'disconnected' || inst.status === 'banned'
  );

  if (dismissed || disconnectedInstances.length === 0) {
    return null;
  }

  const handleReconnect = async (instanceId: string) => {
    setReconnecting(instanceId);

    try {
      const { error } = await supabase.functions.invoke('wasender-connect-session', {
        body: { instance_id: instanceId },
      });

      if (error) throw error;

      toast({
        title: 'Reconnecting...',
        description: 'Check the Instances page to scan the new QR code.',
      });
    } catch (err) {
      console.error('Reconnect error:', err);
      toast({
        title: 'Reconnection failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setReconnecting(null);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  return (
    <div className="bg-warning/10 border border-warning/30 rounded-lg p-4 mb-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground">
            {disconnectedInstances.length === 1
              ? 'WhatsApp Disconnected'
              : `${disconnectedInstances.length} WhatsApp Instances Disconnected`}
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            {disconnectedInstances.length === 1
              ? `Your instance "${disconnectedInstances[0].name}" needs to be reconnected.`
              : 'Some of your WhatsApp instances need to be reconnected.'}
          </p>

          <div className="flex flex-wrap gap-2 mt-3">
            {disconnectedInstances.map((instance) => (
              <Button
                key={instance.id}
                size="sm"
                variant="outline"
                onClick={() => handleReconnect(instance.id)}
                disabled={reconnecting === instance.id}
                className="border-warning/50 hover:bg-warning/10"
              >
                {reconnecting === instance.id ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Reconnect {disconnectedInstances.length > 1 ? instance.name : ''}
              </Button>
            ))}
          </div>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 flex-shrink-0"
          onClick={handleDismiss}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
