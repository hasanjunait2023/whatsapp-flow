import { MessageSquare, MessageSquareText } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export type FBInboxTab = 'messages' | 'comments';

interface FBInboxTabsProps {
  activeTab: FBInboxTab;
  onTabChange: (tab: FBInboxTab) => void;
  messagesUnread: number;
  commentsUnread: number;
  className?: string;
}

export function FBInboxTabs({
  activeTab,
  onTabChange,
  messagesUnread,
  commentsUnread,
  className,
}: FBInboxTabsProps) {
  return (
    <Tabs value={activeTab} onValueChange={(v) => onTabChange(v as FBInboxTab)} className={className}>
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="messages" className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          <span className="hidden sm:inline">Messages</span>
          {messagesUnread > 0 && (
            <Badge 
              variant="destructive" 
              className={cn(
                "h-5 min-w-5 px-1.5 text-xs font-medium",
                activeTab === 'messages' && "bg-primary/20 text-primary hover:bg-primary/30"
              )}
            >
              {messagesUnread > 99 ? '99+' : messagesUnread}
            </Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="comments" className="flex items-center gap-2">
          <MessageSquareText className="h-4 w-4" />
          <span className="hidden sm:inline">Comments</span>
          {commentsUnread > 0 && (
            <Badge 
              variant="destructive" 
              className={cn(
                "h-5 min-w-5 px-1.5 text-xs font-medium",
                activeTab === 'comments' && "bg-primary/20 text-primary hover:bg-primary/30"
              )}
            >
              {commentsUnread > 99 ? '99+' : commentsUnread}
            </Badge>
          )}
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
