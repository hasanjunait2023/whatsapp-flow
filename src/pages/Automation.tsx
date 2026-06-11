import { useAutomationRules, CreateAutomationRuleInput } from '@/hooks/useAutomationRules';
import { useTeam } from '@/hooks/useTeam';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { AddRuleDialog } from '@/components/automation/AddRuleDialog';
import { RuleCard } from '@/components/automation/RuleCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Zap } from 'lucide-react';
import { toast } from 'sonner';

export default function Automation() {
  const { rules, loading, createRule, toggleRule, deleteRule } = useAutomationRules();
  const { members } = useTeam();

  const teamMembers = members.map(m => ({
    id: m.user_id,
    name: m.profile?.full_name || m.profile?.email || 'Unknown',
  }));

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
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Automation</h1>
            <p className="text-muted-foreground">
              Create rules to automate your messaging workflow
            </p>
          </div>
          <AddRuleDialog onAdd={handleAddRule} teamMembers={teamMembers} />
        </div>

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-40 rounded-lg" />
            ))}
          </div>
        ) : rules.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-muted p-4 mb-4">
              <Zap className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-2">No automation rules yet</h3>
            <p className="text-muted-foreground max-w-sm mb-4">
              Create your first automation rule to auto-reply to messages or assign conversations to team members.
            </p>
            <AddRuleDialog onAdd={handleAddRule} teamMembers={teamMembers} />
          </div>
        ) : (
          <div data-tour="automation-rules" className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {rules.map((rule) => (
              <RuleCard
                key={rule.id}
                rule={rule}
                onToggle={handleToggle}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
