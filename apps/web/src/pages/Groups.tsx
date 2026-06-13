import { useState, useMemo } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
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
import { KpiCard } from '@/components/dashboard/bento/KpiCard';
import { RefreshCw, Users, Clock, AlertCircle, Shield, UserCheck } from 'lucide-react';
import { toast } from 'sonner';
import { m, pageEnter, useCountUp } from '@/lib/motion';

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
      <m.div
        variants={pageEnter}
        initial="hidden"
        animate="show"
        className="mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-8 py-5 space-y-6"
      >
        {/* Header */}
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              হোয়াটসঅ্যাপ গ্রুপ
            </h1>
            <p className="text-sm text-muted-foreground">
              আপনার হোয়াটসঅ্যাপ গ্রুপ পরিচালনা করুন
            </p>
          </div>
          <Button
            onClick={() => setSyncDialogOpen(true)}
            disabled={syncing}
            className="min-h-[44px]"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
            সিঙ্ক করুন
          </Button>
        </header>

        {/* KPI strip — one whatsapp-accented highlight + stat cards */}
        <div className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-3">
          <GroupsHighlightTile total={groups.length} loading={loading} />
          <KpiCard
            title="অ্যাডমিন গ্রুপ"
            value={adminGroupsCount}
            icon={Shield}
            tone="success"
            loading={loading}
          />
          <KpiCard
            title="সারিতে অপেক্ষমাণ"
            value={getPendingCount()}
            icon={Clock}
            tone="info"
            loading={loading}
          />
        </div>

        {/* Daily member-add limit — whatsapp-accented progress */}
        {dailyLimit && (
          <Card className="rounded-card shadow-elevation-1">
            <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <span className="flex h-11 w-11 items-center justify-center rounded-control bg-whatsapp-light text-whatsapp">
                  <UserCheck className="h-5 w-5" aria-hidden />
                </span>
                <div>
                  <p className="text-sm text-muted-foreground">আজকের সদস্য সংযোজন সীমা</p>
                  <p className="text-lg font-semibold tabular-nums text-foreground">
                    {dailyLimit.members_added} / {dailyLimit.max_daily_limit}
                  </p>
                </div>
              </div>
              <div className="w-full sm:w-56">
                <Progress
                  value={(dailyLimit.members_added / dailyLimit.max_daily_limit) * 100}
                  className="h-2"
                />
                <p className="mt-1 text-right text-xs tabular-nums text-muted-foreground">
                  {dailyLimit.remaining} টি বাকি
                </p>
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
          <Label htmlFor="admin-filter" className="flex cursor-pointer items-center gap-1.5 text-sm">
            <Shield className="h-4 w-4 text-whatsapp" />
            শুধু অ্যাডমিন গ্রুপ <span className="tabular-nums">({adminGroupsCount})</span>
          </Label>
        </div>

        <Tabs defaultValue="groups">
          <TabsList>
            <TabsTrigger value="groups" className="gap-2">
              <Users className="h-4 w-4" />
              গ্রুপসমূহ
              {filteredGroups.length > 0 && (
                <Badge variant="neutral-soft" className="ml-1 tabular-nums">{filteredGroups.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="queue" className="gap-2">
              <Clock className="h-4 w-4" />
              সারি
              {getPendingCount() > 0 && (
                <Badge variant="info-soft" className="ml-1 tabular-nums">{getPendingCount()}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="groups" className="mt-6">
            {loading ? (
              <div className="grid gap-4 sm:gap-5 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="rounded-card shadow-elevation-1">
                    <CardContent className="space-y-4 p-5">
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-11 w-11 rounded-control" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-3/4" />
                          <Skeleton className="h-3 w-1/2" />
                        </div>
                      </div>
                      <Skeleton className="h-12 w-full" />
                      <Skeleton className="h-11 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredGroups.length === 0 ? (
              <Card className="rounded-card shadow-elevation-1">
                <CardContent className="flex flex-col items-center justify-center px-6 py-16 text-center">
                  <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-control bg-muted-soft text-muted-foreground">
                    <AlertCircle className="h-6 w-6" aria-hidden />
                  </span>
                  <h3 className="mb-2 text-lg font-semibold text-foreground">
                    {showAdminOnly ? 'কোনো অ্যাডমিন গ্রুপ পাওয়া যায়নি' : 'কোনো গ্রুপ পাওয়া যায়নি'}
                  </h3>
                  <p className="mb-4 max-w-sm text-sm text-muted-foreground">
                    {groups.length > 0 && showAdminOnly
                      ? 'আপনি কোনো গ্রুপে অ্যাডমিন নন। সব গ্রুপ দেখতে ফিল্টার বন্ধ করুন।'
                      : 'আপনার হোয়াটসঅ্যাপ গ্রুপ সিঙ্ক করতে উপরের "সিঙ্ক করুন" বাটনে ক্লিক করুন'
                    }
                  </p>
                  {groups.length === 0 && (
                    <Button onClick={() => setSyncDialogOpen(true)} disabled={syncing} className="min-h-[44px]">
                      <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                      এখনই সিঙ্ক করুন
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 sm:gap-5 md:grid-cols-2 lg:grid-cols-3">
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
              <Card className="rounded-card shadow-elevation-1">
                <CardContent className="flex flex-col items-center justify-center px-6 py-16 text-center">
                  <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-control bg-muted-soft text-muted-foreground">
                    <Clock className="h-6 w-6" aria-hidden />
                  </span>
                  <h3 className="mb-2 text-lg font-semibold text-foreground">কোনো নির্ধারিত কাজ নেই</h3>
                  <p className="max-w-sm text-sm text-muted-foreground">
                    ব্যাচ মোডে সদস্য যোগ করলে এখানে সারি দেখা যাবে
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                <Card className="rounded-card shadow-elevation-1">
                  <CardHeader>
                    <CardTitle>সারি সারসংক্ষেপ</CardTitle>
                    <CardDescription>
                      মোট <span className="tabular-nums">{getTotalPendingNumbers()}</span> জন সদস্য যোগ হওয়ার অপেক্ষায়
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
      </m.div>

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

/**
 * Channel-accented highlight tile for Groups (DESIGN.md §2.2 focal, but using the
 * WhatsApp channel token instead of orange — channel pages are calm, not orange).
 * Headline metric = total synced groups.
 */
function GroupsHighlightTile({ total, loading }: { total: number; loading: boolean }) {
  const display = useCountUp(total);

  if (loading) {
    return (
      <div className="flex h-full min-h-[148px] flex-col gap-4 rounded-card bg-whatsapp/80 p-6">
        <Skeleton className="h-4 w-28 bg-white/30" />
        <Skeleton className="h-10 w-24 bg-white/30" />
        <Skeleton className="mt-auto h-4 w-32 bg-white/30" />
      </div>
    );
  }

  return (
    <m.div whileHover={{ y: -2 }} transition={{ duration: 0.15 }} className="h-full">
      <div className="relative flex h-full min-h-[148px] flex-col overflow-hidden rounded-card bg-whatsapp p-6 text-whatsapp-foreground shadow-elevation-1">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/15 via-transparent to-black/10"
        />
        <div className="relative z-10 flex h-full flex-col">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-2 text-sm font-medium text-whatsapp-foreground/85">
              <Users className="h-4 w-4" aria-hidden />
              মোট গ্রুপ
            </span>
            <span className="flex h-9 w-9 items-center justify-center rounded-control bg-white/15">
              <Users className="h-4 w-4" aria-hidden />
            </span>
          </div>
          <p className="mt-3 text-4xl font-bold leading-none tracking-tight tabular-nums md:text-5xl">
            {display.toLocaleString('en-US')}
          </p>
          <p className="mt-auto pt-3 text-xs text-whatsapp-foreground/80">সিঙ্ক করা গ্রুপসমূহ</p>
        </div>
      </div>
    </m.div>
  );
}
