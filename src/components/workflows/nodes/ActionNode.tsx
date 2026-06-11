import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Send, Tag, UserPlus, Globe, MessageSquare, Bot, Users, UserMinus, Link2, AlertCircle, CheckCircle2, Image, Video, Mic, Music, File, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ActionNodeData {
  label: string;
  actionType: string;
  config?: Record<string, any>;
}

const actionIcons: Record<string, React.ElementType> = {
  send_message: Send,
  send_media: MessageSquare,
  send_text: MessageSquare,
  send_image: Image,
  send_video: Video,
  send_voice: Mic,
  send_audio: Music,
  send_document: File,
  send_location: MapPin,
  add_label: Tag,
  assign_agent: UserPlus,
  http_request: Globe,
  ai_response: Bot,
  add_to_group: Users,
  remove_from_group: UserMinus,
  send_group_invite: Link2,
};

function ActionNode({ data, selected }: NodeProps) {
  const nodeData = data as unknown as ActionNodeData;
  const Icon = actionIcons[nodeData.actionType] || Send;
  const config = nodeData.config || {};

  // Validation check
  const isConfigured = () => {
    switch (nodeData.actionType) {
      case 'send_message':
        return !!config.message;
      case 'send_text':
        return !!config.message && !!config.instance_id;
      case 'send_image':
      case 'send_video':
        return !!config.media_url && !!config.instance_id;
      case 'send_voice':
      case 'send_audio':
      case 'send_document':
        return !!config.media_url && !!config.instance_id;
      case 'send_location':
        return !!config.lat && !!config.lng && !!config.instance_id;
      case 'add_label':
        return !!config.label_id;
      case 'assign_agent':
        return !!config.agent_id;
      case 'http_request':
        return !!config.url;
      case 'add_to_group':
      case 'remove_from_group':
      case 'send_group_invite':
        return !!config.group_id;
      default:
        return true;
    }
  };

  const getConfigPreview = () => {
    switch (nodeData.actionType) {
      case 'send_message':
      case 'send_text':
        if (config.message) {
          return `"${config.message.slice(0, 30)}${config.message.length > 30 ? '...' : ''}"`;
        }
        return null;
      case 'send_image':
      case 'send_video':
        if (config.media_url) {
          const preview = config.caption ? config.caption.slice(0, 20) : 'Media attached';
          return preview;
        }
        return null;
      case 'send_voice':
      case 'send_audio':
      case 'send_document':
        if (config.media_url) {
          return config.filename || 'File attached';
        }
        return null;
      case 'send_location':
        if (config.lat && config.lng) {
          return config.location_name || `📍 ${config.lat}, ${config.lng}`;
        }
        return null;
      case 'add_label':
        return config.label_name ? `Add: ${config.label_name}` : null;
      case 'assign_agent':
        return config.agent_name ? `To: ${config.agent_name}` : null;
      case 'http_request':
        return config.url ? `${config.method || 'POST'} ${config.url.slice(0, 20)}...` : null;
      case 'add_to_group':
        return config.group_name ? (
          <span>
            {config.group_name.slice(0, 15)}{config.group_name.length > 15 ? '...' : ''}
            {config.use_queue && <span className="text-emerald-500 ml-1">(safe)</span>}
          </span>
        ) : null;
      case 'remove_from_group':
      case 'send_group_invite':
        return config.group_name ? config.group_name.slice(0, 20) : null;
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
        selected ? 'border-primary ring-2 ring-primary/20' : 'border-blue-500/50',
        'hover:shadow-lg transition-shadow'
      )}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-blue-500 !border-blue-600 !w-3 !h-3"
      />
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
          <Icon className="h-4 w-4 text-blue-500" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <p className="text-xs font-medium text-blue-500 uppercase">Action</p>
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
          {typeof preview === 'string' ? preview : preview}
        </p>
      )}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-blue-500 !border-blue-600 !w-3 !h-3"
      />
    </div>
  );
}

export default memo(ActionNode);
