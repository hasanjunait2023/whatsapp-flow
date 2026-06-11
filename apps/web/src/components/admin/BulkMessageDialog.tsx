import { useState } from 'react';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, MessageSquare, Eye } from 'lucide-react';
import { useMessageTemplates, MessageTemplate } from '@/hooks/useMessageTemplates';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface BulkMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedSubscriptions: Array<{
    id: string;
    tenant_id: string;
    tenant_name: string;
    plan_name: string;
    current_period_end: string;
  }>;
  onComplete?: () => void;
}

export default function BulkMessageDialog({
  open,
  onOpenChange,
  selectedSubscriptions,
  onComplete,
}: BulkMessageDialogProps) {
  const { templates, renderTemplate } = useMessageTemplates();
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [customMessage, setCustomMessage] = useState('');
  const [previewTenantIndex, setPreviewTenantIndex] = useState(0);
  const [sending, setSending] = useState(false);

  const whatsappTemplates = templates.filter(
    (t) => (t.channel === 'whatsapp' || t.channel === 'both') && t.is_active
  );

  const selectedTemplate = whatsappTemplates.find((t) => t.id === selectedTemplateId);

  const getPreviewMessage = () => {
    if (!selectedTemplate || selectedSubscriptions.length === 0) return '';
    
    const sub = selectedSubscriptions[previewTenantIndex];
    const values: Record<string, string> = {
      tenant_name: sub.tenant_name,
      plan_name: sub.plan_name,
      expiry_date: format(new Date(sub.current_period_end), 'MMMM d, yyyy'),
      days_remaining: String(
        Math.max(
          0,
          Math.ceil(
            (new Date(sub.current_period_end).getTime() - Date.now()) /
              (1000 * 60 * 60 * 24)
          )
        )
      ),
    };

    return renderTemplate(selectedTemplate, values);
  };

  const handleSend = async () => {
    if (!selectedTemplate && !customMessage.trim()) {
      toast.error('Please select a template or write a custom message');
      return;
    }

    setSending(true);

    try {
      // TODO: Implement bulk message sending via edge function
      // This would call a new edge function that:
      // 1. Fetches tenant owner contact info
      // 2. Sends WhatsApp messages via the admin's instance
      // 3. Logs the sends to reminder_logs
      
      const { error } = await supabase.functions.invoke('send-bulk-reminder', {
        body: {
          subscription_ids: selectedSubscriptions.map((s) => s.id),
          template_id: selectedTemplateId || null,
          custom_message: customMessage.trim() || null,
        },
      });

      if (error) throw error;

      toast.success(`Messages sent to ${selectedSubscriptions.length} tenants`);
      onOpenChange(false);
      onComplete?.();
    } catch (error) {
      console.error('Bulk send error:', error);
      toast.error('Failed to send messages. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-whatsapp" />
            Send Bulk WhatsApp Message
          </DialogTitle>
          <DialogDescription>
            Send a reminder message to {selectedSubscriptions.length} selected
            subscription(s)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Recipients */}
          <div className="space-y-2">
            <Label>Recipients ({selectedSubscriptions.length})</Label>
            <ScrollArea className="h-24 border rounded-md p-2">
              <div className="flex flex-wrap gap-1">
                {selectedSubscriptions.map((sub) => (
                  <Badge key={sub.id} variant="secondary">
                    {sub.tenant_name}
                  </Badge>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Template Selection */}
          <div className="space-y-2">
            <Label>Message Template</Label>
            <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a template or write custom" />
              </SelectTrigger>
              <SelectContent>
                {whatsappTemplates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    <div className="flex items-center gap-2">
                      <span>{template.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {template.category}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Custom Message */}
          {!selectedTemplateId && (
            <div className="space-y-2">
              <Label>Custom Message</Label>
              <Textarea
                placeholder="Type your message here... Use {{tenant_name}}, {{plan_name}}, {{expiry_date}}, {{days_remaining}} for placeholders"
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                rows={4}
              />
            </div>
          )}

          {/* Preview */}
          {(selectedTemplate || customMessage) && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  Message Preview
                </Label>
                {selectedSubscriptions.length > 1 && (
                  <Select
                    value={String(previewTenantIndex)}
                    onValueChange={(v) => setPreviewTenantIndex(parseInt(v))}
                  >
                    <SelectTrigger className="w-[200px] h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedSubscriptions.map((sub, i) => (
                        <SelectItem key={sub.id} value={String(i)}>
                          {sub.tenant_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <Card className="bg-whatsapp/5 border-whatsapp/20">
                <CardContent className="p-4">
                  <pre className="whitespace-pre-wrap text-sm font-normal">
                    {selectedTemplate ? getPreviewMessage() : customMessage}
                  </pre>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSend}
            disabled={sending || (!selectedTemplateId && !customMessage.trim())}
            className="gap-2 bg-whatsapp hover:bg-whatsapp/90"
          >
            <Send className="h-4 w-4" />
            {sending ? 'Sending...' : `Send to ${selectedSubscriptions.length} Tenants`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
