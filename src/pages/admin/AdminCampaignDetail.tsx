import { useState, useEffect } from 'react';
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
import {
  ArrowLeft,
  Plus,
  Edit,
  Trash2,
  MessageSquare,
  Mail,
  Calendar,
  Percent,
  Save,
  X,
  Target,
  Sparkles,
  Gift,
  Users,
  BookOpen,
  Heart,
  CheckCircle,
} from 'lucide-react';
import { useMarketingCampaigns, MarketingCampaign } from '@/hooks/useMarketingCampaigns';
import { useMarketingSequences, MarketingSequence, MarketingSequenceInput } from '@/hooks/useMarketingSequences';
import { toast } from 'sonner';

const THEME_OPTIONS = [
  { value: 'welcome', label: 'স্বাগতম', labelEn: 'Welcome', icon: Sparkles, color: 'text-yellow-500 bg-yellow-500/10' },
  { value: 'educational', label: 'শিক্ষামূলক', labelEn: 'Educational', icon: BookOpen, color: 'text-blue-500 bg-blue-500/10' },
  { value: 'feature', label: 'ফিচার পরিচয়', labelEn: 'Feature', icon: Target, color: 'text-purple-500 bg-purple-500/10' },
  { value: 'social_proof', label: 'সোশ্যাল প্রুফ', labelEn: 'Social Proof', icon: Users, color: 'text-green-500 bg-green-500/10' },
  { value: 'offer', label: 'অফার/ছাড়', labelEn: 'Offer', icon: Gift, color: 'text-red-500 bg-red-500/10' },
  { value: 'engagement', label: 'এনগেজমেন্ট', labelEn: 'Engagement', icon: Heart, color: 'text-pink-500 bg-pink-500/10' },
  { value: 'checkin', label: 'চেক-ইন', labelEn: 'Check-in', icon: CheckCircle, color: 'text-cyan-500 bg-cyan-500/10' },
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
    if (!campaignId) return;
    
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

  if (campaignsLoading || sequencesLoading) {
    return (
      <AdminLayout>
        <div className="p-6 space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-32" />
          <Skeleton className="h-64" />
        </div>
      </AdminLayout>
    );
  }

  if (!campaign) {
    return (
      <AdminLayout>
        <div className="p-6">
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">ক্যাম্পেইন পাওয়া যায়নি</p>
              <Button variant="outline" className="mt-4" onClick={() => navigate('/admin/marketing')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                ফিরে যান
              </Button>
            </CardContent>
          </Card>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/admin/marketing')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{campaign.name_bn || campaign.name}</h1>
              <p className="text-muted-foreground text-sm">
                {sequences.length}টি সিকোয়েন্স • সর্বোচ্চ {campaign.max_discount_percent}% ছাড়
              </p>
            </div>
          </div>
          <Button onClick={handleOpenAdd}>
            <Plus className="h-4 w-4 mr-2" />
            নতুন সিকোয়েন্স
          </Button>
        </div>

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
              <div className="text-center py-12">
                <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">কোনো সিকোয়েন্স নেই</p>
                <Button variant="outline" className="mt-4" onClick={handleOpenAdd}>
                  <Plus className="h-4 w-4 mr-2" />
                  প্রথম সিকোয়েন্স যোগ করুন
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {sortedWeeks.map((week) => (
                  <div key={week} className="border rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Badge variant="outline" className="font-mono">
                        Week {week}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        সপ্তাহ {week}
                      </span>
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
                              className={`flex items-start gap-3 p-3 rounded-lg border ${
                                seq.is_active ? 'bg-background' : 'bg-muted/50 opacity-60'
                              }`}
                            >
                              <div className={`p-2 rounded-lg shrink-0 ${themeConfig.color}`}>
                                <ThemeIcon className="h-4 w-4" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-medium text-sm">
                                    {seq.name_bn || seq.name}
                                  </span>
                                  <Badge variant="secondary" className="text-xs">
                                    {themeConfig.label}
                                  </Badge>
                                  {seq.discount_percent > 0 && (
                                    <Badge variant="destructive" className="text-xs">
                                      {seq.discount_percent}% ছাড়
                                    </Badge>
                                  )}
                                  {seq.channel === 'whatsapp' && (
                                    <MessageSquare className="h-3 w-3 text-green-500" />
                                  )}
                                  {seq.channel === 'email' && (
                                    <Mail className="h-3 w-3 text-blue-500" />
                                  )}
                                  {!seq.is_active && (
                                    <Badge variant="outline" className="text-xs">
                                      নিষ্ক্রিয়
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground line-clamp-2">
                                  {seq.content_template?.wa_message_bn || 'No message content'}
                                </p>
                              </div>
                              <div className="flex gap-1 shrink-0">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => handleOpenEdit(seq)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive"
                                  onClick={() => handleDelete(seq)}
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
              <Button onClick={handleSave} disabled={!formData.name}>
                <Save className="h-4 w-4 mr-2" />
                {editingSequence ? 'আপডেট করুন' : 'যোগ করুন'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
