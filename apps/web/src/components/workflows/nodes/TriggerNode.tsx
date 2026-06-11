import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Zap, MessageCircle, Webhook, Clock, Tag, Package, AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TriggerNodeData {
  label: string;
  triggerType: string;
  config?: Record<string, any>;
}

const triggerIcons: Record<string, React.ElementType> = {
  message_received: MessageCircle,
  keyword: MessageCircle,
  webhook: Webhook,
  schedule: Clock,
  contact_label_added: Tag,
  order_status_changed: Package,
};

function TriggerNode({ data, selected }: NodeProps) {
  const nodeData = data as unknown as TriggerNodeData;
  const Icon = triggerIcons[nodeData.triggerType] || Zap;
  const config = nodeData.config || {};

  // Validation check
  const isConfigured = () => {
    switch (nodeData.triggerType) {
      case 'keyword':
        return config.keywords && config.keywords.length > 0;
      case 'contact_label_added':
        return !!config.label_id;
      case 'order_status_changed':
        return !!config.order_status;
      default:
        return true; // message_received and webhook don't require config
    }
  };

  const getConfigPreview = () => {
    switch (nodeData.triggerType) {
      case 'keyword':
        if (config.keywords?.length > 0) {
          return `Keywords: ${config.keywords.slice(0, 2).join(', ')}${config.keywords.length > 2 ? '...' : ''}`;
        }
        return null;
      case 'contact_label_added':
        return config.label_name ? `Label: ${config.label_name}` : null;
      case 'order_status_changed':
        return config.order_status ? `Status: ${config.order_status}` : null;
      case 'message_received':
        return config.filter_keywords ? `Filter: ${config.filter_keywords}` : 'Any message';
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
        selected ? 'border-primary ring-2 ring-primary/20' : 'border-emerald-500/50',
        'hover:shadow-lg transition-shadow'
      )}
    >
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
          <Icon className="h-4 w-4 text-emerald-500" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <p className="text-xs font-medium text-emerald-500 uppercase">Trigger</p>
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
      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-emerald-500 !border-emerald-600 !w-3 !h-3"
      />
    </div>
  );
}

export default memo(TriggerNode);
