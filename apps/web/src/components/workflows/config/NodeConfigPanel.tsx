import { Node } from '@xyflow/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Trash2, 
  Copy, 
  X, 
  Zap, 
  Send, 
  GitBranch, 
  Clock,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import TriggerConfigForm from './TriggerConfigForm';
import ActionConfigForm from './ActionConfigForm';
import ConditionConfigForm from './ConditionConfigForm';
import DelayConfigForm from './DelayConfigForm';
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
import { cn } from '@/lib/utils';

interface NodeConfigPanelProps {
  node: Node | null;
  onClose: () => void;
  onUpdateNode: (nodeId: string, data: Record<string, any>) => void;
  onDeleteNode: (nodeId: string) => void;
  onDuplicateNode: (node: Node) => void;
}

const nodeTypeInfo: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  trigger: { label: 'Trigger', icon: Zap, color: 'text-emerald-500' },
  action: { label: 'Action', icon: Send, color: 'text-blue-500' },
  condition: { label: 'Condition', icon: GitBranch, color: 'text-amber-500' },
  delay: { label: 'Delay', icon: Clock, color: 'text-purple-500' },
};

export default function NodeConfigPanel({
  node,
  onClose,
  onUpdateNode,
  onDeleteNode,
  onDuplicateNode,
}: NodeConfigPanelProps) {
  if (!node) {
    return (
      <div className="w-80 bg-card border-l border-border flex flex-col">
        <div className="p-4 border-b border-border">
          <h3 className="font-semibold">Node Configuration</h3>
        </div>
        <div className="flex-1 flex items-center justify-center p-8 text-center">
          <div className="text-muted-foreground">
            <p className="text-sm">Select a node to configure</p>
            <p className="text-xs mt-1">Click on any node in the canvas</p>
          </div>
        </div>
      </div>
    );
  }

  const nodeType = node.type || 'trigger';
  const nodeInfo = nodeTypeInfo[nodeType] || nodeTypeInfo.trigger;
  const Icon = nodeInfo.icon;
  const nodeData = node.data as Record<string, any>;
  const config = nodeData.config || {};

  const handleLabelChange = (label: string) => {
    onUpdateNode(node.id, { ...nodeData, label });
  };

  const handleConfigChange = (newConfig: Record<string, any>) => {
    onUpdateNode(node.id, { ...nodeData, config: newConfig });
  };

  // Validation check
  const getValidationStatus = () => {
    if (nodeType === 'trigger') {
      if (nodeData.triggerType === 'keyword' && (!config.keywords || config.keywords.length === 0)) {
        return { valid: false, message: 'Keywords required' };
      }
      if (nodeData.triggerType === 'contact_label_added' && !config.label_id) {
        return { valid: false, message: 'Label required' };
      }
      if (nodeData.triggerType === 'order_status_changed' && !config.order_status) {
        return { valid: false, message: 'Status required' };
      }
    }
    
    if (nodeType === 'action') {
      if (nodeData.actionType === 'send_message' && !config.message) {
        return { valid: false, message: 'Message required' };
      }
      if (nodeData.actionType === 'send_text' && (!config.message || !config.instance_id)) {
        return { valid: false, message: 'Instance and message required' };
      }
      if (['send_image', 'send_video'].includes(nodeData.actionType) && (!config.media_url || !config.instance_id)) {
        return { valid: false, message: 'Instance and media required' };
      }
      if (['send_voice', 'send_audio', 'send_document'].includes(nodeData.actionType) && (!config.media_url || !config.instance_id)) {
        return { valid: false, message: 'Instance and file required' };
      }
      if (nodeData.actionType === 'send_location' && (!config.lat || !config.lng || !config.instance_id)) {
        return { valid: false, message: 'Instance and coordinates required' };
      }
      if (nodeData.actionType === 'add_label' && !config.label_id) {
        return { valid: false, message: 'Label required' };
      }
      if (nodeData.actionType === 'assign_agent' && !config.agent_id) {
        return { valid: false, message: 'Agent required' };
      }
      if (nodeData.actionType === 'http_request' && !config.url) {
        return { valid: false, message: 'URL required' };
      }
      if (['add_to_group', 'remove_from_group', 'send_group_invite'].includes(nodeData.actionType) && !config.group_id) {
        return { valid: false, message: 'Group required' };
      }
    }

    if (nodeType === 'condition') {
      if (nodeData.conditionType === 'if_else' && (!config.field || !config.operator)) {
        return { valid: false, message: 'Condition incomplete' };
      }
      if (nodeData.conditionType === 'has_label' && !config.label_id) {
        return { valid: false, message: 'Label required' };
      }
    }

    return { valid: true, message: 'Configuration complete' };
  };

  const validation = getValidationStatus();

  return (
    <div className="w-80 bg-card border-l border-border flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Icon className={cn('h-5 w-5', nodeInfo.color)} />
            <span className={cn('text-sm font-medium', nodeInfo.color)}>
              {nodeInfo.label}
            </span>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Validation status */}
        <div className={cn(
          'flex items-center gap-2 text-xs px-2 py-1 rounded',
          validation.valid ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'
        )}>
          {validation.valid ? (
            <CheckCircle2 className="h-3 w-3" />
          ) : (
            <AlertCircle className="h-3 w-3" />
          )}
          {validation.message}
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Node Label */}
          <div className="space-y-2">
            <Label>Node Label</Label>
            <Input
              value={nodeData.label || ''}
              onChange={(e) => handleLabelChange(e.target.value)}
              placeholder="Enter a descriptive name"
            />
          </div>

          <Separator />

          {/* Type-specific configuration */}
          {nodeType === 'trigger' && (
            <TriggerConfigForm
              triggerType={nodeData.triggerType || 'message_received'}
              config={config}
              onChange={handleConfigChange}
            />
          )}

          {nodeType === 'action' && (
            <ActionConfigForm
              actionType={nodeData.actionType || 'send_message'}
              config={config}
              onChange={handleConfigChange}
            />
          )}

          {nodeType === 'condition' && (
            <ConditionConfigForm
              conditionType={nodeData.conditionType || 'if_else'}
              config={config}
              onChange={handleConfigChange}
            />
          )}

          {nodeType === 'delay' && (
            <DelayConfigForm
              config={{ delay: nodeData.delay || 1, unit: nodeData.unit || 'minutes', ...config }}
              onChange={(newConfig) => {
                onUpdateNode(node.id, {
                  ...nodeData,
                  delay: newConfig.delay,
                  unit: newConfig.unit,
                  config: newConfig,
                });
              }}
            />
          )}
        </div>
      </ScrollArea>

      {/* Actions Footer */}
      <div className="p-4 border-t border-border space-y-2">
        <Button
          variant="outline"
          className="w-full justify-start"
          onClick={() => onDuplicateNode(node)}
        >
          <Copy className="h-4 w-4 mr-2" />
          Duplicate Node
        </Button>
        
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="outline"
              className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Node
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Node</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{nodeData.label || 'this node'}"? 
                This will also remove all connections to and from this node.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => onDeleteNode(node.id)}
                className="bg-destructive text-destructive-foreground"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
