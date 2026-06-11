import { useState, useMemo } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useGroups } from '@/hooks/useGroups';
import { useGroupQueue } from '@/hooks/useGroupQueue';
import { useInstances } from '@/hooks/useInstances';
import { GroupCard } from '@/components/groups/GroupCard';
import { GroupDetailsSheet } from '@/components/groups/GroupDetailsSheet';
import { SyncGroupsDialog } from '@/components/groups/SyncGroupsDialog';
import { QueueStatusCard } from '@/components/groups/QueueStatusCard';
import { RefreshCw, Users, Clock, AlertCircle, Shield } from 'lucide-react';
import { toast } from 'sonner';

export default function Groups() {
  const { groups, loading, syncing, dailyLimit, syncGroups, refetch } = useGroups();
  const { queueItems, getPendingCount, getTotalPendingNumbers } = useGroupQueue();
  const { instances } = useInstances();
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [syncDialogOpen, setSyncDialogOpen] = useState(false);
  const [showAdminOnly, setShowAdminOnly] = useState(true);

  const filteredGroups = useMemo(() => {
    return showAdminOnly ? groups.filter(g => g.is_admin) : groups;
  }, [groups, showAdminOnly]);

  const adminGroupsCount = useMemo(() => {
    return groups.filter(g => g.is_admin).length;
  }, [groups]);

  const handleSync = async (instanceId: string) => {
    try {
      const result = await syncGroups(instanceId);
      toast.success(`${result.synced_count} টি গ্রুপ সিঙ্ক হয়েছে`);
      setSyncDialogOpen(false);
    } catch (error) {
      toast.error('গ্রুপ সিঙ্ক করতে সমস্যা হয়েছে');
    }
  };

  const connectedInstances = instances.filter(i => i.status === 'active');

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <PageHeader
          title="হোয়াটসঅ্যাপ গ্রুপ"
          description="আপনার হোয়াটসঅ্যাপ গ্রুপ পরিচালনা করুন"
        >
          <Button onClick={() => setSyncDialogOpen(true)} disabled={syncing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
            সিঙ্ক করুন
          </Button>
        </PageHeader>

        {/* Daily Limit Card */}
        {dailyLimit && (
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">আজকের সদস্য সংযোজন সীমা</p>
                    <p className="text-lg font-semibold">
                      {dailyLimit.members_added} / {dailyLimit.max_daily_limit}
                    </p>
                  </div>
                </div>
                <div className="w-48">
                  <Progress 
                    value={(dailyLimit.members_added / dailyLimit.max_daily_limit) * 100} 
                    className="h-2"
                  />
                  <p className="text-xs text-muted-foreground mt-1 text-right">
                    {dailyLimit.remaining} টি বাকি
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Admin Filter Toggle */}
        <div className="flex items-center justify-end gap-2">
          <Switch 
            id="admin-filter" 
            checked={showAdminOnly} 
            onCheckedChange={setShowAdminOnly}
          />
          <Label htmlFor="admin-filter" className="text-sm flex items-center gap-1.5 cursor-pointer">
            <Shield className="h-4 w-4 text-primary" />
            শুধু অ্যাডমিন গ্রুপ ({adminGroupsCount})
          </Label>
        </div>

        <Tabs defaultValue="groups">
          <TabsList>
            <TabsTrigger value="groups" className="gap-2">
              <Users className="h-4 w-4" />
              গ্রুপসমূহ
              {filteredGroups.length > 0 && (
                <Badge variant="secondary" className="ml-1">{filteredGroups.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="queue" className="gap-2">
              <Clock className="h-4 w-4" />
              সারি
              {getPendingCount() > 0 && (
                <Badge variant="secondary" className="ml-1">{getPendingCount()}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="groups" className="mt-6">
            {loading ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <Card key={i}>
                    <CardHeader>
                      <Skeleton className="h-6 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-20 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredGroups.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    {showAdminOnly ? 'কোনো অ্যাডমিন গ্রুপ পাওয়া যায়নি' : 'কোনো গ্রুপ পাওয়া যায়নি'}
                  </h3>
                  <p className="text-muted-foreground text-center mb-4">
                    {groups.length > 0 && showAdminOnly 
                      ? 'আপনি কোনো গ্রুপে অ্যাডমিন নন। সব গ্রুপ দেখতে ফিল্টার বন্ধ করুন।'
                      : 'আপনার হোয়াটসঅ্যাপ গ্রুপ সিঙ্ক করতে উপরের "সিঙ্ক করুন" বাটনে ক্লিক করুন'
                    }
                  </p>
                  {groups.length === 0 && (
                    <Button onClick={() => setSyncDialogOpen(true)} disabled={syncing}>
                      <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                      এখনই সিঙ্ক করুন
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredGroups.map((group) => (
                  <GroupCard
                    key={group.id}
                    group={group}
                    onSelect={() => setSelectedGroup(group.id)}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="queue" className="mt-6">
            {queueItems.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Clock className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">কোনো নির্ধারিত কাজ নেই</h3>
                  <p className="text-muted-foreground text-center">
                    ব্যাচ মোডে সদস্য যোগ করলে এখানে সারি দেখা যাবে
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>সারি সারসংক্ষেপ</CardTitle>
                    <CardDescription>
                      মোট {getTotalPendingNumbers()} জন সদস্য যোগ হওয়ার অপেক্ষায়
                    </CardDescription>
                  </CardHeader>
                </Card>
                {queueItems.map((item) => (
                  <QueueStatusCard key={item.id} queueItem={item} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <SyncGroupsDialog
        open={syncDialogOpen}
        onOpenChange={setSyncDialogOpen}
        instances={connectedInstances}
        onSync={handleSync}
        syncing={syncing}
      />

      <GroupDetailsSheet
        groupId={selectedGroup}
        open={!!selectedGroup}
        onOpenChange={(open) => !open && setSelectedGroup(null)}
      />
    </DashboardLayout>
  );
}
