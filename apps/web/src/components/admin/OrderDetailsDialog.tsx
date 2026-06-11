import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  User, 
  Mail, 
  Phone, 
  Building2, 
  Calendar, 
  CreditCard,
  Copy,
  Check,
  KeyRound,
  ExternalLink,
  Smartphone,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { useState } from 'react';
import { toast } from 'sonner';
import type { ExternalSalesOrder } from '@/hooks/useExternalSales';

interface OrderDetailsDialogProps {
  order: ExternalSalesOrder | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function OrderDetailsDialog({ order, open, onOpenChange }: OrderDetailsDialogProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  if (!order) return null;

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Extract temp password from raw_payload if available
  const rawPayload = order.raw_payload as Record<string, unknown> | null;
  const tempPassword = rawPayload?.temp_password as string | undefined;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20"><CheckCircle className="h-3 w-3 mr-1" />Completed</Badge>;
      case 'failed':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>;
      case 'processing':
        return <Badge variant="secondary">Processing</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Order Details
            {getStatusBadge(order.status)}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Order ID */}
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">Order ID</p>
            <div className="flex items-center justify-between">
              <code className="font-mono text-sm">{order.external_order_id}</code>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7"
                onClick={() => copyToClipboard(order.external_order_id, 'order_id')}
              >
                {copiedField === 'order_id' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              </Button>
            </div>
          </div>

          {/* Customer Info */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <User className="h-4 w-4" />
              Customer Information
            </h4>
            
            <div className="grid gap-3 pl-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>{order.customer_name}</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>{order.customer_email}</span>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-7 w-7"
                  onClick={() => copyToClipboard(order.customer_email, 'email')}
                >
                  {copiedField === 'email' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                </Button>
              </div>

              {order.customer_phone && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{order.customer_phone}</span>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-7 w-7"
                    onClick={() => copyToClipboard(order.customer_phone!, 'phone')}
                  >
                    {copiedField === 'phone' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Login Credentials */}
          {order.status === 'completed' && (
            <>
              <div className="space-y-3">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <KeyRound className="h-4 w-4" />
                  Login Credentials
                </h4>
                
                <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Email</p>
                      <p className="text-sm font-mono">{order.customer_email}</p>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => copyToClipboard(order.customer_email, 'cred_email')}
                    >
                      {copiedField === 'cred_email' ? <Check className="h-3.5 w-3.5 mr-1" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
                      Copy
                    </Button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Temporary Password</p>
                      {tempPassword ? (
                        <p className="text-sm font-mono">{tempPassword}</p>
                      ) : (
                        <p className="text-sm text-muted-foreground italic">Not stored (user may have changed it)</p>
                      )}
                    </div>
                    {tempPassword && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => copyToClipboard(tempPassword, 'password')}
                      >
                        {copiedField === 'password' ? <Check className="h-3.5 w-3.5 mr-1" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
                        Copy
                      </Button>
                    )}
                  </div>

                  <div className="pt-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full"
                      onClick={() => window.open('https://whaatapp.myecomex.com/auth/login', '_blank')}
                    >
                      <ExternalLink className="h-3.5 w-3.5 mr-2" />
                      Open Login Page
                    </Button>
                  </div>
                </div>
              </div>

              <Separator />
            </>
          )}

          {/* Business Info */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Business Details
            </h4>
            
            <div className="grid gap-2 pl-6 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Business Name</span>
                <span className="font-medium">{order.business_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Type</span>
                <span className="capitalize">{order.business_type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Plan</span>
                <span>{order.plan?.name || '-'}</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Payment Info */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Payment Details
            </h4>
            
            <div className="grid gap-2 pl-6 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount</span>
                <span className="font-semibold">৳{order.amount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Billing Cycle</span>
                <span className="capitalize">{order.billing_cycle}</span>
              </div>
              {order.payment_method && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Payment Method</span>
                  <span className="capitalize">{order.payment_method}</span>
                </div>
              )}
              {order.transaction_id && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Transaction ID</span>
                  <code className="font-mono text-xs">{order.transaction_id}</code>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Notification Status */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <Smartphone className="h-4 w-4" />
              Notification Status
            </h4>
            
            <div className="grid gap-2 pl-6 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">WhatsApp</span>
                {order.whatsapp_sent ? (
                  <Badge className="bg-green-500/10 text-green-600">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Sent {order.whatsapp_sent_at && format(new Date(order.whatsapp_sent_at), 'MMM d, h:mm a')}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-muted-foreground">
                    <XCircle className="h-3 w-3 mr-1" />
                    Not Sent
                  </Badge>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Email</span>
                {order.email_sent ? (
                  <Badge className="bg-green-500/10 text-green-600">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Sent {order.email_sent_at && format(new Date(order.email_sent_at), 'MMM d, h:mm a')}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-muted-foreground">
                    <XCircle className="h-3 w-3 mr-1" />
                    Not Sent
                  </Badge>
                )}
              </div>
              {order.notification_errors && order.notification_errors.length > 0 && (
                <div className="mt-2 p-2 bg-destructive/10 rounded text-xs text-destructive">
                  <div className="flex items-center gap-1 font-medium mb-1">
                    <AlertCircle className="h-3 w-3" />
                    Errors:
                  </div>
                  <ul className="list-disc list-inside space-y-0.5">
                    {order.notification_errors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* Dates */}
          <div className="flex items-center justify-between text-xs text-muted-foreground pt-2">
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Created: {format(new Date(order.created_at), 'MMM d, yyyy h:mm a')}
            </div>
            {order.processed_at && (
              <div>
                Processed: {format(new Date(order.processed_at), 'MMM d, yyyy h:mm a')}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
