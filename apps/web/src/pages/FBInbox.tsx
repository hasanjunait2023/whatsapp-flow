import { useState, useEffect } from 'react';
import { FBContact, useFBContacts } from '@/hooks/useFBContacts';
import { useFacebookPages } from '@/hooks/useFacebookPages';
import { useFBPosts, type FBPost } from '@/hooks/useFBPosts';
import { useIsMobile } from '@/hooks/use-mobile';
import DashboardLayout from '@/components/layout/DashboardLayout';
import FBContactList from '@/components/fb-inbox/FBContactList';
import FBChatView from '@/components/fb-inbox/FBChatView';
import FBCustomerDetailsPanel from '@/components/fb-inbox/FBCustomerDetailsPanel';
import { FBInboxTabs, type FBInboxTab } from '@/components/fb-inbox/FBInboxTabs';
import { FBPostList } from '@/components/fb-inbox/FBPostList';
import { FBCommentThreadView } from '@/components/fb-inbox/FBCommentThreadView';
import { FBCommentDMDialog } from '@/components/fb-inbox/FBCommentDMDialog';
import { FBCommenterDetailsPanel } from '@/components/fb-inbox/FBCommenterDetailsPanel';
import { Button } from '@/components/ui/button';
import { MessageSquare, MessageSquareText, Plus, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { FBPostComment } from '@/hooks/useFBPostComments';

const DETAILS_PANEL_KEY = 'fb-inbox-details-panel';
const ACTIVE_TAB_KEY = 'fb-inbox-active-tab';

export default function FBInbox() {
  // Messages tab state
  const [selectedContact, setSelectedContact] = useState<FBContact | null>(null);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [showDetailsPanel, setShowDetailsPanel] = useState(() => {
    const saved = localStorage.getItem(DETAILS_PANEL_KEY);
    return saved !== 'false';
  });

  // Tab state
  const [activeTab, setActiveTab] = useState<FBInboxTab>(() => {
    const saved = localStorage.getItem(ACTIVE_TAB_KEY);
    return (saved === 'comments' ? 'comments' : 'messages') as FBInboxTab;
  });

  // Comments tab state
  const [selectedPost, setSelectedPost] = useState<FBPost | null>(null);
  const [selectedCommenter, setSelectedCommenter] = useState<FBPostComment | null>(null);
  const [dmDialogOpen, setDmDialogOpen] = useState(false);
  const [dmComment, setDmComment] = useState<FBPostComment | null>(null);

  const isMobile = useIsMobile();
  const { pages, loading: pagesLoading } = useFacebookPages();
  const { markAsRead, unreadCount } = useFBContacts(selectedPageId);
  const { posts, loading: postsLoading, totalUnreadComments } = useFBPosts(selectedPageId);

  // Persist panel and tab state
  useEffect(() => {
    localStorage.setItem(DETAILS_PANEL_KEY, String(showDetailsPanel));
  }, [showDetailsPanel]);

  useEffect(() => {
    localStorage.setItem(ACTIVE_TAB_KEY, activeTab);
  }, [activeTab]);

  const handleSelectContact = (contact: FBContact) => {
    setSelectedContact(contact);
  };

  const handleMarkAsRead = async (contactId: string) => {
    try {
      await markAsRead(contactId);
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const handleToggleDetails = () => {
    setShowDetailsPanel(prev => !prev);
  };

  const handleSelectPost = (post: FBPost) => {
    setSelectedPost(post);
    setSelectedCommenter(null);
  };

  const handleSendDM = (comment: FBPostComment) => {
    setDmComment(comment);
    setDmDialogOpen(true);
  };

  const handleSelectCommenter = (comment: FBPostComment) => {
    setSelectedCommenter(comment);
  };

  const handleDMSent = (contactId: string) => {
    // Switch to messages tab and select the contact
    setActiveTab('messages');
    setDmDialogOpen(false);
    
    // Find the contact by ID and select it
    // The contact list will refresh and we can select it
    // For now, we'll let the user see it in the list
  };

  const hasPages = pages.length > 0;

  return (
    <DashboardLayout hideMobileNav>
      <div className="flex h-[calc(100vh-4rem)] md:h-screen overflow-hidden bg-background">
        {/* Left Panel - Contact/Post List */}
        <div className={`w-full md:w-80 lg:w-96 shrink-0 flex flex-col border-r border-border bg-card ${
          (selectedContact || selectedPost) && isMobile ? 'hidden' : ''
        }`}>
          {/* Tabs */}
          <div className="p-3 border-b border-border">
            <FBInboxTabs
              activeTab={activeTab}
              onTabChange={setActiveTab}
              messagesUnread={unreadCount}
              commentsUnread={totalUnreadComments}
            />
          </div>

          {/* Tab Content */}
          {activeTab === 'messages' ? (
            <FBContactList
              selectedContact={selectedContact}
              onSelectContact={handleSelectContact}
              selectedPageId={selectedPageId}
              onPageChange={setSelectedPageId}
            />
          ) : (
            <FBPostList
              posts={posts}
              loading={postsLoading}
              selectedPostId={selectedPost?.id || null}
              onSelectPost={handleSelectPost}
            />
          )}
        </div>

        {/* Center Panel - Chat/Comment View */}
        <div className="hidden md:flex flex-1 flex-col min-w-0">
          {activeTab === 'messages' ? (
            selectedContact ? (
              <FBChatView
                contact={selectedContact}
                onMarkAsRead={handleMarkAsRead}
                onToggleDetails={handleToggleDetails}
                showDetailsPanel={showDetailsPanel}
              />
            ) : (
              <EmptyState hasPages={hasPages} pagesLoading={pagesLoading} type="messages" />
            )
          ) : (
            selectedPost ? (
              <FBCommentThreadView
                post={selectedPost}
                onSendDM={handleSendDM}
                onSelectCommenter={handleSelectCommenter}
              />
            ) : (
              <EmptyState hasPages={hasPages} pagesLoading={pagesLoading} type="comments" />
            )
          )}
        </div>

        {/* Right Panel - Details */}
        {showDetailsPanel && !isMobile && (
          <div className="hidden lg:flex w-[380px] shrink-0">
            {activeTab === 'messages' && selectedContact ? (
              <FBCustomerDetailsPanel
                contact={selectedContact}
                onClose={() => setShowDetailsPanel(false)}
              />
            ) : activeTab === 'comments' && selectedPost ? (
              <FBCommenterDetailsPanel
                comment={selectedCommenter}
                pageId={selectedPost.page_id}
                onClose={() => setSelectedCommenter(null)}
                onStartDM={handleSendDM}
              />
            ) : null}
          </div>
        )}

        {/* Mobile: Full screen chat when contact selected */}
        {selectedContact && isMobile && activeTab === 'messages' && (
          <div className="fixed inset-0 z-50 bg-background md:hidden">
            <div className="h-full flex flex-col">
              <div className="p-2 border-b border-border bg-card flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="min-h-[44px]"
                  onClick={() => setSelectedContact(null)}
                >
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Back
                </Button>
              </div>
              <div className="flex-1 min-h-0">
                <FBChatView
                  contact={selectedContact}
                  onMarkAsRead={handleMarkAsRead}
                  onToggleDetails={handleToggleDetails}
                  showDetailsPanel={showDetailsPanel}
                />
              </div>
            </div>
          </div>
        )}

        {/* Mobile: Full screen comment thread when post selected */}
        {selectedPost && isMobile && activeTab === 'comments' && (
          <div className="fixed inset-0 z-50 bg-background md:hidden">
            <div className="h-full flex flex-col">
              <div className="p-2 border-b border-border bg-card flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="min-h-[44px]"
                  onClick={() => setSelectedPost(null)}
                >
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Back
                </Button>
              </div>
              <div className="flex-1 min-h-0">
                <FBCommentThreadView
                  post={selectedPost}
                  onSendDM={handleSendDM}
                  onSelectCommenter={handleSelectCommenter}
                />
              </div>
            </div>
          </div>
        )}

        {/* Mobile: Customer Details Panel as overlay */}
        {selectedContact && showDetailsPanel && isMobile && activeTab === 'messages' && (
          <div className="fixed inset-0 z-[60] bg-background md:hidden">
            <FBCustomerDetailsPanel
              contact={selectedContact}
              onClose={() => setShowDetailsPanel(false)}
            />
          </div>
        )}

        {/* DM Dialog */}
        {dmComment && (
          <FBCommentDMDialog
            isOpen={dmDialogOpen}
            onClose={() => {
              setDmDialogOpen(false);
              setDmComment(null);
            }}
            commenter={{
              fb_id: dmComment.commenter_fb_id,
              name: dmComment.commenter_name,
              picture_url: dmComment.commenter_picture_url,
            }}
            comment={{
              id: dmComment.id,
              message: dmComment.message,
            }}
            pageId={selectedPost?.page_id || ''}
            onDMSent={handleDMSent}
          />
        )}
      </div>
    </DashboardLayout>
  );
}

// Empty state component
function EmptyState({
  hasPages,
  pagesLoading,
  type
}: {
  hasPages: boolean;
  pagesLoading: boolean;
  type: 'messages' | 'comments';
}) {
  const Icon = type === 'messages' ? MessageSquare : MessageSquareText;
  return (
    <div className="flex flex-col items-center justify-center h-full bg-muted/30 px-6 text-center">
      <div
        className="mb-6 flex h-20 w-20 items-center justify-center rounded-card"
        style={{ backgroundColor: 'hsl(var(--facebook) / 0.12)' }}
      >
        <Icon className="h-10 w-10" style={{ color: 'hsl(var(--facebook))' }} />
      </div>
      <h3 className="mb-2 text-xl font-semibold tracking-tight text-foreground">
        {type === 'messages' ? 'Facebook Messenger Inbox' : 'Facebook Comments'}
      </h3>

      {!hasPages && !pagesLoading ? (
        <>
          <p className="mb-5 max-w-sm text-sm text-muted-foreground">
            Connect your Facebook Page to start receiving and replying to
            {type === 'messages' ? ' Messenger conversations' : ' post comments'}.
          </p>
          <Link to="/settings">
            <Button className="min-h-[44px]">
              <Plus className="h-4 w-4 mr-2" />
              Connect Facebook Page
            </Button>
          </Link>
        </>
      ) : (
        <p className="max-w-sm text-sm text-muted-foreground">
          {type === 'messages'
            ? 'Select a conversation from the left panel to start chatting with your customers.'
            : 'Select a post from the left panel to view and reply to comments.'}
        </p>
      )}
    </div>
  );
}
