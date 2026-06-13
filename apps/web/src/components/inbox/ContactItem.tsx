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
  const hasUnread = contact.unread_count > 0;

  return (
    <button
      onClick={onClick}
      aria-current={isSelected ? 'true' : undefined}
      className={cn(
        'group relative w-full flex items-start gap-3 px-3 py-3 min-h-[68px] text-left rounded-control border transition-colors duration-200',
        isSelected
          ? 'bg-muted border-border'
          : 'border-transparent hover:bg-muted/60',
        contact.needs_handoff && !isSelected && 'bg-warning-soft/40'
      )}
    >
      {/* Active conversation marker — orange affordance, not a fill */}
      {isSelected && (
        <span
          aria-hidden
          className="absolute left-0 top-1/2 -translate-y-1/2 h-7 w-1 rounded-full bg-primary"
        />
      )}
      <div className="relative">
        <Avatar className="h-12 w-12">
          <AvatarImage src={contact.profile_pic_url || ''} />
          <AvatarFallback className="bg-accent text-accent-foreground font-medium">
            {initials}
          </AvatarFallback>
        </Avatar>
        {/* Channel dot — WhatsApp by default */}
        <span
          aria-hidden
          className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-whatsapp ring-2 ring-card"
        />
        {contact.needs_handoff && contact.unread_count === 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-warning text-warning-foreground ring-2 ring-card">
            <UserRound className="h-3 w-3" />
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <span className={cn(
              'truncate',
              hasUnread ? 'font-semibold text-foreground' : 'font-medium text-foreground'
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
            <span className={cn(
              'text-xs whitespace-nowrap shrink-0 tabular-nums',
              hasUnread ? 'font-medium text-primary' : 'text-muted-foreground'
            )}>
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
              hasUnread ? 'text-foreground font-medium' : 'text-muted-foreground'
            )}>
              {contact.last_message || 'No messages yet'}
            </p>
          )}
          {hasUnread && (
            <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary px-1.5 text-xs font-semibold text-primary-foreground tabular-nums shrink-0">
              {contact.unread_count > 99 ? '99+' : contact.unread_count}
            </span>
          )}
          {contact.needs_handoff ? (
            <Badge variant="warning-soft" className="text-xs shrink-0">
              <UserRound className="h-3 w-3 mr-1" />
              Handoff
            </Badge>
          ) : contact.assigned_to ? (
            <Badge variant="neutral-soft" className="text-xs shrink-0">
              <User className="h-3 w-3 mr-1" />
              {assignedMemberName || 'Assigned'}
            </Badge>
          ) : null}
        </div>
      </div>
    </button>
  );
}
