import { Contact } from '@/hooks/useContacts';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { UserRound, PenLine, User, WifiOff } from 'lucide-react';
import { Label } from '@/hooks/useLabels';
import CustomerStatusBadge from './CustomerStatusBadge';
import { CustomerStatusLabel } from '@/lib/customer-status-config';

interface ContactItemProps {
  contact: Contact;
  isSelected: boolean;
  onClick: () => void;
  replyingUserName?: string | null;
  contactLabels?: Label[];
  assignedMemberName?: string | null;
  customerStatus?: CustomerStatusLabel | null;
}

export default function ContactItem({ 
  contact, 
  isSelected, 
  onClick, 
  replyingUserName,
  contactLabels = [],
  assignedMemberName,
  customerStatus,
}: ContactItemProps) {
  const displayName = contact.name || contact.phone_number;
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-start gap-3 p-3 text-left transition-colors rounded-lg',
        isSelected
          ? 'bg-primary/10 border border-primary/20'
          : 'hover:bg-accent border border-transparent',
        contact.needs_handoff && !isSelected && 'bg-warning/5 border-warning/20'
      )}
    >
      <div className="relative">
        <Avatar className="h-12 w-12">
          <AvatarImage src={contact.profile_pic_url || ''} />
          <AvatarFallback className="bg-brand/10 text-brand font-medium">
            {initials}
          </AvatarFallback>
        </Avatar>
        {contact.unread_count > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-brand px-1 text-xs font-medium text-white">
            {contact.unread_count > 99 ? '99+' : contact.unread_count}
          </span>
        )}
        {contact.needs_handoff && contact.unread_count === 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-warning text-warning-foreground">
            <UserRound className="h-3 w-3" />
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <span className={cn(
              'font-medium truncate',
              contact.unread_count > 0 && 'text-foreground'
            )}>
              {displayName}
            </span>
            {!contact.instance_id && (
              <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                <WifiOff className="h-3 w-3" />
              </span>
            )}
            <CustomerStatusBadge status={customerStatus} size="sm" />
          </div>
          {contact.last_message_at && (
            <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
              {formatDistanceToNow(new Date(contact.last_message_at), { addSuffix: false })}
            </span>
          )}
        </div>
        
        {/* Labels Row */}
        {contactLabels.length > 0 && (
          <div className="flex gap-1 mt-0.5 flex-wrap">
            {contactLabels.slice(0, 2).map((label) => (
              <Badge
                key={label.id}
                className="text-[10px] px-1.5 py-0 h-4 text-white"
                style={{ backgroundColor: label.color }}
              >
                {label.name}
              </Badge>
            ))}
            {contactLabels.length > 2 && (
              <span className="text-[10px] text-muted-foreground">
                +{contactLabels.length - 2}
              </span>
            )}
          </div>
        )}

        <div className="flex items-center gap-2 mt-0.5">
          {replyingUserName ? (
            <p className="text-xs text-primary flex items-center gap-1 flex-1 truncate">
              <PenLine className="h-3 w-3" />
              <span>{replyingUserName} is typing...</span>
            </p>
          ) : (
            <p className={cn(
              'text-sm truncate flex-1',
              contact.unread_count > 0 ? 'text-foreground font-medium' : 'text-muted-foreground'
            )}>
              {contact.last_message || 'No messages yet'}
            </p>
          )}
          {contact.needs_handoff ? (
            <Badge variant="outline" className="text-xs shrink-0 border-warning text-warning">
              <UserRound className="h-3 w-3 mr-1" />
              Handoff
            </Badge>
          ) : contact.assigned_to ? (
            <Badge variant="outline" className="text-xs shrink-0">
              <User className="h-3 w-3 mr-1" />
              {assignedMemberName || 'Assigned'}
            </Badge>
          ) : null}
        </div>
      </div>
    </button>
  );
}
