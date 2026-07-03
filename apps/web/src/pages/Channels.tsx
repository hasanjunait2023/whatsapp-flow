import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { FacebookPagesSettings } from '@/components/settings/FacebookPagesSettings';
import { useInstances } from '@/hooks/useInstances';
import { useFacebookPages } from '@/hooks/useFacebookPages';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { m, pageEnter } from '@/lib/motion';
import {
  MessageCircle,
  Facebook,
  Instagram,
  Plus,
  Settings,
  Wifi,
  WifiOff,
  Clock,
  ExternalLink,
  Copy,
  Check,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';

function ChannelSummaryCard({
  icon,
  label,
  description,
  connected,
  total,
  status,
  onConnect,
  onManage,
  comingSoon,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  connected: number;
  total: number;
  status: 'ok' | 'warn' | 'empty';
  onConnect?: () => void;
  onManage?: () => void;
  comingSoon?: boolean;
}) {
  return (
    <Card className={comingSoon ? 'opacity-60' : ''}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-muted">
              {icon}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold">{label}</span>
                {comingSoon && (
                  <Badge variant="outline" className="text-xs">শীঘ্রই</Badge>
                )}
                {!comingSoon && status === 'ok' && (
                  <Badge className="bg-green-500 text-xs">{connected} সংযুক্ত</Badge>
                )}
                {!comingSoon && status === 'warn' && (
                  <Badge variant="destructive" className="text-xs">সমস্যা আছে</Badge>
                )}
                {!comingSoon && status === 'empty' && (
                  <Badge variant="secondary" className="text-xs">সংযুক্ত নেই</Badge>
                )}
              </div>
              <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
            </div>
          </div>

          {!comingSoon && (
            <div className="flex shrink-0 gap-2">
              {total > 0 && onManage && (
                <Button variant="outline" size="sm" onClick={onManage}>
                  <Settings className="h-3.5 w-3.5 mr-1" />
                  পরিচালনা
                </Button>
              )}
              {onConnect && (
                <Button size="sm" onClick={onConnect}>
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  সংযুক্ত করুন
                </Button>
              )}
            </div>
          )}
        </div>

        {!comingSoon && total > 0 && (
          <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground border-t pt-3">
            <span className="flex items-center gap-1.5">
              <Wifi className="h-3.5 w-3.5 text-green-500" />
              {connected} সক্রিয়
            </span>
            <span className="flex items-center gap-1.5">
              <WifiOff className="h-3.5 w-3.5 text-muted-foreground/50" />
              {total - connected} নিষ্ক্রিয়
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MetaAppLiveGuide() {
  const [copied, setCopied] = useState<string | null>(null);
  const origin = window.location.origin;
  const privacyUrl = `${origin}/privacy`;
  const termsUrl = `${origin}/terms`;

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    toast.success('কপি হয়েছে');
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <Card className="border-violet-200 dark:border-violet-800">
      <CardHeader>
        <CardTitle className="text-base">Meta App Live করার জন্য প্রয়োজনীয় URL</CardTitle>
        <CardDescription>
          Meta App → Settings → Basic এ এই দুটি URL দিতে হবে
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {[
          { label: 'Privacy Policy URL', url: privacyUrl, key: 'pp' },
          { label: 'Terms of Service URL', url: termsUrl, key: 'tos' },
        ].map(({ label, url, key }) => (
          <div key={key} className="flex items-center justify-between gap-3 rounded-lg border bg-muted/30 p-3">
            <div className="min-w-0">
              <p className="text-xs font-medium text-muted-foreground">{label}</p>
              <p className="truncate font-mono text-sm">{url}</p>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button variant="outline" size="icon" onClick={() => handleCopy(url, key)}>
                {copied === key ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              </Button>
              <Button variant="outline" size="icon" asChild>
                <a href={url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            </div>
          </div>
        ))}

        <div className="rounded-lg bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800 p-3 text-sm text-violet-800 dark:text-violet-200">
          <strong>ধাপ:</strong> Meta Developer Console → আপনার App → Settings → Basic → Privacy Policy URL এবং Terms of Service URL এ উপরের লিংক দুটি দিন → App Mode → "Live" করুন
        </div>
      </CardContent>
    </Card>
  );
}

export default function Channels() {
  const navigate = useNavigate();
  const { instances, loading: instancesLoading } = useInstances();
  const { pages, loading: pagesLoading } = useFacebookPages();
  const [activeTab, setActiveTab] = useState('whatsapp');

  const connectedInstances = instances.filter((i) => i.status === 'active').length;
  const connectedPages = pages.filter((p) => p.status === 'active').length;

  const waStatus =
    instancesLoading || pagesLoading
      ? 'empty'
      : instances.length === 0
      ? 'empty'
      : connectedInstances === 0
      ? 'warn'
      : 'ok';

  const fbStatus =
    pagesLoading
      ? 'empty'
      : pages.length === 0
      ? 'empty'
      : connectedPages === 0
      ? 'warn'
      : 'ok';

  return (
    <DashboardLayout>
      <m.div
        variants={pageEnter}
        initial="hidden"
        animate="show"
        className="mx-auto w-full max-w-[1440px] space-y-6 p-4 md:p-6"
      >
        <header className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
            চ্যানেল সংযোগ
          </h1>
          <p className="text-sm text-muted-foreground">
            WhatsApp, Facebook এবং অন্যান্য চ্যানেল এখানে সংযুক্ত করুন ও পরিচালনা করুন
          </p>
        </header>

        {/* Summary cards */}
        <div className="grid gap-4 sm:grid-cols-3">
          <ChannelSummaryCard
            icon={<MessageCircle className="h-5 w-5 text-green-600" />}
            label="WhatsApp"
            description="QR কোড দিয়ে সংযুক্ত করুন"
            connected={connectedInstances}
            total={instances.length}
            status={waStatus}
            onConnect={() => navigate('/instances/onboarding')}
            onManage={() => setActiveTab('whatsapp')}
          />
          <ChannelSummaryCard
            icon={<Facebook className="h-5 w-5 text-blue-600" />}
            label="Facebook"
            description="Messenger ও পোস্ট কমেন্ট"
            connected={connectedPages}
            total={pages.length}
            status={fbStatus}
            onConnect={() => setActiveTab('facebook')}
            onManage={() => setActiveTab('facebook')}
          />
          <ChannelSummaryCard
            icon={<Instagram className="h-5 w-5 text-pink-600" />}
            label="Instagram"
            description="DM ও মন্তব্য পরিচালনা"
            connected={0}
            total={0}
            status="empty"
            comingSoon
          />
        </div>

        {/* Meta App Live URLs — always visible */}
        <MetaAppLiveGuide />

        {/* Per-channel management tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList>
            <TabsTrigger value="whatsapp" className="gap-2">
              <MessageCircle className="h-4 w-4" />
              WhatsApp
            </TabsTrigger>
            <TabsTrigger value="facebook" className="gap-2">
              <Facebook className="h-4 w-4" />
              Facebook
            </TabsTrigger>
          </TabsList>

          <TabsContent value="whatsapp" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <MessageCircle className="h-5 w-5 text-green-600" />
                  WhatsApp সংযোগ
                </CardTitle>
                <CardDescription>
                  QR কোড স্ক্যান করে WhatsApp নম্বর সংযুক্ত করুন। প্রতিটি নম্বর একটি আলাদা সেশন।
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Quick steps */}
                <div className="rounded-lg border bg-muted/30 p-4 space-y-3 text-sm">
                  <p className="font-medium">সংযুক্ত করার ধাপ:</p>
                  <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                    <li>"নতুন WhatsApp যোগ করুন" বাটনে ক্লিক করুন</li>
                    <li>আপনার WhatsApp নম্বরের জন্য একটি নাম দিন</li>
                    <li>QR কোড তৈরি হলে আপনার ফোনের WhatsApp দিয়ে স্ক্যান করুন</li>
                    <li>সংযোগ সম্পন্ন হলে এখানে নম্বরটি দেখা যাবে</li>
                  </ol>
                </div>

                <div className="flex items-center gap-3">
                  <Button onClick={() => navigate('/instances/onboarding')}>
                    <Plus className="h-4 w-4 mr-2" />
                    নতুন WhatsApp যোগ করুন
                  </Button>
                  <Button variant="outline" onClick={() => navigate('/instances')}>
                    সব ইন্সট্যান্স দেখুন
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>

                {/* Instance quick list */}
                {instances.length > 0 && (
                  <div className="space-y-2 border-t pt-4">
                    <p className="text-sm font-medium">সংযুক্ত নম্বরসমূহ ({instances.length})</p>
                    {instances.slice(0, 5).map((inst) => (
                      <div
                        key={inst.id}
                        className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className={`h-2 w-2 rounded-full ${
                              inst.status === 'active' ? 'bg-green-500' : 'bg-muted-foreground/40'
                            }`}
                          />
                          <span className="font-medium">{inst.name}</span>
                          {inst.phone_number && (
                            <span className="text-muted-foreground">{inst.phone_number}</span>
                          )}
                        </div>
                        <Badge
                          variant={inst.status === 'active' ? 'default' : 'secondary'}
                          className={inst.status === 'active' ? 'bg-green-500 text-xs' : 'text-xs'}
                        >
                          {inst.status === 'active'
                            ? 'সক্রিয়'
                            : inst.status === 'banned'
                            ? 'ব্যান্ড'
                            : 'সংযোগ বিচ্ছিন্ন'}
                        </Badge>
                      </div>
                    ))}
                    {instances.length > 5 && (
                      <Button variant="ghost" size="sm" onClick={() => navigate('/instances')}>
                        আরও {instances.length - 5}টি দেখুন
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="facebook">
            {/* Full Facebook setup — reuse existing component */}
            <FacebookPagesSettings />
          </TabsContent>
        </Tabs>
      </m.div>
    </DashboardLayout>
  );
}
