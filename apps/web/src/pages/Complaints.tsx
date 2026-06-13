import { useState, useMemo } from 'react';
import { AlertTriangle, AlertCircle, Clock, CheckCircle, MessagesSquare, ArrowUpRight } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useComplaints, Complaint, ComplaintStatus, ComplaintPriority, ComplaintCategory } from '@/hooks/useComplaints';
import { useTenant } from '@/hooks/useTenant';
import { KpiCard } from '@/components/dashboard/bento/KpiCard';
import { ComplaintFilters } from '@/components/complaints/ComplaintFilters';
import { ComplaintCard } from '@/components/complaints/ComplaintCard';
import { CreateComplaintDialog } from '@/components/complaints/CreateComplaintDialog';
import { ComplaintDetailsSheet } from '@/components/complaints/ComplaintDetailsSheet';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { m, pageEnter, staggerContainer, staggerItem, useCountUp } from '@/lib/motion';

/** Max complaint rows to run the stagger reveal on (DESIGN.md: never animate >~20 list items). */
const MAX_STAGGER_ROWS = 20;

/**
 * The single full-orange surface on the Complaints page (DESIGN.md §2.2): the focal tile.
 * Total active complaints is the page's loudest number; every other stat uses a soft
 * KpiCard. Orange stays rare — this is the only `bg-primary` tile.
 */
function ActiveComplaintsTile({ active, critical }: { active: number; critical: number }) {
  const display = useCountUp(active);

  return (
    <m.div variants={staggerItem} whileHover={{ y: -2 }} transition={{ duration: 0.15 }} className="h-full">
      <div className="relative flex h-full min-h-[140px] flex-col overflow-hidden rounded-card bg-primary p-5 text-primary-foreground shadow-elevation-accent">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/15 via-transparent to-black/10"
        />
        <div className="relative z-10 flex h-full flex-col">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-2 text-sm font-medium text-primary-foreground/85">
              <MessagesSquare className="h-4 w-4" aria-hidden />
              Active complaints
            </span>
            {critical > 0 && (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-white/20 px-2 py-0.5 text-xs font-semibold tabular-nums">
                <ArrowUpRight className="h-3 w-3" aria-hidden />
                {critical.toLocaleString('en-US')} critical
              </span>
            )}
          </div>

          <p className="mt-2 tabular-nums text-3xl font-bold leading-none tracking-tight md:text-4xl">
            {display.toLocaleString('en-US')}
          </p>

          <span className="mt-auto pt-3 text-xs text-primary-foreground/80">open + in progress</span>
        </div>
      </div>
    </m.div>
  );
}

export default function Complaints() {
  const { complaints, stats, isLoading, deleteComplaint } = useComplaints();
  const { currentRole } = useTenant();
  const canManage = currentRole === 'owner' || currentRole === 'manager';

  // Filter state
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ComplaintStatus | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<ComplaintPriority | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<ComplaintCategory | 'all'>('all');

  // Sheet state
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [complaintToDelete, setComplaintToDelete] = useState<string | null>(null);

  // Filter complaints
  const filteredComplaints = useMemo(() => {
    return complaints.filter((complaint) => {
      const matchesSearch =
        search === '' ||
        complaint.title.toLowerCase().includes(search.toLowerCase()) ||
        complaint.description.toLowerCase().includes(search.toLowerCase()) ||
        complaint.contact?.name?.toLowerCase().includes(search.toLowerCase()) ||
        complaint.order?.order_number.toLowerCase().includes(search.toLowerCase());

      const matchesStatus = statusFilter === 'all' || complaint.status === statusFilter;
      const matchesPriority = priorityFilter === 'all' || complaint.priority === priorityFilter;
      const matchesCategory = categoryFilter === 'all' || complaint.category === categoryFilter;

      return matchesSearch && matchesStatus && matchesPriority && matchesCategory;
    });
  }, [complaints, search, statusFilter, priorityFilter, categoryFilter]);

  const handleViewComplaint = (complaint: Complaint) => {
    setSelectedComplaint(complaint);
    setSheetOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    setComplaintToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (complaintToDelete) {
      await deleteComplaint.mutateAsync(complaintToDelete);
      setDeleteDialogOpen(false);
      setComplaintToDelete(null);
    }
  };

  const activeCount = stats.open + stats.in_progress;
  const shouldStagger = filteredComplaints.length <= MAX_STAGGER_ROWS;

  return (
    <DashboardLayout>
      <m.div
        variants={pageEnter}
        initial="hidden"
        animate="show"
        className="mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-8 py-5 space-y-6"
      >
        {/* Header */}
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Complaints</h1>
            <p className="text-sm text-muted-foreground">Track and resolve customer issues</p>
          </div>
          <CreateComplaintDialog />
        </header>

        {/* KPI strip — the ONE orange tile (active) + soft stat cards */}
        <m.div
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-5"
        >
          <div className="col-span-2 lg:col-span-1">
            <ActiveComplaintsTile active={activeCount} critical={stats.critical} />
          </div>
          <KpiCard title="Open" value={stats.open} icon={AlertCircle} tone="warning" loading={isLoading} />
          <KpiCard title="In progress" value={stats.in_progress} icon={Clock} tone="info" loading={isLoading} />
          <KpiCard title="Resolved" value={stats.resolved} icon={CheckCircle} tone="success" loading={isLoading} />
          <KpiCard title="Critical" value={stats.critical} icon={AlertTriangle} tone="destructive" loading={isLoading} />
        </m.div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <ComplaintFilters
              search={search}
              onSearchChange={setSearch}
              status={statusFilter}
              onStatusChange={setStatusFilter}
              priority={priorityFilter}
              onPriorityChange={setPriorityFilter}
              category={categoryFilter}
              onCategoryChange={setCategoryFilter}
            />
          </CardContent>
        </Card>

        {/* Complaints List */}
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full rounded-card" />
            ))}
          </div>
        ) : filteredComplaints.length === 0 ? (
          <Card>
            <EmptyState
              icon={AlertTriangle}
              title="No complaints found"
              description={
                complaints.length === 0
                  ? 'No complaints have been reported yet.'
                  : 'No complaints match your current filters.'
              }
            />
          </Card>
        ) : shouldStagger ? (
          <m.div
            variants={staggerContainer}
            initial="hidden"
            animate="show"
            className="space-y-3"
          >
            {filteredComplaints.map((complaint) => (
              <m.div key={complaint.id} variants={staggerItem}>
                <ComplaintCard
                  complaint={complaint}
                  onView={handleViewComplaint}
                  onDelete={canManage ? handleDeleteClick : undefined}
                  canManage={canManage}
                />
              </m.div>
            ))}
          </m.div>
        ) : (
          <div className="space-y-3">
            {filteredComplaints.map((complaint) => (
              <ComplaintCard
                key={complaint.id}
                complaint={complaint}
                onView={handleViewComplaint}
                onDelete={canManage ? handleDeleteClick : undefined}
                canManage={canManage}
              />
            ))}
          </div>
        )}

        {/* Complaint Details Sheet */}
        <ComplaintDetailsSheet
          complaint={selectedComplaint}
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          canManage={canManage}
        />

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Complaint?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. The complaint will be permanently removed.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </m.div>
    </DashboardLayout>
  );
}
