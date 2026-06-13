import { useState, useCallback, useEffect, useMemo } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import AdminChatView from '@/components/inbox/AdminChatView';
import AdminNewChatView from '@/components/admin-inbox/AdminNewChatView';
import CustomerDetailsPanel from '@/components/inbox/CustomerDetailsPanel';
import CustomerStatusBadge from '@/components/inbox/CustomerStatusBadge';
import { useAdminContactStatus } from '@/hooks/useContactCustomerStatus';
import { AdminContact } from '@/hooks/useAdminContacts';
import { useAdminInboxContacts } from '@/hooks/useAdminInboxContacts';
import { AdminNewChatContact, isAdminNewChatContact } from '@/hooks/useAdminNewChat';
import { MessageCircle, PanelRightOpen, PanelRightClose, ArrowLeft, ChevronLeft, Phone, Users, Search, MessageSquarePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Input } from '@/components/ui/input';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import { useSwipeNavigation } from '@/hooks/useSwipeNavigation';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAdminGroupInbox, AdminGroupInboxItem } from '@/hooks/useAdminGroupInbox';
import AdminGroupList from '@/components/admin-inbox/AdminGroupList';
import AdminGroupChatView from '@/components/admin-inbox/AdminGroupChatView';
import AdminCreateGroupDialog from '@/components/admin-inbox/AdminCreateGroupDialog';

type MobileView = 'list' | 'chat' | 'details';
type InboxTab = 'chats' | 'groups';

// System tenant ID
const SYSTEM_TENANT_ID = '5a0ad1d5-588a-473a-af82-724e69890074';

export default function AdminInbox() {
  const [selectedContact, setSelectedContact] = useState<AdminContact | AdminNewChatContact | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<AdminGroupInboxItem | null>(null);
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(null);
  const [showDetailsPanel, setShowDetailsPanel] = useState(() => {
    const saved = localStorage.getItem('admin-inbox-details-panel');
    return saved !== 'false';
  });
  const [mobileView, setMobileView] = useState<MobileView>('list');
  const [activeTab, setActiveTab] = useState<InboxTab>('chats');
  const [showCreateGroupDialog, setShowCreateGroupDialog] = useState(false);
  const [instance, setInstance] = useState<{ id: string; name: string; phone_number: string | null; status: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const { contacts, loading: contactsLoading, markAsRead, requestHandoff, resolveHandoff, deleteContact } = useAdminInboxContacts({ instanceId: selectedInstanceId });
  const { groups, loading: groupsLoading, markGroupAsRead } = useAdminGroupInbox(selectedInstanceId);
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  // Fetch Central Admin's WhatsApp instance - use whatsapp_instances table with the known Central Admin ID
  useEffect(() => {
    const CENTRAL_ADMIN_INSTANCE_ID = 'd61ab28c-c512-4c34-9566-b57669a69c9f';
    
    const fetchInstance = async () => {
      // Query the main whatsapp_instances table for Central Admin (NOT admin_whatsapp_instances)
      const { data: adminInstance } = await supabase
        .from('whatsapp_instances')
        .select('id, name, phone_number, status, api_key_encrypted')
        .eq('id', CENTRAL_ADMIN_INSTANCE_ID)
        .single();
      
      if (adminInstance) {
        setInstance(adminInstance);
        setSelectedInstanceId(adminInstance.id);
        return;
      }
      
      // Fallback: find by phone number pattern if ID doesn't match
      const { data: fallbackInstance } = await supabase
        .from('whatsapp_instances')
        .select('id, name, phone_number, status, api_key_encrypted')
        .or('phone_number.ilike.%1922001161%')
        .eq('status', 'active')
        .limit(1)
        .single();
      
      if (fallbackInstance) {
        setInstance(fallbackInstance);
        setSelectedInstanceId(fallbackInstance.id);
      }
    };
    fetchInstance();
  }, []);

  useEffect(() => {
    localStorage.setItem('admin-inbox-details-panel', String(showDetailsPanel));
  }, [showDetailsPanel]);

  useEffect(() => {
    if (selectedContact && isMobile) {
      setMobileView('chat');
    }
  }, [selectedContact, isMobile]);

  useEffect(() => {
    if (selectedGroup && isMobile) {
      setMobileView('chat');
    }
  }, [selectedGroup, isMobile]);

  // Clear selection when switching tabs
  useEffect(() => {
    if (activeTab === 'chats') {
      setSelectedGroup(null);
    } else {
      setSelectedContact(null);
    }
  }, [activeTab]);

  const handleSelectContact = (contact: AdminContact | AdminNewChatContact) => {
    setSelectedContact(contact);
    if (isMobile) {
      setMobileView('chat');
    }
  };

  const handleNewChatContactCreated = useCallback((contact: AdminContact) => {
    setSelectedContact(contact);
    setSearchQuery('');
  }, []);

  const handleSelectGroup = (group: AdminGroupInboxItem) => {
    setSelectedGroup(group);
    markGroupAsRead(group.id);
    if (isMobile) {
      setMobileView('chat');
    }
  };

  const handleBackToList = useCallback(() => {
    setMobileView('list');
  }, []);

  const { translateX, showSwipeIndicator, swipeIndicatorOpacity, handlers: swipeHandlers } = useSwipeNavigation({
    onSwipeRight: handleBackToList,
    enabled: isMobile && mobileView === 'chat',
    threshold: 60,
  });

  const handleMarkAsRead = useCallback((id: string) => {
    markAsRead(id);
  }, [markAsRead]);

  const handleRequestHandoff = useCallback((id: string, reason: string) => {
    requestHandoff(id, reason);
    setSelectedContact((prev) => {
      if (!prev || isAdminNewChatContact(prev)) return prev;
      return prev.id === id ? { ...prev, needs_handoff: true, handoff_reason: reason, handoff_at: new Date().toISOString() } : prev;
    });
  }, [requestHandoff]);

  const handleResolveHandoff = useCallback((id: string) => {
    resolveHandoff(id);
    setSelectedContact((prev) => {
      if (!prev || isAdminNewChatContact(prev)) return prev;
      return prev.id === id ? { ...prev, needs_handoff: false, handoff_reason: null, handoff_at: null } : prev;
    });
  }, [resolveHandoff]);

  const handleDeleteContact = useCallback(async (id: string) => {
    try {
      await deleteContact(id);
      setSelectedContact(null);
      if (isMobile) {
        setMobileView('list');
      }
    } catch (error) {
      console.error('Failed to delete contact:', error);
    }
  }, [deleteContact, isMobile]);

  const handleViewOrder = useCallback((orderId: string) => {
    navigate(`/orders?order=${orderId}`);
  }, [navigate]);

  const handleShowDetails = () => {
    if (isMobile) {
      setMobileView('details');
    } else {
      setShowDetailsPanel(!showDetailsPanel);
    }
  };

  const handleCreateGroupSuccess = () => {
    setShowCreateGroupDialog(false);
  };

  // Current contact logic - handle new chat vs real contact
  const currentContact = useMemo(() => {
    if (!selectedContact) return null;
    if (isAdminNewChatContact(selectedContact)) return selectedContact;
    return contacts.find(c => c.id === selectedContact.id) || selectedContact;
  }, [selectedContact, contacts]);

  const isNewChat = currentContact && isAdminNewChatContact(currentContact);
  const currentRealContact = currentContact && !isAdminNewChatContact(currentContact) ? currentContact : null;

  // Filter contacts by search query
  const filteredContacts = useMemo(() => {
    if (!searchQuery.trim()) return contacts;
    const query = searchQuery.toLowerCase();
    return contacts.filter(c => 
      c.name?.toLowerCase().includes(query) ||
      c.phone_number.toLowerCase().includes(query)
    );
  }, [contacts, searchQuery]);

  // Check if search query is a valid phone number for new chat
  const isValidPhoneNumber = useMemo(() => {
    const digitsOnly = searchQuery.replace(/\D/g, '');
    return digitsOnly.length >= 10;
  }, [searchQuery]);

  const showNewChatOption = useMemo(() => {
    if (!isValidPhoneNumber) return false;
    const digitsOnly = searchQuery.replace(/\D/g, '');
    const exactMatch = contacts.some(c => 
      c.phone_number.replace(/\D/g, '').includes(digitsOnly) ||
      digitsOnly.includes(c.phone_number.replace(/\D/g, ''))
    );
    return !exactMatch || filteredContacts.length === 0;
  }, [isValidPhoneNumber, searchQuery, contacts, filteredContacts]);

  const handleStartNewChat = useCallback(() => {
    const digitsOnly = searchQuery.replace(/\D/g, '');
    handleSelectContact({
      isNew: true,
      phone_number: digitsOnly,
      instance_id: selectedInstanceId,
    });
  }, [searchQuery, selectedInstanceId, handleSelectContact]);

  // Get phone numbers for tenant status lookup
  const contactPhones = useMemo(() => filteredContacts.map(c => c.phone_number), [filteredContacts]);
  const tenantStatusMap = useAdminContactStatus(contactPhones);

  const showContactList = !isMobile || mobileView === 'list';
  const showChatView = !isMobile || mobileView === 'chat';
  const showDetailsOnMobile = isMobile && mobileView === 'details';

  // Count unreads
  const chatUnreadCount = filteredContacts.reduce((acc, c) => acc + c.unread_count, 0);
  const groupUnreadCount = groups.reduce((acc, g) => acc + g.unread_count, 0);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
      case 'active':
        return 'bg-success';
      case 'connecting': return 'bg-warning';
      default: return 'bg-destructive';
    }
  };

  return (
    <AdminLayout>
      <div className="flex flex-col h-[calc(100vh-0px)]">
        {/* Admin Inbox Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold tracking-tight text-foreground">Admin Inbox</h1>
            {instance && (
              <Badge variant="outline" className="flex items-center gap-1.5">
                <span className={cn("h-2 w-2 rounded-full", getStatusColor(instance.status))} />
                <Phone className="h-3 w-3" />
                {instance.phone_number || instance.name}
              </Badge>
            )}
          </div>
          <div className="text-sm text-muted-foreground">
            {activeTab === 'chats' ? `${contacts.length} contacts` : `${groups.length} groups`}
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="px-4 py-2 border-b border-border bg-card">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as InboxTab)}>
            <TabsList className="grid w-full max-w-[300px] grid-cols-2">
              <TabsTrigger value="chats" className="gap-2">
                <MessageCircle className="h-4 w-4" />
                Chats
                {chatUnreadCount > 0 && (
                  <Badge variant="default" className="h-5 min-w-5 px-1.5 text-xs">
                    {chatUnreadCount}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="groups" className="gap-2">
                <Users className="h-4 w-4" />
                Groups
                {groupUnreadCount > 0 && (
                  <Badge variant="default" className="h-5 min-w-5 px-1.5 text-xs">
                    {groupUnreadCount}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* === CHATS TAB === */}
          {activeTab === 'chats' && (
            <>
              {/* Contact List */}
              {showContactList && !showDetailsOnMobile && (
                <div className="w-full md:w-[360px] md:shrink-0 border-r border-border bg-card">
                  {/* Search Box */}
                  <div className="p-3 border-b border-border">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search or enter phone number..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                  </div>

                  <div className="h-[calc(100%-57px)] overflow-y-auto">
                    {/* New Chat Option */}
                    {showNewChatOption && (
                      <button
                        onClick={handleStartNewChat}
                        className="w-full p-3 text-left border-b border-border bg-accent/40 hover:bg-accent transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-11 w-11 rounded-card bg-accent flex items-center justify-center flex-shrink-0">
                            <MessageSquarePlus className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground">Start new chat</p>
                            <p className="text-sm text-muted-foreground truncate">
                              Send message to {searchQuery.replace(/\D/g, '')}
                            </p>
                          </div>
                        </div>
                      </button>
                    )}

                    {filteredContacts.length === 0 && !showNewChatOption ? (
                      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-card bg-accent">
                          <MessageCircle className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <h3 className="font-medium text-foreground mb-1">No contacts yet</h3>
                        <p className="text-sm text-muted-foreground">
                          {searchQuery ? 'No matching contacts' : 'Contacts from ads will appear here'}
                        </p>
                      </div>
                    ) : (
                      <div className="divide-y divide-border">
                        {filteredContacts.map((contact) => (
                          <button
                            key={contact.id}
                            onClick={() => handleSelectContact(contact)}
                            className={cn(
                              "w-full min-h-[44px] p-3 text-left transition-colors hover:bg-muted/60",
                              !isAdminNewChatContact(currentContact) && currentContact?.id === contact.id && "bg-muted"
                            )}
                          >
                            <div className="flex items-center gap-3">
                              <div className="h-11 w-11 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                                {contact.profile_pic_url ? (
                                  <img
                                    src={contact.profile_pic_url}
                                    alt={contact.name || ''}
                                    className="h-11 w-11 rounded-full object-cover"
                                  />
                                ) : (
                                  <span className="text-sm font-medium text-foreground">
                                    {(contact.name || contact.phone_number || '?')[0].toUpperCase()}
                                  </span>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                    <p className="font-medium text-foreground truncate">
                                      {contact.name || contact.phone_number}
                                    </p>
                                    <CustomerStatusBadge
                                      status={tenantStatusMap[contact.phone_number]}
                                      size="sm"
                                    />
                                  </div>
                                  {contact.unread_count > 0 && (
                                    <span className="h-5 min-w-5 px-1.5 rounded-full bg-secondary text-secondary-foreground text-xs tabular-nums flex items-center justify-center shrink-0">
                                      {contact.unread_count}
                                    </span>
                                  )}
                                </div>
                                {contact.last_message && (
                                  <p className="text-sm text-muted-foreground truncate">
                                    {contact.last_message}
                                  </p>
                                )}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* New Chat View */}
              {showChatView && isNewChat && !showDetailsOnMobile && (
                <div 
                  className="flex-1 relative w-full md:w-auto"
                  {...(isMobile ? swipeHandlers : {})}
                >
                  {isMobile && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-3 left-3 h-9 w-9 z-10 md:hidden"
                      onClick={handleBackToList}
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                  )}
                  <AdminNewChatView
                    newContact={currentContact as AdminNewChatContact}
                    onContactCreated={handleNewChatContactCreated}
                  />
                </div>
              )}

              {/* Chat View for real contacts */}
              {showChatView && currentRealContact && !showDetailsOnMobile && (
                <div 
                  className="flex-1 relative w-full md:w-auto touch-pan-y"
                  {...(isMobile ? swipeHandlers : {})}
                >
                  {isMobile && showSwipeIndicator && (
                    <div 
                      className="absolute left-0 top-0 bottom-0 w-12 flex items-center justify-center z-20 pointer-events-none"
                      style={{ opacity: swipeIndicatorOpacity }}
                    >
                      <div className="h-16 w-8 rounded-r-full bg-primary/20 flex items-center justify-center">
                        <ChevronLeft className="h-5 w-5 text-primary" />
                      </div>
                    </div>
                  )}
                  
                  {isMobile && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-3 left-3 h-9 w-9 z-10 md:hidden"
                      onClick={handleBackToList}
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                  )}
                  
                  <div
                    className={cn(
                      "h-full transition-transform",
                      !showSwipeIndicator && "duration-200"
                    )}
                    style={{ 
                      transform: isMobile ? `translateX(${translateX}px)` : undefined 
                    }}
                  >
                    <AdminChatView
                      contact={currentRealContact}
                      instanceId={currentRealContact.instance_id || selectedInstanceId || ''}
                      onMarkAsRead={handleMarkAsRead}
                      onRequestHandoff={handleRequestHandoff}
                      onResolveHandoff={handleResolveHandoff}
                      onDeleteContact={handleDeleteContact}
                      allContacts={filteredContacts}
                    />
                  </div>
                  
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-3 right-3 h-9 w-9 z-10"
                        onClick={handleShowDetails}
                      >
                        {showDetailsPanel && !isMobile ? (
                          <PanelRightClose className="h-4 w-4" />
                        ) : (
                          <PanelRightOpen className="h-4 w-4" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="left">
                      {showDetailsPanel ? 'Hide details' : 'Show details'}
                    </TooltipContent>
                  </Tooltip>
                </div>
              )}

              {/* Empty state for chats */}
              {!isMobile && !currentContact && (
                <div className="flex-1 h-full flex flex-col items-center justify-center bg-muted/30 px-6">
                  <div className="h-20 w-20 rounded-card bg-accent flex items-center justify-center mb-6">
                    <MessageCircle className="h-10 w-10 text-primary" />
                  </div>
                  <h2 className="text-xl font-semibold tracking-tight text-foreground mb-2">
                    Admin Inbox
                  </h2>
                  <p className="text-muted-foreground text-center max-w-sm">
                    Select a conversation or search a phone number to start chatting.
                  </p>
                </div>
              )}

              {/* Customer Details Panel - Desktop */}
              {!isMobile && currentRealContact && showDetailsPanel && (
                <div className="w-[380px] shrink-0 animate-in slide-in-from-right-5 duration-200">
                  <CustomerDetailsPanel
                    contact={currentRealContact as any}
                    onClose={() => setShowDetailsPanel(false)}
                    onViewOrder={handleViewOrder}
                  />
                </div>
              )}

              {/* Customer Details Panel - Mobile */}
              {showDetailsOnMobile && currentRealContact && (
                <div className="w-full h-full animate-in slide-in-from-right duration-200">
                  <CustomerDetailsPanel
                    contact={currentRealContact as any}
                    onClose={() => setMobileView('chat')}
                    onViewOrder={handleViewOrder}
                  />
                </div>
              )}
            </>
          )}

          {/* === GROUPS TAB === */}
          {activeTab === 'groups' && (
            <>
              {/* Group List */}
              {showContactList && !showDetailsOnMobile && (
                <div className="w-full md:w-[360px] md:shrink-0">
                  <AdminGroupList
                    groups={groups}
                    loading={groupsLoading}
                    selectedGroupId={selectedGroup?.id || null}
                    onSelectGroup={handleSelectGroup}
                    onCreateGroup={() => setShowCreateGroupDialog(true)}
                  />
                </div>
              )}

              {/* Group Chat View */}
              {showChatView && selectedGroup && !showDetailsOnMobile && (
                <div 
                  className="flex-1 relative w-full md:w-auto touch-pan-y"
                  {...(isMobile ? swipeHandlers : {})}
                >
                  {isMobile && showSwipeIndicator && (
                    <div 
                      className="absolute left-0 top-0 bottom-0 w-12 flex items-center justify-center z-20 pointer-events-none"
                      style={{ opacity: swipeIndicatorOpacity }}
                    >
                      <div className="h-16 w-8 rounded-r-full bg-primary/20 flex items-center justify-center">
                        <ChevronLeft className="h-5 w-5 text-primary" />
                      </div>
                    </div>
                  )}
                  
                  <div
                    className={cn(
                      "h-full transition-transform",
                      !showSwipeIndicator && "duration-200"
                    )}
                    style={{ 
                      transform: isMobile ? `translateX(${translateX}px)` : undefined 
                    }}
                  >
                    <AdminGroupChatView
                      groupId={selectedGroup.id}
                      onBack={isMobile ? handleBackToList : undefined}
                    />
                  </div>
                </div>
              )}

              {/* Empty state for groups */}
              {!isMobile && !selectedGroup && (
                <div className="flex-1 h-full flex flex-col items-center justify-center bg-muted/30 px-6">
                  <div className="h-20 w-20 rounded-card bg-accent flex items-center justify-center mb-6">
                    <Users className="h-10 w-10 text-primary" />
                  </div>
                  <h2 className="text-xl font-semibold tracking-tight text-foreground mb-2">
                    Group Inbox
                  </h2>
                  <p className="text-muted-foreground text-center max-w-sm">
                    Select a group from the left or create a new one to start messaging.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Create Group Dialog */}
      <AdminCreateGroupDialog
        open={showCreateGroupDialog}
        onOpenChange={setShowCreateGroupDialog}
        instanceId={selectedInstanceId}
        onSuccess={handleCreateGroupSuccess}
      />
    </AdminLayout>
  );
}
