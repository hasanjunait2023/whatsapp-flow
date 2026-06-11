import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useContacts, Contact } from '@/hooks/useContacts';
import { useLabels, Label } from '@/hooks/useLabels';
import { useCustomerJourney, JourneyEvent, EVENT_ICONS } from '@/hooks/useCustomerJourney';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Search,
  Filter,
  MoreHorizontal,
  MessageSquare,
  Archive,
  Ban,
  Tag,
  Users,
  Phone,
  Calendar,
  RefreshCw,
  Plus,
  X,
  ChevronDown,
  ShoppingBag,
  CreditCard,
  MessageCirclePlus,
  Send,
  Bot,
  CheckCircle,
  Package,
  Truck,
  PackageCheck,
  PackageX,
  UserRound,
  UserCheck,
  StickyNote,
  ChevronRight,
  History,
  Download,
} from 'lucide-react';
import { exportToCSV } from '@/lib/csv-export';
import { format, isToday, isYesterday } from 'date-fns';
import { toast } from 'sonner';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  MessageCirclePlus,
  MessageSquare,
  Send,
  Bot,
  ShoppingBag,
  CheckCircle,
  Package,
  Truck,
  PackageCheck,
  PackageX,
  CreditCard,
  UserRound,
  UserCheck,
  StickyNote,
  Tag,
};

export default function Contacts() {
  const navigate = useNavigate();
  const { contacts, loading, refetch, updateContact } = useContacts();
  const { labels, createLabel, addLabelToContact, removeLabelFromContact, getContactLabels } = useLabels();
  
  const [search, setSearch] = useState('');
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());
  const [filterLabels, setFilterLabels] = useState<string[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  const [showBlocked, setShowBlocked] = useState(false);
  
  // Contact detail sheet
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [contactLabels, setContactLabels] = useState<Label[]>([]);
  const [detailSheetOpen, setDetailSheetOpen] = useState(false);
  
  // Customer Journey
  const { events: journeyEvents, isLoading: loadingJourney } = useCustomerJourney(
    detailSheetOpen ? selectedContact?.id || null : null
  );
  
  // Label dialog
  const [labelDialogOpen, setLabelDialogOpen] = useState(false);
  const [newLabelName, setNewLabelName] = useState('');
  const [newLabelColor, setNewLabelColor] = useState('#6366f1');
  // Filter contacts
  const filteredContacts = contacts.filter((contact) => {
    // Search filter
    const matchesSearch =
      !search ||
      contact.name?.toLowerCase().includes(search.toLowerCase()) ||
      contact.phone_number.includes(search);

    // Archive/Block filter
    const matchesStatus =
      (showArchived ? contact.is_archived : !contact.is_archived) &&
      (showBlocked ? contact.is_blocked : !contact.is_blocked);

    return matchesSearch && matchesStatus;
  });

  // Load contact labels when detail sheet opens
  useEffect(() => {
    if (selectedContact) {
      getContactLabels(selectedContact.id).then(setContactLabels);
    }
  }, [selectedContact?.id]);

  const handleSelectAll = () => {
    if (selectedContacts.size === filteredContacts.length) {
      setSelectedContacts(new Set());
    } else {
      setSelectedContacts(new Set(filteredContacts.map((c) => c.id)));
    }
  };

  const handleSelectContact = (id: string) => {
    const newSelected = new Set(selectedContacts);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedContacts(newSelected);
  };

  const handleBulkArchive = async () => {
    try {
      for (const id of selectedContacts) {
        await updateContact(id, { is_archived: true });
      }
      toast.success(`${selectedContacts.size} contacts archived`);
      setSelectedContacts(new Set());
      refetch();
    } catch (error) {
      toast.error('Failed to archive contacts');
    }
  };

  const handleBulkBlock = async () => {
    try {
      for (const id of selectedContacts) {
        await updateContact(id, { is_blocked: true });
      }
      toast.success(`${selectedContacts.size} contacts blocked`);
      setSelectedContacts(new Set());
      refetch();
    } catch (error) {
      toast.error('Failed to block contacts');
    }
  };

  const handleOpenChat = (contact: Contact) => {
    navigate(`/inbox?contact=${contact.id}`);
  };

  const handleOpenDetail = (contact: Contact) => {
    setSelectedContact(contact);
    setDetailSheetOpen(true);
  };

  const handleCreateLabel = async () => {
    if (!newLabelName.trim()) return;
    try {
      await createLabel(newLabelName, newLabelColor);
      toast.success('Label created');
      setLabelDialogOpen(false);
      setNewLabelName('');
    } catch (error) {
      toast.error('Failed to create label');
    }
  };

  const handleToggleContactLabel = async (labelId: string, hasLabel: boolean) => {
    if (!selectedContact) return;
    try {
      if (hasLabel) {
        await removeLabelFromContact(selectedContact.id, labelId);
        setContactLabels((prev) => prev.filter((l) => l.id !== labelId));
      } else {
        await addLabelToContact(selectedContact.id, labelId);
        const label = labels.find((l) => l.id === labelId);
        if (label) setContactLabels((prev) => [...prev, label]);
      }
    } catch (error) {
      toast.error('Failed to update label');
    }
  };

  const colorOptions = [
    '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6',
    '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899', '#6b7280',
  ];

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Contacts</h1>
            <p className="text-muted-foreground">
              {filteredContacts.length} contacts
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                exportToCSV(
                  filteredContacts,
                  [
                    { key: 'name', header: 'Name', formatter: (val) => val as string || '' },
                    { key: 'phone_number', header: 'Phone Number' },
                    { key: 'is_blocked', header: 'Blocked' },
                    { key: 'is_archived', header: 'Archived' },
                    { key: 'unread_count', header: 'Unread Messages' },
                    { key: 'last_message_at', header: 'Last Message', formatter: (val) => val ? format(new Date(val as string), 'yyyy-MM-dd HH:mm:ss') : '' },
                    { key: 'created_at', header: 'Created At', formatter: (val) => val ? format(new Date(val as string), 'yyyy-MM-dd HH:mm:ss') : '' },
                  ],
                  `contacts-export-${format(new Date(), 'yyyy-MM-dd')}`
                );
                toast.success('Contacts exported successfully!');
              }}
              disabled={filteredContacts.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Filters and Search */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or phone..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Filter dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    <Filter className="h-4 w-4 mr-2" />
                    Filters
                    <ChevronDown className="h-4 w-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Status</DropdownMenuLabel>
                  <DropdownMenuCheckboxItem
                    checked={showArchived}
                    onCheckedChange={setShowArchived}
                  >
                    Show Archived
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={showBlocked}
                    onCheckedChange={setShowBlocked}
                  >
                    Show Blocked
                  </DropdownMenuCheckboxItem>
                  {labels.length > 0 && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuLabel>Labels</DropdownMenuLabel>
                      {labels.map((label) => (
                        <DropdownMenuCheckboxItem
                          key={label.id}
                          checked={filterLabels.includes(label.id)}
                          onCheckedChange={(checked) => {
                            setFilterLabels((prev) =>
                              checked
                                ? [...prev, label.id]
                                : prev.filter((id) => id !== label.id)
                            );
                          }}
                        >
                          <div
                            className="h-3 w-3 rounded-full mr-2"
                            style={{ backgroundColor: label.color }}
                          />
                          {label.name}
                        </DropdownMenuCheckboxItem>
                      ))}
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Label management */}
              <Button variant="outline" onClick={() => setLabelDialogOpen(true)}>
                <Tag className="h-4 w-4 mr-2" />
                Labels
              </Button>
            </div>

            {/* Bulk actions */}
            {selectedContacts.size > 0 && (
              <div className="flex items-center gap-2 mt-4 pt-4 border-t">
                <span className="text-sm text-muted-foreground">
                  {selectedContacts.size} selected
                </span>
                <Button variant="outline" size="sm" onClick={handleBulkArchive}>
                  <Archive className="h-4 w-4 mr-2" />
                  Archive
                </Button>
                <Button variant="outline" size="sm" onClick={handleBulkBlock}>
                  <Ban className="h-4 w-4 mr-2" />
                  Block
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedContacts(new Set())}
                >
                  <X className="h-4 w-4 mr-2" />
                  Clear
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Contacts List */}
        <Card>
          <CardHeader className="py-3 px-4 border-b">
            <div className="flex items-center gap-4">
              <Checkbox
                checked={
                  filteredContacts.length > 0 &&
                  selectedContacts.size === filteredContacts.length
                }
                onCheckedChange={handleSelectAll}
              />
              <span className="text-sm font-medium flex-1">Contact</span>
              <span className="text-sm font-medium w-32 hidden md:block">Phone</span>
              <span className="text-sm font-medium w-32 hidden lg:block">Last Activity</span>
              <span className="text-sm font-medium w-24 hidden lg:block">Labels</span>
              <span className="w-10"></span>
            </div>
          </CardHeader>
          <ScrollArea className="h-[calc(100vh-380px)]">
            {loading ? (
              <div className="p-4 space-y-3">
                {[...Array(8)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : filteredContacts.length === 0 ? (
              <div className="p-8 text-center">
                <Users className="h-12 w-12 mx-auto text-muted-foreground/50" />
                <p className="mt-4 text-muted-foreground">No contacts found</p>
              </div>
            ) : (
              <div className="divide-y">
                {filteredContacts.map((contact) => (
                  <div
                    key={contact.id}
                    className="flex items-center gap-4 p-4 hover:bg-accent/50 cursor-pointer transition-colors"
                    onClick={() => handleOpenDetail(contact)}
                  >
                    <Checkbox
                      checked={selectedContacts.has(contact.id)}
                      onCheckedChange={() => handleSelectContact(contact.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={contact.profile_pic_url || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {(contact.name || contact.phone_number).charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {contact.name || contact.phone_number}
                      </p>
                      {contact.name && (
                        <p className="text-xs text-muted-foreground md:hidden">
                          {contact.phone_number}
                        </p>
                      )}
                      {contact.unread_count > 0 && (
                        <Badge className="mt-1 bg-whatsapp text-whatsapp-foreground">
                          {contact.unread_count} unread
                        </Badge>
                      )}
                    </div>
                    <span className="text-sm text-muted-foreground w-32 hidden md:block">
                      {contact.phone_number}
                    </span>
                    <span className="text-sm text-muted-foreground w-32 hidden lg:block">
                      {contact.last_message_at
                        ? format(new Date(contact.last_message_at), 'MMM d, h:mm a')
                        : 'Never'}
                    </span>
                    <div className="w-24 hidden lg:flex gap-1">
                      {contact.is_blocked && (
                        <Badge variant="destructive" className="text-xs">Blocked</Badge>
                      )}
                      {contact.is_archived && (
                        <Badge variant="secondary" className="text-xs">Archived</Badge>
                      )}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleOpenChat(contact)}>
                          <MessageSquare className="mr-2 h-4 w-4" />
                          Open Chat
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={async () => {
                            await updateContact(contact.id, { is_archived: !contact.is_archived });
                            refetch();
                          }}
                        >
                          <Archive className="mr-2 h-4 w-4" />
                          {contact.is_archived ? 'Unarchive' : 'Archive'}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={async () => {
                            await updateContact(contact.id, { is_blocked: !contact.is_blocked });
                            refetch();
                          }}
                        >
                          <Ban className="mr-2 h-4 w-4" />
                          {contact.is_blocked ? 'Unblock' : 'Block'}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </Card>

        {/* Contact Detail Sheet */}
        <Sheet open={detailSheetOpen} onOpenChange={setDetailSheetOpen}>
          <SheetContent className="sm:max-w-lg">
            {selectedContact && (
              <>
                <SheetHeader>
                  <div className="flex items-center gap-4">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={selectedContact.profile_pic_url || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary text-xl">
                        {(selectedContact.name || selectedContact.phone_number).charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <SheetTitle>
                        {selectedContact.name || selectedContact.phone_number}
                      </SheetTitle>
                      <SheetDescription>{selectedContact.phone_number}</SheetDescription>
                    </div>
                  </div>
                </SheetHeader>

                <div className="mt-6 space-y-6">
                  {/* Quick Actions */}
                  <div className="flex gap-2">
                    <Button className="flex-1" onClick={() => handleOpenChat(selectedContact)}>
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Open Chat
                    </Button>
                    <Button variant="outline" size="icon">
                      <Phone className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Info */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{selectedContact.phone_number}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>
                        Added {format(new Date(selectedContact.created_at), 'MMMM d, yyyy')}
                      </span>
                    </div>
                    {selectedContact.last_message_at && (
                      <div className="flex items-center gap-3 text-sm">
                        <MessageSquare className="h-4 w-4 text-muted-foreground" />
                        <span>
                          Last message {format(new Date(selectedContact.last_message_at), 'MMM d, h:mm a')}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Labels */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Labels</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setLabelDialogOpen(true)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {labels.map((label) => {
                        const hasLabel = contactLabels.some((cl) => cl.id === label.id);
                        return (
                          <Badge
                            key={label.id}
                            variant={hasLabel ? 'default' : 'outline'}
                            className="cursor-pointer"
                            style={hasLabel ? { backgroundColor: label.color } : {}}
                            onClick={() => handleToggleContactLabel(label.id, hasLabel)}
                          >
                            {label.name}
                          </Badge>
                        );
                      })}
                      {labels.length === 0 && (
                        <p className="text-sm text-muted-foreground">No labels yet</p>
                      )}
                    </div>
                  </div>

                  {/* Status */}
                  <div className="space-y-3">
                    <span className="text-sm font-medium">Status</span>
                    <div className="flex gap-2">
                      <Button
                        variant={selectedContact.is_archived ? 'default' : 'outline'}
                        size="sm"
                        onClick={async () => {
                          await updateContact(selectedContact.id, {
                            is_archived: !selectedContact.is_archived,
                          });
                          setSelectedContact({
                            ...selectedContact,
                            is_archived: !selectedContact.is_archived,
                          });
                          refetch();
                        }}
                      >
                        <Archive className="h-4 w-4 mr-2" />
                        {selectedContact.is_archived ? 'Archived' : 'Archive'}
                      </Button>
                      <Button
                        variant={selectedContact.is_blocked ? 'destructive' : 'outline'}
                        size="sm"
                        onClick={async () => {
                          await updateContact(selectedContact.id, {
                            is_blocked: !selectedContact.is_blocked,
                          });
                          setSelectedContact({
                            ...selectedContact,
                            is_blocked: !selectedContact.is_blocked,
                          });
                          refetch();
                        }}
                      >
                        <Ban className="h-4 w-4 mr-2" />
                        {selectedContact.is_blocked ? 'Blocked' : 'Block'}
                      </Button>
                    </div>
                  </div>

                  <Separator />

                  {/* Customer Journey */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium flex items-center gap-2">
                        <History className="h-4 w-4" />
                        Customer Journey
                      </span>
                      <Badge variant="secondary" className="text-xs">
                        {journeyEvents.length} events
                      </Badge>
                    </div>

                    {loadingJourney ? (
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
                    ) : journeyEvents.length === 0 ? (
                      <div className="py-6 text-center bg-muted/30 rounded-lg">
                        <MessageCirclePlus className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
                        <p className="text-sm text-muted-foreground">No journey events yet</p>
                      </div>
                    ) : (
                      <ScrollArea className="h-[300px] pr-4">
                        <div className="space-y-0">
                          {(() => {
                            // Group events by date
                            const eventsByDate: Record<string, JourneyEvent[]> = {};
                            journeyEvents.forEach(event => {
                              const dateKey = new Date(event.created_at).toDateString();
                              if (!eventsByDate[dateKey]) eventsByDate[dateKey] = [];
                              eventsByDate[dateKey].push(event);
                            });

                            const formatDateLabel = (dateStr: string) => {
                              const date = new Date(dateStr);
                              if (isToday(date)) return 'Today';
                              if (isYesterday(date)) return 'Yesterday';
                              return format(date, 'MMM d, yyyy');
                            };

                            const formatTime = (dateStr: string) => format(new Date(dateStr), 'h:mm a');

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
                                case 'system': return 'bg-amber-500/10';
                                default: return 'bg-muted';
                              }
                            };

                            return Object.entries(eventsByDate).map(([dateKey, dateEvents]) => (
                              <div key={dateKey} className="mb-4">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                                    {formatDateLabel(dateEvents[0].created_at)}
                                  </span>
                                  <div className="flex-1 h-px bg-border" />
                                </div>

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
                                            {hasOrderId && (
                                              <Button
                                                variant="link"
                                                size="sm"
                                                className="h-auto p-0 text-[11px] text-primary"
                                                onClick={() => navigate(`/orders?order=${event.metadata!.order_id}`)}
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
                            ));
                          })()}
                        </div>
                      </ScrollArea>
                    )}
                  </div>
                </div>
              </>
            )}
          </SheetContent>
        </Sheet>

        {/* Create Label Dialog */}
        <Dialog open={labelDialogOpen} onOpenChange={setLabelDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Manage Labels</DialogTitle>
              <DialogDescription>
                Create and organize labels for your contacts.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {/* Existing labels */}
              {labels.length > 0 && (
                <div className="space-y-2">
                  <span className="text-sm font-medium">Existing Labels</span>
                  <div className="flex flex-wrap gap-2">
                    {labels.map((label) => (
                      <Badge
                        key={label.id}
                        style={{ backgroundColor: label.color }}
                      >
                        {label.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* New label form */}
              <div className="space-y-2">
                <span className="text-sm font-medium">Create New Label</span>
                <div className="flex gap-2">
                  <Input
                    placeholder="Label name..."
                    value={newLabelName}
                    onChange={(e) => setNewLabelName(e.target.value)}
                    className="flex-1"
                  />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="icon">
                        <div
                          className="h-4 w-4 rounded-full"
                          style={{ backgroundColor: newLabelColor }}
                        />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <div className="grid grid-cols-5 gap-1 p-2">
                        {colorOptions.map((color) => (
                          <button
                            key={color}
                            className="h-6 w-6 rounded-full hover:ring-2 ring-offset-2"
                            style={{ backgroundColor: color }}
                            onClick={() => setNewLabelColor(color)}
                          />
                        ))}
                      </div>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setLabelDialogOpen(false)}>
                Close
              </Button>
              <Button onClick={handleCreateLabel} disabled={!newLabelName.trim()}>
                Create Label
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
