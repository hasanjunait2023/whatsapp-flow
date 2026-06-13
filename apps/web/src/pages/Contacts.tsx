import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useContacts, Contact } from '@/hooks/useContacts';
import { useLabels, Label } from '@/hooks/useLabels';
import { useCustomerJourney, JourneyEvent, EVENT_ICONS } from '@/hooks/useCustomerJourney';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
  UserPlus,
  MessageCircle,
} from 'lucide-react';
import { exportToCSV } from '@/lib/csv-export';
import { format, isToday, isYesterday } from 'date-fns';
import { toast } from 'sonner';
import { m, pageEnter, staggerContainer, staggerItem, useCountUp } from '@/lib/motion';
import { KpiCard } from '@/components/dashboard/bento/KpiCard';

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

/**
 * The single full-orange surface on this page (DESIGN.md §2.2).
 * Headline metric for Contacts = total contacts in view.
 */
function ContactsHighlightTile({ total, loading }: { total: number; loading: boolean }) {
  const display = useCountUp(total);

  if (loading) {
    return (
      <div className="flex h-full min-h-[148px] flex-col gap-4 rounded-card bg-primary/80 p-6">
        <Skeleton className="h-4 w-28 bg-white/30" />
        <Skeleton className="h-10 w-24 bg-white/30" />
        <Skeleton className="mt-auto h-4 w-32 bg-white/30" />
      </div>
    );
  }

  return (
    <m.div variants={staggerItem} whileHover={{ y: -2 }} transition={{ duration: 0.15 }} className="h-full">
      <div className="relative flex h-full min-h-[148px] flex-col overflow-hidden rounded-card bg-primary p-6 text-primary-foreground shadow-elevation-accent">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/15 via-transparent to-black/10"
        />
        <div className="relative z-10 flex h-full flex-col">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-2 text-sm font-medium text-primary-foreground/85">
              <Users className="h-4 w-4" aria-hidden />
              Total contacts
            </span>
            <span className="flex h-9 w-9 items-center justify-center rounded-control bg-white/15">
              <Users className="h-4 w-4" aria-hidden />
            </span>
          </div>
          <p className="mt-3 tabular-nums text-4xl font-bold leading-none tracking-tight md:text-5xl">
            {display.toLocaleString('en-US')}
          </p>
          <p className="mt-auto pt-3 text-xs text-primary-foreground/80">In your current view</p>
        </div>
      </div>
    </m.div>
  );
}

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

  // KPI metrics derived from existing data (no extra fetches)
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const newThisWeek = contacts.filter((c) => new Date(c.created_at).getTime() >= weekAgo).length;
  const activeChats = contacts.filter((c) => c.unread_count > 0).length;
  const blockedCount = contacts.filter((c) => c.is_blocked).length;

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

  const allSelected =
    filteredContacts.length > 0 && selectedContacts.size === filteredContacts.length;

  return (
    <DashboardLayout>
      <m.div
        variants={pageEnter}
        initial="hidden"
        animate="show"
        className="mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-8 py-5 space-y-6"
      >
        {/* Header */}
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Contacts</h1>
            <p className="text-sm text-muted-foreground">
              Manage the people you talk to across your WhatsApp workspace.
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
        </header>

        {/* KPI strip — stat cards + the ONE orange tile */}
        <m.div
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4"
        >
          <ContactsHighlightTile total={filteredContacts.length} loading={loading} />
          <m.div variants={staggerItem}>
            <KpiCard
              title="New this week"
              value={newThisWeek}
              icon={UserPlus}
              tone="success"
              loading={loading}
            />
          </m.div>
          <m.div variants={staggerItem}>
            <KpiCard
              title="Active chats"
              value={activeChats}
              icon={MessageCircle}
              tone="info"
              loading={loading}
            />
          </m.div>
          <m.div variants={staggerItem}>
            <KpiCard
              title="Blocked"
              value={blockedCount}
              icon={Ban}
              tone="destructive"
              loading={loading}
            />
          </m.div>
        </m.div>

        {/* Filters and Search */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-3">
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
              <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t">
                <span className="text-sm font-medium tabular-nums text-foreground">
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
        <Card className="overflow-hidden">
          <ScrollArea className="h-[calc(100vh-460px)] min-h-[320px]">
            {loading ? (
              <div className="p-4 space-y-3">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-9 w-9 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-3.5 w-40" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <Skeleton className="h-5 w-20 rounded-full hidden md:block" />
                    <Skeleton className="h-5 w-16 rounded-full hidden lg:block" />
                  </div>
                ))}
              </div>
            ) : filteredContacts.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-control bg-muted-soft text-muted-foreground">
                  <Users className="h-6 w-6" aria-hidden />
                </span>
                <p className="mt-4 text-sm font-medium text-foreground">No contacts found</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {search || showArchived || showBlocked
                    ? 'Try adjusting your search or filters.'
                    : 'Contacts appear here once people message your number.'}
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-10">
                      <Checkbox
                        checked={allSelected}
                        onCheckedChange={handleSelectAll}
                        aria-label="Select all contacts"
                      />
                    </TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead className="hidden md:table-cell">Phone</TableHead>
                    <TableHead className="hidden sm:table-cell">Channel</TableHead>
                    <TableHead className="hidden lg:table-cell">Last Activity</TableHead>
                    <TableHead className="hidden lg:table-cell">Status</TableHead>
                    <TableHead className="w-10 text-right">
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredContacts.map((contact) => (
                    <TableRow
                      key={contact.id}
                      data-state={selectedContacts.has(contact.id) ? 'selected' : undefined}
                      className="cursor-pointer"
                      onClick={() => handleOpenDetail(contact)}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedContacts.has(contact.id)}
                          onCheckedChange={() => handleSelectContact(contact.id)}
                          aria-label={`Select ${contact.name || contact.phone_number}`}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar className="h-9 w-9 shrink-0">
                            <AvatarImage src={contact.profile_pic_url || undefined} />
                            <AvatarFallback className="bg-accent text-primary text-sm font-semibold">
                              {(contact.name || contact.phone_number).charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-foreground truncate">
                                {contact.name || contact.phone_number}
                              </p>
                              {contact.unread_count > 0 && (
                                <Badge variant="whatsapp" className="tabular-nums">
                                  {contact.unread_count}
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs tabular-nums text-muted-foreground md:hidden">
                              {contact.phone_number}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell tabular-nums text-sm text-muted-foreground">
                        {contact.phone_number}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-whatsapp-light px-2.5 py-0.5 text-xs font-semibold text-whatsapp">
                          <span className="h-1.5 w-1.5 rounded-full bg-whatsapp" aria-hidden />
                          WhatsApp
                        </span>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                        {contact.last_message_at
                          ? format(new Date(contact.last_message_at), 'MMM d, h:mm a')
                          : 'Never'}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <div className="flex flex-wrap gap-1.5">
                          {contact.is_blocked && (
                            <Badge variant="destructive-soft">
                              <span className="mr-1 h-1.5 w-1.5 rounded-full bg-destructive" aria-hidden />
                              Blocked
                            </Badge>
                          )}
                          {contact.is_archived && (
                            <Badge variant="neutral-soft">Archived</Badge>
                          )}
                          {!contact.is_blocked && !contact.is_archived && (
                            <Badge variant="success-soft">
                              <span className="mr-1 h-1.5 w-1.5 rounded-full bg-success" aria-hidden />
                              Active
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Open menu</span>
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
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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
                      <AvatarFallback className="bg-accent text-primary text-xl font-semibold">
                        {(selectedContact.name || selectedContact.phone_number).charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <SheetTitle>
                        {selectedContact.name || selectedContact.phone_number}
                      </SheetTitle>
                      <SheetDescription className="tabular-nums">{selectedContact.phone_number}</SheetDescription>
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
                      <span className="tabular-nums">{selectedContact.phone_number}</span>
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
                      <Badge variant="neutral-soft" className="tabular-nums">
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
                      <div className="py-6 text-center bg-muted-soft rounded-card">
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
                                case 'communication': return 'bg-info-soft';
                                case 'order': return 'bg-accent';
                                case 'payment': return 'bg-success-soft';
                                case 'system': return 'bg-warning-soft';
                                default: return 'bg-muted-soft';
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
                                          <span className="text-[10px] tabular-nums text-muted-foreground whitespace-nowrap shrink-0">
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
      </m.div>
    </DashboardLayout>
  );
}
