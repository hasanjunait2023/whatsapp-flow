import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Clock, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DelayNodeData {
  label: string;
  delay: number;
  unit: 'seconds' | 'minutes' | 'hours' | 'days';
  config?: Record<string, any>;
}

function DelayNode({ data, selected }: NodeProps) {
  const nodeData = data as unknown as DelayNodeData;
  const delay = nodeData.delay || nodeData.config?.delay || 1;
  const unit = nodeData.unit || nodeData.config?.unit || 'minutes';

  const formatDuration = () => {
    const unitLabel = delay === 1 ? unit.slice(0, -1) : unit;
    return `${delay} ${unitLabel}`;
  };

  return (
    <div
      className={cn(
        'px-4 py-3 rounded-lg border-2 bg-card shadow-md min-w-[180px] max-w-[220px]',
        selected ? 'border-primary ring-2 ring-primary/20' : 'border-purple-500/50',
        'hover:shadow-lg transition-shadow'
      )}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-purple-500 !border-purple-600 !w-3 !h-3"
      />
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
          <Clock className="h-4 w-4 text-purple-500" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <p className="text-xs font-medium text-purple-500 uppercase">Delay</p>
            <CheckCircle2 className="h-3 w-3 text-emerald-500" />
          </div>
          <p className="text-sm font-medium truncate">{nodeData.label}</p>
        </div>
      </div>
      <div className="mt-2 p-2 rounded bg-purple-500/10 text-center">
        <p className="text-lg font-bold text-purple-500">{formatDuration()}</p>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-purple-500 !border-purple-600 !w-3 !h-3"
      />
    </div>
  );
}

export default memo(DelayNode);
