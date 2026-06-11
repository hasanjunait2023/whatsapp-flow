import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, MessageSquare, Mail, Percent } from 'lucide-react';

interface MarketingSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function MarketingSettingsDialog({
  open,
  onOpenChange,
}: MarketingSettingsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>মার্কেটিং গ্লোবাল সেটিংস</DialogTitle>
          <DialogDescription>
            সব ক্যাম্পেইনের জন্য ডিফল্ট সেটিংস
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4" />
                ফ্রিকোয়েন্সি সেটিংস
              </CardTitle>
              <CardDescription>মেসেজ পাঠানোর নিয়ম</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>প্রতি সপ্তাহে মেসেজ</Label>
                  <Input type="number" value={1} min={1} max={7} readOnly />
                  <p className="text-xs text-muted-foreground">ডিফল্ট: ১টি</p>
                </div>
                <div className="space-y-2">
                  <Label>প্রতি মাসে মিনিমাম</Label>
                  <Input type="number" value={4} min={1} readOnly />
                  <p className="text-xs text-muted-foreground">ডিফল্ট: ৪টি</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>মেসেজের মধ্যে গ্যাপ (দিন)</Label>
                  <Input type="number" value={2} min={1} readOnly />
                </div>
                <div className="space-y-2">
                  <Label>ব্ল্যাকআউট সময়</Label>
                  <Input type="text" value="22:00 - 08:00" readOnly />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                চ্যানেল সেটিংস
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                <span className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-green-500" />
                  WhatsApp
                </span>
                <span className="text-sm text-muted-foreground">চালু</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                <span className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-blue-500" />
                  Email
                </span>
                <span className="text-sm text-muted-foreground">চালু</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Percent className="h-4 w-4" />
                ডিসকাউন্ট সেটিংস
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label>সর্বোচ্চ ডিসকাউন্ট</Label>
                <div className="flex items-center gap-2">
                  <Input type="number" value={10} max={10} readOnly className="w-24" />
                  <span>%</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  কোনো ক্যাম্পেইনে ১০% এর বেশি ডিসকাউন্ট দেওয়া যাবে না
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
