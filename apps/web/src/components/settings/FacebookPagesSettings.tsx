import { useState } from 'react';
import { useFacebookPages, FacebookPageInput } from '@/hooks/useFacebookPages';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
import { Facebook, Plus, Trash2, Star, Copy, Check, AlertTriangle, ExternalLink, FileText, ChevronDown, Rocket } from 'lucide-react';
import { toast } from 'sonner';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

export function FacebookPagesSettings() {
  const { pages, loading, connectPage, disconnectPage, setDefaultPage } = useFacebookPages();
  const [isConnectOpen, setIsConnectOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  
  const [formData, setFormData] = useState<FacebookPageInput>({
    page_id: '',
    page_name: '',
    page_access_token: '',
    app_secret: '',
  });

  const webhookUrl = `https://cdkrvztqeuflxilrtnws.supabase.co/functions/v1/fb-webhook`;
  const verifyToken = '112233';
  const privacyPolicyDocsUrl = 'https://docs.google.com/document/d/1iY0diu-I2r1M54Zoo0DwkokP0D5zuNi1Q5o3lfysqlE/edit?tab=t.0';

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleConnect = async () => {
    if (!formData.page_id || !formData.page_name || !formData.page_access_token) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      await connectPage(formData);
      toast.success('Facebook Page connected successfully');
      setIsConnectOpen(false);
      setFormData({ page_id: '', page_name: '', page_access_token: '', app_secret: '' });
    } catch (error) {
      console.error('Error connecting page:', error);
      toast.error('Failed to connect Facebook Page');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDisconnect = async (pageId: string) => {
    try {
      await disconnectPage(pageId);
      toast.success('Facebook Page disconnected');
    } catch (error) {
      console.error('Error disconnecting page:', error);
      toast.error('Failed to disconnect page');
    }
  };

  const handleSetDefault = async (pageId: string) => {
    try {
      await setDefaultPage(pageId);
      toast.success('Default page updated');
    } catch (error) {
      console.error('Error setting default:', error);
      toast.error('Failed to set default page');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default" className="bg-green-500">Active</Badge>;
      case 'disconnected':
        return <Badge variant="secondary">Disconnected</Badge>;
      case 'token_expired':
        return <Badge variant="destructive">Token Expired</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Setup Guide */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Facebook className="h-5 w-5 text-blue-600" />
            Facebook Messenger Setup
          </CardTitle>
          <CardDescription>
            Connect your Facebook Pages to receive and reply to Messenger messages
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Inline Setup Guide - Collapsible */}
          <Collapsible open={isGuideOpen} onOpenChange={setIsGuideOpen}>
            <CollapsibleTrigger asChild>
              <div className="flex items-center justify-between p-4 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-950/50 transition-colors">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="font-medium text-blue-900 dark:text-blue-100">সম্পূর্ণ সেটআপ গাইড (বাংলায়)</p>
                    <p className="text-sm text-blue-700 dark:text-blue-300">ধাপে ধাপে সব নির্দেশনা দেখুন</p>
                  </div>
                </div>
                <Button variant="outline" className="border-blue-300">
                  গাইড দেখুন <ChevronDown className={`h-4 w-4 ml-2 transition-transform ${isGuideOpen ? 'rotate-180' : ''}`} />
                </Button>
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-4 p-4 rounded-lg border bg-muted/30 space-y-6 text-sm">
                {/* Step 1 */}
                <div className="space-y-2">
                  <h4 className="font-semibold flex items-center gap-2">
                    <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">১</span>
                    Meta Developer App তৈরি করুন
                  </h4>
                  <ul className="ml-8 list-disc text-muted-foreground space-y-1">
                    <li><a href="https://developers.facebook.com/apps" target="_blank" rel="noopener noreferrer" className="text-primary underline">developers.facebook.com/apps</a> এ যান</li>
                    <li>"Create App" ক্লিক করুন → "Other" → "Business" টাইপ সিলেক্ট করুন</li>
                    <li>App এর নাম দিন (যেমন: "My Business Messenger")</li>
                  </ul>
                </div>

                {/* Step 2 */}
                <div className="space-y-2">
                  <h4 className="font-semibold flex items-center gap-2">
                    <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">২</span>
                    Messenger Product যোগ করুন
                  </h4>
                  <ul className="ml-8 list-disc text-muted-foreground space-y-1">
                    <li>App Dashboard → "Add Products" → "Messenger" → "Set Up"</li>
                  </ul>
                </div>

                {/* Step 3 */}
                <div className="space-y-2">
                  <h4 className="font-semibold flex items-center gap-2">
                    <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">৩</span>
                    Webhook Configure করুন
                  </h4>
                  <ul className="ml-8 list-disc text-muted-foreground space-y-1">
                    <li>App Dashboard → <strong>Webhooks</strong> এ যান (বাম মেনুতে)</li>
                    <li><strong>"Select product"</strong> ড্রপডাউন থেকে <code className="bg-muted px-1 rounded font-semibold">Page</code> সিলেক্ট করুন</li>
                    <li>"Subscribe to this object" বা "Configure" ক্লিক করুন</li>
                    <li><strong>Callback URL:</strong> নীচে দেওয়া URL কপি করে পেস্ট করুন</li>
                    <li><strong>Verify Token:</strong> <code className="bg-muted px-1 rounded">112233</code></li>
                    <li>"Verify and Save" ক্লিক করুন</li>
                  </ul>
                </div>

                {/* Step 4 */}
                <div className="space-y-2">
                  <h4 className="font-semibold flex items-center gap-2">
                    <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">৪</span>
                    Webhook Fields Subscribe করুন
                  </h4>
                  <ul className="ml-8 list-disc text-muted-foreground space-y-1">
                    <li>"Select product" এ <code className="bg-muted px-1 rounded font-semibold">Page</code> সিলেক্ট থাকা অবস্থায়:</li>
                    <li>এগুলো টিক দিন: <code className="bg-muted px-1 rounded">messages</code>, <code className="bg-muted px-1 rounded">messaging_postbacks</code>, <code className="bg-muted px-1 rounded">message_deliveries</code>, <code className="bg-muted px-1 rounded">message_reads</code>, <code className="bg-muted px-1 rounded">feed</code></li>
                  </ul>
                </div>

                {/* Step 5 */}
                <div className="space-y-2">
                  <h4 className="font-semibold flex items-center gap-2">
                    <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">৫</span>
                    App Secret খুঁজুন 🔑
                  </h4>
                  <ul className="ml-8 list-disc text-muted-foreground space-y-1">
                    <li>App Dashboard → <strong>Settings → Basic</strong> এ যান</li>
                    <li>"App Secret" এর পাশে "Show" ক্লিক করুন</li>
                    <li>Password দিয়ে verify করে Secret কপি করুন</li>
                  </ul>
                </div>

                {/* Step 6 */}
                <div className="space-y-2">
                  <h4 className="font-semibold flex items-center gap-2">
                    <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">৬</span>
                    Page Access Token তৈরি করুন
                  </h4>
                  <ul className="ml-8 list-disc text-muted-foreground space-y-1">
                    <li>Messenger → Settings → Access Tokens এ যান</li>
                    <li>আপনার Facebook Page সিলেক্ট করুন</li>
                    <li>"Generate Token" ক্লিক করুন</li>
                    <li className="font-medium text-foreground">নিম্নলিখিত সব Permissions সিলেক্ট করুন:</li>
                  </ul>
                  
                  {/* Permissions List */}
                  <div className="ml-8 mt-3 p-3 bg-muted/50 rounded-lg border">
                    <div className="flex flex-wrap gap-1.5">
                      <code className="bg-background border px-2 py-0.5 rounded text-xs">pages_messaging</code>
                      <code className="bg-background border px-2 py-0.5 rounded text-xs">pages_manage_metadata</code>
                      <code className="bg-background border px-2 py-0.5 rounded text-xs">pages_read_engagement</code>
                      <code className="bg-background border px-2 py-0.5 rounded text-xs">pages_show_list</code>
                      <code className="bg-background border px-2 py-0.5 rounded text-xs">pages_manage_posts</code>
                      <code className="bg-background border px-2 py-0.5 rounded text-xs">pages_read_user_content</code>
                      <code className="bg-background border px-2 py-0.5 rounded text-xs">pages_manage_engagement</code>
                      <code className="bg-background border px-2 py-0.5 rounded text-xs">publish_video</code>
                      <code className="bg-background border px-2 py-0.5 rounded text-xs">pages_user_locale</code>
                      <code className="bg-background border px-2 py-0.5 rounded text-xs">pages_user_timezone</code>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">💡 এই permissions ভবিষ্যতে AI automation এবং advanced features এ সাহায্য করবে</p>
                  </div>
                  
                  <ul className="ml-8 list-disc text-muted-foreground space-y-1 mt-2">
                    <li>সব Permission সিলেক্ট করে Token কপি করুন</li>
                  </ul>
                </div>

                {/* Step 7 */}
                <div className="space-y-2">
                  <h4 className="font-semibold flex items-center gap-2">
                    <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">৭</span>
                    Page ID খুঁজুন
                  </h4>
                  <ul className="ml-8 list-disc text-muted-foreground space-y-1">
                    <li>Meta Business Suite → আপনার Page → Settings → Page Info → Page ID</li>
                    <li>অথবা Facebook Page → About → Page ID</li>
                  </ul>
                </div>

                {/* Step 8 */}
                <div className="space-y-2">
                  <h4 className="font-semibold flex items-center gap-2">
                    <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">৮</span>
                    এখানে Page Connect করুন
                  </h4>
                  <ul className="ml-8 list-disc text-muted-foreground space-y-1">
                    <li>নীচে "Connect Page" বাটনে ক্লিক করুন</li>
                    <li>Page Name, Page ID, Access Token, App Secret দিন</li>
                  </ul>
                </div>

                {/* Step 9 */}
                <div className="space-y-2">
                  <h4 className="font-semibold flex items-center gap-2">
                    <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">৯</span>
                    Page Subscription করুন
                  </h4>
                  <ul className="ml-8 list-disc text-muted-foreground space-y-1">
                    <li>Meta App → Messenger → Webhooks → "Add Subscriptions"</li>
                    <li>আপনার Page সিলেক্ট করে Subscribe করুন</li>
                  </ul>
                </div>

                <div className="mt-4 p-3 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
                  <p className="text-green-800 dark:text-green-200 font-medium">✅ সম্পন্ন! এখন আপনার Page থেকে message আসলে এখানে দেখতে পাবেন।</p>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              You'll need a Meta Developer App with Messenger and Webhooks products enabled.{' '}
              <a
                href="https://developers.facebook.com/apps"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline inline-flex items-center gap-1"
              >
                Create App <ExternalLink className="h-3 w-3" />
              </a>
            </AlertDescription>
          </Alert>

          <div className="rounded-lg border p-4 space-y-4">
            <h4 className="font-medium">Webhook Configuration</h4>
            <p className="text-sm text-muted-foreground">
              In your Meta App, go to Messenger → Settings → Webhooks → Configure
            </p>
            
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Callback URL</Label>
                <div className="flex gap-2">
                  <Input 
                    value={webhookUrl} 
                    readOnly 
                    className="font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleCopy(webhookUrl, 'webhook')}
                  >
                    {copiedField === 'webhook' ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Verify Token</Label>
                <div className="flex gap-2">
                  <Input 
                    value={verifyToken} 
                    readOnly 
                    className="font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleCopy(verifyToken, 'verify')}
                  >
                    {copiedField === 'verify' ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="text-sm">
                <p className="font-medium mb-2">Subscribe to these webhook fields:</p>
                <ul className="list-disc list-inside text-muted-foreground space-y-1">
                  <li>messages</li>
                  <li>messaging_postbacks</li>
                  <li>message_deliveries</li>
                  <li>message_reads</li>
                  <li>feed (for comments)</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Connected Pages */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Connected Pages</CardTitle>
              <CardDescription>
                Manage your connected Facebook Pages
              </CardDescription>
            </div>
            <Dialog open={isConnectOpen} onOpenChange={setIsConnectOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Connect Page
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Connect Facebook Page</DialogTitle>
                  <DialogDescription>
                    Enter your Facebook Page details and access token
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="page_name">Page Name *</Label>
                    <Input
                      id="page_name"
                      placeholder="My Business Page"
                      value={formData.page_name}
                      onChange={(e) => setFormData({ ...formData, page_name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="page_id">Page ID *</Label>
                    <Input
                      id="page_id"
                      placeholder="123456789012345"
                      value={formData.page_id}
                      onChange={(e) => setFormData({ ...formData, page_id: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">
                      Find this in your Page's About section or Meta Business Suite
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="page_access_token">Page Access Token *</Label>
                    <Input
                      id="page_access_token"
                      type="password"
                      placeholder="EAABs..."
                      value={formData.page_access_token}
                      onChange={(e) => setFormData({ ...formData, page_access_token: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">
                      Generate in Meta App → Messenger → Access Tokens
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="app_secret">App Secret (for webhook verification)</Label>
                    <Input
                      id="app_secret"
                      type="password"
                      placeholder="abc123..."
                      value={formData.app_secret || ''}
                      onChange={(e) => setFormData({ ...formData, app_secret: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">
                      Found in Meta App → Settings → Basic → App Secret
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsConnectOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleConnect} disabled={isSubmitting}>
                    {isSubmitting ? 'Connecting...' : 'Connect Page'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {pages.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Facebook className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No Facebook Pages connected yet</p>
              <p className="text-sm">Click "Connect Page" to get started</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pages.map((page) => (
                <div
                  key={page.id}
                  className="p-4 rounded-lg border space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <Facebook className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{page.page_name}</span>
                          {page.is_default && (
                            <Badge variant="outline" className="text-xs">
                              <Star className="h-3 w-3 mr-1" />
                              Default
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          ID: {page.page_id}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {getStatusBadge(page.status)}
                      {!page.is_default && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSetDefault(page.id)}
                        >
                          Set Default
                        </Button>
                      )}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Disconnect Page?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will disconnect "{page.page_name}" from your workspace. 
                              You won't receive new messages until you reconnect.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDisconnect(page.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Disconnect
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                  
                  {/* Verify Token Section */}
                  <div className="bg-muted/50 rounded-md p-3 space-y-2">
                    <Label className="text-xs text-muted-foreground">Verify Token (for Meta Webhook)</Label>
                    <div className="flex gap-2">
                      <Input 
                        value={page.webhook_verify_token} 
                        readOnly 
                        className="font-mono text-sm bg-background"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleCopy(page.webhook_verify_token, `verify-${page.id}`)}
                      >
                        {copiedField === `verify-${page.id}` ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Use this token in Meta Developer Console → Webhooks → Verify Token field
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* App Live Section */}
      <Card className="border-orange-200 dark:border-orange-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Rocket className="h-5 w-5 text-orange-500" />
            App Live করুন (Production)
          </CardTitle>
          <CardDescription>
            Meta App কে Live mode এ নিতে Privacy Policy URL প্রয়োজন
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="border-orange-200 bg-orange-50 dark:bg-orange-950/30">
            <AlertTriangle className="h-4 w-4 text-orange-500" />
            <AlertDescription className="text-orange-800 dark:text-orange-200">
              ⚠️ App Live করতে গেলে Meta আপনার কাছে <strong>Privacy Policy URL</strong> চাইবে। 
              নীচের ডকুমেন্ট ব্যবহার করে আপনার Privacy Policy তৈরি করুন।
            </AlertDescription>
          </Alert>

          <div className="flex items-center justify-between p-4 rounded-lg bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-orange-600" />
              <div>
                <p className="font-medium text-orange-900 dark:text-orange-100">Privacy Policy Template</p>
                <p className="text-sm text-orange-700 dark:text-orange-300">এটি কপি করে আপনার ওয়েবসাইটে রাখুন</p>
              </div>
            </div>
            <Button asChild variant="outline" className="border-orange-300">
              <a href={privacyPolicyDocsUrl} target="_blank" rel="noopener noreferrer">
                ডকুমেন্ট দেখুন <ExternalLink className="h-4 w-4 ml-2" />
              </a>
            </Button>
          </div>

          <div className="text-sm text-muted-foreground space-y-2">
            <p><strong>ধাপ:</strong></p>
            <ol className="list-decimal list-inside space-y-1 ml-2">
              <li>উপরের ডকুমেন্ট থেকে Privacy Policy কপি করুন</li>
              <li>আপনার ওয়েবসাইটে একটি পেজে রাখুন (যেমন: yoursite.com/privacy)</li>
              <li>Meta App → Settings → Basic → Privacy Policy URL এ এই URL দিন</li>
              <li>App Mode → "Live" করুন</li>
            </ol>
          </div>
        </CardContent>
      </Card>

      {/* Troubleshooting */}
      <Card>
        <CardHeader>
          <CardTitle>Troubleshooting</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <details className="group">
            <summary className="cursor-pointer font-medium hover:text-primary">
              Not receiving messages?
            </summary>
            <ul className="mt-2 ml-4 list-disc text-muted-foreground space-y-1">
              <li>Verify webhook is subscribed to "messages" field</li>
              <li>Check Page is connected to your Meta App</li>
              <li>Ensure Page Access Token hasn't expired</li>
              <li>Test with Meta's Graph API Explorer</li>
            </ul>
          </details>
          <details className="group">
            <summary className="cursor-pointer font-medium hover:text-primary">
              Token expired error?
            </summary>
            <ul className="mt-2 ml-4 list-disc text-muted-foreground space-y-1">
              <li>Generate a new long-lived Page Access Token</li>
              <li>Re-authorize the app if permissions changed</li>
              <li>Disconnect and reconnect the page with new token</li>
            </ul>
          </details>
          <details className="group">
            <summary className="cursor-pointer font-medium hover:text-primary">
              Messages not sending?
            </summary>
            <ul className="mt-2 ml-4 list-disc text-muted-foreground space-y-1">
              <li>Check 24-hour messaging window hasn't closed</li>
              <li>Verify recipient hasn't blocked your Page</li>
              <li>For promotional messages, use Message Tags</li>
            </ul>
          </details>
        </CardContent>
      </Card>
    </div>
  );
}
