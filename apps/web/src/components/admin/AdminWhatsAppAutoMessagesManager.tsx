import { useState, useEffect } from 'react';
import { useAdminWhatsAppAutoMessages, WhatsAppAutoMessagesInput, MediaItem } from '@/hooks/useAdminWhatsAppAutoMessages';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Bot, HandMetal, Moon, Clock, Loader2, AlertTriangle } from 'lucide-react';
import QuickReplyMediaUploader from '@/components/inbox/QuickReplyMediaUploader';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

/**
 * Admin-specific WhatsApp Auto Messages Manager.
 * Uses `useAdminWhatsAppAutoMessages` hook which operates on the System Tenant.
 * Admin has full access to all features (no Pro plan restrictions).
 */
export default function AdminWhatsAppAutoMessagesManager() {
  const { settings, loading, saving, saveSettings, hasFollowupAccess } = useAdminWhatsAppAutoMessages();
  
  // Check if follow-up system is globally enabled
  const { data: followupGlobalEnabled, isLoading: globalLoading } = useQuery({
    queryKey: ['whatsapp-followup-global'],
    queryFn: async () => {
      const { data } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'whatsapp_followup_enabled')
        .maybeSingle();
      return (data?.value as { value?: boolean })?.value === true;
    },
  });
  
  // Local form state
  const [welcomeEnabled, setWelcomeEnabled] = useState(false);
  const [welcomeMessage, setWelcomeMessage] = useState('');
  const [welcomeMedia, setWelcomeMedia] = useState<MediaItem[]>([]);
  
  const [awayEnabled, setAwayEnabled] = useState(false);
  const [awayMessage, setAwayMessage] = useState('');
  const [awayMedia, setAwayMedia] = useState<MediaItem[]>([]);
  const [awayCooldown, setAwayCooldown] = useState(24);
  
  const [followupEnabled, setFollowupEnabled] = useState(false);
  const [followupMessage, setFollowupMessage] = useState('');
  const [followupMedia, setFollowupMedia] = useState<MediaItem[]>([]);
  const [followupDelay, setFollowupDelay] = useState(6);

  // Sync form state with settings
  useEffect(() => {
    if (settings) {
      setWelcomeEnabled(settings.welcome_enabled);
      setWelcomeMessage(settings.welcome_message);
      setWelcomeMedia(settings.welcome_media_items);
      
      setAwayEnabled(settings.away_enabled);
      setAwayMessage(settings.away_message);
      setAwayMedia(settings.away_media_items);
      setAwayCooldown(settings.away_cooldown_hours);
      
      setFollowupEnabled(settings.followup_enabled);
      setFollowupMessage(settings.followup_message);
      setFollowupMedia(settings.followup_media_items);
      setFollowupDelay(settings.followup_delay_hours);
    }
  }, [settings]);

  const handleSave = async () => {
    const input: WhatsAppAutoMessagesInput = {
      welcome_enabled: welcomeEnabled,
      welcome_message: welcomeMessage,
      welcome_media_items: welcomeMedia,
      away_enabled: awayEnabled,
      away_message: awayMessage,
      away_media_items: awayMedia,
      away_cooldown_hours: awayCooldown,
      followup_enabled: followupEnabled,
      followup_message: followupMessage,
      followup_media_items: followupMedia,
      followup_delay_hours: followupDelay,
    };
    await saveSettings(input);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72 mt-2" />
        </CardHeader>
        <CardContent className="space-y-6">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </CardContent>
      </Card>
    );
  }

  const isFollowupSystemDisabled = !globalLoading && !followupGlobalEnabled;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="h-5 w-5" />
          Auto Messages
        </CardTitle>
        <CardDescription>
          Automated messages for admin business communication
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        {/* Welcome Message Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <HandMetal className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold">Welcome Message</h3>
                <p className="text-sm text-muted-foreground">
                  Automatically greet new customers when they first message
                </p>
              </div>
            </div>
            <Switch
              checked={welcomeEnabled}
              onCheckedChange={setWelcomeEnabled}
            />
          </div>
          
          {welcomeEnabled && (
            <div className="ml-12 space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Message</Label>
                <Textarea
                  placeholder="Type your welcome message..."
                  value={welcomeMessage}
                  onChange={(e) => setWelcomeMessage(e.target.value)}
                  rows={3}
                />
              </div>
              <QuickReplyMediaUploader
                mediaItems={welcomeMedia}
                onMediaItemsChange={setWelcomeMedia}
              />
            </div>
          )}
        </div>

        <Separator />

        {/* Away Message Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Moon className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold">Away Message</h3>
                <p className="text-sm text-muted-foreground">
                  Send when no team member is online
                </p>
              </div>
            </div>
            <Switch
              checked={awayEnabled}
              onCheckedChange={setAwayEnabled}
            />
          </div>
          
          {awayEnabled && (
            <div className="ml-12 space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Message</Label>
                <Textarea
                  placeholder="Type your away message..."
                  value={awayMessage}
                  onChange={(e) => setAwayMessage(e.target.value)}
                  rows={3}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Cooldown Period</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={1}
                    max={168}
                    value={awayCooldown}
                    onChange={(e) => setAwayCooldown(parseInt(e.target.value) || 24)}
                    className="w-24"
                  />
                  <span className="text-sm text-muted-foreground">
                    hours between messages to same contact
                  </span>
                </div>
              </div>
              
              <QuickReplyMediaUploader
                mediaItems={awayMedia}
                onMediaItemsChange={setAwayMedia}
              />
            </div>
          )}
        </div>

        <Separator />

        {/* Follow-up Message Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <Clock className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold">Follow-up Message</h3>
                <p className="text-sm text-muted-foreground">
                  Automatically follow up if customer hasn't ordered
                </p>
              </div>
            </div>
            <Switch
              checked={followupEnabled}
              onCheckedChange={setFollowupEnabled}
              disabled={!hasFollowupAccess}
            />
          </div>
          
          {isFollowupSystemDisabled && (
            <div className="ml-12 p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <div>
                  <p className="text-sm font-medium text-yellow-700">System Disabled</p>
                  <p className="text-xs text-yellow-600 mt-1">
                    Follow-up automation is currently disabled by the system administrator.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {hasFollowupAccess && followupEnabled && (
            <div className="ml-12 space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Message</Label>
                <Textarea
                  placeholder="Type your follow-up message..."
                  value={followupMessage}
                  onChange={(e) => setFollowupMessage(e.target.value)}
                  rows={3}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Send After</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={1}
                    max={72}
                    value={followupDelay}
                    onChange={(e) => setFollowupDelay(parseInt(e.target.value) || 6)}
                    className="w-24"
                  />
                  <span className="text-sm text-muted-foreground">
                    hours if no order placed
                  </span>
                </div>
              </div>
              
              <QuickReplyMediaUploader
                mediaItems={followupMedia}
                onMediaItemsChange={setFollowupMedia}
              />
            </div>
          )}
        </div>

        <Separator />

        {/* Save Button */}
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Settings'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
