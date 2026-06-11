import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Contact, useContacts } from '@/hooks/useContacts';
import { useLabels, Label } from '@/hooks/useLabels';
import { useTeam } from '@/hooks/useTeam';
import { useContactCustomerStatus } from '@/hooks/useContactCustomerStatus';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import ContactItem from './ContactItem';
import { Search, Filter, Users, UserRound, Tag, X } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

import { NewChatContact, isNewChatContact } from '@/hooks/useNewChat';
import NewChatItem from './NewChatItem';

interface ContactListProps {
  selectedContact: Contact | NewChatContact | null;
  onSelectContact: (contact: Contact | NewChatContact) => void;
  instanceFilter?: string | null;
}

type FilterType = 'all' | 'handoff' | 'unread';

interface ContactLabelMap {
  [contactId: string]: Label[];
}

export default function ContactList({ selectedContact, onSelectContact, instanceFilter }: ContactListProps) {
  // All hooks must be called unconditionally at the top
  const { contacts, loading } = useContacts();
  const { labels } = useLabels();
  const { members } = useTeam();
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [typingContacts, setTypingContacts] = useState<Record<string, boolean>>({});
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
  const [contactLabelMap, setContactLabelMap] = useState<ContactLabelMap>({});

  // Fetch customer status for all contacts
  const contactIds = useMemo(() => contacts.map((c) => c.id), [contacts.map(c => c.id).join(',')]);
  const { statusMap: customerStatusMap } = useContactCustomerStatus(contactIds);

  // Fetch all contact labels for the displayed contacts
  const contactIdsKey = contactIds.join(',');
  useEffect(() => {
    const fetchContactLabels = async () => {
      if (contactIds.length === 0) {
        setContactLabelMap({});
        return;
      }

      const { data, error } = await supabase
        .from('contact_labels')
        .select('contact_id, label:labels(*)')
        .in('contact_id', contactIds);

      if (error) {
        console.error('Error fetching contact labels:', error);
        return;
      }

      const labelMap: ContactLabelMap = {};
      (data || []).forEach((cl: any) => {
        if (!labelMap[cl.contact_id]) {
          labelMap[cl.contact_id] = [];
        }
        if (cl.label) {
          labelMap[cl.contact_id].push(cl.label);
        }
      });

      setContactLabelMap(labelMap);
    };

    fetchContactLabels();
  }, [contactIdsKey]);

  // Create member name lookup
  const memberNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    members.forEach((m) => {
      map[m.user_id] = m.profile?.full_name || m.profile?.email || 'Team Member';
    });
    return map;
  }, [members]);

  // Track typing indicators from device_typing_at — use ref to avoid re-triggering interval
  const contactsRef = useRef(contacts);
  contactsRef.current = contacts;

  useEffect(() => {
    const checkTyping = () => {
      const now = Date.now();
      const newTypingState: Record<string, boolean> = {};
      
      contactsRef.current.forEach((contact) => {
        if (contact.device_typing_at) {
          const typingTime = new Date(contact.device_typing_at).getTime();
          if (now - typingTime < 10000) {
            newTypingState[contact.id] = true;
          }
        }
      });
      
      setTypingContacts(prev => {
        const prevKeys = Object.keys(prev).sort().join(',');
        const newKeys = Object.keys(newTypingState).sort().join(',');
        if (prevKeys === newKeys) return prev;
        return newTypingState;
      });
    };
    
    checkTyping();
    const interval = setInterval(checkTyping, 2000);
    
    return () => clearInterval(interval);
  }, []);

  const filteredContacts = useMemo(() => contacts.filter((contact) => {
    // Filter by instance first
    if (instanceFilter && contact.instance_id !== instanceFilter) {
      return false;
    }

    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = 
      contact.name?.toLowerCase().includes(searchLower) ||
      contact.phone_number.toLowerCase().includes(searchLower);
    
    if (!matchesSearch) return false;
    
    // Filter by selected labels
    if (selectedLabels.length > 0) {
      const contactLabels = contactLabelMap[contact.id] || [];
      const contactLabelIds = contactLabels.map((l) => l.id);
      const hasAllLabels = selectedLabels.every((labelId) => contactLabelIds.includes(labelId));
      if (!hasAllLabels) return false;
    }
    
    switch (filter) {
      case 'handoff':
        return contact.needs_handoff;
      case 'unread':
        return contact.unread_count > 0;
      default:
        return true;
    }
  }), [contacts, instanceFilter, searchQuery, filter, selectedLabels, contactLabelMap]);

  const unreadCount = contacts.reduce((sum, c) => sum + c.unread_count, 0);
  const handoffCount = contacts.filter(c => c.needs_handoff).length;

  // Check if search query is a valid phone number and not matching existing contacts
  const isValidPhoneNumber = useMemo(() => {
    const digitsOnly = searchQuery.replace(/\D/g, '');
    return digitsOnly.length >= 10;
  }, [searchQuery]);

  const showNewChatOption = useMemo(() => {
    if (!isValidPhoneNumber || filter !== 'all' || selectedLabels.length > 0) return false;
    // Check if any contact matches the search exactly
    const digitsOnly = searchQuery.replace(/\D/g, '');
    const exactMatch = contacts.some(c => 
      c.phone_number.replace(/\D/g, '').includes(digitsOnly) ||
      digitsOnly.includes(c.phone_number.replace(/\D/g, ''))
    );
    return !exactMatch || filteredContacts.length === 0;
  }, [isValidPhoneNumber, searchQuery, contacts, filteredContacts, filter, selectedLabels]);

  const handleStartNewChat = useCallback(() => {
    const digitsOnly = searchQuery.replace(/\D/g, '');
    onSelectContact({
      isNew: true,
      phone_number: digitsOnly,
      instance_id: instanceFilter || null,
    });
  }, [searchQuery, instanceFilter, onSelectContact]);

  const toggleLabel = (labelId: string) => {
    setSelectedLabels((prev) =>
      prev.includes(labelId)
        ? prev.filter((id) => id !== labelId)
        : [...prev, labelId]
    );
  };

  const clearLabelFilters = () => {
    setSelectedLabels([]);
  };

  return (
    <div className="flex flex-col h-full border-r border-border bg-card md:border-r-0">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-lg">Inbox</h2>
            {unreadCount > 0 && (
              <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-brand px-1.5 text-xs font-medium text-white">
                {unreadCount}
              </span>
            )}
            {handoffCount > 0 && (
              <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-warning px-1.5 text-xs font-medium text-warning-foreground">
                {handoffCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {/* Label Filter */}
            <Popover>
              <PopoverTrigger asChild>
                <Button 
                  variant={selectedLabels.length > 0 ? 'default' : 'ghost'} 
                  size="icon" 
                  className="h-8 w-8"
                >
                  <Tag className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56" align="end">
                <div className="space-y-2">
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
                  <div className="space-y-1 max-h-[200px] overflow-y-auto">
                    {labels.map((label) => (
                      <button
                        key={label.id}
                        onClick={() => toggleLabel(label.id)}
                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent transition-colors"
                      >
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: label.color }}
                        />
                        <span className="text-sm flex-1 text-left">{label.name}</span>
                        {selectedLabels.includes(label.id) && (
                          <Badge variant="secondary" className="text-[10px] px-1">
                            ✓
                          </Badge>
                        )}
                      </button>
                    ))}
                    {labels.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-2">
                        No labels created
                      </p>
                    )}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Filter className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Filter Conversations</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setFilter('all')}>
                  <Users className="h-4 w-4 mr-2" />
                  All Conversations
                  {filter === 'all' && <Badge variant="secondary" className="ml-auto">Active</Badge>}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilter('handoff')}>
                  <UserRound className="h-4 w-4 mr-2" />
                  Needs Handoff
                  {handoffCount > 0 && (
                    <Badge variant="outline" className="ml-auto border-warning text-warning">
                      {handoffCount}
                    </Badge>
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilter('unread')}>
                  <Search className="h-4 w-4 mr-2" />
                  Unread Only
                  {unreadCount > 0 && (
                    <Badge variant="outline" className="ml-auto">
                      {unreadCount}
                    </Badge>
                  )}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search contacts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        
        {/* Active Filters */}
        {(filter !== 'all' || selectedLabels.length > 0) && (
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {filter !== 'all' && (
              <Badge variant="secondary" className="text-xs">
                {filter === 'handoff' ? 'Needs Handoff' : 'Unread'}
                <button
                  className="ml-1 hover:text-destructive"
                  onClick={() => setFilter('all')}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {selectedLabels.map((labelId) => {
              const label = labels.find((l) => l.id === labelId);
              if (!label) return null;
              return (
                <Badge
                  key={labelId}
                  className="text-xs text-white"
                  style={{ backgroundColor: label.color }}
                >
                  {label.name}
                  <button
                    className="ml-1 hover:opacity-70"
                    onClick={() => toggleLabel(labelId)}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              );
            })}
            {(filter !== 'all' || selectedLabels.length > 0) && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-6 text-xs px-2"
                onClick={() => {
                  setFilter('all');
                  clearLabelFilters();
                }}
              >
                Clear all
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Contact List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {loading && (
            <>
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-start gap-3 p-3">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                </div>
              ))}
            </>
          )}

          {!loading && filteredContacts.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
                <Users className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground">No contacts found</p>
              <p className="text-xs text-muted-foreground mt-1">
                {searchQuery || selectedLabels.length > 0
                  ? 'Try different filters'
                  : 'Contacts will appear when you receive messages'}
              </p>
            </div>
          )}

          {/* New Chat Option */}
          {!loading && showNewChatOption && (
            <NewChatItem
              phoneNumber={searchQuery.replace(/\D/g, '')}
              onClick={handleStartNewChat}
            />
          )}

          {!loading &&
            filteredContacts.map((contact) => (
              <ContactItem
                key={contact.id}
                contact={contact}
                isSelected={!isNewChatContact(selectedContact) && selectedContact?.id === contact.id}
                onClick={() => onSelectContact(contact)}
                replyingUserName={typingContacts[contact.id] ? 'Contact' : null}
                contactLabels={contactLabelMap[contact.id] || []}
                assignedMemberName={contact.assigned_to ? memberNameMap[contact.assigned_to] : null}
                customerStatus={customerStatusMap[contact.id]}
              />
            ))}
        </div>
      </ScrollArea>
    </div>
  );
}
