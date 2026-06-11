import { useEffect, useState } from 'react';
import { usePwaInstall } from '@/hooks/usePwaInstall';
import {
  disablePushNotifications,
  enablePushNotifications,
  isPushSupported,
} from '@/lib/pwa';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { BellRing, Download, Loader2, MonitorSmartphone } from 'lucide-react';

// TODO i18n: hardcoded English strings

export function AppInstallCard() {
  const { canInstall, promptInstall } = usePwaInstall();
  const { toast } = useToast();
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const pushSupported = isPushSupported();

  // Reflect the current browser subscription state on mount.
  useEffect(() => {
    if (!pushSupported) return;
    let cancelled = false;
    void navigator.serviceWorker.ready
      .then((registration) => registration.pushManager.getSubscription())
      .then((subscription) => {
        if (!cancelled) setPushEnabled(!!subscription);
      })
      .catch(() => {
        // Leave the toggle off if the SW is unavailable.
      });
    return () => {
      cancelled = true;
    };
  }, [pushSupported]);

  const handlePushToggle = async (checked: boolean) => {
    setPushBusy(true);
    try {
      if (checked) {
        const ok = await enablePushNotifications();
        setPushEnabled(ok);
        if (ok) {
          toast({ title: 'Push enabled', description: 'You will receive push notifications.' });
        } else {
          toast({
            title: 'Could not enable push',
            description: 'Permission was denied or push is not configured.',
            variant: 'destructive',
          });
        }
      } else {
        await disablePushNotifications();
        setPushEnabled(false);
        toast({ title: 'Push disabled', description: 'Push notifications turned off.' });
      }
    } finally {
      setPushBusy(false);
    }
  };

  const handleInstall = async () => {
    const accepted = await promptInstall();
    if (accepted) {
      toast({ title: 'App installed', description: 'You can now launch it from your home screen.' });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MonitorSmartphone className="h-5 w-5 text-primary" />
          App & Push
        </CardTitle>
        <CardDescription>Install the app and manage browser push notifications</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="space-y-0.5">
            <Label className="text-base">Install app</Label>
            <p className="text-sm text-muted-foreground">
              {canInstall
                ? 'Add the app to your home screen or desktop'
                : 'Already installed, or not supported by this browser'}
            </p>
          </div>
          <Button onClick={handleInstall} disabled={!canInstall} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Install
          </Button>
        </div>

        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="space-y-0.5">
            <Label className="text-base flex items-center gap-2">
              <BellRing className="h-4 w-4" />
              Push notifications
            </Label>
            <p className="text-sm text-muted-foreground">
              {pushSupported
                ? 'Get notified about new messages even when the app is closed'
                : 'Push notifications are not supported in this browser'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {pushBusy && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            <Switch
              checked={pushEnabled}
              onCheckedChange={(checked) => void handlePushToggle(checked)}
              disabled={!pushSupported || pushBusy}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
