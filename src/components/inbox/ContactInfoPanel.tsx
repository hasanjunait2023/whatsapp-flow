import { useState } from 'react';
import { Contact } from '@/hooks/useContacts';
import { JourneyEvent, EVENT_ICONS } from '@/hooks/useCustomerJourney';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Phone,
  Calendar,
  Plus,
  Clock,
  ShoppingBag,
  MessageSquare,
  CreditCard,
  Loader2,
  MessageCirclePlus,
  CheckCircle,
  Package,
  Truck,
  PackageCheck,
  PackageX,
  UserRound,
  UserCheck,
  UserRoundCheck,
  AlertTriangle,
  Star,
  ChevronRight,
  TrendingUp,
  ShieldCheck,
  Shield,
  ShieldAlert,
  RefreshCw,
} from 'lucide-react';
import { format, formatDistanceToNow, isToday, isYesterday } from 'date-fns';
import { UseMutationResult } from '@tanstack/react-query';
import { PurchaseBehaviorSheet } from './PurchaseBehaviorSheet';
import { PurchaseBehaviorSummary } from './PurchaseBehaviorSummary';
import { usePurchaseBehavior, getRiskLevelColor } from '@/hooks/usePurchaseBehavior';
import { QuickComplaintDialog } from './QuickComplaintDialog';
import { formatCurrency } from '@/lib/currency';
import { useRefreshWhatsappProfile } from '@/hooks/useRefreshWhatsappProfile';
 import ContactGroupsSection from './ContactGroupsSection';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  MessageCirclePlus,
  MessageSquare,
  ShoppingBag,
  CheckCircle,
  Package,
  Truck,
  PackageCheck,
  PackageX,
  CreditCard,
  UserRound,
  UserCheck,
  UserRoundCheck,
  AlertTriangle,
  Star,
  TrendingUp,
};

interface ContactInfoPanelProps {
  contact: Contact;
  events: JourneyEvent[];
  isLoadingEvents: boolean;
  addNote: UseMutationResult<any, Error, { title: string; description: string }, unknown>;
  addEvent?: (eventType: string, title: string, description: string) => Promise<void>;
  onViewOrder?: (orderId: string) => void;
}

export default function ContactInfoPanel({ 
  contact, 
  events, 
  isLoadingEvents,
  addNote,
  addEvent,
  onViewOrder 
}: ContactInfoPanelProps) {
  const [noteTitle, setNoteTitle] = useState('');
  const [noteDescription, setNoteDescription] = useState('');
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [showBehaviorSheet, setShowBehaviorSheet] = useState(false);
  const [complaintDialogOpen, setComplaintDialogOpen] = useState(false);

  // Get cached purchase behavior and mutation (pass contact's tenant_id for admin context)
  const { cachedBehavior, checkBehavior } = usePurchaseBehavior(contact.id, contact.phone_number, contact.tenant_id);

  // WhatsApp profile refresh hook
  const { refreshProfile, isRefreshing } = useRefreshWhatsappProfile({ contactId: contact.id });

  const displayName = contact.name || contact.phone_number;
  const initials = displayName.slice(0, 2).toUpperCase();

  // Get risk badge icon
  const getRiskIcon = (level: string | null | undefined) => {
    switch (level) {
      case 'low':
        return <ShieldCheck className="h-3.5 w-3.5 text-green-600" />;
      case 'medium':
        return <Shield className="h-3.5 w-3.5 text-yellow-600" />;
      case 'high':
        return <ShieldAlert className="h-3.5 w-3.5 text-red-600" />;
      default:
        return null;
    }
  };

  // Calculate stats from journey events
  const orderEvents = events.filter(e => e.event_type === 'order_created');
  const totalOrders = orderEvents.length;
  const totalSpent = orderEvents.reduce((sum, e) => sum + (e.metadata?.total || 0), 0);
  const messageEvents = events.filter(e => e.event_category === 'communication');

  const handleAddNote = async () => {
    if (!noteTitle.trim()) return;
    
    setIsAddingNote(true);
    try {
      await addNote.mutateAsync({
        title: noteTitle,
        description: noteDescription,
      });
      setNoteTitle('');
      setNoteDescription('');
    } finally {
      setIsAddingNote(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return 'Today';
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'MMM d, yyyy');
  };

  const formatTime = (dateStr: string) => {
    return format(new Date(dateStr), 'h:mm a');
  };

  const getEventIcon = (eventType: string) => {
    const iconInfo = EVENT_ICONS[eventType] || { icon: 'MessageSquare', color: 'text-muted-foreground' };
    const IconComponent = iconMap[iconInfo.icon] || MessageSquare;
    return { Icon: IconComponent, color: iconInfo.color };
  };

  const getCategoryBgColor = (category: string) => {
    switch (category) {
      case 'communication': return 'bg-blue-500/10';
      case 'order': return 'bg-violet-500/10';
      case 'payment': return 'bg-green-500/10';
      case 'support': return 'bg-amber-500/10';
      default: return 'bg-muted';
    }
  };

  const handleQuickEvent = async (eventType: string, title: string) => {
    if (!addEvent) return;
    await addEvent(eventType, title, '');
  };

  // Group events by date
  const eventsByDate: Record<string, JourneyEvent[]> = {};
  events.forEach(event => {
    const dateKey = new Date(event.created_at).toDateString();
    if (!eventsByDate[dateKey]) eventsByDate[dateKey] = [];
    eventsByDate[dateKey].push(event);
  });

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-5">
        {/* Profile Section */}
        <div className="flex flex-col items-center text-center">
          <div className="relative">
            <Avatar className="h-16 w-16 mb-2">
              <AvatarImage src={contact.profile_pic_url || ''} />
              <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full"
                  onClick={refreshProfile}
                  disabled={isRefreshing}
                >
                  <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Refresh profile from WhatsApp</TooltipContent>
            </Tooltip>
          </div>
          <h3 className="text-base font-semibold text-foreground">{displayName}</h3>
          <p className="text-sm text-muted-foreground">{contact.phone_number}</p>
          
          {/* Status Badges */}
          <div className="flex flex-wrap gap-1.5 mt-2 justify-center">
            {contact.needs_handoff && (
              <Badge variant="destructive" className="text-xs">Needs Handoff</Badge>
            )}
            {contact.is_blocked && (
              <Badge variant="secondary" className="text-xs">Blocked</Badge>
            )}
            {contact.is_archived && (
              <Badge variant="outline" className="text-xs">Archived</Badge>
            )}
            {cachedBehavior?.risk_level && (
              <Badge 
                variant="outline" 
                className={`text-xs ${getRiskLevelColor(cachedBehavior.risk_level)}`}
              >
                {getRiskIcon(cachedBehavior.risk_level)}
                <span className="ml-1 capitalize">{cachedBehavior.risk_level} Risk</span>
              </Badge>
            )}
          </div>
        </div>

        {/* Purchase Behavior Summary Card (shown when data exists) */}
        {cachedBehavior && (
          <PurchaseBehaviorSummary
            behavior={cachedBehavior}
            onRefresh={() => checkBehavior.mutate({ 
              phone: contact.phone_number, 
              contactId: contact.id, 
              forceRefresh: true 
            })}
            onViewDetails={() => setShowBehaviorSheet(true)}
            isRefreshing={checkBehavior.isPending}
          />
        )}

        {/* Purchase Behavior Check Button (shown when no data) */}
        {!cachedBehavior && (
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setShowBehaviorSheet(true)}
          >
            <TrendingUp className="h-4 w-4 mr-2" />
            Check Purchase Behavior
          </Button>
        )}
        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-2">
          <div className="text-center p-2.5 bg-muted/50 rounded-lg">
            <ShoppingBag className="h-4 w-4 mx-auto text-primary mb-0.5" />
            <p className="text-base font-semibold">{totalOrders}</p>
            <p className="text-[10px] text-muted-foreground">Orders</p>
          </div>
          <div className="text-center p-2.5 bg-muted/50 rounded-lg">
            <CreditCard className="h-4 w-4 mx-auto text-green-500 mb-0.5" />
            <p className="text-base font-semibold">{formatCurrency(totalSpent)}</p>
            <p className="text-[10px] text-muted-foreground">Spent</p>
          </div>
          <div className="text-center p-2.5 bg-muted/50 rounded-lg">
            <MessageSquare className="h-4 w-4 mx-auto text-blue-500 mb-0.5" />
            <p className="text-base font-semibold">{messageEvents.length}</p>
            <p className="text-[10px] text-muted-foreground">Events</p>
          </div>
        </div>

        {/* Contact Details */}
        <div className="space-y-2">
          <div className="flex items-center gap-3 text-sm">
            <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-foreground">{contact.phone_number}</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-muted-foreground">Since </span>
            <span className="text-foreground">
              {format(new Date(contact.created_at), 'MMM d, yyyy')}
            </span>
          </div>
          {contact.last_message_at && (
            <div className="flex items-center gap-3 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground">Active </span>
              <span className="text-foreground">
                {formatDistanceToNow(new Date(contact.last_message_at), { addSuffix: true })}
              </span>
            </div>
          )}
        </div>

        <Separator />

        {/* Quick Event Buttons */}
        {addEvent && (
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Quick Actions</h4>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 h-8 text-xs"
                onClick={() => setComplaintDialogOpen(true)}
              >
                <AlertTriangle className="h-3.5 w-3.5 mr-1.5 text-amber-500" />
                Mark Complaint
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 h-8 text-xs"
                onClick={() => handleQuickEvent('feedback_given', 'Feedback Given')}
              >
                <Star className="h-3.5 w-3.5 mr-1.5 text-yellow-500" />
                Add Feedback
              </Button>
            </div>
          </div>
        )}

        <Separator />

        {/* Add Note */}
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Add Note</h4>
          <Input
            value={noteTitle}
            onChange={(e) => setNoteTitle(e.target.value)}
            placeholder="Note title"
            className="h-8 text-sm"
          />
          <Textarea
            value={noteDescription}
            onChange={(e) => setNoteDescription(e.target.value)}
            placeholder="Details (optional)"
            rows={2}
            className="resize-none text-sm"
          />
          <Button
            onClick={handleAddNote}
            disabled={!noteTitle.trim() || isAddingNote}
            size="sm"
            className="w-full h-8"
          >
            {isAddingNote ? (
              <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Adding...</>
            ) : (
              <><Plus className="h-3.5 w-3.5 mr-1.5" />Add to Journey</>
            )}
          </Button>
        </div>

        <Separator />

        {/* Customer Journey Timeline */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Customer Journey
            </h4>
            <Badge variant="secondary" className="text-[10px] h-5">
              {events.length} events
            </Badge>
          </div>

          {isLoadingEvents ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-2.5">
                  <Skeleton className="h-6 w-6 rounded-full shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3.5 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : events.length === 0 ? (
            <div className="py-6 text-center">
              <MessageCirclePlus className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">No journey events yet</p>
            </div>
          ) : (
            <div className="space-y-0">
              {Object.entries(eventsByDate).slice(0, 5).map(([dateKey, dateEvents]) => (
                <div key={dateKey} className="mb-4">
                  {/* Date Header */}
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                      {formatDate(dateEvents[0].created_at)}
                    </span>
                    <div className="flex-1 h-px bg-border" />
                  </div>

                  {/* Events */}
                  {dateEvents.map((event, index) => {
                    const { Icon, color } = getEventIcon(event.event_type);
                    const isLast = index === dateEvents.length - 1;
                    const hasOrderId = event.metadata?.order_id;

                    return (
                      <div key={event.id} className="flex gap-2.5">
                        <div className="flex flex-col items-center">
                          <div className={`h-6 w-6 rounded-full ${getCategoryBgColor(event.event_category)} flex items-center justify-center shrink-0`}>
                            <Icon className={`h-3 w-3 ${color}`} />
                          </div>
                          {!isLast && <div className="w-0.5 flex-1 bg-border min-h-[16px]" />}
                        </div>
                        <div className={`flex-1 min-w-0 ${!isLast ? 'pb-3' : ''}`}>
                          <div className="flex items-start justify-between gap-1">
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-foreground truncate">
                                {event.title}
                              </p>
                              {event.description && (
                                <p className="text-[11px] text-muted-foreground line-clamp-1">
                                  {event.description}
                                </p>
                              )}
                              {hasOrderId && onViewOrder && (
                                <Button
                                  variant="link"
                                  size="sm"
                                  className="h-auto p-0 text-[11px] text-primary"
                                  onClick={() => onViewOrder(event.metadata!.order_id)}
                                >
                                  View Order<ChevronRight className="h-3 w-3 ml-0.5" />
                                </Button>
                              )}
                            </div>
                            <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0">
                              {formatTime(event.created_at)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
              
              {Object.keys(eventsByDate).length > 5 && (
                <p className="text-xs text-center text-muted-foreground py-2">
                  + {events.length - Object.values(eventsByDate).slice(0, 5).flat().length} more events
                </p>
              )}
            </div>
          )}
        </div>

        {/* Purchase Behavior Sheet */}
        <PurchaseBehaviorSheet
          open={showBehaviorSheet}
          onOpenChange={setShowBehaviorSheet}
          phoneNumber={contact.phone_number}
          contactId={contact.id}
          contactName={displayName}
          tenantId={contact.tenant_id}
        />

        {/* Quick Complaint Dialog */}
        <QuickComplaintDialog
          contactId={contact.id}
          contactName={displayName}
          open={complaintDialogOpen}
          onOpenChange={setComplaintDialogOpen}
        />
         
         {/* Contact's WhatsApp Groups */}
         <ContactGroupsSection contactId={contact.id} />
      </div>
    </ScrollArea>
  );
}