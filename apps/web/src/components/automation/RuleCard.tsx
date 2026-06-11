import { AutomationRule } from '@/hooks/useAutomationRules';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, MessageSquare, UserPlus, Zap, Target } from 'lucide-react';
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
    <Card className={!rule.is_active ? 'opacity-60' : ''}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-base font-medium">{rule.name}</CardTitle>
            {rule.description && (
              <CardDescription className="mt-1">{rule.description}</CardDescription>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={rule.is_active}
              onCheckedChange={(checked) => onToggle(rule.id, checked)}
            />
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
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
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="flex items-center gap-1.5">
            {getTriggerIcon()}
            <span>When</span>
          </Badge>
          <span className="text-sm text-muted-foreground">{getTriggerLabel()}</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="flex items-center gap-1.5">
            {getActionIcon()}
            <span>Then</span>
          </Badge>
          <span className="text-sm text-muted-foreground">{getActionLabel()}</span>
        </div>
      </CardContent>
    </Card>
  );
}
