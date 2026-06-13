import { useAutomationRules, CreateAutomationRuleInput } from '@/hooks/useAutomationRules';
import { useTeam } from '@/hooks/useTeam';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { AddRuleDialog } from '@/components/automation/AddRuleDialog';
import { RuleCard } from '@/components/automation/RuleCard';
import { ActiveRulesTile } from '@/components/automation/ActiveRulesTile';
import { KpiCard } from '@/components/dashboard/bento/KpiCard';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Zap, ListChecks, PauseCircle, PlayCircle } from 'lucide-react';
import { m, pageEnter, staggerContainer, staggerItem } from '@/lib/motion';
import { toast } from 'sonner';

export default function Automation() {
  const { rules, loading, createRule, toggleRule, deleteRule } = useAutomationRules();
  const { members } = useTeam();

  const teamMembers = members.map(m => ({
    id: m.user_id,
    name: m.profile?.full_name || m.profile?.email || 'Unknown',
  }));

  const stats = {
    total: rules.length,
    active: rules.filter(r => r.is_active).length,
    paused: rules.filter(r => !r.is_active).length,
  };

  const handleAddRule = async (input: CreateAutomationRuleInput) => {
    try {
      await createRule(input);
      toast.success('Automation rule created successfully');
    } catch (error) {
      toast.error('Failed to create automation rule');
      throw error;
    }
  };

  const handleToggle = async (id: string, isActive: boolean) => {
    try {
      await toggleRule(id, isActive);
      toast.success(isActive ? 'Rule activated' : 'Rule deactivated');
    } catch (error) {
      toast.error('Failed to update rule');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteRule(id);
      toast.success('Rule deleted');
    } catch (error) {
      toast.error('Failed to delete rule');
    }
  };

  return (
    <DashboardLayout>
      <m.div
        variants={pageEnter}
        initial="hidden"
        animate="show"
        className="mx-auto w-full max-w-[1440px] px-4 py-5 sm:px-6 lg:px-8 space-y-6"
      >
        {/* Header */}
        <PageHeader
          title="Automation"
          description="Create rules to automate your messaging workflow"
        >
          <AddRuleDialog onAdd={handleAddRule} teamMembers={teamMembers} />
        </PageHeader>

        {/* KPI strip — stat cards + the ONE orange active-rules tile */}
        <m.div
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4"
        >
          <m.div variants={staggerItem}>
            <KpiCard
              title="Total Rules"
              value={stats.total}
              icon={ListChecks}
              tone="info"
              loading={loading}
            />
          </m.div>
          <m.div variants={staggerItem}>
            <KpiCard
              title="Active"
              value={stats.active}
              icon={PlayCircle}
              tone="success"
              loading={loading}
            />
          </m.div>
          <m.div variants={staggerItem}>
            <KpiCard
              title="Paused"
              value={stats.paused}
              icon={PauseCircle}
              tone="warning"
              loading={loading}
            />
          </m.div>
          {/* The single orange surface on this page */}
          <ActiveRulesTile
            activeCount={stats.active}
            totalCount={stats.total}
            loading={loading}
          />
        </m.div>

        {/* Rules grid */}
        {loading ? (
          <div className="grid gap-4 sm:gap-5 md:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-44 rounded-card" />
            ))}
          </div>
        ) : rules.length === 0 ? (
          <Card className="flex flex-col items-center justify-center px-4 py-16 text-center">
            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent">
              <Zap className="h-8 w-8 text-primary" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-foreground">No automation rules yet</h3>
            <p className="mb-6 max-w-sm text-muted-foreground">
              Create your first automation rule to auto-reply to messages or assign conversations to team members.
            </p>
            <AddRuleDialog onAdd={handleAddRule} teamMembers={teamMembers} />
          </Card>
        ) : (
          <m.div
            data-tour="automation-rules"
            variants={staggerContainer}
            initial="hidden"
            animate="show"
            className="grid gap-4 sm:gap-5 md:grid-cols-2 xl:grid-cols-3"
          >
            {rules.map((rule, index) => (
              <m.div key={rule.id} variants={index < 12 ? staggerItem : undefined}>
                <RuleCard
                  rule={rule}
                  onToggle={handleToggle}
                  onDelete={handleDelete}
                />
              </m.div>
            ))}
          </m.div>
        )}
      </m.div>
    </DashboardLayout>
  );
}
