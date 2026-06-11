import { Contact } from '@/hooks/useContacts';
import { Button } from '@/components/ui/button';
import { UserRound, Bot, X, MessageSquare } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface HandoffBannerProps {
  contact: Contact;
  onResolve: () => void;
  onResumeAI: () => void;
}

export default function HandoffBanner({ contact, onResolve, onResumeAI }: HandoffBannerProps) {
  if (!contact.needs_handoff) return null;

  return (
    <div className="px-4 py-3 bg-warning/10 border-b border-warning/20">
      <div className="flex items-start gap-3">
        <div className="h-8 w-8 rounded-full bg-warning/20 flex items-center justify-center flex-shrink-0">
          <UserRound className="h-4 w-4 text-warning" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">
            Human assistance requested
          </p>
          <p className="text-sm text-muted-foreground mt-0.5">
            {contact.handoff_reason || 'AI requested this conversation be handled by a human agent.'}
          </p>
          {contact.handoff_at && (
            <p className="text-xs text-muted-foreground mt-1">
              Requested {formatDistanceToNow(new Date(contact.handoff_at), { addSuffix: true })}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={onResumeAI}
            className="h-8"
          >
            <Bot className="h-3.5 w-3.5 mr-1.5" />
            Resume AI
          </Button>
          <Button
            size="sm"
            onClick={onResolve}
            className="h-8"
          >
            <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
            Take Over
          </Button>
        </div>
      </div>
    </div>
  );
}
