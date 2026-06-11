import { 
  MessageCircle, Send, GitBranch, Clock, Tag, UserPlus, Globe, Bot, Webhook,
  Users, UserMinus, Link2, ShoppingCart, Package,
  MessageSquare, Image, Video, Mic, Music, File, MapPin
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NodeTemplate {
  type: string;
  subtype: string;
  label: string;
  icon: React.ElementType;
  color: string;
  category: 'trigger' | 'action' | 'condition' | 'delay';
}

const nodeTemplates: NodeTemplate[] = [
  // Triggers
  { type: 'trigger', subtype: 'message_received', label: 'Message Received', icon: MessageCircle, color: 'emerald', category: 'trigger' },
  { type: 'trigger', subtype: 'keyword', label: 'Keyword Match', icon: MessageCircle, color: 'emerald', category: 'trigger' },
  { type: 'trigger', subtype: 'webhook', label: 'Webhook', icon: Webhook, color: 'emerald', category: 'trigger' },
  { type: 'trigger', subtype: 'contact_label_added', label: 'Label Added', icon: Tag, color: 'emerald', category: 'trigger' },
  { type: 'trigger', subtype: 'order_status_changed', label: 'Order Status Changed', icon: Package, color: 'emerald', category: 'trigger' },
  
  // Actions - Message Types
  { type: 'action', subtype: 'send_text', label: 'Send Text', icon: MessageSquare, color: 'blue', category: 'action' },
  { type: 'action', subtype: 'send_image', label: 'Send Image', icon: Image, color: 'blue', category: 'action' },
  { type: 'action', subtype: 'send_video', label: 'Send Video', icon: Video, color: 'blue', category: 'action' },
  { type: 'action', subtype: 'send_voice', label: 'Send Voice', icon: Mic, color: 'blue', category: 'action' },
  { type: 'action', subtype: 'send_audio', label: 'Send Audio', icon: Music, color: 'blue', category: 'action' },
  { type: 'action', subtype: 'send_document', label: 'Send Document', icon: File, color: 'blue', category: 'action' },
  { type: 'action', subtype: 'send_location', label: 'Send Location', icon: MapPin, color: 'blue', category: 'action' },
  
  // Actions - Other
  { type: 'action', subtype: 'send_message', label: 'Send Message (Legacy)', icon: Send, color: 'blue', category: 'action' },
  { type: 'action', subtype: 'add_label', label: 'Add Label', icon: Tag, color: 'blue', category: 'action' },
  { type: 'action', subtype: 'assign_agent', label: 'Assign Agent', icon: UserPlus, color: 'blue', category: 'action' },
  { type: 'action', subtype: 'http_request', label: 'HTTP Request', icon: Globe, color: 'blue', category: 'action' },
  { type: 'action', subtype: 'ai_response', label: 'AI Response', icon: Bot, color: 'blue', category: 'action' },
  { type: 'action', subtype: 'add_to_group', label: 'Add to Group', icon: Users, color: 'blue', category: 'action' },
  { type: 'action', subtype: 'remove_from_group', label: 'Remove from Group', icon: UserMinus, color: 'blue', category: 'action' },
  { type: 'action', subtype: 'send_group_invite', label: 'Send Group Invite', icon: Link2, color: 'blue', category: 'action' },
  
  // Conditions
  { type: 'condition', subtype: 'if_else', label: 'If/Else', icon: GitBranch, color: 'amber', category: 'condition' },
  { type: 'condition', subtype: 'has_label', label: 'Has Label', icon: Tag, color: 'amber', category: 'condition' },
  
  // Delays
  { type: 'delay', subtype: 'wait', label: 'Wait', icon: Clock, color: 'purple', category: 'delay' },
];

const colorClasses: Record<string, string> = {
  emerald: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30 hover:border-emerald-500',
  blue: 'bg-blue-500/10 text-blue-500 border-blue-500/30 hover:border-blue-500',
  amber: 'bg-amber-500/10 text-amber-500 border-amber-500/30 hover:border-amber-500',
  purple: 'bg-purple-500/10 text-purple-500 border-purple-500/30 hover:border-purple-500',
};

interface NodePaletteProps {
  onDragStart: (event: React.DragEvent, nodeType: string, nodeSubtype: string, label: string) => void;
}

export default function NodePalette({ onDragStart }: NodePaletteProps) {
  const categories = ['trigger', 'action', 'condition', 'delay'] as const;
  const categoryLabels: Record<string, string> = {
    trigger: 'Triggers',
    action: 'Actions',
    condition: 'Conditions',
    delay: 'Delays',
  };

  return (
    <div className="w-64 bg-card border-r border-border p-4 overflow-y-auto">
      <h3 className="font-semibold text-sm mb-4">Node Palette</h3>
      <p className="text-xs text-muted-foreground mb-4">
        Drag nodes to the canvas to build your workflow
      </p>

      {categories.map((category) => (
        <div key={category} className="mb-4">
          <h4 className="text-xs font-medium text-muted-foreground uppercase mb-2">
            {categoryLabels[category]}
          </h4>
          <div className="space-y-2">
            {nodeTemplates
              .filter((n) => n.category === category)
              .map((template) => {
                const Icon = template.icon;
                return (
                  <div
                    key={template.subtype}
                    draggable
                    onDragStart={(e) => onDragStart(e, template.type, template.subtype, template.label)}
                    className={cn(
                      'flex items-center gap-2 p-2 rounded-lg border cursor-grab transition-colors',
                      colorClasses[template.color]
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="text-sm font-medium">{template.label}</span>
                  </div>
                );
              })}
          </div>
        </div>
      ))}
    </div>
  );
}
