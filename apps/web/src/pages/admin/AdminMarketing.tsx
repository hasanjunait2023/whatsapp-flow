import { useState } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Users,
  TrendingUp,
  Plus,
  Settings,
  BarChart3,
  Target,
  RefreshCw,
  Zap,
  Send,
  Megaphone,
} from 'lucide-react';
import { useMarketingCampaigns } from '@/hooks/useMarketingCampaigns';
import { useMarketingEnrollments } from '@/hooks/useMarketingEnrollments';
import MarketingCampaignCard from '@/components/admin/marketing/MarketingCampaignCard';
import CreateCampaignDialog from '@/components/admin/marketing/CreateCampaignDialog';
import MarketingSettingsDialog from '@/components/admin/marketing/MarketingSettingsDialog';
import MarketingSendsTable from '@/components/admin/marketing/MarketingSendsTable';
import { KpiCard } from '@/components/dashboard/bento/KpiCard';
import { m, pageEnter, staggerContainer, staggerItem, useCountUp } from '@/lib/motion';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function AdminMarketing() {
  const { campaigns, loading: campaignsLoading, refetch: refetchCampaigns } = useMarketingCampaigns();
  const { enrollments, loading: enrollmentsLoading, getEnrollmentStats } = useMarketingEnrollments();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [running, setRunning] = useState(false);

  const handleManualRun = async () => {
    setRunning(true);
    try {
      const response = await supabase.functions.invoke('marketing-automation-cron');
      if (response.error) throw response.error;
      const data = response.data as { processed?: number; sent?: number; skipped?: number; retried?: number };
      toast.success(`প্রসেস হয়েছে: ${data.processed || 0}, পাঠানো হয়েছে: ${data.sent || 0}`);
      refetchCampaigns();
    } catch (error) {
      console.error('Manual run error:', error);
      toast.error('চালাতে ব্যর্থ হয়েছে');
    } finally {
      setRunning(false);
    }
  };

  const stats = getEnrollmentStats();
  const activeCampaigns = campaigns.filter((c) => c.status === 'active');
  const prospectCampaigns = campaigns.filter((c) => c.type === 'prospect_nurture');
  const retentionCampaigns = campaigns.filter((c) => c.type === 'subscriber_retention');

  // Total messages sent across all enrollments — the hero focal metric.
  const totalSent = enrollments.reduce((sum, e) => sum + (e.total_messages_sent || 0), 0);
  const heroSent = useCountUp(totalSent);
  // Conversion = completed journeys / total enrollments.
  const conversionPct = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  const filteredCampaigns = activeTab === 'all'
    ? campaigns
    : campaigns.filter((c) => c.type === activeTab);

  if (campaignsLoading || enrollmentsLoading) {
    return (
      <AdminLayout>
        <div className="mx-auto w-full max-w-[1440px] space-y-6 p-4 md:p-6">
          <div className="flex items-center justify-between">
            <Skeleton className="h-9 w-56" />
            <Skeleton className="h-11 w-32" />
          </div>
          <div className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-32 rounded-card" />
            ))}
          </div>
          <Skeleton className="h-64 rounded-card" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <m.div
        variants={pageEnter}
        initial="hidden"
        animate="show"
        className="mx-auto w-full max-w-[1440px] space-y-6 p-4 md:p-6"
      >
        {/* Header */}
        <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-1">
            <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight md:text-3xl">
              <Megaphone className="h-6 w-6 text-primary" aria-hidden />
              মার্কেটিং অটোমেশন
            </h1>
            <p className="text-sm text-muted-foreground">
              প্রসপেক্ট ও সাবস্ক্রাইবারদের জন্য অটোমেটেড ক্যাম্পেইন পরিচালনা করুন
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={handleManualRun}
              disabled={running}
              className="min-h-[44px] sm:min-h-0"
            >
              <Zap className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">{running ? 'চলছে...' : 'এখনই চালান'}</span>
            </Button>
            <Button variant="outline" size="sm" onClick={() => refetchCampaigns()} className="min-h-[44px] sm:min-h-0">
              <RefreshCw className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">রিফ্রেশ</span>
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowSettingsDialog(true)} className="min-h-[44px] sm:min-h-0">
              <Settings className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">সেটিংস</span>
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setShowCreateDialog(true)} className="min-h-[44px] sm:min-h-0">
              <Plus className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">নতুন ক্যাম্পেইন</span>
            </Button>
          </div>
        </header>

        {/* KPI strip — three token tiles + ONE orange focal (total sent) */}
        <m.div
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4"
        >
          <m.div variants={staggerItem}>
            <KpiCard title="Campaigns" value={campaigns.length} icon={Target} tone="info" />
          </m.div>

          {/* The single orange focal tile — total messages sent. */}
          <m.div variants={staggerItem} whileHover={{ y: -2 }} transition={{ duration: 0.15 }} className="h-full">
            <div className="relative flex h-full min-h-[132px] flex-col justify-between overflow-hidden rounded-card bg-primary p-5 text-primary-foreground shadow-elevation-accent">
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/15 via-transparent to-black/10"
              />
              <div className="relative z-10 flex items-start justify-between gap-3">
                <p className="text-sm font-medium text-primary-foreground/85">Messages sent</p>
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
                  <Send className="h-5 w-5" aria-hidden />
                </span>
              </div>
              <p className="relative z-10 tabular-nums text-2xl font-bold leading-none tracking-tight md:text-3xl">
                {heroSent.toLocaleString('en-US')}
              </p>
              <div className="relative z-10 flex items-center gap-2">
                <span className="inline-flex items-center gap-0.5 rounded-full bg-white/20 px-2 py-0.5 text-xs font-semibold tabular-nums">
                  <Users className="h-3 w-3" aria-hidden />
                  {stats.total.toLocaleString('en-US')}
                </span>
                <span className="text-xs text-primary-foreground/80">enrollments</span>
              </div>
            </div>
          </m.div>

          <m.div variants={staggerItem}>
            <KpiCard title="Active now" value={activeCampaigns.length} icon={Zap} tone="success" />
          </m.div>
          <m.div variants={staggerItem}>
            <KpiCard
              title="Conversion"
              value={conversionPct}
              format={(v) => `${Math.round(v)}%`}
              icon={TrendingUp}
              tone="primary"
            />
          </m.div>
        </m.div>

        {/* Quick Overview */}
        <div className="grid gap-5 sm:gap-6 md:grid-cols-2">
          <m.div {...{ whileHover: { y: -2 }, transition: { duration: 0.15 } }}>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-info-soft text-info">
                    <Users className="h-4 w-4" aria-hidden />
                  </span>
                  প্রসপেক্ট নার্চারিং
                </CardTitle>
                <CardDescription>নতুন লিড থেকে কাস্টমার বানানো</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-end justify-between">
                  <div>
                    <p className="tabular-nums text-2xl font-bold">{prospectCampaigns.length}</p>
                    <p className="text-xs text-muted-foreground">ক্যাম্পেইন</p>
                  </div>
                  <Badge variant="success-soft" className="gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-success" aria-hidden />
                    <span className="tabular-nums">
                      {prospectCampaigns.filter((c) => c.status === 'active').length}
                    </span>
                    অ্যাক্টিভ
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </m.div>

          <m.div {...{ whileHover: { y: -2 }, transition: { duration: 0.15 } }}>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-success-soft text-success">
                    <TrendingUp className="h-4 w-4" aria-hidden />
                  </span>
                  সাবস্ক্রাইবার রিটেনশন
                </CardTitle>
                <CardDescription>বিদ্যমান কাস্টমার ধরে রাখা</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-end justify-between">
                  <div>
                    <p className="tabular-nums text-2xl font-bold">{retentionCampaigns.length}</p>
                    <p className="text-xs text-muted-foreground">ক্যাম্পেইন</p>
                  </div>
                  <Badge variant="success-soft" className="gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-success" aria-hidden />
                    <span className="tabular-nums">
                      {retentionCampaigns.filter((c) => c.status === 'active').length}
                    </span>
                    অ্যাক্টিভ
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </m.div>
        </div>

        {/* Campaigns List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base md:text-lg">
              <BarChart3 className="h-5 w-5 text-muted-foreground" />
              ক্যাম্পেইন সমূহ
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <div className="-mx-1 overflow-x-auto px-1 pb-2">
                <TabsList className="mb-4 inline-flex min-w-max">
                  <TabsTrigger value="all">সব ({campaigns.length})</TabsTrigger>
                  <TabsTrigger value="prospect_nurture">
                    প্রসপেক্ট ({prospectCampaigns.length})
                  </TabsTrigger>
                  <TabsTrigger value="subscriber_retention">
                    রিটেনশন ({retentionCampaigns.length})
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value={activeTab} className="space-y-4">
                {filteredCampaigns.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <span className="flex h-12 w-12 items-center justify-center rounded-control bg-accent text-primary">
                      <Target className="h-6 w-6" aria-hidden />
                    </span>
                    <p className="mt-4 text-sm text-muted-foreground">কোনো ক্যাম্পেইন নেই</p>
                    <Button
                      variant="secondary"
                      className="mt-4"
                      onClick={() => setShowCreateDialog(true)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      প্রথম ক্যাম্পেইন তৈরি করুন
                    </Button>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {filteredCampaigns.map((campaign) => (
                      <MarketingCampaignCard
                        key={campaign.id}
                        campaign={campaign}
                        onRefresh={refetchCampaigns}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Sends Monitoring */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base md:text-lg">
              <Send className="h-5 w-5 text-muted-foreground" />
              মেসেজ Sends
            </CardTitle>
            <CardDescription>সাম্প্রতিক পাঠানো মার্কেটিং মেসেজসমূহ</CardDescription>
          </CardHeader>
          <CardContent>
            <MarketingSendsTable />
          </CardContent>
        </Card>

        {/* Dialogs */}
        <CreateCampaignDialog
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
          onCreated={refetchCampaigns}
        />
        <MarketingSettingsDialog
          open={showSettingsDialog}
          onOpenChange={setShowSettingsDialog}
        />
      </m.div>
    </AdminLayout>
  );
}
