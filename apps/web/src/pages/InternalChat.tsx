import { useState, useEffect } from 'react';
import { MessagesSquare, ArrowLeft } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { ChatSidebar } from '@/components/internal-chat/ChatSidebar';
import { ChatRoomView } from '@/components/internal-chat/ChatRoomView';
import { useInternalChat } from '@/hooks/useInternalChat';
import { usePresence } from '@/hooks/usePresence';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';

type MobileView = 'sidebar' | 'chat';

export default function InternalChat() {
  const {
    rooms,
    currentRoom,
    setCurrentRoom,
    messages,
    loading,
    messagesLoading,
    error,
    sendMessage,
    createDirectChat,
    createGroupChat,
  } = useInternalChat();

  const isMobile = useIsMobile();
  const [mobileView, setMobileView] = useState<MobileView>('sidebar');

  // Initialize presence tracking
  usePresence();

  const handleCreateGroup = async (name: string, memberIds: string[]) => {
    try {
      const room = await createGroupChat(name, memberIds);
      if (room) {
        setCurrentRoom(room);
        if (isMobile) {
          setMobileView('chat');
        }
      }
    } catch (error) {
      console.error('Error creating group chat:', error);
      // Prevents unhandled rejection from crashing the app
    }
  };

  const handleSelectRoom = (room: typeof currentRoom) => {
    if (room) {
      setCurrentRoom(room as any);
      if (isMobile) {
        setMobileView('chat');
      }
    }
  };

  const handleLeaveGroup = async (roomId: string) => {
    // TODO: Implement leave group
    console.log('Leave group:', roomId);
  };

  // Update mobile view when room is selected
  useEffect(() => {
    if (currentRoom && isMobile) {
      setMobileView('chat');
    }
  }, [currentRoom, isMobile]);

  const handleBackToSidebar = () => {
    setMobileView('sidebar');
  };

  // Determine what to show on mobile
  const showSidebar = !isMobile || mobileView === 'sidebar';
  const showChatView = !isMobile || mobileView === 'chat';

  // Show error state
  if (error) {
    return (
      <DashboardLayout hideMobileNav>
        <div className="h-[calc(100vh-56px)] md:h-[calc(100vh-0px)] flex items-center justify-center bg-muted/30 px-6">
          <div className="max-w-sm text-center">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-card bg-destructive-soft">
              <MessagesSquare className="h-10 w-10 text-destructive" />
            </div>
            <h3 className="text-lg font-semibold tracking-tight text-foreground">Failed to load Team Chat</h3>
            <p className="mt-1 mb-4 text-sm text-muted-foreground">{error.message || 'An unexpected error occurred'}</p>
            <Button onClick={() => window.location.reload()}>
              Retry
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout hideMobileNav>
      <div className="h-[calc(100vh-56px)] md:h-[calc(100vh-0px)] flex">
        {/* Chat Sidebar */}
        {showSidebar && (
          <div className="w-full md:w-auto">
            <ChatSidebar
              rooms={rooms}
              currentRoomId={currentRoom?.id || null}
              onSelectRoom={handleSelectRoom}
              onCreateDirectChat={createDirectChat}
              onCreateGroupChat={handleCreateGroup}
              loading={loading}
            />
          </div>
        )}

        {/* Chat Room View */}
        {showChatView && currentRoom && (
          <div className="flex-1 relative">
            {/* Mobile Back Button */}
            {isMobile && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-4 left-4 h-9 w-9 z-10 md:hidden"
                onClick={handleBackToSidebar}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            
            <ChatRoomView
              room={currentRoom}
              messages={messages}
              loading={messagesLoading}
              onSendMessage={async (roomId, content, contentType, mediaUrl, mediaFilename, replyToId, mentions) => {
                await sendMessage(roomId, content, contentType, mediaUrl, mediaFilename, replyToId, mentions);
              }}
              onLeaveGroup={handleLeaveGroup}
            />
          </div>
        )}

        {/* Empty state - Desktop only */}
        {!isMobile && !currentRoom && (
          <div className="flex-1 flex flex-col items-center justify-center bg-muted/30 px-6">
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-card bg-accent">
              <MessagesSquare className="h-10 w-10 text-primary" />
            </div>
            <h3 className="text-xl font-semibold tracking-tight text-foreground mb-2">Welcome to Team Chat</h3>
            <p className="max-w-sm text-center text-muted-foreground">
              Select a conversation from the left or start a new one to message your team.
            </p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}