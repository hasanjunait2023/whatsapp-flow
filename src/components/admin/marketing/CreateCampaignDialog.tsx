import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useMarketingCampaigns, MarketingCampaignInput } from '@/hooks/useMarketingCampaigns';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface CreateCampaignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

export default function CreateCampaignDialog({
  open,
  onOpenChange,
  onCreated,
}: CreateCampaignDialogProps) {
  const { createCampaign } = useMarketingCampaigns();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<MarketingCampaignInput>({
    name: '',
    name_bn: '',
    type: 'prospect_nurture',
    frequency_per_week: 1,
    frequency_per_month: 4,
    min_days_between_messages: 2,
    max_discount_percent: 10,
    use_whatsapp: true,
    use_email: true,
    alternate_channels: true,
    blackout_hours: { start: '22:00', end: '08:00' },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('ক্যাম্পেইনের নাম দিন');
      return;
    }

    setLoading(true);
    try {
      await createCampaign(formData);
      toast.success('ক্যাম্পেইন তৈরি হয়েছে');
      onOpenChange(false);
      onCreated();
      // Reset form
      setFormData({
        name: '',
        name_bn: '',
        type: 'prospect_nurture',
        frequency_per_week: 1,
        frequency_per_month: 4,
        min_days_between_messages: 2,
        max_discount_percent: 10,
        use_whatsapp: true,
        use_email: true,
        alternate_channels: true,
        blackout_hours: { start: '22:00', end: '08:00' },
      });
    } catch (error) {
      toast.error('ক্যাম্পেইন তৈরি ব্যর্থ হয়েছে');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>নতুন ক্যাম্পেইন তৈরি</DialogTitle>
          <DialogDescription>
            মার্কেটিং অটোমেশন ক্যাম্পেইন তৈরি করুন
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="name">ক্যাম্পেইন নাম (English)</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Prospect Nurture 2024"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="name_bn">ক্যাম্পেইন নাম (বাংলা)</Label>
              <Input
                id="name_bn"
                value={formData.name_bn || ''}
                onChange={(e) => setFormData({ ...formData, name_bn: e.target.value })}
                placeholder="যেমন: প্রসপেক্ট নার্চারিং ২০২৪"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="type">ক্যাম্পেইন ধরন</Label>
              <Select
                value={formData.type}
                onValueChange={(value: any) => setFormData({ ...formData, type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="prospect_nurture">প্রসপেক্ট নার্চারিং</SelectItem>
                  <SelectItem value="subscriber_retention">সাবস্ক্রাইবার রিটেনশন</SelectItem>
                  <SelectItem value="pro_ai_onboard">Pro AI অনবোর্ডিং</SelectItem>
                  <SelectItem value="win_back">উইন-ব্যাক</SelectItem>
                  <SelectItem value="announcement">ঘোষণা</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="frequency_per_week">সপ্তাহে মেসেজ</Label>
                <Input
                  id="frequency_per_week"
                  type="number"
                  min={1}
                  max={7}
                  value={formData.frequency_per_week}
                  onChange={(e) =>
                    setFormData({ ...formData, frequency_per_week: parseInt(e.target.value) || 1 })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="min_days_between">মিনিমাম গ্যাপ (দিন)</Label>
                <Input
                  id="min_days_between"
                  type="number"
                  min={1}
                  value={formData.min_days_between_messages}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      min_days_between_messages: parseInt(e.target.value) || 2,
                    })
                  }
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="max_discount">সর্বোচ্চ ডিসকাউন্ট (%)</Label>
              <Input
                id="max_discount"
                type="number"
                min={0}
                max={10}
                value={formData.max_discount_percent}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    max_discount_percent: Math.min(10, parseInt(e.target.value) || 0),
                  })
                }
              />
              <p className="text-xs text-muted-foreground">সর্বোচ্চ ১০% পর্যন্ত</p>
            </div>

            <div className="space-y-3">
              <Label>চ্যানেল</Label>
              <div className="flex items-center justify-between">
                <span className="text-sm">WhatsApp</span>
                <Switch
                  checked={formData.use_whatsapp}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, use_whatsapp: checked })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Email</span>
                <Switch
                  checked={formData.use_email}
                  onCheckedChange={(checked) => setFormData({ ...formData, use_email: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">চ্যানেল পাল্টে পাল্টে পাঠাও</span>
                <Switch
                  checked={formData.alternate_channels}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, alternate_channels: checked })
                  }
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              বাতিল
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              তৈরি করুন
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
