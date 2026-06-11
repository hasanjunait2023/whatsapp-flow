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
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useContacts } from '@/hooks/useContacts';
import { useLabels } from '@/hooks/useLabels';
import { useGroups } from '@/hooks/useGroups';
import { Search, AlertTriangle, Calendar, Users, Clock } from 'lucide-react';
import { toast } from 'sonner';

interface AddMembersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
  groupName: string;
  onSuccess: () => void;
}

export function AddMembersDialog({ 
  open, 
  onOpenChange, 
  groupId, 
  groupName,
  onSuccess 
}: AddMembersDialogProps) {
  const { contacts } = useContacts();
  const { labels } = useLabels();
  const { dailyLimit, addParticipants, queueBatchAdd, refreshDailyLimit } = useGroups();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLabel, setSelectedLabel] = useState<string>('all');
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [addMode, setAddMode] = useState<'immediate' | 'scheduled'>('immediate');
  const [batchSize, setBatchSize] = useState(5);
  const [intervalMinutes, setIntervalMinutes] = useState(30);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      refreshDailyLimit();
      setSelectedContacts([]);
      setSearchQuery('');
      setSelectedLabel('all');
    }
  }, [open]);

  const filteredContacts = contacts.filter(contact => {
    const matchesSearch = searchQuery === '' || 
      contact.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.phone_number.includes(searchQuery);
    
    if (selectedLabel === 'all') return matchesSearch;
    
    // Filter by label - would need to join with contact_labels
    return matchesSearch;
  });

  const toggleContact = (phoneNumber: string) => {
    setSelectedContacts(prev =>
      prev.includes(phoneNumber)
        ? prev.filter(p => p !== phoneNumber)
        : [...prev, phoneNumber]
    );
  };

  const toggleAll = () => {
    if (selectedContacts.length === filteredContacts.length) {
      setSelectedContacts([]);
    } else {
      setSelectedContacts(filteredContacts.map(c => c.phone_number));
    }
  };

  const handleSubmit = async () => {
    if (selectedContacts.length === 0) {
      toast.error('অন্তত একজন সদস্য নির্বাচন করুন');
      return;
    }

    setLoading(true);
    try {
      if (addMode === 'immediate') {
        const remaining = dailyLimit?.remaining || 0;
        if (selectedContacts.length > remaining) {
          toast.error(`আজকে সর্বোচ্চ ${remaining} জন যোগ করতে পারবেন`);
          setLoading(false);
          return;
        }

        const result = await addParticipants(groupId, selectedContacts);
        toast.success(`${result.added} জন সদস্য যোগ হয়েছে`);
      } else {
        const result = await queueBatchAdd(groupId, selectedContacts, batchSize, intervalMinutes);
        toast.success(`${result.total_numbers} জন সদস্য ${result.days_needed} দিনে যোগ হবে`);
      }
      
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || 'সদস্য যোগ করতে সমস্যা হয়েছে');
    } finally {
      setLoading(false);
    }
  };

  const estimatedDays = Math.ceil(selectedContacts.length / 50);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>সদস্য যোগ করুন: {groupName}</DialogTitle>
          <DialogDescription>
            গ্রুপে নতুন সদস্য যোগ করুন
          </DialogDescription>
        </DialogHeader>

        {/* Daily Limit Alert */}
        {dailyLimit && (
          <Alert variant={dailyLimit.remaining < 10 ? 'destructive' : 'default'}>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              আজকের সীমা: {dailyLimit.members_added}/{dailyLimit.max_daily_limit} 
              ({dailyLimit.remaining} বাকি)
            </AlertDescription>
          </Alert>
        )}

        <div className="flex-1 overflow-hidden space-y-4">
          {/* Filters */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="নাম বা নম্বর দিয়ে খুঁজুন..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedLabel} onValueChange={setSelectedLabel}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="লেবেল ফিল্টার" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">সব কন্টাক্ট</SelectItem>
                {labels.map(label => (
                  <SelectItem key={label.id} value={label.id}>
                    {label.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Select All */}
          <div className="flex items-center justify-between py-2 border-b">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={selectedContacts.length === filteredContacts.length && filteredContacts.length > 0}
                onCheckedChange={toggleAll}
              />
              <span className="text-sm">সব নির্বাচন করুন ({filteredContacts.length})</span>
            </div>
            {selectedContacts.length > 0 && (
              <Badge variant="secondary">
                <Users className="h-3 w-3 mr-1" />
                {selectedContacts.length} নির্বাচিত
              </Badge>
            )}
          </div>

          {/* Contact List */}
          <ScrollArea className="h-[200px]">
            <div className="space-y-1">
              {filteredContacts.map((contact) => (
                <div
                  key={contact.id}
                  className={`flex items-center gap-3 p-2 rounded-lg hover:bg-muted cursor-pointer ${
                    selectedContacts.includes(contact.phone_number) ? 'bg-primary/10' : ''
                  }`}
                  onClick={() => toggleContact(contact.phone_number)}
                >
                  <Checkbox
                    checked={selectedContacts.includes(contact.phone_number)}
                    onCheckedChange={() => toggleContact(contact.phone_number)}
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

          {/* Add Mode Selection */}
          {selectedContacts.length > 0 && (
            <div className="border rounded-lg p-4 space-y-4">
              <Label>যোগ করার পদ্ধতি</Label>
              <RadioGroup value={addMode} onValueChange={(v) => setAddMode(v as 'immediate' | 'scheduled')}>
                <div className="flex items-start gap-3 p-3 border rounded-lg">
                  <RadioGroupItem value="immediate" id="immediate" className="mt-1" />
                  <div className="flex-1">
                    <Label htmlFor="immediate" className="font-medium cursor-pointer">
                      এখনই যোগ করুন
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      আজকে সর্বোচ্চ {dailyLimit?.remaining || 50} জন যোগ করতে পারবেন
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 border rounded-lg">
                  <RadioGroupItem value="scheduled" id="scheduled" className="mt-1" />
                  <div className="flex-1">
                    <Label htmlFor="scheduled" className="font-medium cursor-pointer">
                      ব্যাচ মোডে যোগ করুন
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      দৈনিক ৫০ জন করে নিরাপদে যোগ হবে
                    </p>
                  </div>
                </div>
              </RadioGroup>

              {addMode === 'scheduled' && (
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="space-y-2">
                    <Label htmlFor="batchSize">ব্যাচ সাইজ</Label>
                    <Select value={batchSize.toString()} onValueChange={(v) => setBatchSize(parseInt(v))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="3">৩ জন / ব্যাচ</SelectItem>
                        <SelectItem value="5">৫ জন / ব্যাচ</SelectItem>
                        <SelectItem value="10">১০ জন / ব্যাচ</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="interval">বিরতি</Label>
                    <Select value={intervalMinutes.toString()} onValueChange={(v) => setIntervalMinutes(parseInt(v))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="15">১৫ মিনিট</SelectItem>
                        <SelectItem value="30">৩০ মিনিট</SelectItem>
                        <SelectItem value="60">১ ঘণ্টা</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2 flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>আনুমানিক সময়: {estimatedDays} দিন</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            বাতিল
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={selectedContacts.length === 0 || loading}
          >
            {loading ? 'প্রসেস হচ্ছে...' : addMode === 'immediate' ? 'এখনই যোগ করুন' : 'সারিতে যোগ করুন'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
