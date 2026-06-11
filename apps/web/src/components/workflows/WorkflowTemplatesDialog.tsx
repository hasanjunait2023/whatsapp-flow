import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  LayoutTemplate, 
  MessageCircle, 
  ShoppingCart, 
  Star, 
  UserPlus,
  Bell,
  Loader2,
  Check
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  category: string;
  nodes: any[];
  edges: any[];
}

const workflowTemplates: WorkflowTemplate[] = [
  {
    id: 'welcome-message',
    name: 'Welcome Message',
    description: 'Send a welcome message when a new customer messages you for the first time.',
    icon: MessageCircle,
    category: 'Onboarding',
    nodes: [
      {
        node_type: 'trigger',
        node_subtype: 'message_received',
        node_config: { label: 'New Message Received' },
        position_x: 250,
        position_y: 50,
      },
      {
        node_type: 'delay',
        node_subtype: 'wait',
        node_config: { label: 'Wait 5 seconds', delay: 5, unit: 'seconds' },
        position_x: 250,
        position_y: 150,
      },
      {
        node_type: 'action',
        node_subtype: 'send_message',
        node_config: { 
          label: 'Send Welcome',
          message: 'Hello {{contact.name}}! 👋 Welcome to our store. How can I help you today?' 
        },
        position_x: 250,
        position_y: 250,
      },
    ],
    edges: [
      { source_index: 0, target_index: 1 },
      { source_index: 1, target_index: 2 },
    ],
  },
  {
    id: 'order-confirmation',
    name: 'Order Confirmation',
    description: 'Automatically send order confirmation when an order is placed.',
    icon: ShoppingCart,
    category: 'Orders',
    nodes: [
      {
        node_type: 'trigger',
        node_subtype: 'order_status_changed',
        node_config: { label: 'Order Confirmed', order_status: 'confirmed' },
        position_x: 250,
        position_y: 50,
      },
      {
        node_type: 'action',
        node_subtype: 'send_message',
        node_config: { 
          label: 'Send Confirmation',
          message: '✅ Thank you {{contact.name}}! Your order #{{order.number}} has been confirmed.\n\nTotal: ৳{{order.total}}\n\nWe will notify you when it ships!' 
        },
        position_x: 250,
        position_y: 150,
      },
      {
        node_type: 'action',
        node_subtype: 'add_label',
        node_config: { label: 'Add Customer Label', label_name: 'Customer' },
        position_x: 250,
        position_y: 250,
      },
    ],
    edges: [
      { source_index: 0, target_index: 1 },
      { source_index: 1, target_index: 2 },
    ],
  },
  {
    id: 'vip-onboarding',
    name: 'VIP Customer Onboarding',
    description: 'Add VIP customers to exclusive group and send personalized welcome.',
    icon: Star,
    category: 'Segmentation',
    nodes: [
      {
        node_type: 'trigger',
        node_subtype: 'contact_label_added',
        node_config: { label: 'VIP Label Added', label_name: 'VIP' },
        position_x: 250,
        position_y: 50,
      },
      {
        node_type: 'action',
        node_subtype: 'send_message',
        node_config: { 
          label: 'VIP Welcome',
          message: '🌟 Congratulations {{contact.name}}! You are now a VIP member.\n\nEnjoy exclusive benefits:\n• Early access to new products\n• Special discounts\n• Priority support' 
        },
        position_x: 250,
        position_y: 150,
      },
      {
        node_type: 'action',
        node_subtype: 'send_group_invite',
        node_config: { label: 'Invite to VIP Group', group_name: 'VIP Members' },
        position_x: 250,
        position_y: 250,
      },
    ],
    edges: [
      { source_index: 0, target_index: 1 },
      { source_index: 1, target_index: 2 },
    ],
  },
  {
    id: 'shipping-notification',
    name: 'Shipping Notification',
    description: 'Notify customers when their order has been shipped with tracking info.',
    icon: Bell,
    category: 'Orders',
    nodes: [
      {
        node_type: 'trigger',
        node_subtype: 'order_status_changed',
        node_config: { label: 'Order Shipped', order_status: 'shipped' },
        position_x: 250,
        position_y: 50,
      },
      {
        node_type: 'action',
        node_subtype: 'send_message',
        node_config: { 
          label: 'Send Shipping Update',
          message: '📦 Great news {{contact.name}}!\n\nYour order #{{order.number}} is on its way!\n\nExpected delivery: 2-3 business days\n\nThank you for shopping with us!' 
        },
        position_x: 250,
        position_y: 150,
      },
    ],
    edges: [
      { source_index: 0, target_index: 1 },
    ],
  },
  {
    id: 'lead-capture',
    name: 'Lead Capture & Follow-up',
    description: 'Capture new leads, add to CRM with label, and send follow-up sequence.',
    icon: UserPlus,
    category: 'Sales',
    nodes: [
      {
        node_type: 'trigger',
        node_subtype: 'keyword',
        node_config: { label: 'Interest Keyword', keywords: ['interested', 'price', 'info', 'details'] },
        position_x: 250,
        position_y: 50,
      },
      {
        node_type: 'action',
        node_subtype: 'add_label',
        node_config: { label: 'Mark as Lead', label_name: 'New Lead' },
        position_x: 250,
        position_y: 150,
      },
      {
        node_type: 'action',
        node_subtype: 'send_message',
        node_config: { 
          label: 'Send Info',
          message: 'Hi {{contact.name}}! Thanks for your interest. 😊\n\nI\'d be happy to share more details. What product are you interested in?' 
        },
        position_x: 250,
        position_y: 250,
      },
      {
        node_type: 'delay',
        node_subtype: 'wait',
        node_config: { label: 'Wait 1 Day', delay: 1, unit: 'days' },
        position_x: 250,
        position_y: 350,
      },
      {
        node_type: 'action',
        node_subtype: 'send_message',
        node_config: { 
          label: 'Follow-up',
          message: 'Hi {{contact.name}}, just following up on your inquiry. Let me know if you have any questions!' 
        },
        position_x: 250,
        position_y: 450,
      },
    ],
    edges: [
      { source_index: 0, target_index: 1 },
      { source_index: 1, target_index: 2 },
      { source_index: 2, target_index: 3 },
      { source_index: 3, target_index: 4 },
    ],
  },
];

interface WorkflowTemplatesDialogProps {
  onImport: (name: string, description: string, nodes: any[], edges: any[]) => Promise<void>;
}

export default function WorkflowTemplatesDialog({ onImport }: WorkflowTemplatesDialogProps) {
  const [open, setOpen] = useState(false);
  const [importing, setImporting] = useState<string | null>(null);
  const [imported, setImported] = useState<string[]>([]);

  const categories = [...new Set(workflowTemplates.map((t) => t.category))];

  const handleImport = async (template: WorkflowTemplate) => {
    setImporting(template.id);
    
    try {
      // Convert template edges to use node IDs (will be assigned during creation)
      const edgesWithPlaceholders = template.edges.map((e, i) => ({
        source_node_id: `placeholder-${e.source_index}`,
        target_node_id: `placeholder-${e.target_index}`,
        source_handle: null,
        target_handle: null,
        label: null,
      }));

      await onImport(
        template.name,
        template.description,
        template.nodes,
        edgesWithPlaceholders
      );
      
      setImported((prev) => [...prev, template.id]);
    } finally {
      setImporting(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <LayoutTemplate className="h-4 w-4 mr-2" />
          Templates
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Workflow Templates</DialogTitle>
          <DialogDescription>
            Start with a pre-built workflow template and customize it to your needs.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          {categories.map((category) => (
            <div key={category} className="mb-6">
              <h4 className="text-sm font-medium text-muted-foreground mb-3">{category}</h4>
              <div className="grid gap-3">
                {workflowTemplates
                  .filter((t) => t.category === category)
                  .map((template) => {
                    const Icon = template.icon;
                    const isImported = imported.includes(template.id);
                    const isImporting = importing === template.id;
                    
                    return (
                      <Card key={template.id} className="overflow-hidden">
                        <CardHeader className="pb-2">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                <Icon className="h-5 w-5 text-primary" />
                              </div>
                              <div>
                                <CardTitle className="text-base">{template.name}</CardTitle>
                                <CardDescription className="text-sm">
                                  {template.description}
                                </CardDescription>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant={isImported ? 'secondary' : 'default'}
                              disabled={isImporting || isImported}
                              onClick={() => handleImport(template)}
                            >
                              {isImporting ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  Importing...
                                </>
                              ) : isImported ? (
                                <>
                                  <Check className="h-4 w-4 mr-2" />
                                  Imported
                                </>
                              ) : (
                                'Use Template'
                              )}
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-2">
                          <div className="flex flex-wrap gap-1">
                            {template.nodes.map((node, i) => (
                              <Badge
                                key={i}
                                variant="secondary"
                                className={cn(
                                  'text-xs',
                                  node.node_type === 'trigger' && 'bg-emerald-500/10 text-emerald-500',
                                  node.node_type === 'action' && 'bg-blue-500/10 text-blue-500',
                                  node.node_type === 'delay' && 'bg-purple-500/10 text-purple-500',
                                  node.node_type === 'condition' && 'bg-amber-500/10 text-amber-500'
                                )}
                              >
                                {node.node_config.label}
                              </Badge>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
              </div>
            </div>
          ))}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
