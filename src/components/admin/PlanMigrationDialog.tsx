import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import {
  usePlanMigration,
  LegacySubscription,
  MigrationTarget,
} from '@/hooks/usePlanMigration';
import {
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Building2,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface PlanMigrationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMigrationComplete?: () => void;
}

export function PlanMigrationDialog({
  open,
  onOpenChange,
  onMigrationComplete,
}: PlanMigrationDialogProps) {
  const {
    legacySubscriptions,
    loading,
    migrating,
    refetch,
    bulkMigrate,
    getPlansForBusinessType,
  } = usePlanMigration();

  const [selectedSubs, setSelectedSubs] = useState<Set<string>>(new Set());
  const [planAssignments, setPlanAssignments] = useState<Record<string, string>>({});
  const [step, setStep] = useState<'select' | 'confirm' | 'complete'>('select');
  const [migrationResult, setMigrationResult] = useState<{
    success: number;
    failed: number;
  } | null>(null);

  // Initialize plan assignments with suggested plans
  useEffect(() => {
    const initial: Record<string, string> = {};
    legacySubscriptions.forEach((sub) => {
      if (sub.suggested_plan_id) {
        initial[sub.id] = sub.suggested_plan_id;
      }
    });
    setPlanAssignments(initial);
  }, [legacySubscriptions]);

  const toggleSelectAll = () => {
    if (selectedSubs.size === legacySubscriptions.length) {
      setSelectedSubs(new Set());
    } else {
      setSelectedSubs(new Set(legacySubscriptions.map((s) => s.id)));
    }
  };

  const toggleSubscription = (id: string) => {
    const newSet = new Set(selectedSubs);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedSubs(newSet);
  };

  const updatePlanAssignment = (subscriptionId: string, planId: string) => {
    setPlanAssignments((prev) => ({ ...prev, [subscriptionId]: planId }));
  };

  const getSelectedMigrations = (): MigrationTarget[] => {
    return Array.from(selectedSubs)
      .filter((subId) => planAssignments[subId])
      .map((subId) => ({
        subscription_id: subId,
        target_plan_id: planAssignments[subId],
      }));
  };

  const handleProceed = () => {
    const migrations = getSelectedMigrations();
    if (migrations.length === 0) {
      toast.error('Please select subscriptions and assign target plans');
      return;
    }
    setStep('confirm');
  };

  const handleMigrate = async () => {
    const migrations = getSelectedMigrations();
    const result = await bulkMigrate(migrations);
    setMigrationResult(result);
    setStep('complete');

    if (result.success > 0) {
      toast.success(`Successfully migrated ${result.success} subscription(s)`);
      onMigrationComplete?.();
    }
    if (result.failed > 0) {
      toast.error(`Failed to migrate ${result.failed} subscription(s)`);
    }
  };

  const handleClose = () => {
    setStep('select');
    setSelectedSubs(new Set());
    setMigrationResult(null);
    onOpenChange(false);
  };

  const subsWithoutBusinessType = legacySubscriptions.filter(
    (s) => !s.tenant_business_type_id
  );
  const subsWithBusinessType = legacySubscriptions.filter(
    (s) => s.tenant_business_type_id
  );

  const renderSubscriptionRow = (sub: LegacySubscription) => {
    const availablePlans = getPlansForBusinessType(sub.tenant_business_type_id);
    const selectedPlanId = planAssignments[sub.id];

    return (
      <TableRow key={sub.id}>
        <TableCell>
          <Checkbox
            checked={selectedSubs.has(sub.id)}
            onCheckedChange={() => toggleSubscription(sub.id)}
            disabled={!sub.tenant_business_type_id}
          />
        </TableCell>
        <TableCell>
          <div className="font-medium">{sub.tenant_name}</div>
          <div className="text-xs text-muted-foreground">
            {sub.tenant_business_type_name || (
              <span className="text-amber-600">No business type</span>
            )}
          </div>
        </TableCell>
        <TableCell>
          <Badge variant="outline">{sub.plan_name}</Badge>
        </TableCell>
        <TableCell>
          <Badge
            variant={sub.status === 'active' ? 'default' : 'secondary'}
          >
            {sub.status}
          </Badge>
        </TableCell>
        <TableCell className="text-sm text-muted-foreground">
          {format(new Date(sub.current_period_end), 'MMM dd, yyyy')}
        </TableCell>
        <TableCell>
          {sub.tenant_business_type_id ? (
            <Select
              value={selectedPlanId || ''}
              onValueChange={(v) => updatePlanAssignment(sub.id, v)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select plan" />
              </SelectTrigger>
              <SelectContent>
                {availablePlans.map((plan) => (
                  <SelectItem key={plan.id} value={plan.id}>
                    <span className="flex items-center gap-2">
                      {plan.name}
                      <Badge variant="outline" className="ml-1 text-xs">
                        ৳{plan.price_monthly}
                      </Badge>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <span className="text-xs text-muted-foreground italic">
              Assign business type first
            </span>
          )}
        </TableCell>
      </TableRow>
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Plan Migration Tool
          </DialogTitle>
          <DialogDescription>
            Migrate subscribers from legacy plans to new business-type specific plans
          </DialogDescription>
        </DialogHeader>

        {step === 'select' && (
          <>
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : legacySubscriptions.length === 0 ? (
              <div className="py-12 text-center">
                <CheckCircle2 className="h-12 w-12 mx-auto text-green-500 mb-4" />
                <h3 className="text-lg font-semibold">All Caught Up!</h3>
                <p className="text-muted-foreground">
                  No subscriptions on legacy plans. All tenants are on
                  business-type specific plans.
                </p>
              </div>
            ) : (
              <>
                {subsWithoutBusinessType.length > 0 && (
                  <Alert variant="destructive" className="mb-4">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Action Required</AlertTitle>
                    <AlertDescription>
                      {subsWithoutBusinessType.length} tenant(s) don't have a
                      business type assigned. Please assign a business type in
                      the Tenants page before migrating.
                    </AlertDescription>
                  </Alert>
                )}

                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {legacySubscriptions.length} on legacy plans
                    </span>
                    <span className="flex items-center gap-1">
                      <Building2 className="h-4 w-4" />
                      {subsWithBusinessType.length} ready to migrate
                    </span>
                  </div>
                  <Button variant="outline" size="sm" onClick={refetch}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                </div>

                <ScrollArea className="h-[400px] border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[50px]">
                          <Checkbox
                            checked={
                              selectedSubs.size === subsWithBusinessType.length &&
                              subsWithBusinessType.length > 0
                            }
                            onCheckedChange={toggleSelectAll}
                          />
                        </TableHead>
                        <TableHead>Tenant</TableHead>
                        <TableHead>Current Plan</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Expires</TableHead>
                        <TableHead>Migrate To</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {legacySubscriptions.map(renderSubscriptionRow)}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={handleProceed}
                disabled={selectedSubs.size === 0 || loading}
              >
                Continue
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 'confirm' && (
          <>
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Confirm Migration</AlertTitle>
              <AlertDescription>
                You are about to migrate {getSelectedMigrations().length}{' '}
                subscription(s) to new plans. This action will:
                <ul className="list-disc ml-6 mt-2 space-y-1">
                  <li>Update their plan immediately</li>
                  <li>Preserve their current billing period</li>
                  <li>Apply new plan features and limits</li>
                </ul>
              </AlertDescription>
            </Alert>

            <ScrollArea className="h-[300px] border rounded-lg p-4">
              <div className="space-y-3">
                {getSelectedMigrations().map((migration) => {
                  const sub = legacySubscriptions.find(
                    (s) => s.id === migration.subscription_id
                  );
                  const availablePlans = getPlansForBusinessType(
                    sub?.tenant_business_type_id || null
                  );
                  const targetPlan = availablePlans.find(
                    (p) => p.id === migration.target_plan_id
                  );

                  return (
                    <div
                      key={migration.subscription_id}
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                    >
                      <div>
                        <div className="font-medium">{sub?.tenant_name}</div>
                        <div className="text-sm text-muted-foreground">
                          {sub?.tenant_business_type_name}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="outline">{sub?.plan_name}</Badge>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        <Badge variant="default">{targetPlan?.name}</Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep('select')}>
                Back
              </Button>
              <Button onClick={handleMigrate} disabled={migrating}>
                {migrating ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Migrating...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Confirm Migration
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 'complete' && migrationResult && (
          <>
            <div className="py-8 text-center">
              {migrationResult.failed === 0 ? (
                <>
                  <CheckCircle2 className="h-16 w-16 mx-auto text-green-500 mb-4" />
                  <h3 className="text-xl font-semibold mb-2">
                    Migration Complete!
                  </h3>
                  <p className="text-muted-foreground">
                    Successfully migrated {migrationResult.success} subscription(s)
                    to new business-type specific plans.
                  </p>
                </>
              ) : (
                <>
                  <AlertTriangle className="h-16 w-16 mx-auto text-amber-500 mb-4" />
                  <h3 className="text-xl font-semibold mb-2">
                    Migration Partially Complete
                  </h3>
                  <p className="text-muted-foreground">
                    {migrationResult.success} succeeded, {migrationResult.failed}{' '}
                    failed. Please check the console for details.
                  </p>
                </>
              )}
            </div>

            <DialogFooter>
              <Button onClick={handleClose}>Close</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
