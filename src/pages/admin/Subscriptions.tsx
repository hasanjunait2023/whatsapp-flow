import { useState, useMemo } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import { useAdminSubscriptions, AdminSubscription } from '@/hooks/useAdminSubscriptions';
import { usePlans } from '@/hooks/usePlans';
import { useAuditLog } from '@/hooks/useAuditLog';
import { BulkActionsBar } from '@/components/admin/BulkActionsBar';
import { MobileTableFilters } from '@/components/admin/MobileTableFilters';
import SubscriptionTabs, { SubscriptionCategory } from '@/components/admin/SubscriptionTabs';
import BulkMessageDialog from '@/components/admin/BulkMessageDialog';
import { ResponsivePageHeader } from '@/components/admin/ResponsivePageHeader';
import { MobileDataCard } from '@/components/admin/MobileDataCard';
import { exportToCSV } from '@/lib/csv-export';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  MoreHorizontal, 
  RefreshCw, 
  CreditCard, 
  Calendar, 
  ArrowUpRight, 
  CheckCircle, 
  Ban, 
  XCircle, 
  Download,
  MessageSquare,
  Clock
} from 'lucide-react';
import { format, isAfter, isBefore, startOfDay, endOfDay, differenceInDays } from 'date-fns';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';
import type { FilterConfig, ActiveFilters } from '@/components/admin/TableFilters';
import { Database } from '@/integrations/supabase/types';

type SubscriptionStatus = Database['public']['Enums']['subscription_status'];

export default function AdminSubscriptions() {
  const { subscriptions, loading, refetch, updateStatus, updatePlan, extendSubscription, bulkUpdateStatus, bulkChangePlan, bulkExtendSubscriptions } = useAdminSubscriptions();
  const { plans } = usePlans();
  const { logAction, logBulkAction } = useAuditLog();
  const isMobile = useIsMobile();
  
  // Tab and filter state
  const [activeTab, setActiveTab] = useState<SubscriptionCategory>('all');
  const [activeFilters, setActiveFilters] = useState<ActiveFilters>({});
  
  // Dialog states
  const [changePlanDialogOpen, setChangePlanDialogOpen] = useState(false);
  const [extendDialogOpen, setExtendDialogOpen] = useState(false);
  const [bulkMessageDialogOpen, setBulkMessageDialogOpen] = useState(false);
  const [selectedSubscriptionId, setSelectedSubscriptionId] = useState<string | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [extendDays, setExtendDays] = useState('30');
  const [processing, setProcessing] = useState(false);
  
  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkChangePlanDialogOpen, setBulkChangePlanDialogOpen] = useState(false);
  const [bulkExtendDialogOpen, setBulkExtendDialogOpen] = useState(false);
  const [bulkPlanId, setBulkPlanId] = useState<string>('');
  const [bulkExtendDays, setBulkExtendDays] = useState('30');

  // Categorize subscriptions
  const categories = useMemo(() => {
    const now = new Date();
    
    const result: Record<SubscriptionCategory, AdminSubscription[]> = {
      all: subscriptions,
      active: [],
      expiring: [],
      redzone: [],
      frozen: [],
    };

    subscriptions.forEach((sub) => {
      const periodEnd = new Date(sub.current_period_end);
      const daysUntilExpiry = differenceInDays(periodEnd, now);

      if (sub.status === 'cancelled') {
        result.frozen.push(sub);
        return;
      }

      if (
        sub.status === 'past_due' ||
        sub.status === 'suspended' ||
        (sub.status === 'active' && periodEnd < now)
      ) {
        result.redzone.push(sub);
        return;
      }

      if (
        (sub.status === 'active' || sub.status === 'trialing') &&
        periodEnd > now &&
        daysUntilExpiry <= 3
      ) {
        result.expiring.push(sub);
        return;
      }

      if (
        (sub.status === 'active' || sub.status === 'trialing') &&
        periodEnd > now &&
        daysUntilExpiry > 3
      ) {
        result.active.push(sub);
        return;
      }
    });

    return result;
  }, [subscriptions]);

  // Filter configuration
  const filterConfig: FilterConfig[] = useMemo(() => [
    {
      key: 'plan',
      label: 'Plan',
      type: 'select',
      options: plans.map((p) => ({ label: p.name, value: p.id })),
    },
    {
      key: 'periodEnd',
      label: 'Period End',
      type: 'date-range',
    },
  ], [plans]);

  const tabSubscriptions = useMemo(() => {
    return categories[activeTab] || [];
  }, [categories, activeTab]);

  const filteredSubscriptions = useMemo(() => {
    return tabSubscriptions.filter((sub) => {
      const planFilter = activeFilters.plan as string | undefined;
      if (planFilter && planFilter !== 'all' && sub.plan_id !== planFilter) {
        return false;
      }

      const dateFilter = activeFilters.periodEnd as { from?: Date; to?: Date } | undefined;
      if (dateFilter) {
        const periodEnd = new Date(sub.current_period_end);
        if (dateFilter.from && isBefore(periodEnd, startOfDay(dateFilter.from))) return false;
        if (dateFilter.to && isAfter(periodEnd, endOfDay(dateFilter.to))) return false;
      }

      return true;
    });
  }, [tabSubscriptions, activeFilters]);

  const allSelected = filteredSubscriptions.length > 0 && filteredSubscriptions.every((s) => selectedIds.has(s.id));
  const someSelected = filteredSubscriptions.some((s) => selectedIds.has(s.id));

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredSubscriptions.map((s) => s.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const clearSelection = () => setSelectedIds(new Set());

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500/10 text-green-500 border-green-500/20">Active</Badge>;
      case 'trialing':
        return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20">Trial</Badge>;
      case 'suspended':
        return <Badge className="bg-red-500/10 text-red-500 border-red-500/20">Suspended</Badge>;
      case 'cancelled':
        return <Badge className="bg-gray-500/10 text-gray-500 border-gray-500/20">Cancelled</Badge>;
      case 'past_due':
        return <Badge className="bg-orange-500/10 text-orange-500 border-orange-500/20">Past Due</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getDaysRemaining = (periodEnd: string) => {
    const days = differenceInDays(new Date(periodEnd), new Date());
    if (days < 0) return <span className="text-red-500 font-medium text-xs">{Math.abs(days)}d overdue</span>;
    if (days === 0) return <span className="text-amber-500 font-medium text-xs">Today</span>;
    if (days <= 3) return <span className="text-amber-500 font-medium text-xs">{days}d left</span>;
    return <span className="text-muted-foreground text-xs">{days}d left</span>;
  };

  const selectedSubscriptionsForMessage = useMemo(() => {
    return filteredSubscriptions
      .filter((s) => selectedIds.has(s.id))
      .map((s) => ({
        id: s.id,
        tenant_id: s.tenant_id,
        tenant_name: s.tenant_name,
        plan_name: s.plan_name,
        current_period_end: s.current_period_end,
      }));
  }, [filteredSubscriptions, selectedIds]);

  const handleExport = () => {
    const dataToExport = selectedIds.size > 0 
      ? filteredSubscriptions.filter((s) => selectedIds.has(s.id))
      : filteredSubscriptions;

    exportToCSV(
      dataToExport,
      [
        { key: 'tenant_name', header: 'Tenant' },
        { key: 'plan_name', header: 'Plan' },
        { key: 'status', header: 'Status' },
        { key: 'current_period_start', header: 'Period Start', formatter: (v) => v ? format(new Date(v as string), 'yyyy-MM-dd') : '' },
        { key: 'current_period_end', header: 'Period End', formatter: (v) => v ? format(new Date(v as string), 'yyyy-MM-dd') : '' },
        { key: 'trial_ends_at', header: 'Trial Ends', formatter: (v) => v ? format(new Date(v as string), 'yyyy-MM-dd') : '' },
        { key: 'created_at', header: 'Created At', formatter: (v) => v ? format(new Date(v as string), 'yyyy-MM-dd HH:mm:ss') : '' },
      ],
      `subscriptions-${activeTab}-${format(new Date(), 'yyyy-MM-dd')}`
    );

    toast.success(`Exported ${dataToExport.length} subscriptions`);
  };

  const handleStatusChange = async (subscriptionId: string, status: SubscriptionStatus) => {
    setProcessing(true);
    try {
      const sub = subscriptions.find((s) => s.id === subscriptionId);
      await updateStatus(subscriptionId, status);
      await logAction(status as 'activate' | 'suspend' | 'cancel', 'subscription', subscriptionId, {
        old_value: sub?.status,
        new_value: status,
        tenant_name: sub?.tenant_name,
      });
      toast.success(`Subscription status updated to ${status}`);
    } catch (error) {
      toast.error('Failed to update status');
    } finally {
      setProcessing(false);
    }
  };

  const handleChangePlan = async () => {
    if (!selectedSubscriptionId || !selectedPlanId) return;
    setProcessing(true);
    try {
      const sub = subscriptions.find((s) => s.id === selectedSubscriptionId);
      const newPlan = plans.find((p) => p.id === selectedPlanId);
      await updatePlan(selectedSubscriptionId, selectedPlanId);
      await logAction('change_plan', 'subscription', selectedSubscriptionId, {
        old_value: sub?.plan_name,
        new_value: newPlan?.name,
        plan_id: selectedPlanId,
      });
      toast.success('Plan updated successfully');
      setChangePlanDialogOpen(false);
      setSelectedSubscriptionId(null);
      setSelectedPlanId('');
    } catch (error) {
      toast.error('Failed to update plan');
    } finally {
      setProcessing(false);
    }
  };

  const handleExtend = async () => {
    if (!selectedSubscriptionId || !extendDays) return;
    setProcessing(true);
    try {
      await extendSubscription(selectedSubscriptionId, parseInt(extendDays));
      await logAction('extend', 'subscription', selectedSubscriptionId, {
        days: parseInt(extendDays),
      });
      toast.success(`Subscription extended by ${extendDays} days`);
      setExtendDialogOpen(false);
      setSelectedSubscriptionId(null);
      setExtendDays('30');
    } catch (error) {
      toast.error('Failed to extend subscription');
    } finally {
      setProcessing(false);
    }
  };

  // Bulk actions
  const handleBulkActivate = async () => {
    setProcessing(true);
    try {
      const ids = Array.from(selectedIds);
      await bulkUpdateStatus(ids, 'active');
      await logBulkAction('bulk_activate', 'subscription', ids, { new_value: 'active' });
      toast.success(`${selectedIds.size} subscriptions activated`);
      clearSelection();
    } catch (error) {
      toast.error('Failed to activate subscriptions');
    } finally {
      setProcessing(false);
    }
  };

  const handleBulkSuspend = async () => {
    setProcessing(true);
    try {
      const ids = Array.from(selectedIds);
      await bulkUpdateStatus(ids, 'suspended');
      await logBulkAction('bulk_suspend', 'subscription', ids, { new_value: 'suspended' });
      toast.success(`${selectedIds.size} subscriptions suspended`);
      clearSelection();
    } catch (error) {
      toast.error('Failed to suspend subscriptions');
    } finally {
      setProcessing(false);
    }
  };

  const handleBulkCancel = async () => {
    setProcessing(true);
    try {
      const ids = Array.from(selectedIds);
      await bulkUpdateStatus(ids, 'cancelled');
      await logBulkAction('bulk_cancel', 'subscription', ids, { new_value: 'cancelled' });
      toast.success(`${selectedIds.size} subscriptions cancelled`);
      clearSelection();
    } catch (error) {
      toast.error('Failed to cancel subscriptions');
    } finally {
      setProcessing(false);
    }
  };

  const handleBulkChangePlan = async () => {
    if (!bulkPlanId) return;
    setProcessing(true);
    try {
      const ids = Array.from(selectedIds);
      const newPlan = plans.find((p) => p.id === bulkPlanId);
      await bulkChangePlan(ids, bulkPlanId);
      await logBulkAction('bulk_change_plan', 'subscription', ids, {
        plan_id: bulkPlanId,
        plan_name: newPlan?.name,
      });
      toast.success(`${selectedIds.size} subscriptions updated`);
      clearSelection();
      setBulkChangePlanDialogOpen(false);
      setBulkPlanId('');
    } catch (error) {
      toast.error('Failed to change plans');
    } finally {
      setProcessing(false);
    }
  };

  const handleBulkExtend = async () => {
    if (!bulkExtendDays) return;
    setProcessing(true);
    try {
      const ids = Array.from(selectedIds);
      await bulkExtendSubscriptions(ids, parseInt(bulkExtendDays));
      await logBulkAction('bulk_extend', 'subscription', ids, {
        days: parseInt(bulkExtendDays),
      });
      toast.success(`${selectedIds.size} subscriptions extended by ${bulkExtendDays} days`);
      clearSelection();
      setBulkExtendDialogOpen(false);
      setBulkExtendDays('30');
    } catch (error) {
      toast.error('Failed to extend subscriptions');
    } finally {
      setProcessing(false);
    }
  };

  // Mobile subscription card
  const SubscriptionCard = ({ sub }: { sub: AdminSubscription }) => (
    <MobileDataCard
      data={sub}
      selected={selectedIds.has(sub.id)}
      onSelect={() => toggleSelect(sub.id)}
      header={
        <div>
          <p className="font-medium">{sub.tenant_name}</p>
          <p className="text-xs text-muted-foreground">{sub.plan_name}</p>
        </div>
      }
      fields={[
        {
          key: 'status',
          label: 'Status',
          render: () => getStatusBadge(sub.status),
        },
        {
          key: 'period',
          label: 'Period End',
          render: () => (
            <span className="text-xs text-muted-foreground">
              {format(new Date(sub.current_period_end), 'MMM d, yyyy')}
            </span>
          ),
        },
        {
          key: 'remaining',
          label: 'Remaining',
          render: () => getDaysRemaining(sub.current_period_end),
        },
      ]}
      actions={
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                setSelectedSubscriptionId(sub.id);
                setSelectedPlanId(sub.plan_id);
                setChangePlanDialogOpen(true);
              }}
            >
              <ArrowUpRight className="mr-2 h-4 w-4" />
              Change Plan
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                setSelectedSubscriptionId(sub.id);
                setExtendDialogOpen(true);
              }}
            >
              <Calendar className="mr-2 h-4 w-4" />
              Extend
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {sub.status !== 'active' && (
              <DropdownMenuItem onClick={() => handleStatusChange(sub.id, 'active')}>
                <CheckCircle className="mr-2 h-4 w-4" />
                Activate
              </DropdownMenuItem>
            )}
            {sub.status !== 'suspended' && (
              <DropdownMenuItem onClick={() => handleStatusChange(sub.id, 'suspended')}>
                <Ban className="mr-2 h-4 w-4" />
                Suspend
              </DropdownMenuItem>
            )}
            {sub.status !== 'cancelled' && (
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => handleStatusChange(sub.id, 'cancelled')}
              >
                <XCircle className="mr-2 h-4 w-4" />
                Cancel
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      }
    />
  );

  return (
    <AdminLayout>
      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        <ResponsivePageHeader
          title="Subscriptions"
          description="Manage tenant subscriptions"
          actions={
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="h-4 w-4 md:mr-2" />
                <span className="hidden md:inline">Export {selectedIds.size > 0 ? `(${selectedIds.size})` : ''}</span>
              </Button>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4 md:mr-2" />
                <span className="hidden md:inline">Refresh</span>
              </Button>
            </div>
          }
        />

        {/* Subscription Category Tabs */}
        <SubscriptionTabs
          subscriptions={subscriptions}
          activeTab={activeTab}
          onTabChange={(tab) => {
            setActiveTab(tab);
            clearSelection();
          }}
        />

        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                  <CreditCard className="h-5 w-5" />
                  {activeTab === 'all' ? 'All Subscriptions' : 
                   activeTab === 'active' ? 'Active' :
                   activeTab === 'expiring' ? 'Expiring Soon' :
                   activeTab === 'redzone' ? 'Red Zone' :
                   'Frozen'}
                </CardTitle>
                <CardDescription className="text-xs md:text-sm">
                  {filteredSubscriptions.length} subscription{filteredSubscriptions.length !== 1 ? 's' : ''}
                  {activeTab === 'expiring' && ' expiring within 3 days'}
                  {activeTab === 'redzone' && ' requiring attention'}
                </CardDescription>
              </div>
            </div>
            <MobileTableFilters
              filters={filterConfig}
              activeFilters={activeFilters}
              onFiltersChange={setActiveFilters}
              className="mt-3"
            />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-24 md:h-12 w-full" />
                ))}
              </div>
            ) : isMobile ? (
              <div className="space-y-3">
                {/* Select All for mobile */}
                {filteredSubscriptions.length > 0 && (
                  <div className="flex items-center gap-2 pb-2 border-b">
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={toggleSelectAll}
                      aria-label="Select all"
                    />
                    <span className="text-sm text-muted-foreground">
                      {allSelected ? 'Deselect all' : 'Select all'} ({filteredSubscriptions.length})
                    </span>
                  </div>
                )}
                {filteredSubscriptions.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    No subscriptions in this category
                  </div>
                ) : (
                  filteredSubscriptions.map((sub) => (
                    <SubscriptionCard key={sub.id} sub={sub} />
                  ))
                )}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">
                      <Checkbox
                        checked={allSelected}
                        onCheckedChange={toggleSelectAll}
                        aria-label="Select all"
                        className={someSelected && !allSelected ? 'data-[state=checked]:bg-primary/50' : ''}
                      />
                    </TableHead>
                    <TableHead>Tenant</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Period End</TableHead>
                    <TableHead>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        Remaining
                      </div>
                    </TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSubscriptions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        No subscriptions in this category
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredSubscriptions.map((sub) => (
                      <TableRow key={sub.id} className={selectedIds.has(sub.id) ? 'bg-muted/50' : ''}>
                        <TableCell>
                          <Checkbox
                            checked={selectedIds.has(sub.id)}
                            onCheckedChange={() => toggleSelect(sub.id)}
                            aria-label={`Select ${sub.tenant_name}`}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{sub.tenant_name}</TableCell>
                        <TableCell>{sub.plan_name}</TableCell>
                        <TableCell>{getStatusBadge(sub.status)}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {format(new Date(sub.current_period_end), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell>
                          {getDaysRemaining(sub.current_period_end)}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedSubscriptionId(sub.id);
                                  setSelectedPlanId(sub.plan_id);
                                  setChangePlanDialogOpen(true);
                                }}
                              >
                                <ArrowUpRight className="mr-2 h-4 w-4" />
                                Change Plan
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedSubscriptionId(sub.id);
                                  setExtendDialogOpen(true);
                                }}
                              >
                                <Calendar className="mr-2 h-4 w-4" />
                                Extend Period
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {sub.status !== 'active' && (
                                <DropdownMenuItem onClick={() => handleStatusChange(sub.id, 'active')}>
                                  <CheckCircle className="mr-2 h-4 w-4" />
                                  Activate
                                </DropdownMenuItem>
                              )}
                              {sub.status !== 'suspended' && (
                                <DropdownMenuItem onClick={() => handleStatusChange(sub.id, 'suspended')}>
                                  <Ban className="mr-2 h-4 w-4" />
                                  Suspend
                                </DropdownMenuItem>
                              )}
                              {sub.status !== 'cancelled' && (
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => handleStatusChange(sub.id, 'cancelled')}
                                >
                                  <XCircle className="mr-2 h-4 w-4" />
                                  Cancel
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Dialogs */}
        <Dialog open={changePlanDialogOpen} onOpenChange={setChangePlanDialogOpen}>
          <DialogContent className="mx-4 max-w-[calc(100vw-2rem)] sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Change Plan</DialogTitle>
              <DialogDescription>
                Select a new plan for this subscription.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Select Plan</Label>
                <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a plan" />
                  </SelectTrigger>
                  <SelectContent>
                    {plans.map((plan) => (
                      <SelectItem key={plan.id} value={plan.id}>
                        {plan.name} - BDT {plan.price_monthly}/mo
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={() => setChangePlanDialogOpen(false)} className="w-full sm:w-auto">
                Cancel
              </Button>
              <Button onClick={handleChangePlan} disabled={!selectedPlanId || processing} className="w-full sm:w-auto">
                Update Plan
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={extendDialogOpen} onOpenChange={setExtendDialogOpen}>
          <DialogContent className="mx-4 max-w-[calc(100vw-2rem)] sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Extend Subscription</DialogTitle>
              <DialogDescription>
                Add additional days to the billing period.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Days to Add</Label>
                <Input
                  type="number"
                  value={extendDays}
                  onChange={(e) => setExtendDays(e.target.value)}
                  min="1"
                  max="365"
                />
              </div>
            </div>
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={() => setExtendDialogOpen(false)} className="w-full sm:w-auto">
                Cancel
              </Button>
              <Button onClick={handleExtend} disabled={!extendDays || processing} className="w-full sm:w-auto">
                Extend
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={bulkChangePlanDialogOpen} onOpenChange={setBulkChangePlanDialogOpen}>
          <DialogContent className="mx-4 max-w-[calc(100vw-2rem)] sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Change Plan ({selectedIds.size})</DialogTitle>
              <DialogDescription>
                Select a new plan for all selected subscriptions.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Select Plan</Label>
                <Select value={bulkPlanId} onValueChange={setBulkPlanId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a plan" />
                  </SelectTrigger>
                  <SelectContent>
                    {plans.map((plan) => (
                      <SelectItem key={plan.id} value={plan.id}>
                        {plan.name} - BDT {plan.price_monthly}/mo
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={() => setBulkChangePlanDialogOpen(false)} className="w-full sm:w-auto">
                Cancel
              </Button>
              <Button onClick={handleBulkChangePlan} disabled={!bulkPlanId || processing} className="w-full sm:w-auto">
                {processing ? 'Updating...' : 'Update All'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={bulkExtendDialogOpen} onOpenChange={setBulkExtendDialogOpen}>
          <DialogContent className="mx-4 max-w-[calc(100vw-2rem)] sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Extend ({selectedIds.size})</DialogTitle>
              <DialogDescription>
                Add days to all selected subscriptions.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Days to Add</Label>
                <Input
                  type="number"
                  value={bulkExtendDays}
                  onChange={(e) => setBulkExtendDays(e.target.value)}
                  min="1"
                  max="365"
                />
              </div>
            </div>
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={() => setBulkExtendDialogOpen(false)} className="w-full sm:w-auto">
                Cancel
              </Button>
              <Button onClick={handleBulkExtend} disabled={!bulkExtendDays || processing} className="w-full sm:w-auto">
                {processing ? 'Extending...' : 'Extend All'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <BulkMessageDialog
          open={bulkMessageDialogOpen}
          onOpenChange={setBulkMessageDialogOpen}
          selectedSubscriptions={selectedSubscriptionsForMessage}
          onComplete={() => {
            clearSelection();
            refetch();
          }}
        />

        <BulkActionsBar
          selectedCount={selectedIds.size}
          onClearSelection={clearSelection}
          actions={[
            {
              label: 'Message',
              icon: <MessageSquare className="h-4 w-4" />,
              onClick: () => setBulkMessageDialogOpen(true),
              disabled: processing,
            },
            {
              label: 'Activate',
              icon: <CheckCircle className="h-4 w-4" />,
              onClick: handleBulkActivate,
              disabled: processing,
            },
            {
              label: 'Suspend',
              icon: <Ban className="h-4 w-4" />,
              onClick: handleBulkSuspend,
              disabled: processing,
            },
            {
              label: 'Plan',
              icon: <ArrowUpRight className="h-4 w-4" />,
              onClick: () => setBulkChangePlanDialogOpen(true),
              disabled: processing,
            },
            {
              label: 'Extend',
              icon: <Calendar className="h-4 w-4" />,
              onClick: () => setBulkExtendDialogOpen(true),
              disabled: processing,
            },
            {
              label: 'Cancel',
              icon: <XCircle className="h-4 w-4" />,
              onClick: handleBulkCancel,
              variant: 'destructive',
              disabled: processing,
            },
          ]}
        />
      </div>
    </AdminLayout>
  );
}
