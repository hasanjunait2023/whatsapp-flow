import { format } from 'date-fns';
import { MessageCircle, Mail, Phone, Building2, Calendar, Clock, Eye } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { MarketingLead } from '@/hooks/useAdminLeads';

interface LeadDetailsDialogProps {
  lead: MarketingLead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onWhatsApp: (number: string) => void;
  onEmail: (email: string) => void;
}

const statusColors: Record<string, string> = {
  warm: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  hot: 'bg-violet-500/10 text-violet-600 border-violet-500/20',
  contacted: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  converted: 'bg-green-500/10 text-green-600 border-green-500/20',
  lost: 'bg-red-500/10 text-red-600 border-red-500/20',
};

export function LeadDetailsDialog({ lead, open, onOpenChange, onWhatsApp, onEmail }: LeadDetailsDialogProps) {
  if (!lead) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Lead Details
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Header with name and status */}
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-semibold">{lead.full_name}</h3>
              <p className="text-sm text-muted-foreground">{lead.business_name}</p>
            </div>
            <Badge variant="outline" className={statusColors[lead.status]}>
              {lead.status}
            </Badge>
          </div>

          <Separator />

          {/* Contact Information */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">Contact Information</h4>
            
            <div className="grid gap-3">
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{lead.whatsapp_number}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-auto h-7"
                  onClick={() => onWhatsApp(lead.whatsapp_number)}
                >
                  <MessageCircle className="h-4 w-4 text-green-600 mr-1" />
                  WhatsApp
                </Button>
              </div>
              
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm truncate flex-1">{lead.email}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-auto h-7"
                  onClick={() => onEmail(lead.email)}
                >
                  <Mail className="h-4 w-4 text-blue-600 mr-1" />
                  Email
                </Button>
              </div>
              
              <div className="flex items-center gap-3">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{lead.business_name}</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Source & Dates */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">Activity</h4>
            
            <div className="grid gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Source:</span>
                <span>{lead.source}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created:</span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {format(new Date(lead.created_at), 'dd MMM yyyy, HH:mm')}
                </span>
              </div>
              
              {lead.demo_accessed_at && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Last Demo Access:</span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {format(new Date(lead.demo_accessed_at), 'dd MMM yyyy, HH:mm')}
                  </span>
                </div>
              )}
              
              <div className="flex justify-between">
                <span className="text-muted-foreground">Demo Access Count:</span>
                <span>{lead.demo_access_count}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {lead.notes && (
            <>
              <Separator />
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">Notes</h4>
                <p className="text-sm bg-muted/50 p-3 rounded-md">{lead.notes}</p>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
