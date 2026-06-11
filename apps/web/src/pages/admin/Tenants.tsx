import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '@/components/layout/AdminLayout';
import { useAdminTenants, AdminTenant } from '@/hooks/useAdminTenants';
import { useImpersonation } from '@/contexts/ImpersonationContext';
import { usePlans } from '@/hooks/usePlans';
import { useAuditLog } from '@/hooks/useAuditLog';
import { BulkActionsBar } from '@/components/admin/BulkActionsBar';
import { MobileTableFilters } from '@/components/admin/MobileTableFilters';
import { TenantFeatureDialog, TenantForFeatures } from '@/components/admin/TenantFeatureDialog';
import { TenantResourceOverridesDialog } from '@/components/admin/TenantResourceOverridesDialog';
import { BulkFeatureDialog } from '@/components/admin/BulkFeatureDialog';
import { CreateSubscriptionOrderDialog } from '@/components/admin/CreateSubscriptionOrderDialog';
import { ResponsivePageHeader } from '@/components/admin/ResponsivePageHeader';
import { MobileDataCard } from '@/components/admin/MobileDataCard';
import { exportToCSV } from '@/lib/csv-export';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { MoreHorizontal, Search, RefreshCw, Building2, Eye, CheckCircle, Ban, Trash2, Download, Settings2, Sliders, RotateCcw, ShoppingCart, Zap, SlidersHorizontal } from 'lucide-react';
import { format, isAfter, isBefore, startOfDay, endOfDay } from 'date-fns';
import { toast } from 'sonner';
import { FEATURE_FLAGS } from '@/hooks/useFeatureAccess';
import { useIsMobile } from '@/hooks/use-mobile';
import type { FilterConfig, ActiveFilters } from '@/components/admin/TableFilters';

export default function AdminTenants() {
  const { tenants, loading, refetch, updateSubscriptionStatus, deleteTenant, bulkUpdateSubscriptionStatus, bulkDeleteTenants, updateTenantPlan, updateFeatureOverrides, bulkUpdateFeatureOverrides, bulkResetFeatureOverrides, activateTenant, updateResourceOverrides } = useAdminTenants();
  const { startImpersonation } = useImpersonation();
  const { plans } = usePlans();
  const { logAction, logBulkAction } = useAuditLog();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [search, setSearch] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [activeFilters, setActiveFilters] = useState<ActiveFilters>({});
  const [featureDialogOpen, setFeatureDialogOpen] = useState(false);
  const [selectedTenantForFeatures, setSelectedTenantForFeatures] = useState<TenantForFeatures | null>(null);
  const [bulkFeatureDialogOpen, setBulkFeatureDialogOpen] = useState(false);
  const [createOrderDialogOpen, setCreateOrderDialogOpen] = useState(false);
  const [selectedTenantForOrder, setSelectedTenantForOrder] = useState<{ id: string; name: string } | null>(null);
  const [resourceDialogOpen, setResourceDialogOpen] = useState(false);
  const [selectedTenantForResources, setSelectedTenantForResources] = useState<any>(null);

  // Filter configuration
  const filterConfig: FilterConfig[] = useMemo(() => [
    {
      key: 'activation',
      label: 'Activation',
      type: 'select',
      options: [
        { label: 'Activated', value: 'activated' },
        { label: 'Pending', value: 'pending' },
      ],
    },
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      options: [
        { label: 'Active', value: 'active' },
        { label: 'Trial', value: 'trialing' },
        { label: 'Suspended', value: 'suspended' },
        { label: 'Past Due', value: 'past_due' },
        { label: 'Cancelled', value: 'cancelled' },
      ],
    },
    {
      key: 'plan',
      label: 'Plan',
      type: 'select',
      options: plans.map((p) => ({ label: p.name, value: p.id })),
    },
    {
      key: 'createdAt',
      label: 'Created Date',
      type: 'date-range',
    },
  ], [plans]);

  // Apply filters and search
  const filteredTenants = useMemo(() => {
    return tenants.filter((tenant) => {
      const matchesSearch =
        tenant.name.toLowerCase().includes(search.toLowerCase()) ||
        tenant.owner_email?.toLowerCase().includes(search.toLowerCase());
      
      if (!matchesSearch) return false;

      const activationFilter = activeFilters.activation as string | undefined;
      if (activationFilter && activationFilter !== 'all') {
        if (activationFilter === 'activated' && !tenant.is_activated) return false;
        if (activationFilter === 'pending' && tenant.is_activated) return false;
      }

      const statusFilter = activeFilters.status as string | undefined;
      if (statusFilter && statusFilter !== 'all' && tenant.subscription_status !== statusFilter) {
        return false;
      }

      const planFilter = activeFilters.plan as string | undefined;
      if (planFilter && planFilter !== 'all') {
        const tenantPlan = plans.find((p) => p.name === tenant.plan_name);
        if (tenantPlan?.id !== planFilter) return false;
      }

      const dateFilter = activeFilters.createdAt as { from?: Date; to?: Date } | undefined;
      if (dateFilter) {
        const createdAt = new Date(tenant.created_at);
        if (dateFilter.from && isBefore(createdAt, startOfDay(dateFilter.from))) return false;
        if (dateFilter.to && isAfter(createdAt, endOfDay(dateFilter.to))) return false;
      }

      return true;
    });
  }, [tenants, search, activeFilters, plans]);

  const allSelected = filteredTenants.length > 0 && filteredTenants.every((t) => selectedIds.has(t.id));
  const someSelected = filteredTenants.some((t) => selectedIds.has(t.id));

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredTenants.map((t) => t.id)));
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

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500/10 text-green-500 border-green-500/20">Active</Badge>;
      case 'trialing':
        return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20">Trial</Badge>;
      case 'suspended':
        return <Badge className="bg-red-500/10 text-red-500 border-red-500/20">Suspended</Badge>;
      case 'cancelled':
        return <Badge className="bg-gray-500/10 text-gray-500 border-gray-500/20">Cancelled</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const handleStatusChange = async (tenantId: string, status: 'active' | 'suspended') => {
    try {
      const tenant = tenants.find((t) => t.id === tenantId);
      await updateSubscriptionStatus(tenantId, status);
      await logAction(status === 'active' ? 'activate' : 'suspend', 'tenant', tenantId, {
        old_value: tenant?.subscription_status,
        new_value: status,
      });
      toast.success(`Subscription ${status === 'active' ? 'activated' : 'suspended'}`);
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const handleDelete = async () => {
    if (!selectedTenantId) return;
    try {
      const tenant = tenants.find((t) => t.id === selectedTenantId);
      await deleteTenant(selectedTenantId);
      await logAction('delete', 'tenant', selectedTenantId, {
        tenant_name: tenant?.name,
      });
      toast.success('Tenant deleted successfully');
      setDeleteDialogOpen(false);
      setSelectedTenantId(null);
    } catch (error) {
      toast.error('Failed to delete tenant');
    }
  };

  const handleImpersonate = async (tenantId: string, tenantName: string) => {
    startImpersonation({ id: tenantId, name: tenantName });
    await logAction('impersonate', 'tenant', tenantId, { tenant_name: tenantName });
    toast.success(`Now viewing as "${tenantName}"`);
    navigate('/dashboard');
  };

  const handleActivateTenant = async (tenantId: string, tenantName: string) => {
    try {
      await activateTenant(tenantId);
      await logAction('activate', 'tenant', tenantId, { tenant_name: tenantName });
      toast.success(`Tenant "${tenantName}" activated successfully`);
    } catch (error) {
      toast.error('Failed to activate tenant');
    }
  };

  const openCreateOrderDialog = (tenant: AdminTenant) => {
    setSelectedTenantForOrder({ id: tenant.id, name: tenant.name });
    setCreateOrderDialogOpen(true);
  };

  const openResourceDialog = (tenant: AdminTenant) => {
    setSelectedTenantForResources({
      id: tenant.id,
      name: tenant.name,
      plan_name: tenant.plan_name,
      resource_overrides: tenant.resource_overrides,
      plan_defaults: tenant.plan_defaults,
    });
    setResourceDialogOpen(true);
  };

  const handleUpdateResourceOverrides = async (tenantId: string, overrides: any) => {
    await updateResourceOverrides(tenantId, overrides);
    await logAction('update', 'subscription', tenantId, {
      status: 'resource_overrides_updated',
    });
  };

  const handleExport = () => {
    const dataToExport = selectedIds.size > 0 
      ? filteredTenants.filter((t) => selectedIds.has(t.id))
      : filteredTenants;

    exportToCSV(
      dataToExport,
      [
        { key: 'name', header: 'Tenant Name' },
        { key: 'slug', header: 'Slug' },
        { key: 'owner_name', header: 'Owner Name' },
        { key: 'owner_email', header: 'Owner Email' },
        { key: 'plan_name', header: 'Plan' },
        { key: 'subscription_status', header: 'Status' },
        { key: 'instance_count', header: 'Instances' },
        { key: 'message_count', header: 'Messages This Month' },
        { key: 'created_at', header: 'Created At', formatter: (v) => v ? format(new Date(v as string), 'yyyy-MM-dd HH:mm:ss') : '' },
      ],
      `tenants-export-${format(new Date(), 'yyyy-MM-dd')}`
    );

    toast.success(`Exported ${dataToExport.length} tenants`);
  };

  // Bulk actions
  const handleBulkActivate = async () => {
    setBulkProcessing(true);
    try {
      const ids = Array.from(selectedIds);
      await bulkUpdateSubscriptionStatus(ids, 'active');
      await logBulkAction('bulk_activate', 'tenant', ids, { new_value: 'active' });
      toast.success(`${selectedIds.size} subscriptions activated`);
      clearSelection();
    } catch (error) {
      toast.error('Failed to activate subscriptions');
    } finally {
      setBulkProcessing(false);
    }
  };

  const handleBulkSuspend = async () => {
    setBulkProcessing(true);
    try {
      const ids = Array.from(selectedIds);
      await bulkUpdateSubscriptionStatus(ids, 'suspended');
      await logBulkAction('bulk_suspend', 'tenant', ids, { new_value: 'suspended' });
      toast.success(`${selectedIds.size} subscriptions suspended`);
      clearSelection();
    } catch (error) {
      toast.error('Failed to suspend subscriptions');
    } finally {
      setBulkProcessing(false);
    }
  };

  const handleBulkDelete = async () => {
    setBulkProcessing(true);
    try {
      const ids = Array.from(selectedIds);
      await bulkDeleteTenants(ids);
      await logBulkAction('bulk_delete', 'tenant', ids);
      toast.success(`${selectedIds.size} tenants deleted`);
      clearSelection();
      setBulkDeleteDialogOpen(false);
    } catch (error) {
      toast.error('Failed to delete tenants');
    } finally {
      setBulkProcessing(false);
    }
  };

  const getFeatureCount = (tenant: AdminTenant) => {
    const planFeatures = tenant.plan_features || {};
    const overrides = tenant.feature_overrides || {};
    const defaultFeatures = {
      orders_enabled: true,
      products_enabled: true,
      automation_enabled: false,
      workflows_enabled: false,
      analytics_enabled: false,
      team_enabled: true,
      ai_agent_enabled: false,
      quick_replies_enabled: true,
      invoice_generation: false,
      woocommerce_sync: false,
      contacts_enabled: true,
    };
    const merged = { ...defaultFeatures, ...planFeatures, ...overrides };
    const enabled = Object.values(merged).filter(Boolean).length;
    const total = Object.keys(FEATURE_FLAGS).length;
    const hasOverrides = Object.keys(overrides).length > 0;
    return { enabled, total, hasOverrides };
  };

  const openFeatureDialog = (tenant: AdminTenant) => {
    setSelectedTenantForFeatures({
      id: tenant.id,
      name: tenant.name,
      subscription_id: tenant.subscription_id,
      plan_id: tenant.plan_id,
      plan_name: tenant.plan_name,
      plan_features: tenant.plan_features,
      feature_overrides: tenant.feature_overrides,
    });
    setFeatureDialogOpen(true);
  };

  const handleUpdatePlan = async (tenantId: string, planId: string) => {
    const tenant = tenants.find((t) => t.id === tenantId);
    const newPlan = plans.find((p) => p.id === planId);
    await updateTenantPlan(tenantId, planId);
    await logAction('change_plan', 'subscription', tenantId, {
      old_value: tenant?.plan_name,
      new_value: newPlan?.name,
      plan_id: planId,
    });
  };

  const handleUpdateFeatureOverrides = async (tenantId: string, overrides: Record<string, boolean> | null) => {
    await updateFeatureOverrides(tenantId, overrides);
    await logAction('update', 'subscription', tenantId, {
      status: 'feature_overrides_updated',
    });
  };

  const handleBulkFeatureOverrides = async (overrides: Record<string, boolean>) => {
    setBulkProcessing(true);
    try {
      const ids = Array.from(selectedIds);
      await bulkUpdateFeatureOverrides(ids, overrides);
      await logBulkAction('bulk_change_plan', 'subscription', ids, {
        status: 'bulk_feature_overrides_applied',
      });
      clearSelection();
    } catch (error) {
      throw error;
    } finally {
      setBulkProcessing(false);
    }
  };

  const handleBulkResetFeatures = async () => {
    setBulkProcessing(true);
    try {
      const ids = Array.from(selectedIds);
      await bulkResetFeatureOverrides(ids);
      await logBulkAction('bulk_change_plan', 'subscription', ids, {
        status: 'bulk_feature_overrides_reset',
      });
      toast.success(`Feature overrides cleared for ${selectedIds.size} tenants`);
      clearSelection();
    } catch (error) {
      toast.error('Failed to reset features');
    } finally {
      setBulkProcessing(false);
    }
  };

  // Mobile tenant card component
  const TenantCard = ({ tenant }: { tenant: AdminTenant }) => {
    const { enabled, total, hasOverrides } = getFeatureCount(tenant);
    
    return (
      <MobileDataCard
        data={tenant}
        selected={selectedIds.has(tenant.id)}
        onSelect={() => toggleSelect(tenant.id)}
        header={
          <div>
            <p className="font-medium">{tenant.name}</p>
            <p className="text-xs text-muted-foreground">{tenant.owner_email}</p>
          </div>
        }
        fields={[
          {
            key: 'plan',
            label: 'Plan',
            render: () => <span>{tenant.plan_name || 'No plan'}</span>,
          },
          {
            key: 'activation',
            label: 'Activation',
            render: () => tenant.is_activated ? (
              <Badge className="bg-green-500/10 text-green-500 border-green-500/20 text-xs">
                <CheckCircle className="h-3 w-3 mr-1" />
                Activated
              </Badge>
            ) : (
              <Badge className="bg-warning/10 text-warning border-warning/20 text-xs">
                ⏳ Pending
              </Badge>
            ),
          },
          {
            key: 'status',
            label: 'Status',
            render: () => getStatusBadge(tenant.subscription_status),
          },
          {
            key: 'stats',
            render: () => (
              <div className="flex justify-between text-xs text-muted-foreground w-full">
                <span>{tenant.instance_count} instances</span>
                <span>{tenant.message_count.toLocaleString()} msgs</span>
                <span>{format(new Date(tenant.created_at), 'MMM d')}</span>
              </div>
            ),
            className: 'pt-2 border-t mt-2',
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
              {!tenant.is_activated && (
                <>
                  <DropdownMenuItem onClick={() => openCreateOrderDialog(tenant)}>
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    Create Order
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleActivateTenant(tenant.id, tenant.name)}>
                    <Zap className="h-4 w-4 mr-2" />
                    Quick Activate
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem onClick={() => openFeatureDialog(tenant)}>
                <Settings2 className="h-4 w-4 mr-2" />
                Features ({enabled}/{total})
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openResourceDialog(tenant)}>
                <SlidersHorizontal className="h-4 w-4 mr-2" />
                Resource Limits
                {tenant.resource_overrides && <Badge variant="secondary" className="ml-auto text-[10px] px-1">Custom</Badge>}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleImpersonate(tenant.id, tenant.name)}>
                <Eye className="h-4 w-4 mr-2" />
                View as Tenant
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {tenant.subscription_status !== 'active' && (
                <DropdownMenuItem onClick={() => handleStatusChange(tenant.id, 'active')}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Activate
                </DropdownMenuItem>
              )}
              {tenant.subscription_status !== 'suspended' && (
                <DropdownMenuItem onClick={() => handleStatusChange(tenant.id, 'suspended')}>
                  <Ban className="h-4 w-4 mr-2" />
                  Suspend
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => {
                  setSelectedTenantId(tenant.id);
                  setDeleteDialogOpen(true);
                }}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        }
      />
    );
  };

  return (
    <AdminLayout>
      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        <ResponsivePageHeader
          title="Tenants"
          description="Manage all workspaces"
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

        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                  <Building2 className="h-5 w-5" />
                  All Tenants
                </CardTitle>
                <CardDescription>
                  {filteredTenants.length} of {tenants.length} workspaces
                </CardDescription>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search tenants..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
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
                  <Skeleton key={i} className="h-28 md:h-12 w-full" />
                ))}
              </div>
            ) : isMobile ? (
              <div className="space-y-3">
                {/* Select All for mobile */}
                {filteredTenants.length > 0 && (
                  <div className="flex items-center gap-2 pb-2 border-b">
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={toggleSelectAll}
                      aria-label="Select all"
                    />
                    <span className="text-sm text-muted-foreground">
                      {allSelected ? 'Deselect all' : 'Select all'} ({filteredTenants.length})
                    </span>
                  </div>
                )}
                {filteredTenants.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    No tenants found
                  </div>
                ) : (
                  filteredTenants.map((tenant) => (
                    <TenantCard key={tenant.id} tenant={tenant} />
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
                    <TableHead>Owner</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Activation</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Features</TableHead>
                    <TableHead className="text-right">Instances</TableHead>
                    <TableHead className="text-right">Messages</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTenants.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={11} className="text-center text-muted-foreground py-8">
                        No tenants found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTenants.map((tenant) => (
                      <TableRow key={tenant.id} className={selectedIds.has(tenant.id) ? 'bg-muted/50' : ''}>
                        <TableCell>
                          <Checkbox
                            checked={selectedIds.has(tenant.id)}
                            onCheckedChange={() => toggleSelect(tenant.id)}
                            aria-label={`Select ${tenant.name}`}
                          />
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{tenant.name}</p>
                            <p className="text-xs text-muted-foreground">{tenant.slug || 'No slug'}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="text-sm">{tenant.owner_name || 'Unknown'}</p>
                            <p className="text-xs text-muted-foreground">{tenant.owner_email}</p>
                          </div>
                        </TableCell>
                        <TableCell>{tenant.plan_name || 'No plan'}</TableCell>
                        <TableCell>
                          {tenant.is_activated ? (
                            <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Activated
                            </Badge>
                          ) : (
                            <Badge className="bg-warning/10 text-warning border-warning/20">
                              ⏳ Pending
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>{getStatusBadge(tenant.subscription_status)}</TableCell>
                        <TableCell>
                          {(() => {
                            const { enabled, total, hasOverrides } = getFeatureCount(tenant);
                            return (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-auto py-1 px-2 gap-1.5"
                                onClick={() => openFeatureDialog(tenant)}
                              >
                                <span className={hasOverrides ? 'text-primary font-medium' : 'text-muted-foreground'}>
                                  {enabled}/{total}
                                </span>
                                {hasOverrides && (
                                  <Badge variant="secondary" className="text-xs px-1 py-0">
                                    Custom
                                  </Badge>
                                )}
                                <Settings2 className="h-3.5 w-3.5 text-muted-foreground" />
                              </Button>
                            );
                          })()}
                        </TableCell>
                        <TableCell className="text-right">{tenant.instance_count}</TableCell>
                        <TableCell className="text-right">{tenant.message_count.toLocaleString()}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {format(new Date(tenant.created_at), 'MMM d, yyyy')}
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
                              {!tenant.is_activated && (
                                <>
                                  <DropdownMenuItem onClick={() => openCreateOrderDialog(tenant)}>
                                    <ShoppingCart className="h-4 w-4 mr-2" />
                                    Create Order
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleActivateTenant(tenant.id, tenant.name)}>
                                    <Zap className="h-4 w-4 mr-2" />
                                    Quick Activate
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                </>
                              )}
              <DropdownMenuItem onClick={() => openFeatureDialog(tenant)}>
                <Settings2 className="h-4 w-4 mr-2" />
                Manage Features
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openResourceDialog(tenant)}>
                <SlidersHorizontal className="h-4 w-4 mr-2" />
                Resource Limits
                {tenant.resource_overrides && <Badge variant="secondary" className="ml-auto text-[10px] px-1">Custom</Badge>}
              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleImpersonate(tenant.id, tenant.name)}>
                                <Eye className="h-4 w-4 mr-2" />
                                View as Tenant
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {tenant.subscription_status !== 'active' && (
                                <DropdownMenuItem onClick={() => handleStatusChange(tenant.id, 'active')}>
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Activate Subscription
                                </DropdownMenuItem>
                              )}
                              {tenant.subscription_status !== 'suspended' && (
                                <DropdownMenuItem onClick={() => handleStatusChange(tenant.id, 'suspended')}>
                                  <Ban className="h-4 w-4 mr-2" />
                                  Suspend Subscription
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => {
                                  setSelectedTenantId(tenant.id);
                                  setDeleteDialogOpen(true);
                                }}
                              >
                                Delete Tenant
                              </DropdownMenuItem>
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
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent className="mx-4 max-w-[calc(100vw-2rem)] sm:max-w-lg">
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Tenant</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the tenant and all associated data.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-col sm:flex-row gap-2">
              <AlertDialogCancel className="w-full sm:w-auto">Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="w-full sm:w-auto bg-destructive text-destructive-foreground">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
          <AlertDialogContent className="mx-4 max-w-[calc(100vw-2rem)] sm:max-w-lg">
            <AlertDialogHeader>
              <AlertDialogTitle>Delete {selectedIds.size} Tenants</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete {selectedIds.size} tenants and all their data.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-col sm:flex-row gap-2">
              <AlertDialogCancel className="w-full sm:w-auto">Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleBulkDelete}
                className="w-full sm:w-auto bg-destructive text-destructive-foreground"
                disabled={bulkProcessing}
              >
                {bulkProcessing ? 'Deleting...' : 'Delete All'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <BulkActionsBar
          selectedCount={selectedIds.size}
          onClearSelection={clearSelection}
          actions={[
            {
              label: 'Features',
              icon: <Sliders className="h-4 w-4" />,
              onClick: () => setBulkFeatureDialogOpen(true),
              disabled: bulkProcessing,
            },
            {
              label: 'Reset',
              icon: <RotateCcw className="h-4 w-4" />,
              onClick: handleBulkResetFeatures,
              variant: 'outline',
              disabled: bulkProcessing,
            },
            {
              label: 'Activate',
              icon: <CheckCircle className="h-4 w-4" />,
              onClick: handleBulkActivate,
              disabled: bulkProcessing,
            },
            {
              label: 'Suspend',
              icon: <Ban className="h-4 w-4" />,
              onClick: handleBulkSuspend,
              disabled: bulkProcessing,
            },
            {
              label: 'Delete',
              icon: <Trash2 className="h-4 w-4" />,
              onClick: () => setBulkDeleteDialogOpen(true),
              variant: 'destructive',
              disabled: bulkProcessing,
            },
          ]}
        />

        <TenantFeatureDialog
          open={featureDialogOpen}
          onOpenChange={setFeatureDialogOpen}
          tenant={selectedTenantForFeatures}
          plans={plans.map((p) => ({ id: p.id, name: p.name, features: p.features as Record<string, boolean> | undefined }))}
          onUpdatePlan={handleUpdatePlan}
          onUpdateFeatureOverrides={handleUpdateFeatureOverrides}
        />

        <BulkFeatureDialog
          open={bulkFeatureDialogOpen}
          onOpenChange={setBulkFeatureDialogOpen}
          selectedCount={selectedIds.size}
          onApply={handleBulkFeatureOverrides}
        />

        <CreateSubscriptionOrderDialog
          open={createOrderDialogOpen}
          onOpenChange={setCreateOrderDialogOpen}
          tenant={selectedTenantForOrder}
          onSuccess={refetch}
        />

        <TenantResourceOverridesDialog
          open={resourceDialogOpen}
          onOpenChange={setResourceDialogOpen}
          tenant={selectedTenantForResources}
          onSave={handleUpdateResourceOverrides}
        />
      </div>
    </AdminLayout>
  );
}
