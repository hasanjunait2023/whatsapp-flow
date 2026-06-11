import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { 
  Webhook, 
  Copy, 
  Check, 
  RefreshCw, 
  Eye, 
  EyeOff, 
  ExternalLink,
  AlertTriangle,
  Shield
} from 'lucide-react';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

function generateSecureSecret(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let secret = 'whsec_';
  for (let i = 0; i < 32; i++) {
    secret += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return secret;
}

export default function WebhookSecretManager() {
  const [showSecret, setShowSecret] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const webhookUrl = 'https://cdkrvztqeuflxilrtnws.supabase.co/functions/v1/sales-order-webhook';

  // Fetch current webhook secret from system_settings
  const { data: webhookSecret, isLoading } = useQuery({
    queryKey: ['webhook-secret'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'sales_webhook_secret')
        .maybeSingle();

      if (error) throw error;
      
      // Handle both direct values and JSON wrapped values
      if (data?.value) {
        const value = typeof data.value === 'object' && 'value' in (data.value as object)
          ? (data.value as { value: string }).value
          : data.value;
        return value as string;
      }
      return null;
    },
  });

  // Mutation to update/create webhook secret
  const updateSecretMutation = useMutation({
    mutationFn: async (newSecret: string) => {
      const jsonValue = { value: newSecret };

      // Check if setting exists
      const { data: existing } = await supabase
        .from('system_settings')
        .select('id')
        .eq('key', 'sales_webhook_secret')
        .single();

      if (existing) {
        const { error } = await supabase
          .from('system_settings')
          .update({ value: jsonValue })
          .eq('key', 'sales_webhook_secret');
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('system_settings')
          .insert([{ 
            key: 'sales_webhook_secret', 
            value: jsonValue,
            description: 'Secret key for external sales webhook authentication'
          }]);
        if (error) throw error;
      }

      // Log to audit
      await supabase.from('admin_audit_logs').insert({
        action: 'webhook_secret_regenerated',
        entity_type: 'system_settings',
        entity_id: 'sales_webhook_secret',
        details: { regenerated_at: new Date().toISOString() }
      });

      return newSecret;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhook-secret'] });
      toast.success('Webhook secret regenerated successfully');
    },
    onError: (error) => {
      toast.error('Failed to regenerate secret: ' + (error as Error).message);
    }
  });

  const handleRegenerate = () => {
    const newSecret = generateSecureSecret();
    updateSecretMutation.mutate(newSecret);
  };

  const handleGenerateFirst = () => {
    const newSecret = generateSecureSecret();
    updateSecretMutation.mutate(newSecret);
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const maskedSecret = webhookSecret 
    ? webhookSecret.substring(0, 10) + '•'.repeat(20) + webhookSecret.substring(webhookSecret.length - 4)
    : '';

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Webhook className="h-5 w-5 text-primary" />
          <div>
            <CardTitle>External Sales Webhook</CardTitle>
            <CardDescription>
              Configure webhook authentication for external sales integration
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Webhook URL */}
        <div className="space-y-2">
          <Label>Webhook Endpoint</Label>
          <div className="flex items-center gap-2">
            <Input 
              value={webhookUrl} 
              readOnly 
              className="font-mono text-sm bg-muted"
            />
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => copyToClipboard(webhookUrl, 'url')}
                  >
                    {copiedId === 'url' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Copy URL</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <p className="text-xs text-muted-foreground">
            Your external website should send POST requests to this URL
          </p>
        </div>

        {/* Webhook Secret */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-muted-foreground" />
              Webhook Secret
            </Label>
            {webhookSecret && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowSecret(!showSecret)}
              >
                {showSecret ? <EyeOff className="h-4 w-4 mr-1" /> : <Eye className="h-4 w-4 mr-1" />}
                {showSecret ? 'Hide' : 'Show'}
              </Button>
            )}
          </div>

          {webhookSecret ? (
            <div className="flex items-center gap-2">
              <Input 
                value={showSecret ? webhookSecret : maskedSecret} 
                readOnly 
                className="font-mono text-sm bg-muted"
              />
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={() => copyToClipboard(webhookSecret, 'secret')}
                    >
                      {copiedId === 'secret' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Copy Secret</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          ) : (
            <Alert className="bg-yellow-500/10 border-yellow-500/20">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              <AlertDescription className="text-yellow-600">
                No webhook secret configured. Generate one to enable secure webhook authentication.
              </AlertDescription>
            </Alert>
          )}

          <p className="text-xs text-muted-foreground">
            Include this in the <code className="bg-muted px-1 rounded">X-Sales-Webhook-Secret</code> header
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2">
          {webhookSecret ? (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="outline" 
                  disabled={updateSecretMutation.isPending}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${updateSecretMutation.isPending ? 'animate-spin' : ''}`} />
                  Regenerate Secret
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Regenerate Webhook Secret?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will invalidate the current secret. Your external website will need to be updated 
                    with the new secret, or webhook requests will fail.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleRegenerate}>
                    Regenerate
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : (
            <Button 
              onClick={handleGenerateFirst}
              disabled={updateSecretMutation.isPending}
            >
              <Shield className="h-4 w-4 mr-2" />
              Generate Secret
            </Button>
          )}

          <Button variant="ghost" asChild>
            <a href="/admin/external-sales" className="flex items-center">
              <ExternalLink className="h-4 w-4 mr-2" />
              View Sales
            </a>
          </Button>
        </div>

        {/* Integration Guide */}
        <div className="pt-4 border-t">
          <h4 className="text-sm font-medium mb-2">Integration Example</h4>
          <pre className="p-3 bg-muted rounded-lg text-xs overflow-x-auto">
{`POST ${webhookUrl}
Headers:
  Content-Type: application/json
  X-Sales-Webhook-Secret: ${webhookSecret ? '[YOUR_SECRET]' : '[GENERATE_SECRET_FIRST]'}

Body:
{
  "customer": { "name": "...", "email": "...", "phone": "..." },
  "order": { "order_id": "...", "plan_slug": "starter_retail", "amount": 1999 },
  "business": { "name": "...", "type": "retail" }
}`}
          </pre>
        </div>
      </CardContent>
    </Card>
  );
}
