import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { GitBranch, AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ConditionNodeData {
  label: string;
  conditionType: string;
  config?: Record<string, any>;
}

function ConditionNode({ data, selected }: NodeProps) {
  const nodeData = data as unknown as ConditionNodeData;
  const config = nodeData.config || {};

  // Validation check
  const isConfigured = () => {
    switch (nodeData.conditionType) {
      case 'if_else':
        return !!config.field && !!config.operator;
      case 'has_label':
        return !!config.label_id;
      default:
        return true;
    }
  };

  const getConfigPreview = () => {
    switch (nodeData.conditionType) {
      case 'if_else':
        if (config.field && config.operator) {
          const fieldLabel = config.field.split('.').pop();
          return `If ${fieldLabel} ${config.operator}${config.value ? ` "${config.value}"` : ''}`;
        }
        return null;
      case 'has_label':
        return config.label_name ? `Has: ${config.label_name}` : null;
      default:
        return null;
    }
  };

  const configured = isConfigured();
  const preview = getConfigPreview();

  return (
    <div
      className={cn(
        'px-4 py-3 rounded-lg border-2 bg-card shadow-md min-w-[180px] max-w-[220px]',
        selected ? 'border-primary ring-2 ring-primary/20' : 'border-amber-500/50',
        'hover:shadow-lg transition-shadow'
      )}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-amber-500 !border-amber-600 !w-3 !h-3"
      />
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
          <GitBranch className="h-4 w-4 text-amber-500" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <p className="text-xs font-medium text-amber-500 uppercase">Condition</p>
            {configured ? (
              <CheckCircle2 className="h-3 w-3 text-emerald-500" />
            ) : (
              <AlertCircle className="h-3 w-3 text-amber-500" />
            )}
          </div>
          <p className="text-sm font-medium truncate">{nodeData.label}</p>
        </div>
      </div>
      {preview && (
        <p className="text-xs text-muted-foreground mt-2 truncate">
          {preview}
        </p>
      )}
      <div className="flex justify-between mt-2 text-xs">
        <span className="text-emerald-500">Yes →</span>
        <span className="text-destructive">No →</span>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        id="yes"
        style={{ left: '30%' }}
        className="!bg-emerald-500 !border-emerald-600 !w-3 !h-3"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="no"
        style={{ left: '70%' }}
        className="!bg-destructive !border-destructive !w-3 !h-3"
      />
    </div>
  );
}

export default memo(ConditionNode);
