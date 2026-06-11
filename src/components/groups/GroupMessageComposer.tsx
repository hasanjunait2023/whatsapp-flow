import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useGroups } from '@/hooks/useGroups';
import { Send, Image, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface GroupMessageComposerProps {
  groupId: string;
  groupName: string;
}

export function GroupMessageComposer({ groupId, groupName }: GroupMessageComposerProps) {
  const { sendGroupMessage } = useGroups();
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!message.trim()) {
      toast.error('মেসেজ লিখুন');
      return;
    }

    setLoading(true);
    try {
      await sendGroupMessage(groupId, message);
      toast.success('মেসেজ পাঠানো হয়েছে');
      setMessage('');
    } catch (error: any) {
      toast.error(error.message || 'মেসেজ পাঠাতে সমস্যা হয়েছে');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">গ্রুপে মেসেজ পাঠান</CardTitle>
        <CardDescription>
          "{groupName}" গ্রুপের সব সদস্যকে মেসেজ পাঠান
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="আপনার মেসেজ লিখুন..."
          className="min-h-[150px]"
        />
        <div className="flex justify-between items-center">
          <Button variant="outline" size="sm" disabled>
            <Image className="h-4 w-4 mr-2" />
            ছবি যোগ করুন
          </Button>
          <Button onClick={handleSend} disabled={!message.trim() || loading}>
            {loading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            পাঠান
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
