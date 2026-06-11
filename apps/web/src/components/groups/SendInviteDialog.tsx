import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useContacts } from '@/hooks/useContacts';
import { useGroups } from '@/hooks/useGroups';
import { useTenant } from '@/hooks/useTenant';
import { Search, Send, Users, Eye } from 'lucide-react';
import { toast } from 'sonner';

interface SendInviteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
  groupName: string;
  inviteLink: string;
}

const DEFAULT_TEMPLATE = `প্রিয় {{customer_name}},

{{company_name}} এর পক্ষ থেকে আপনাকে আমাদের বিশেষ গ্রুপে যোগ দিতে আমন্ত্রণ জানাচ্ছি।

📱 গ্রুপে যোগ দিন: {{invite_link}}

এই গ্রুপে আপনি পাবেন:
✅ এক্সক্লুসিভ অফার ও ডিস্কাউন্ট
✅ নতুন প্রোডাক্ট আপডেট
✅ সরাসরি কাস্টমার সাপোর্ট

ধন্যবাদ,
{{company_name}}`;

export function SendInviteDialog({ 
  open, 
  onOpenChange, 
  groupId, 
  groupName,
  inviteLink 
}: SendInviteDialogProps) {
  const { contacts } = useContacts();
  const { sendInvites } = useGroups();
  const { currentTenant: tenant } = useTenant();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [template, setTemplate] = useState(DEFAULT_TEMPLATE);
  const [showPreview, setShowPreview] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setSelectedContacts([]);
      setSearchQuery('');
      setTemplate(DEFAULT_TEMPLATE);
    }
  }, [open]);

  const filteredContacts = contacts.filter(contact => {
    const matchesSearch = searchQuery === '' || 
      contact.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.phone_number.includes(searchQuery);
    return matchesSearch;
  });

  const toggleContact = (contactId: string) => {
    setSelectedContacts(prev =>
      prev.includes(contactId)
        ? prev.filter(p => p !== contactId)
        : [...prev, contactId]
    );
  };

  const toggleAll = () => {
    if (selectedContacts.length === filteredContacts.length) {
      setSelectedContacts([]);
    } else {
      setSelectedContacts(filteredContacts.map(c => c.id));
    }
  };

  const getPreviewMessage = () => {
    return template
      .replace(/{{customer_name}}/g, 'গ্রাহক নাম')
      .replace(/{{company_name}}/g, tenant?.name || 'আপনার কোম্পানি')
      .replace(/{{invite_link}}/g, inviteLink)
      .replace(/{{group_name}}/g, groupName);
  };

  const handleSubmit = async () => {
    if (selectedContacts.length === 0) {
      toast.error('অন্তত একজন কাস্টমার নির্বাচন করুন');
      return;
    }

    setLoading(true);
    try {
      const result = await sendInvites(groupId, selectedContacts, template);
      toast.success(`${result.sent} জনকে আমন্ত্রণ পাঠানো হয়েছে`);
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || 'আমন্ত্রণ পাঠাতে সমস্যা হয়েছে');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>গ্রুপ আমন্ত্রণ পাঠান: {groupName}</DialogTitle>
          <DialogDescription>
            আপনার কাস্টমারদের বাংলায় গ্রুপে যোগ দেওয়ার আমন্ত্রণ পাঠান
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden grid grid-cols-2 gap-4">
          {/* Left: Contact Selection */}
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="কাস্টমার খুঁজুন..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex items-center justify-between py-2 border-b">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={selectedContacts.length === filteredContacts.length && filteredContacts.length > 0}
                  onCheckedChange={toggleAll}
                />
                <span className="text-sm">সব নির্বাচন করুন</span>
              </div>
              {selectedContacts.length > 0 && (
                <Badge variant="secondary">
                  <Users className="h-3 w-3 mr-1" />
                  {selectedContacts.length}
                </Badge>
              )}
            </div>

            <ScrollArea className="h-[300px]">
              <div className="space-y-1">
                {filteredContacts.map((contact) => (
                  <div
                    key={contact.id}
                    className={`flex items-center gap-3 p-2 rounded-lg hover:bg-muted cursor-pointer ${
                      selectedContacts.includes(contact.id) ? 'bg-primary/10' : ''
                    }`}
                    onClick={() => toggleContact(contact.id)}
                  >
                    <Checkbox
                      checked={selectedContacts.includes(contact.id)}
                      onCheckedChange={() => toggleContact(contact.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {contact.name || contact.phone_number}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {contact.phone_number}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Right: Template & Preview */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>মেসেজ টেমপ্লেট</Label>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowPreview(!showPreview)}
              >
                <Eye className="h-4 w-4 mr-1" />
                {showPreview ? 'এডিট' : 'প্রিভিউ'}
              </Button>
            </div>

            {showPreview ? (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">মেসেজ প্রিভিউ</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-muted p-3 rounded-lg whitespace-pre-wrap text-sm">
                    {getPreviewMessage()}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Textarea
                value={template}
                onChange={(e) => setTemplate(e.target.value)}
                className="h-[350px] font-mono text-sm"
                placeholder="মেসেজ টেমপ্লেট লিখুন..."
              />
            )}

            <div className="text-xs text-muted-foreground space-y-1">
              <p><strong>ব্যবহারযোগ্য ভেরিয়েবল:</strong></p>
              <p>• {"{{customer_name}}"} - কাস্টমারের নাম</p>
              <p>• {"{{company_name}}"} - আপনার কোম্পানির নাম</p>
              <p>• {"{{invite_link}}"} - গ্রুপের ইনভাইট লিংক</p>
              <p>• {"{{group_name}}"} - গ্রুপের নাম</p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            বাতিল
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={selectedContacts.length === 0 || loading}
          >
            <Send className="h-4 w-4 mr-2" />
            {loading ? 'পাঠানো হচ্ছে...' : `${selectedContacts.length} জনকে আমন্ত্রণ পাঠান`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
