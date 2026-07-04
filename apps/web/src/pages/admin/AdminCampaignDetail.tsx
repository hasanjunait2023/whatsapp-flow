import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AdminLayout from '@/components/layout/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { EmptyState } from '@/components/ui/empty-state';
import { KpiCard } from '@/components/dashboard/bento/KpiCard';
import { CampaignSequencesTile } from '@/components/admin/marketing/CampaignSequencesTile';
import { m, pageEnter, staggerContainer, staggerItem } from '@/lib/motion';
import { cn } from '@/lib/utils';
import {
  ArrowLeft,
  Plus,
  Edit,
  Trash2,
  MessageSquare,
  Mail,
  Calendar,
  Save,
  X,
  Target,
  Sparkles,
  Gift,
  Users,
  BookOpen,
  Heart,
  CheckCircle,
  Power,
} from 'lucide-react';
import { useMarketingCampaigns } from '@/hooks/useMarketingCampaigns';
import { useMarketingSequences, MarketingSequence, MarketingSequenceInput } from '@/hooks/useMarketingSequences';
import { toast } from 'sonner';

const THEME_OPTIONS = [
  { value: 'welcome', label: 'স্বাগতম', labelEn: 'Welcome', icon: Sparkles },
  { value: 'educational', label: 'শিক্ষামূলক', labelEn: 'Educational', icon: BookOpen },
  { value: 'feature', label: 'ফিচার পরিচয়', labelEn: 'Feature', icon: Target },
  { value: 'social_proof', label: 'সোশ্যাল প্রুফ', labelEn: 'Social Proof', icon: Users },
  { value: 'offer', label: 'অফার/ছাড়', labelEn: 'Offer', icon: Gift },
  { value: 'engagement', label: 'এনগেজমেন্ট', labelEn: 'Engagement', icon: Heart },
  { value: 'checkin', label: 'চেক-ইন', labelEn: 'Check-in', icon: CheckCircle },
];

const CHANNEL_OPTIONS = [
  { value: 'whatsapp', label: 'WhatsApp', icon: MessageSquare },
  { value: 'email', label: 'Email', icon: Mail },
  { value: 'both', label: 'উভয়', icon: MessageSquare },
];

export default function AdminCampaignDetail() {
  const { campaignId } = useParams<{ campaignId: string }>();
  const navigate = useNavigate();
  const { campaigns, loading: campaignsLoading } = useMarketingCampaigns();
  const { sequences, loading: sequencesLoading, createSequence, updateSequence, deleteSequence, refetch } = useMarketingSequences(campaignId);
  
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingSequence, setEditingSequence] = useState<MarketingSequence | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<Partial<MarketingSequenceInput>>({
    week_number: 1,
    step_order: 1,
    name: '',
    name_bn: '',
    theme: 'educational',
    channel: 'whatsapp',
    discount_percent: 0,
    ai_personalize: true,
    is_active: true,
    content_template: {
      wa_message_bn: '',
    },
  });

  const campaign = campaigns.find((c) => c.id === campaignId);

  const resetForm = () => {
    setFormData({
      week_number: 1,
      step_order: 1,
      name: '',
      name_bn: '',
      theme: 'educational',
      channel: 'whatsapp',
      discount_percent: 0,
      ai_personalize: true,
      is_active: true,
      content_template: {
        wa_message_bn: '',
      },
    });
  };

  const handleOpenAdd = () => {
    resetForm();
    setEditingSequence(null);
    setShowAddDialog(true);
  };

  const handleOpenEdit = (seq: MarketingSequence) => {
    setEditingSequence(seq);
    setFormData({
      week_number: seq.week_number,
      step_order: seq.step_order,
      name: seq.name,
      name_bn: seq.name_bn || '',
      theme: seq.theme || 'educational',
      channel: seq.channel,
      discount_percent: seq.discount_percent,
      ai_personalize: seq.ai_personalize,
      is_active: seq.is_active,
      content_template: seq.content_template,
    });
    setShowAddDialog(true);
  };

  const handleSave = async () => {
    if (!campaignId || isSaving) return;
    setIsSaving(true);
    try {
      if (editingSequence) {
        await updateSequence(editingSequence.id, formData);
        toast.success('সিকোয়েন্স আপডেট হয়েছে');
      } else {
        await createSequence({
          campaign_id: campaignId,
          week_number: formData.week_number!,
          step_order: formData.step_order!,
          name: formData.name!,
          name_bn: formData.name_bn,
          theme: formData.theme as MarketingSequence['theme'],
          channel: formData.channel as MarketingSequence['channel'],
          discount_percent: formData.discount_percent,
          ai_personalize: formData.ai_personalize,
          is_active: formData.is_active,
          content_template: formData.content_template!,
        });
        toast.success('নতুন সিকোয়েন্স যোগ হয়েছে');
      }
      setShowAddDialog(false);
      resetForm();
      refetch();
    } catch (error) {
      toast.error('সেভ করতে সমস্যা হয়েছে');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (seq: MarketingSequence) => {
    if (!confirm(`"${seq.name_bn || seq.name}" মুছে ফেলতে চান?`)) return;
    
    try {
      await deleteSequence(seq.id);
      toast.success('সিকোয়েন্স মুছে ফেলা হয়েছে');
      refetch();
    } catch (error) {
      toast.error('মুছতে সমস্যা হয়েছে');
    }
  };

  const getThemeConfig = (theme: string | null) => {
    return THEME_OPTIONS.find((t) => t.value === theme) || THEME_OPTIONS[1];
  };

  // Group sequences by week
  const sequencesByWeek = sequences.reduce((acc, seq) => {
    const week = seq.week_number;
    if (!acc[week]) acc[week] = [];
    acc[week].push(seq);
    return acc;
  }, {} as Record<number, MarketingSequence[]>);

  const sortedWeeks = Object.keys(sequencesByWeek)
    .map(Number)
    .sort((a, b) => a - b);

  // KPI metrics derived from real sequence data (presentation only).
  const activeCount = sequences.filter((s) => s.is_active).length;
  const whatsappCount = sequences.filter((s) => s.channel === 'whatsapp' || s.channel === 'both').length;

  if (campaignsLoading || sequencesLoading) {
    return (
      <AdminLayout>
        <div className="mx-auto w-full max-w-[1440px] space-y-6 p-4 md:p-6">
          <Skeleton className="h-9 w-64" />
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 sm:gap-5">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-[120px] w-full rounded-card" />
            ))}
          </div>
          <Skeleton className="h-64 w-full rounded-card" />
        </div>
      </AdminLayout>
    );
  }

  if (!campaign) {
    return (
      <AdminLayout>
        <div className="mx-auto w-full max-w-[1440px] p-4 md:p-6">
          <Card>
            <CardContent className="py-4">
              <EmptyState
                icon={Target}
                title="ক্যাম্পেইন পাওয়া যায়নি"
                description="The campaign you are looking for does not exist or has been removed."
                action={{ label: 'ফিরে যান', onClick: () => navigate('/admin/marketing'), icon: ArrowLeft }}
              />
            </CardContent>
          </Card>
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
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/admin/marketing')}
              className="min-h-[44px] min-w-[44px] shrink-0"
              aria-label="ফিরে যান"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-bold tracking-tight md:text-3xl">
                {campaign.name_bn || campaign.name}
              </h1>
              <p className="text-sm text-muted-foreground">
                <span className="tabular-nums">{sequences.length}</span>টি সিকোয়েন্স • সর্বোচ্চ{' '}
                <span className="tabular-nums">{campaign.max_discount_percent}</span>% ছাড়
              </p>
            </div>
          </div>
          <Button onClick={handleOpenAdd} className="min-h-[44px] self-start sm:min-h-0 sm:self-auto">
            <Plus className="h-4 w-4 mr-2" />
            নতুন সিকোয়েন্স
          </Button>
        </header>

        {/* KPI strip — 3 stat cards + the ONE orange Sequences tile */}
        <m.div
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="grid grid-cols-2 gap-4 lg:grid-cols-4 sm:gap-5"
        >
          <KpiCard title="Active" value={activeCount} icon={Power} tone="success" />
          <KpiCard title="WhatsApp" value={whatsappCount} icon={MessageSquare} tone="info" />
          <KpiCard title="Max ছাড়" value={campaign.max_discount_percent} icon={Gift} tone="warning" />
          <m.div variants={staggerItem}>
            <CampaignSequencesTile total={sequences.length} weeks={sortedWeeks.length} />
          </m.div>
        </m.div>

        {/* Sequences List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              সিকোয়েন্স টাইমলাইন (52 সপ্তাহ)
            </CardTitle>
            <CardDescription>
              প্রতি সপ্তাহে কোন মেসেজ পাঠানো হবে তা এখানে সেট করুন
            </CardDescription>
          </CardHeader>
          <CardContent>
            {sequences.length === 0 ? (
              <EmptyState
                icon={MessageSquare}
                title="কোনো সিকোয়েন্স নেই"
                description="প্রতি সপ্তাহে কোন মেসেজ পাঠানো হবে তা সেট করতে প্রথম সিকোয়েন্স যোগ করুন।"
                action={{ label: 'প্রথম সিকোয়েন্স যোগ করুন', onClick: handleOpenAdd, icon: Plus }}
                className="py-12"
              />
            ) : (
              <div className="space-y-4">
                {sortedWeeks.map((week) => (
                  <div key={week} className="rounded-card border border-border p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <Badge variant="neutral-soft" className="font-mono tabular-nums">
                        Week {week}
                      </Badge>
                      <span className="text-sm text-muted-foreground tabular-nums">সপ্তাহ {week}</span>
                    </div>
                    <div className="space-y-2">
                      {sequencesByWeek[week]
                        .sort((a, b) => a.step_order - b.step_order)
                        .map((seq) => {
                          const themeConfig = getThemeConfig(seq.theme);
                          const ThemeIcon = themeConfig.icon;

                          return (
                            <div
                              key={seq.id}
                              className={cn(
                                'flex items-start gap-3 rounded-control border border-border p-3 transition-colors',
                                seq.is_active ? 'bg-card hover:bg-muted-soft' : 'bg-muted/50 opacity-60',
                              )}
                            >
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                                <ThemeIcon className="h-4 w-4" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="mb-1 flex flex-wrap items-center gap-2">
                                  <span className="text-sm font-medium">{seq.name_bn || seq.name}</span>
                                  <Badge variant="neutral-soft" className="text-xs">
                                    {themeConfig.label}
                                  </Badge>
                                  {seq.discount_percent > 0 && (
                                    <Badge variant="warning-soft" className="text-xs tabular-nums">
                                      {seq.discount_percent}% ছাড়
                                    </Badge>
                                  )}
                                  {(seq.channel === 'whatsapp' || seq.channel === 'both') && (
                                    <MessageSquare className="h-3.5 w-3.5 text-whatsapp" aria-label="WhatsApp" />
                                  )}
                                  {(seq.channel === 'email' || seq.channel === 'both') && (
                                    <Mail className="h-3.5 w-3.5 text-info" aria-label="Email" />
                                  )}
                                  {!seq.is_active && (
                                    <Badge variant="neutral-soft" className="text-xs">
                                      নিষ্ক্রিয়
                                    </Badge>
                                  )}
                                </div>
                                <p className="line-clamp-2 text-xs text-muted-foreground">
                                  {seq.content_template?.wa_message_bn || 'No message content'}
                                </p>
                              </div>
                              <div className="flex shrink-0 gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-9 w-9"
                                  onClick={() => handleOpenEdit(seq)}
                                  aria-label="এডিট"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-9 w-9 text-destructive hover:text-destructive"
                                  onClick={() => handleDelete(seq)}
                                  aria-label="মুছুন"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Add/Edit Dialog */}
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>
                {editingSequence ? 'সিকোয়েন্স এডিট করুন' : 'নতুন সিকোয়েন্স যোগ করুন'}
              </DialogTitle>
            </DialogHeader>
            <ScrollArea className="max-h-[60vh] pr-4">
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>সপ্তাহ নম্বর</Label>
                    <Input
                      type="number"
                      min={1}
                      max={52}
                      value={formData.week_number}
                      onChange={(e) => setFormData({ ...formData, week_number: parseInt(e.target.value) || 1 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>স্টেপ অর্ডার</Label>
                    <Input
                      type="number"
                      min={1}
                      value={formData.step_order}
                      onChange={(e) => setFormData({ ...formData, step_order: parseInt(e.target.value) || 1 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>ছাড় (%)</Label>
                    <Input
                      type="number"
                      min={0}
                      max={15}
                      value={formData.discount_percent}
                      onChange={(e) => setFormData({ ...formData, discount_percent: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>নাম (English)</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., Welcome Message"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>নাম (বাংলা)</Label>
                    <Input
                      value={formData.name_bn}
                      onChange={(e) => setFormData({ ...formData, name_bn: e.target.value })}
                      placeholder="যেমন: স্বাগতম মেসেজ"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>থিম</Label>
                    <Select
                      value={formData.theme || 'educational'}
                      onValueChange={(v) => setFormData({ ...formData, theme: v as MarketingSequence['theme'] })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {THEME_OPTIONS.map((theme) => (
                          <SelectItem key={theme.value} value={theme.value}>
                            <div className="flex items-center gap-2">
                              <theme.icon className="h-4 w-4" />
                              {theme.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>চ্যানেল</Label>
                    <Select
                      value={formData.channel || 'whatsapp'}
                      onValueChange={(v) => setFormData({ ...formData, channel: v as MarketingSequence['channel'] })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CHANNEL_OPTIONS.map((ch) => (
                          <SelectItem key={ch.value} value={ch.value}>
                            <div className="flex items-center gap-2">
                              <ch.icon className="h-4 w-4" />
                              {ch.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>WhatsApp মেসেজ (বাংলা)</Label>
                  <Textarea
                    rows={6}
                    value={formData.content_template?.wa_message_bn || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        content_template: {
                          ...formData.content_template,
                          wa_message_bn: e.target.value,
                        },
                      })
                    }
                    placeholder="মেসেজ লিখুন... {{name}} দিয়ে নাম যোগ করতে পারেন"
                  />
                  <p className="text-xs text-muted-foreground">
                    Variables: {'{{name}}'}, {'{{signup_link}}'}, {'{{offer_end_date}}'}
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={formData.ai_personalize}
                      onCheckedChange={(v) => setFormData({ ...formData, ai_personalize: v })}
                    />
                    <Label>AI Personalization</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={formData.is_active}
                      onCheckedChange={(v) => setFormData({ ...formData, is_active: v })}
                    />
                    <Label>সক্রিয়</Label>
                  </div>
                </div>
              </div>
            </ScrollArea>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                <X className="h-4 w-4 mr-2" />
                বাতিল
              </Button>
              <Button onClick={handleSave} disabled={!formData.name || isSaving}>
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? 'সেভ হচ্ছে...' : editingSequence ? 'আপডেট করুন' : 'যোগ করুন'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </m.div>
    </AdminLayout>
  );
}
