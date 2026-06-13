import { AutomationRule } from '@/hooks/useAutomationRules';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, MessageSquare, UserPlus, Zap, Target, ArrowRight } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface RuleCardProps {
  rule: AutomationRule;
  onToggle: (id: string, isActive: boolean) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function RuleCard({ rule, onToggle, onDelete }: RuleCardProps) {
  const getTriggerIcon = () => {
    switch (rule.trigger_type) {
      case 'new_message':
        return <MessageSquare className="h-4 w-4" />;
      case 'keyword_match':
        return <Target className="h-4 w-4" />;
      default:
        return <Zap className="h-4 w-4" />;
    }
  };

  const getActionIcon = () => {
    switch (rule.action_type) {
      case 'auto_reply':
        return <MessageSquare className="h-4 w-4" />;
      case 'assign_agent':
        return <UserPlus className="h-4 w-4" />;
      default:
        return <Zap className="h-4 w-4" />;
    }
  };

  const getTriggerLabel = () => {
    switch (rule.trigger_type) {
      case 'new_message':
        return 'On any new message';
      case 'keyword_match':
        const keywords = rule.trigger_config?.keywords || [];
        return `Keywords: ${keywords.join(', ')}`;
      default:
        return rule.trigger_type;
    }
  };

  const getActionLabel = () => {
    switch (rule.action_type) {
      case 'auto_reply':
        const msg = rule.action_config?.reply_message || '';
        return msg.length > 50 ? msg.slice(0, 50) + '...' : msg;
      case 'assign_agent':
        return 'Assign to agent';
      default:
        return rule.action_type;
    }
  };

  return (
    <Card hover="lift" className={!rule.is_active ? 'opacity-70' : ''}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base font-semibold">{rule.name}</CardTitle>
              <Badge
                variant={rule.is_active ? 'success-soft' : 'neutral-soft'}
                className="gap-1.5"
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${rule.is_active ? 'bg-success' : 'bg-muted-foreground'}`}
                  aria-hidden
                />
                {rule.is_active ? 'Active' : 'Paused'}
              </Badge>
            </div>
            {rule.description && (
              <CardDescription>{rule.description}</CardDescription>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Switch
              checked={rule.is_active}
              onCheckedChange={(checked) => onToggle(rule.id, checked)}
              aria-label={rule.is_active ? 'Deactivate rule' : 'Activate rule'}
            />
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Rule</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete "{rule.name}"? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => onDelete(rule.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-start gap-3 rounded-xl bg-muted-soft px-3 py-2.5">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-info-soft text-info">
            {getTriggerIcon()}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">When</p>
            <p className="truncate text-sm text-foreground">{getTriggerLabel()}</p>
          </div>
        </div>
        <div className="flex items-start gap-3 rounded-xl bg-muted-soft px-3 py-2.5">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent text-primary">
            {getActionIcon()}
          </span>
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <ArrowRight className="h-3 w-3" aria-hidden /> Then
            </p>
            <p className="truncate text-sm text-foreground">{getActionLabel()}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
