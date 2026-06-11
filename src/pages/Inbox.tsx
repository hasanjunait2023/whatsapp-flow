import { useState, useCallback, useEffect, useMemo } from 'react';

import ContactList from '@/components/inbox/ContactList';
import ChatView from '@/components/inbox/ChatView';
import NewChatView from '@/components/inbox/NewChatView';
import InboxHeader from '@/components/inbox/InboxHeader';
import CustomerDetailsPanel from '@/components/inbox/CustomerDetailsPanel';
import { Contact, useContacts } from '@/hooks/useContacts';
import { NewChatContact, isNewChatContact } from '@/hooks/useNewChat';
import { MessageCircle, PanelRightOpen, PanelRightClose, ArrowLeft, ChevronLeft, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import { useSwipeNavigation } from '@/hooks/useSwipeNavigation';
import { cn } from '@/lib/utils';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useGroupInbox, GroupInboxItem } from '@/hooks/useGroupInbox';
import GroupList from '@/components/inbox/GroupList';
import GroupChatView from '@/components/inbox/GroupChatView';
import CreateGroupDialog from '@/components/groups/CreateGroupDialog';

type MobileView = 'list' | 'chat' | 'details' | 'group-list' | 'group-chat';
type InboxTab = 'chats' | 'groups';

export default function Inbox() {
  const [selectedContact, setSelectedContact] = useState<Contact | NewChatContact | null>(null);
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(null);
  const [showDetailsPanel, setShowDetailsPanel] = useState(() => {
    const saved = localStorage.getItem('inbox-details-panel');
    return saved !== 'false'; // Default to true
  });
  const [mobileView, setMobileView] = useState<MobileView>('list');
   const [activeTab, setActiveTab] = useState<InboxTab>('chats');
   const [selectedGroup, setSelectedGroup] = useState<GroupInboxItem | null>(null);
   const [showCreateGroup, setShowCreateGroup] = useState(false);
  const { contacts, markAsRead, requestHandoff, resolveHandoff, deleteContact } = useContacts();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
 
   // Group inbox hook
   const { groups, loading: groupsLoading, refetch: refetchGroups, markGroupAsRead } = useGroupInbox(selectedInstanceId);

  // Persist panel state
  useEffect(() => {
    localStorage.setItem('inbox-details-panel', String(showDetailsPanel));
  }, [showDetailsPanel]);

  // Update mobile view when contact is selected
  useEffect(() => {
    if (selectedContact && isMobile) {
      setMobileView('chat');
    }
  }, [selectedContact, isMobile]);

  const handleSelectContact = (contact: Contact | NewChatContact) => {
    setSelectedContact(contact);
    if (isMobile) {
      setMobileView('chat');
    }
  };

  const handleNewChatContactCreated = useCallback((contact: Contact) => {
    setSelectedContact(contact);
    // Refetch contacts to include the new one
    // This will happen automatically via useContacts
  }, []);
 
   const handleSelectGroup = (group: GroupInboxItem) => {
     setSelectedGroup(group);
     markGroupAsRead(group.id);
     if (isMobile) {
       setMobileView('group-chat');
     }
   };
 
   const handleBackFromGroupChat = useCallback(() => {
     if (isMobile) {
       setMobileView('group-list');
     }
   }, [isMobile]);
 
   const handleTabChange = (tab: string) => {
     setActiveTab(tab as InboxTab);
     if (isMobile) {
       setMobileView(tab === 'groups' ? 'group-list' : 'list');
     }
     // Clear selections when switching tabs
     if (tab === 'groups') {
       setSelectedContact(null);
     } else {
       setSelectedGroup(null);
     }
   };
 
   const handleGroupCreated = useCallback(() => {
     refetchGroups();
   }, [refetchGroups]);

  const handleBackToList = useCallback(() => {
    setMobileView('list');
  }, []);

  // Swipe navigation for going back from chat to list
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
    // Update selected contact state (only if it's a real contact)
    setSelectedContact((prev) => {
      if (!prev || isNewChatContact(prev)) return prev;
      return prev.id === id ? { ...prev, needs_handoff: true, handoff_reason: reason, handoff_at: new Date().toISOString() } : prev;
    });
  }, [requestHandoff]);

  const handleResolveHandoff = useCallback((id: string) => {
    resolveHandoff(id);
    // Update selected contact state (only if it's a real contact)
    setSelectedContact((prev) => {
      if (!prev || isNewChatContact(prev)) return prev;
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

  // Keep selected contact in sync with contacts list (only for real contacts)
  const currentContact = useMemo(() => {
    if (!selectedContact) return null;
    if (isNewChatContact(selectedContact)) return selectedContact;
    return contacts.find(c => c.id === selectedContact.id) || selectedContact;
  }, [selectedContact, contacts]);

  // Check if current selection is a new chat
  const isNewChat = currentContact && isNewChatContact(currentContact);
  const currentRealContact = currentContact && !isNewChatContact(currentContact) ? currentContact : null;

  // Filter contacts by selected instance
  const filteredContacts = selectedInstanceId
    ? contacts.filter(c => c.instance_id === selectedInstanceId)
    : contacts;

  // Determine what to show on mobile
  const showContactList = !isMobile || mobileView === 'list';
  const showChatView = !isMobile || mobileView === 'chat';
  const showDetailsOnMobile = isMobile && mobileView === 'details';
   const showGroupList = !isMobile || mobileView === 'group-list';
   const showGroupChatView = !isMobile || mobileView === 'group-chat';

  return (
    <>
      <div data-tour="inbox-area" className="flex flex-col h-[calc(100vh-0px)] md:h-[calc(100vh-0px)]">
        {/* Inbox Header with Instance Switcher and AI Toggle */}
        <InboxHeader
          selectedInstanceId={selectedInstanceId}
          onInstanceChange={setSelectedInstanceId}
        />

         {/* Tabs */}
         <div className="px-4 py-2 border-b border-border bg-background">
           <Tabs value={activeTab} onValueChange={handleTabChange}>
             <TabsList className="w-full max-w-[300px]">
               <TabsTrigger value="chats" className="flex-1 gap-2">
                 <MessageCircle className="h-4 w-4" />
                 চ্যাট
               </TabsTrigger>
               <TabsTrigger value="groups" className="flex-1 gap-2">
                 <Users className="h-4 w-4" />
                 গ্রুপ
               </TabsTrigger>
             </TabsList>
           </Tabs>
         </div>
 
        <div className="flex flex-1 overflow-hidden">
           {/* Contact List - Only show when chats tab is active */}
           {activeTab === 'chats' && showContactList && !showDetailsOnMobile && (
            <div className="w-full md:w-[360px] md:shrink-0">
              <ContactList
                selectedContact={currentContact}
                onSelectContact={handleSelectContact}
                instanceFilter={selectedInstanceId}
              />
            </div>
          )}

           {/* New Chat View - Show when new chat is selected */}
           {activeTab === 'chats' && showChatView && isNewChat && !showDetailsOnMobile && (
             <div 
               className="flex-1 relative w-full md:w-auto"
               {...(isMobile ? swipeHandlers : {})}
             >
               {/* Mobile Back Button */}
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
               <NewChatView
                 newContact={currentContact as NewChatContact}
                 onContactCreated={handleNewChatContactCreated}
               />
             </div>
           )}

           {/* Chat View - Only show when chats tab is active and real contact selected */}
           {activeTab === 'chats' && showChatView && currentRealContact && !showDetailsOnMobile && (
            <div 
              className="flex-1 relative w-full md:w-auto touch-pan-y"
              {...(isMobile ? swipeHandlers : {})}
            >
              {/* Swipe Back Indicator */}
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
              
              {/* Mobile Back Button */}
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
                <ChatView
                  contact={currentRealContact}
                  onMarkAsRead={handleMarkAsRead}
                  onRequestHandoff={handleRequestHandoff}
                  onResolveHandoff={handleResolveHandoff}
                  onDeleteContact={handleDeleteContact}
                />
              </div>
              
              {/* Panel Toggle Button - Desktop only for toggle, mobile for opening details */}
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
                  {showDetailsPanel ? 'Hide customer details' : 'Show customer details'}
                </TooltipContent>
              </Tooltip>
            </div>
          )}

           {/* Group List - Only show when groups tab is active */}
           {activeTab === 'groups' && showGroupList && !showDetailsOnMobile && (
             <div className="w-full md:w-[360px] md:shrink-0">
               <GroupList
                 groups={groups}
                 loading={groupsLoading}
                 selectedGroupId={selectedGroup?.id || null}
                 onSelectGroup={handleSelectGroup}
                 onCreateGroup={() => setShowCreateGroup(true)}
               />
             </div>
           )}
 
           {/* Group Chat View - Only show when groups tab is active */}
           {activeTab === 'groups' && showGroupChatView && selectedGroup && !showDetailsOnMobile && (
             <div className="flex-1 w-full md:w-auto">
               <GroupChatView
                 groupId={selectedGroup.id}
                 onBack={isMobile ? handleBackFromGroupChat : undefined}
                 instancePhoneNumber={selectedGroup.instance?.phone_number || undefined}
               />
             </div>
           )}
 
           {/* Empty state when no contact selected - Desktop only for chats tab */}
           {activeTab === 'chats' && !isMobile && !currentContact && (
            <div className="flex-1 h-full flex flex-col items-center justify-center bg-muted/30">
              <div className="h-20 w-20 rounded-full bg-brand/10 flex items-center justify-center mb-6">
                <MessageCircle className="h-10 w-10 text-brand" />
              </div>
              <h2 className="text-xl font-semibold text-foreground mb-2">
                WhatsCRM Inbox
              </h2>
              <p className="text-muted-foreground text-center max-w-sm">
                Select a conversation from the left to start chatting with your customers.
              </p>
            </div>
          )}

           {/* Empty state when no group selected - Desktop only for groups tab */}
           {activeTab === 'groups' && !isMobile && !selectedGroup && (
             <div className="flex-1 h-full flex flex-col items-center justify-center bg-muted/30">
               <div className="h-20 w-20 rounded-full bg-brand/10 flex items-center justify-center mb-6">
                 <Users className="h-10 w-10 text-brand" />
               </div>
               <h2 className="text-xl font-semibold text-foreground mb-2">
                 গ্রুপ ইনবক্স
               </h2>
               <p className="text-muted-foreground text-center max-w-sm">
                 বাম দিক থেকে একটি গ্রুপ সিলেক্ট করুন অথবা নতুন গ্রুপ তৈরি করুন।
               </p>
             </div>
           )}
 
           {/* Customer Details Panel - Desktop (only for chats, only for real contacts) */}
           {activeTab === 'chats' && !isMobile && currentRealContact && showDetailsPanel && (
            <div className="w-[380px] shrink-0 animate-in slide-in-from-right-5 duration-200">
              <CustomerDetailsPanel
                contact={currentRealContact}
                onClose={() => setShowDetailsPanel(false)}
                onViewOrder={handleViewOrder}
              />
            </div>
          )}

           {/* Customer Details Panel - Mobile (Full Screen, only for chats, only for real contacts) */}
           {activeTab === 'chats' && showDetailsOnMobile && currentRealContact && (
            <div className="w-full h-full animate-in slide-in-from-right duration-200">
              <CustomerDetailsPanel
                contact={currentRealContact}
                onClose={() => setMobileView('chat')}
                onViewOrder={handleViewOrder}
              />
            </div>
          )}
        </div>
      </div>
       
       {/* Create Group Dialog */}
       <CreateGroupDialog
         open={showCreateGroup}
         onOpenChange={setShowCreateGroup}
         onSuccess={handleGroupCreated}
       />
    </>
  );
}