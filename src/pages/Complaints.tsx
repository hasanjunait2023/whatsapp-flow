import { useState, useMemo } from 'react';
import { AlertTriangle } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useComplaints, Complaint, ComplaintStatus, ComplaintPriority, ComplaintCategory } from '@/hooks/useComplaints';
import { useTenant } from '@/hooks/useTenant';
import { ComplaintStats } from '@/components/complaints/ComplaintStats';
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

  return (
    <DashboardLayout>
      <div className="container py-6 space-y-6">
        <PageHeader
          title="Complaints"
          description="Track and resolve customer issues"
        >
          <CreateComplaintDialog />
        </PageHeader>

        {/* Stats Cards */}
        <ComplaintStats stats={stats} />

        {/* Filters */}
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

        {/* Complaints List */}
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        ) : filteredComplaints.length === 0 ? (
          <EmptyState
            icon={AlertTriangle}
            title="No complaints found"
            description={
              complaints.length === 0
                ? "No complaints have been reported yet."
                : "No complaints match your current filters."
            }
          />
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
      </div>
    </DashboardLayout>
  );
}
