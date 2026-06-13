import { Workflow } from '@/hooks/useWorkflows';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreVertical, Edit, Trash2, Play, MessageCircle, Webhook, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface WorkflowCardProps {
  workflow: Workflow;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: (isActive: boolean) => void;
}

const triggerIcons: Record<string, React.ElementType> = {
  message_received: MessageCircle,
  keyword: MessageCircle,
  webhook: Webhook,
  schedule: Clock,
};

const triggerLabels: Record<string, string> = {
  message_received: 'Message Received',
  keyword: 'Keyword Match',
  webhook: 'Webhook',
  schedule: 'Schedule',
};

export default function WorkflowCard({ workflow, onEdit, onDelete, onToggle }: WorkflowCardProps) {
  const TriggerIcon = triggerIcons[workflow.trigger_type] || MessageCircle;

  return (
    <Card hover="lift">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base font-semibold">{workflow.name}</CardTitle>
              <Badge
                variant={workflow.is_active ? 'success-soft' : 'neutral-soft'}
                className="gap-1.5"
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${workflow.is_active ? 'bg-success' : 'bg-muted-foreground'}`}
                  aria-hidden
                />
                {workflow.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </div>
            <CardDescription className="mt-1">
              {workflow.description || 'No description'}
            </CardDescription>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Workflow
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDelete} className="text-destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-info-soft flex items-center justify-center">
              <TriggerIcon className="h-4 w-4 text-info" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Trigger</p>
              <p className="text-sm font-medium">{triggerLabels[workflow.trigger_type] || workflow.trigger_type}</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Updated</p>
              <p className="text-sm">{formatDistanceToNow(new Date(workflow.updated_at), { addSuffix: true })}</p>
            </div>
            <Switch
              checked={workflow.is_active}
              onCheckedChange={onToggle}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
