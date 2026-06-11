import { useState, useEffect, useCallback, useMemo } from 'react';
import { FBContact, useFBContacts } from '@/hooks/useFBContacts';
import { useFacebookPages } from '@/hooks/useFacebookPages';
import { useLabels, Label } from '@/hooks/useLabels';
import { useContactCustomerStatus } from '@/hooks/useContactCustomerStatus';
import { supabase } from '@/integrations/supabase/client';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Search, MessageSquare, UserRound, Tag, X, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import FBContactItem from './FBContactItem';

interface FBContactListProps {
  selectedContact: FBContact | null;
  onSelectContact: (contact: FBContact) => void;
  selectedPageId: string | null;
  onPageChange: (pageId: string | null) => void;
}

type FilterType = 'all' | 'unread' | 'handoff';

export default function FBContactList({
  selectedContact,
  onSelectContact,
  selectedPageId,
  onPageChange,
}: FBContactListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
  const [contactLabelMap, setContactLabelMap] = useState<Record<string, string[]>>({});
  
  const { pages, loading: pagesLoading } = useFacebookPages();
  const { contacts, loading: contactsLoading, unreadCount, handoffCount } = useFBContacts(selectedPageId);
  const { labels } = useLabels();

  // Fetch customer status for FB contacts
  // Note: FB contacts may not have matching WhatsApp contact records, so status may be null
  const fbContactIds = useMemo(() => contacts.map(c => c.id), [contacts]);
  const { statusMap: customerStatusMap } = useContactCustomerStatus(fbContactIds);

  // Fetch all contact-label associations for filtering
  const fetchContactLabels = useCallback(async () => {
    if (contacts.length === 0) return;
    
    const contactIds = contacts.map(c => c.id);
    const { data, error } = await supabase
      .from('fb_contact_labels')
      .select('contact_id, label_id')
      .in('contact_id', contactIds);

    if (error) {
      console.error('Error fetching contact labels:', error);
      return;
    }

    const map: Record<string, string[]> = {};
    (data || []).forEach(cl => {
      if (!map[cl.contact_id]) {
        map[cl.contact_id] = [];
      }
      map[cl.contact_id].push(cl.label_id);
    });
    setContactLabelMap(map);
  }, [contacts]);

  useEffect(() => {
    fetchContactLabels();
  }, [fetchContactLabels]);

  const toggleLabel = (labelId: string) => {
    setSelectedLabels(prev => 
      prev.includes(labelId) 
        ? prev.filter(id => id !== labelId)
        : [...prev, labelId]
    );
  };

  const clearLabelFilters = () => {
    setSelectedLabels([]);
  };

  const filteredContacts = contacts.filter(contact => {
    // Search filter
    const matchesSearch = !searchQuery || 
      contact.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.psid.includes(searchQuery);

    // Status filter
    const matchesFilter = 
      filter === 'all' ||
      (filter === 'unread' && contact.unread_count > 0) ||
      (filter === 'handoff' && contact.needs_handoff);

    // Label filter
    const matchesLabels = selectedLabels.length === 0 || 
      selectedLabels.some(labelId => contactLabelMap[contact.id]?.includes(labelId));

    return matchesSearch && matchesFilter && matchesLabels;
  });

  const loading = pagesLoading || contactsLoading;

  const selectedLabelObjects = labels.filter(l => selectedLabels.includes(l.id));

  return (
    <div className="flex flex-col h-full border-r border-border bg-card">
      {/* Header */}
      <div className="p-4 border-b border-border space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-blue-500" />
            <h2 className="font-semibold">Messenger</h2>
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Badge variant="secondary" className="bg-blue-500/10 text-blue-500">
                {unreadCount} unread
              </Badge>
            )}
            {handoffCount > 0 && (
              <Badge variant="secondary" className="bg-warning/10 text-warning">
                {handoffCount} handoff
              </Badge>
            )}
          </div>
        </div>

        {/* Page Selector */}
        <Select
          value={selectedPageId || 'all'}
          onValueChange={(value) => onPageChange(value === 'all' ? null : value)}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select page" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Pages</SelectItem>
            {pages.map((page) => (
              <SelectItem key={page.id} value={page.id}>
                <div className="flex items-center gap-2">
                  <span>{page.page_name}</span>
                  {page.status === 'active' ? (
                    <Badge variant="outline" className="text-green-500 text-[10px]">
                      Connected
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground text-[10px]">
                      Disconnected
                    </Badge>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Filter Buttons */}
        <div className="flex items-center gap-1 flex-wrap">
          <Button
            variant={filter === 'all' ? 'secondary' : 'ghost'}
            size="sm"
            className="text-xs h-7"
            onClick={() => setFilter('all')}
          >
            All
          </Button>
          <Button
            variant={filter === 'unread' ? 'secondary' : 'ghost'}
            size="sm"
            className="text-xs h-7"
            onClick={() => setFilter('unread')}
          >
            Unread
            {unreadCount > 0 && (
              <Badge variant="default" className="ml-1 h-4 px-1 text-[10px] bg-blue-500">
                {unreadCount}
              </Badge>
            )}
          </Button>
          <Button
            variant={filter === 'handoff' ? 'secondary' : 'ghost'}
            size="sm"
            className="text-xs h-7"
            onClick={() => setFilter('handoff')}
          >
            <UserRound className="h-3 w-3 mr-1" />
            Handoff
            {handoffCount > 0 && (
              <Badge variant="default" className="ml-1 h-4 px-1 text-[10px] bg-warning">
                {handoffCount}
              </Badge>
            )}
          </Button>

          {/* Label Filter */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={selectedLabels.length > 0 ? 'secondary' : 'ghost'}
                size="sm"
                className="text-xs h-7"
              >
                <Tag className="h-3 w-3 mr-1" />
                Labels
                {selectedLabels.length > 0 && (
                  <Badge variant="default" className="ml-1 h-4 px-1 text-[10px]">
                    {selectedLabels.length}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-56 p-0">
              <div className="p-2 border-b border-border">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Filter by Label</span>
                  {selectedLabels.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={clearLabelFilters}
                    >
                      Clear
                    </Button>
                  )}
                </div>
              </div>
              <ScrollArea className="max-h-[200px]">
                {labels.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground text-sm">
                    No labels created yet
                  </div>
                ) : (
                  <div className="p-1">
                    {labels.map((label) => {
                      const isSelected = selectedLabels.includes(label.id);
                      return (
                        <button
                          key={label.id}
                          onClick={() => toggleLabel(label.id)}
                          className={cn(
                            "w-full flex items-center justify-between px-3 py-2 rounded-md transition-colors",
                            "hover:bg-accent"
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: label.color }}
                            />
                            <span className="text-sm">{label.name}</span>
                          </div>
                          {isSelected && (
                            <Check className="h-4 w-4 text-primary" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </PopoverContent>
          </Popover>
        </div>

        {/* Active Label Filters */}
        {selectedLabelObjects.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {selectedLabelObjects.map((label) => (
              <Badge
                key={label.id}
                variant="secondary"
                className="text-xs cursor-pointer gap-1"
                style={{ backgroundColor: label.color, color: 'white' }}
                onClick={() => toggleLabel(label.id)}
              >
                {label.name}
                <X className="h-3 w-3" />
              </Badge>
            ))}
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Contact List */}
      <ScrollArea className="flex-1">
        {loading ? (
          <div className="p-4 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-start gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredContacts.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p className="text-sm">
              {searchQuery || filter !== 'all' || selectedLabels.length > 0
                ? 'No conversations match your filter'
                : 'No conversations yet'}
            </p>
            {pages.length === 0 && (
              <p className="text-xs mt-2">
                Connect a Facebook Page to start receiving messages
              </p>
            )}
          </div>
        ) : (
          filteredContacts.map((contact) => (
            <FBContactItem
              key={contact.id}
              contact={contact}
              isSelected={selectedContact?.id === contact.id}
              onClick={() => onSelectContact(contact)}
              customerStatus={customerStatusMap[contact.id]}
            />
          ))
        )}
      </ScrollArea>
    </div>
  );
}
