import { Check, CheckCheck } from 'lucide-react';

interface ReadReceiptIndicatorProps {
  isRead: boolean;
  isSent: boolean;
}

export function ReadReceiptIndicator({ isRead, isSent }: ReadReceiptIndicatorProps) {
  if (!isSent) {
    return <span className="text-muted-foreground/60 text-[10px]">○</span>;
  }

  if (isRead) {
    return <CheckCheck className="h-3.5 w-3.5 text-primary" />;
  }

  return <Check className="h-3.5 w-3.5 text-muted-foreground" />;
}
