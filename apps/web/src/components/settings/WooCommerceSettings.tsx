import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Loader2, RefreshCw, Check, X, Trash2, ExternalLink, ShoppingBag, Clock, Copy, Link2, Package } from 'lucide-react';
import { useWooCommerce } from '@/hooks/useWooCommerce';
import { useTenantContext } from '@/contexts/TenantContext';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow, format } from 'date-fns';

export function WooCommerceSettings() {
  const { currentTenant } = useTenantContext();
  const { toast } = useToast();
  const { 
    integration, 
    syncLogs,
    isLoading, 
    testConnection, 
    saveIntegration, 
    syncProducts,
    deleteIntegration 
  } = useWooCommerce();

  const [storeUrl, setStoreUrl] = useState(integration?.store_url || '');
  const [consumerKey, setConsumerKey] = useState('');
  const [consumerSecret, setConsumerSecret] = useState('');
  const [isEditing, setIsEditing] = useState(!integration);

  // Generate webhook URL for this tenant
  const webhookUrl = currentTenant?.id 
    ? `https://cdkrvztqeuflxilrtnws.supabase.co/functions/v1/woocommerce-order-webhook?tenant_id=${currentTenant.id}`
    : '';

  const copyWebhookUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    toast({ title: 'Copied!', description: 'Webhook URL copied to clipboard' });
  };

  const handleTest = async () => {
    await testConnection.mutateAsync({ storeUrl, consumerKey, consumerSecret });
  };

  const handleSave = async () => {
    await saveIntegration.mutateAsync({ storeUrl, consumerKey, consumerSecret });
    setIsEditing(false);
    setConsumerKey('');
    setConsumerSecret('');
  };

  const handleSync = async () => {
    await syncProducts.mutateAsync();
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/10">
              <ShoppingBag className="h-5 w-5 text-purple-500" />
            </div>
            <div>
              <CardTitle>WooCommerce Integration</CardTitle>
              <CardDescription>
                Import products from your WordPress/WooCommerce store
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {integration && !isEditing ? (
            <>
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${integration.is_active ? 'bg-green-500/10' : 'bg-muted'}`}>
                    {integration.is_active ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <X className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium">{integration.store_url}</p>
                    <p className="text-sm text-muted-foreground">
                      {integration.last_sync_at 
                        ? `Last synced ${formatDistanceToNow(new Date(integration.last_sync_at), { addSuffix: true })}`
                        : 'Never synced'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={
                    integration.sync_status === 'syncing' ? 'default' :
                    integration.sync_status === 'error' ? 'destructive' : 'secondary'
                  }>
                    {integration.sync_status}
                  </Badge>
                </div>
              </div>

              {integration.sync_error && (
                <div className="p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
                  {integration.sync_error}
                </div>
              )}

              {/* Auto Sync Settings */}
              <div className="p-4 border rounded-lg space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Automatic Sync
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      Automatically sync products every few days
                    </p>
                  </div>
                  <Switch
                    checked={(integration as any)?.auto_sync_enabled || false}
                    onCheckedChange={async (checked) => {
                      await saveIntegration.mutateAsync({
                        storeUrl: integration?.store_url || '',
                        consumerKey: '',
                        consumerSecret: '',
                        autoSyncEnabled: checked,
                        syncIntervalHours: (integration as any)?.sync_interval_hours || 72,
                      });
                    }}
                  />
                </div>
                
                {(integration as any)?.auto_sync_enabled && (
                  <div className="space-y-2">
                    <Label>Sync Interval</Label>
                    <Select
                      value={String((integration as any)?.sync_interval_hours || 72)}
                      onValueChange={async (value) => {
                        await saveIntegration.mutateAsync({
                          storeUrl: integration?.store_url || '',
                          consumerKey: '',
                          consumerSecret: '',
                          autoSyncEnabled: true,
                          syncIntervalHours: parseInt(value),
                        });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="24">Every 24 hours</SelectItem>
                        <SelectItem value="48">Every 2 days</SelectItem>
                        <SelectItem value="72">Every 3 days</SelectItem>
                        <SelectItem value="168">Every week</SelectItem>
                      </SelectContent>
                    </Select>
                    {(integration as any)?.next_scheduled_sync && (
                      <p className="text-xs text-muted-foreground">
                        Next sync: {format(new Date((integration as any).next_scheduled_sync), 'PPp')}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Order Sync (Webhook) Section */}
              <div className="p-4 border rounded-lg space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      Order Sync (Webhook)
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      Automatically receive orders from your WooCommerce store
                    </p>
                  </div>
                  <Switch
                    checked={(integration as any)?.sync_orders_enabled || false}
                    onCheckedChange={async (checked) => {
                      await saveIntegration.mutateAsync({
                        storeUrl: integration?.store_url || '',
                        consumerKey: '',
                        consumerSecret: '',
                        syncOrdersEnabled: checked,
                      });
                    }}
                  />
                </div>
                
                {(integration as any)?.sync_orders_enabled && (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label>Webhook URL</Label>
                      <div className="flex gap-2">
                        <Input 
                          value={webhookUrl} 
                          readOnly 
                          className="font-mono text-xs"
                        />
                        <Button 
                          variant="outline" 
                          size="icon"
                          onClick={copyWebhookUrl}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="p-3 bg-muted rounded-lg text-sm space-y-2">
                      <p className="font-medium flex items-center gap-2">
                        <Link2 className="h-4 w-4" />
                        Setup Instructions:
                      </p>
                      <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                        <li>Go to WooCommerce → Settings → Advanced → Webhooks</li>
                        <li>Click "Add webhook"</li>
                        <li>Set Name: "Order Sync to CRM"</li>
                        <li>Set Status: "Active"</li>
                        <li>Set Topic: "Order created"</li>
                        <li>Set Delivery URL: paste the webhook URL above</li>
                        <li>Click "Save webhook"</li>
                      </ol>
                    </div>
                  </div>
                )}
              </div>

              <Separator />

              <div className="flex gap-2">
                <Button 
                  onClick={handleSync}
                  disabled={syncProducts.isPending || integration.sync_status === 'syncing'}
                >
                  {syncProducts.isPending || integration.sync_status === 'syncing' ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Sync Now
                </Button>
                <Button variant="outline" onClick={() => setIsEditing(true)}>
                  Edit Connection
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Remove Integration</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will disconnect your WooCommerce store. Products already imported will remain.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={() => deleteIntegration.mutate()}
                        className="bg-destructive text-destructive-foreground"
                      >
                        Remove
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="storeUrl">Store URL</Label>
                <Input
                  id="storeUrl"
                  placeholder="https://yourstore.com"
                  value={storeUrl}
                  onChange={(e) => setStoreUrl(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Your WordPress site URL (without /wp-json)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="consumerKey">Consumer Key</Label>
                <Input
                  id="consumerKey"
                  placeholder="ck_xxxxxxxxxxxxxxxx"
                  value={consumerKey}
                  onChange={(e) => setConsumerKey(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="consumerSecret">Consumer Secret</Label>
                <Input
                  id="consumerSecret"
                  type="password"
                  placeholder="cs_xxxxxxxxxxxxxxxx"
                  value={consumerSecret}
                  onChange={(e) => setConsumerSecret(e.target.value)}
                />
              </div>

              <div className="p-3 bg-muted rounded-lg text-sm">
                <p className="font-medium mb-1">How to get API keys:</p>
                <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                  <li>Go to WooCommerce → Settings → Advanced → REST API</li>
                  <li>Click "Add key" and set permissions to "Read"</li>
                  <li>Copy the Consumer Key and Secret</li>
                </ol>
              </div>

              <div className="flex gap-2">
                <Button 
                  variant="outline"
                  onClick={handleTest}
                  disabled={testConnection.isPending || !storeUrl || !consumerKey || !consumerSecret}
                >
                  {testConnection.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Test Connection
                </Button>
                <Button 
                  onClick={handleSave}
                  disabled={saveIntegration.isPending || !storeUrl || !consumerKey || !consumerSecret}
                >
                  {saveIntegration.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Save & Connect
                </Button>
                {integration && (
                  <Button variant="ghost" onClick={() => setIsEditing(false)}>
                    Cancel
                  </Button>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sync History */}
      {syncLogs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sync History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {syncLogs.map((log) => (
                <div key={log.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg text-sm">
                  <div className="flex items-center gap-3">
                    <Badge variant={
                      log.status === 'completed' ? 'default' :
                      log.status === 'failed' ? 'destructive' : 'secondary'
                    }>
                      {log.status}
                    </Badge>
                    <span className="text-muted-foreground">
                      {formatDistanceToNow(new Date(log.started_at), { addSuffix: true })}
                    </span>
                  </div>
                  <div className="text-right">
                    <span>{log.products_synced} products</span>
                    <span className="text-muted-foreground mx-1">•</span>
                    <span>{log.categories_synced} categories</span>
                    {log.errors?.length > 0 && (
                      <>
                        <span className="text-muted-foreground mx-1">•</span>
                        <span className="text-destructive">{log.errors.length} errors</span>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
