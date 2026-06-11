import { Smartphone, Mail, Check, X, RefreshCw, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import { format } from 'date-fns';

interface NotificationStatusBadgesProps {
  whatsappSent: boolean;
  whatsappSentAt?: string | null;
  emailSent: boolean;
  emailSentAt?: string | null;
  notificationErrors?: string[] | null;
  customerPhone?: string | null;
  status: string;
  onResend?: (type: 'whatsapp' | 'email' | 'all') => void;
  isResending?: boolean;
}

export default function NotificationStatusBadges({
  whatsappSent,
  whatsappSentAt,
  emailSent,
  emailSentAt,
  notificationErrors,
  customerPhone,
  status,
  onResend,
  isResending,
}: NotificationStatusBadgesProps) {
  // Don't show for non-completed orders
  if (status !== 'completed') {
    return <span className="text-muted-foreground text-sm">—</span>;
  }

  const hasWhatsAppError = notificationErrors?.some(e => e.toLowerCase().includes('whatsapp'));
  const hasEmailError = notificationErrors?.some(e => e.toLowerCase().includes('email'));

  const canSendWhatsApp = !!customerPhone;
  const needsResend = !whatsappSent || !emailSent;

  return (
    <div className="flex items-center gap-2">
      {/* WhatsApp Status */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs ${
              whatsappSent 
                ? 'bg-green-500/10 text-green-600' 
                : hasWhatsAppError 
                  ? 'bg-red-500/10 text-red-600'
                  : 'bg-muted text-muted-foreground'
            }`}>
              <Smartphone className="h-3 w-3" />
              {whatsappSent ? (
                <Check className="h-3 w-3" />
              ) : (
                <X className="h-3 w-3" />
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            {whatsappSent 
              ? `WhatsApp sent ${whatsappSentAt ? format(new Date(whatsappSentAt), 'MMM d, h:mm a') : ''}` 
              : !canSendWhatsApp
                ? 'No phone number provided'
                : hasWhatsAppError
                  ? 'WhatsApp failed'
                  : 'WhatsApp not sent'
            }
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Email Status */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs ${
              emailSent 
                ? 'bg-green-500/10 text-green-600' 
                : hasEmailError 
                  ? 'bg-red-500/10 text-red-600'
                  : 'bg-muted text-muted-foreground'
            }`}>
              <Mail className="h-3 w-3" />
              {emailSent ? (
                <Check className="h-3 w-3" />
              ) : (
                <X className="h-3 w-3" />
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            {emailSent 
              ? `Email sent ${emailSentAt ? format(new Date(emailSentAt), 'MMM d, h:mm a') : ''}` 
              : hasEmailError
                ? 'Email failed'
                : 'Email not sent'
            }
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Error Details */}
      {notificationErrors && notificationErrors.length > 0 && (
        <HoverCard>
          <HoverCardTrigger asChild>
            <AlertCircle className="h-4 w-4 text-amber-500 cursor-help" />
          </HoverCardTrigger>
          <HoverCardContent className="w-80">
            <div className="space-y-2">
              <h4 className="font-semibold text-sm">Notification Errors</h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                {notificationErrors.map((error, idx) => (
                  <li key={idx} className="flex items-start gap-1">
                    <X className="h-3 w-3 text-red-500 mt-0.5 shrink-0" />
                    <span>{error}</span>
                  </li>
                ))}
              </ul>
            </div>
          </HoverCardContent>
        </HoverCard>
      )}

      {/* Resend Button */}
      {needsResend && onResend && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => {
                  if (!whatsappSent && !emailSent) {
                    onResend('all');
                  } else if (!whatsappSent && canSendWhatsApp) {
                    onResend('whatsapp');
                  } else if (!emailSent) {
                    onResend('email');
                  }
                }}
                disabled={isResending}
              >
                <RefreshCw className={`h-3 w-3 ${isResending ? 'animate-spin' : ''}`} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Resend failed notifications</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
}
