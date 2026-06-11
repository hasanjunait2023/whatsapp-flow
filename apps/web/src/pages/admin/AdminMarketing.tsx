import { useState } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Mail,
  MessageSquare,
  Users,
  TrendingUp,
  Calendar,
  Play,
  Pause,
  Plus,
  Settings,
  BarChart3,
  Target,
  Clock,
  RefreshCw,
  Zap,
  Send,
} from 'lucide-react';
import { useMarketingCampaigns } from '@/hooks/useMarketingCampaigns';
import { useMarketingEnrollments } from '@/hooks/useMarketingEnrollments';
import MarketingCampaignCard from '@/components/admin/marketing/MarketingCampaignCard';
import MarketingStatsCards from '@/components/admin/marketing/MarketingStatsCards';
import CreateCampaignDialog from '@/components/admin/marketing/CreateCampaignDialog';
import MarketingSettingsDialog from '@/components/admin/marketing/MarketingSettingsDialog';
import MarketingSendsTable from '@/components/admin/marketing/MarketingSendsTable';
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

  const filteredCampaigns = activeTab === 'all' 
    ? campaigns 
    : campaigns.filter((c) => c.type === activeTab);

  if (campaignsLoading || enrollmentsLoading) {
    return (
      <AdminLayout>
        <div className="space-y-6 p-6">
          <div className="flex items-center justify-between">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-10 w-32" />
          </div>
          <div className="grid gap-4 md:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          <Skeleton className="h-64" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Target className="h-6 w-6 text-primary" />
            মার্কেটিং অটোমেশন
          </h1>
          <p className="text-muted-foreground">
            প্রসপেক্ট ও সাবস্ক্রাইবারদের জন্য অটোমেটেড ক্যাম্পেইন পরিচালনা করুন
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button 
            variant="default" 
            size="sm" 
            onClick={handleManualRun} 
            disabled={running}
            className="bg-primary"
          >
            <Zap className="h-4 w-4 mr-2" />
            {running ? 'চলছে...' : 'এখনই চালান'}
          </Button>
          <Button variant="outline" size="sm" onClick={() => refetchCampaigns()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            রিফ্রেশ
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowSettingsDialog(true)}>
            <Settings className="h-4 w-4 mr-2" />
            সেটিংস
          </Button>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            নতুন ক্যাম্পেইন
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <MarketingStatsCards
        totalCampaigns={campaigns.length}
        activeCampaigns={activeCampaigns.length}
        totalEnrollments={stats.total}
        activeEnrollments={stats.active}
        completedEnrollments={stats.completed}
        unsubscribedEnrollments={stats.unsubscribed}
      />

      {/* Quick Overview */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-500" />
              প্রসপেক্ট নার্চারিং
            </CardTitle>
            <CardDescription>নতুন লিড থেকে কাস্টমার বানানো</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{prospectCampaigns.length}</p>
                <p className="text-xs text-muted-foreground">ক্যাম্পেইন</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold text-green-600">
                  {prospectCampaigns.filter((c) => c.status === 'active').length}
                </p>
                <p className="text-xs text-muted-foreground">অ্যাক্টিভ</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              সাবস্ক্রাইবার রিটেনশন
            </CardTitle>
            <CardDescription>বিদ্যমান কাস্টমার ধরে রাখা</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{retentionCampaigns.length}</p>
                <p className="text-xs text-muted-foreground">ক্যাম্পেইন</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold text-green-600">
                  {retentionCampaigns.filter((c) => c.status === 'active').length}
                </p>
                <p className="text-xs text-muted-foreground">অ্যাক্টিভ</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Campaigns List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            ক্যাম্পেইন সমূহ
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="all">সব ({campaigns.length})</TabsTrigger>
              <TabsTrigger value="prospect_nurture">
                প্রসপেক্ট ({prospectCampaigns.length})
              </TabsTrigger>
              <TabsTrigger value="subscriber_retention">
                রিটেনশন ({retentionCampaigns.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="space-y-4">
              {filteredCampaigns.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>কোনো ক্যাম্পেইন নেই</p>
                  <Button
                    variant="outline"
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
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
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
      </div>
    </AdminLayout>
  );
}
