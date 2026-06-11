import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useGroups, WhatsAppGroup, GroupParticipant } from '@/hooks/useGroups';
import { AddMembersDialog } from './AddMembersDialog';
import { SendInviteDialog } from './SendInviteDialog';
import { GroupMessageComposer } from './GroupMessageComposer';
import { 
  Users, 
  Link2, 
  Copy, 
  UserPlus, 
  UserMinus, 
  MessageSquare, 
  Send,
  RefreshCw,
  Search,
  Shield,
  Check
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface GroupDetailsSheetProps {
  groupId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GroupDetailsSheet({ groupId, open, onOpenChange }: GroupDetailsSheetProps) {
  const { getGroupMetadata, getGroupParticipants, removeParticipants, groups } = useGroups();
  const [group, setGroup] = useState<WhatsAppGroup | null>(null);
  const [participants, setParticipants] = useState<GroupParticipant[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [addMembersOpen, setAddMembersOpen] = useState(false);
  const [sendInviteOpen, setSendInviteOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (groupId && open) {
      loadGroupData();
    }
  }, [groupId, open]);

  const loadGroupData = async () => {
    if (!groupId) return;

    setLoading(true);
    try {
      // Get group from local state first
      const localGroup = groups.find(g => g.id === groupId);
      if (localGroup) {
        setGroup(localGroup);
      }

      // Get participants
      const participantData = await getGroupParticipants(groupId);
      setParticipants(participantData);
    } catch (error) {
      console.error('Error loading group data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSyncMetadata = async () => {
    if (!groupId) return;

    setSyncing(true);
    try {
      const result = await getGroupMetadata(groupId);
      setGroup(result.group);
      toast.success('গ্রুপ তথ্য আপডেট হয়েছে');
      await loadGroupData();
    } catch (error) {
      toast.error('গ্রুপ তথ্য আপডেট করতে সমস্যা হয়েছে');
    } finally {
      setSyncing(false);
    }
  };

  const handleCopyLink = () => {
    if (group?.invite_link) {
      navigator.clipboard.writeText(group.invite_link);
      setCopied(true);
      toast.success('লিংক কপি হয়েছে');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleRemoveParticipants = async () => {
    if (!groupId || selectedParticipants.length === 0) return;

    try {
      await removeParticipants(groupId, selectedParticipants);
      toast.success(`${selectedParticipants.length} জন সদস্য সরানো হয়েছে`);
      setSelectedParticipants([]);
      await loadGroupData();
    } catch (error) {
      toast.error('সদস্য সরাতে সমস্যা হয়েছে');
    }
  };

  const toggleParticipantSelection = (phoneNumber: string) => {
    setSelectedParticipants(prev => 
      prev.includes(phoneNumber) 
        ? prev.filter(p => p !== phoneNumber)
        : [...prev, phoneNumber]
    );
  };

  const filteredParticipants = participants.filter(p => {
    const query = searchQuery.toLowerCase();
    return (
      p.phone_number.includes(query) ||
      p.contact?.name?.toLowerCase().includes(query)
    );
  });

  if (!group && !loading) {
    return null;
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              {loading ? (
                <Skeleton className="h-6 w-48" />
              ) : (
                <>
                  {group?.name}
                  {group?.is_admin && (
                    <Badge variant="secondary" className="ml-2">
                      <Shield className="h-3 w-3 mr-1" />
                      অ্যাডমিন
                    </Badge>
                  )}
                </>
              )}
            </SheetTitle>
            <SheetDescription>
              {loading ? (
                <Skeleton className="h-4 w-32" />
              ) : (
                `${group?.participant_count || 0} সদস্য`
              )}
            </SheetDescription>
          </SheetHeader>

          {loading ? (
            <div className="mt-6 space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : (
            <Tabs defaultValue="participants" className="mt-6">
              <TabsList className="w-full">
                <TabsTrigger value="participants" className="flex-1">
                  <Users className="h-4 w-4 mr-2" />
                  সদস্য
                </TabsTrigger>
                <TabsTrigger value="message" className="flex-1">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  মেসেজ
                </TabsTrigger>
                <TabsTrigger value="invite" className="flex-1">
                  <Send className="h-4 w-4 mr-2" />
                  আমন্ত্রণ
                </TabsTrigger>
              </TabsList>

              <TabsContent value="participants" className="mt-4 space-y-4">
                {/* Actions Bar */}
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleSyncMetadata}
                    disabled={syncing}
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                    রিফ্রেশ
                  </Button>
                  <Button 
                    size="sm" 
                    onClick={() => setAddMembersOpen(true)}
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    সদস্য যোগ করুন
                  </Button>
                  {selectedParticipants.length > 0 && (
                    <Button 
                      variant="destructive" 
                      size="sm" 
                      onClick={handleRemoveParticipants}
                    >
                      <UserMinus className="h-4 w-4 mr-2" />
                      সরান ({selectedParticipants.length})
                    </Button>
                  )}
                </div>

                {/* Invite Link */}
                {group?.invite_link && (
                  <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                    <Link2 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm flex-1 truncate">{group.invite_link}</span>
                    <Button variant="ghost" size="sm" onClick={handleCopyLink}>
                      {copied ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                )}

                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="সদস্য খুঁজুন..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* Participants List */}
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2">
                    {filteredParticipants.map((participant) => (
                      <div
                        key={participant.id}
                        className={`flex items-center gap-3 p-3 rounded-lg hover:bg-muted cursor-pointer transition-colors ${
                          selectedParticipants.includes(participant.phone_number) 
                            ? 'bg-primary/10 border border-primary/30' 
                            : ''
                        }`}
                        onClick={() => toggleParticipantSelection(participant.phone_number)}
                      >
                        <Avatar className="h-10 w-10">
                          <AvatarFallback>
                            {(participant.contact?.name || participant.phone_number).charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">
                            {participant.contact?.name || participant.phone_number}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {participant.phone_number}
                          </p>
                        </div>
                        {participant.is_admin && (
                          <Badge variant="outline">
                            <Shield className="h-3 w-3 mr-1" />
                            অ্যাডমিন
                          </Badge>
                        )}
                      </div>
                    ))}
                    {filteredParticipants.length === 0 && (
                      <p className="text-center text-muted-foreground py-8">
                        কোনো সদস্য পাওয়া যায়নি
                      </p>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="message" className="mt-4">
                <GroupMessageComposer 
                  groupId={groupId!} 
                  groupName={group?.name || ''} 
                />
              </TabsContent>

              <TabsContent value="invite" className="mt-4">
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    আপনার কাস্টমারদের বাংলায় গ্রুপে যোগ দেওয়ার আমন্ত্রণ পাঠান
                  </p>
                  <Button 
                    onClick={() => setSendInviteOpen(true)}
                    disabled={!group?.invite_link}
                    className="w-full"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    আমন্ত্রণ পাঠান
                  </Button>
                  {!group?.invite_link && (
                    <p className="text-sm text-destructive text-center">
                      এই গ্রুপের কোনো ইনভাইট লিংক নেই
                    </p>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          )}
        </SheetContent>
      </Sheet>

      <AddMembersDialog
        open={addMembersOpen}
        onOpenChange={setAddMembersOpen}
        groupId={groupId!}
        groupName={group?.name || ''}
        onSuccess={() => {
          loadGroupData();
        }}
      />

      <SendInviteDialog
        open={sendInviteOpen}
        onOpenChange={setSendInviteOpen}
        groupId={groupId!}
        groupName={group?.name || ''}
        inviteLink={group?.invite_link || ''}
      />
    </>
  );
}
