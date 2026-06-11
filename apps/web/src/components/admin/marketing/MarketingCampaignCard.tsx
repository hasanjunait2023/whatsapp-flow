import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Play,
  Pause,
  MoreVertical,
  Edit,
  Trash2,
  Mail,
  MessageSquare,
  Clock,
  Calendar,
  Users,
  Target,
  TrendingUp,
} from 'lucide-react';
import { MarketingCampaign, useMarketingCampaigns } from '@/hooks/useMarketingCampaigns';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface MarketingCampaignCardProps {
  campaign: MarketingCampaign;
  onRefresh: () => void;
}

const TYPE_LABELS: Record<string, { label: string; icon: typeof Target; color: string }> = {
  prospect_nurture: {
    label: 'প্রসপেক্ট নার্চারিং',
    icon: Users,
    color: 'text-blue-500 bg-blue-500/10',
  },
  subscriber_retention: {
    label: 'সাবস্ক্রাইবার রিটেনশন',
    icon: TrendingUp,
    color: 'text-green-500 bg-green-500/10',
  },
  pro_ai_onboard: {
    label: 'Pro AI অনবোর্ডিং',
    icon: Target,
    color: 'text-purple-500 bg-purple-500/10',
  },
  win_back: {
    label: 'উইন-ব্যাক',
    icon: Target,
    color: 'text-orange-500 bg-orange-500/10',
  },
  announcement: {
    label: 'ঘোষণা',
    icon: Target,
    color: 'text-cyan-500 bg-cyan-500/10',
  },
};

const STATUS_BADGES: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  draft: { label: 'ড্রাফট', variant: 'outline' },
  active: { label: 'অ্যাক্টিভ', variant: 'default' },
  paused: { label: 'পজড', variant: 'secondary' },
  completed: { label: 'সম্পন্ন', variant: 'outline' },
};

export default function MarketingCampaignCard({ campaign, onRefresh }: MarketingCampaignCardProps) {
  const { toggleStatus, deleteCampaign } = useMarketingCampaigns();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const typeConfig = TYPE_LABELS[campaign.type] || TYPE_LABELS.announcement;
  const statusConfig = STATUS_BADGES[campaign.status] || STATUS_BADGES.draft;
  const TypeIcon = typeConfig.icon;

  const handleToggleStatus = async () => {
    setLoading(true);
    try {
      const newStatus = campaign.status === 'active' ? 'paused' : 'active';
      await toggleStatus(campaign.id, newStatus);
      toast.success(`ক্যাম্পেইন ${newStatus === 'active' ? 'চালু' : 'বন্ধ'} করা হয়েছে`);
      onRefresh();
    } catch (error) {
      toast.error('স্ট্যাটাস পরিবর্তন ব্যর্থ হয়েছে');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('আপনি কি নিশ্চিত? এই ক্যাম্পেইন মুছে ফেলা হবে।')) return;
    
    setLoading(true);
    try {
      await deleteCampaign(campaign.id);
      toast.success('ক্যাম্পেইন মুছে ফেলা হয়েছে');
      onRefresh();
    } catch (error) {
      toast.error('মুছে ফেলা ব্যর্থ হয়েছে');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className={campaign.status === 'active' ? 'border-primary/30' : ''}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-lg ${typeConfig.color}`}>
              <TypeIcon className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-medium">{campaign.name_bn || campaign.name}</h3>
                <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1">{typeConfig.label}</p>
              
              {/* Settings Summary */}
              <div className="flex flex-wrap gap-3 mt-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  সপ্তাহে {campaign.frequency_per_week}টা
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  গ্যাপ {campaign.min_days_between_messages} দিন
                </span>
                {campaign.use_whatsapp && (
                  <span className="flex items-center gap-1">
                    <MessageSquare className="h-3 w-3 text-green-500" />
                    WhatsApp
                  </span>
                )}
                {campaign.use_email && (
                  <span className="flex items-center gap-1">
                    <Mail className="h-3 w-3 text-blue-500" />
                    Email
                  </span>
                )}
                <span className="flex items-center gap-1">
                  সর্বোচ্চ {campaign.max_discount_percent}% ছাড়
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleToggleStatus}
              disabled={loading || campaign.status === 'completed'}
            >
              {campaign.status === 'active' ? (
                <>
                  <Pause className="h-4 w-4 mr-1" />
                  পজ
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-1" />
                  চালু
                </>
              )}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => navigate(`/admin/marketing/campaigns/${campaign.id}`)}>
                  <Edit className="h-4 w-4 mr-2" />
                  এডিট করুন
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  মুছে ফেলুন
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
