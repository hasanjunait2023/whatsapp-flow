import { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { 
  X, 
  MessageSquare, 
  ExternalLink, 
  Ban, 
  History,
  Loader2,
  User
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import type { FBPostComment } from '@/hooks/useFBPostComments';

interface FBCommenterDetailsPanelProps {
  comment: FBPostComment | null;
  pageId: string;
  onClose: () => void;
  onStartDM: (comment: FBPostComment) => void;
}

interface CommentHistoryItem {
  id: string;
  message: string | null;
  created_time: string | null;
  post_message: string | null;
}

export function FBCommenterDetailsPanel({
  comment,
  pageId,
  onClose,
  onStartDM,
}: FBCommenterDetailsPanelProps) {
  const [commentHistory, setCommentHistory] = useState<CommentHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch commenter's comment history
  useEffect(() => {
    if (!comment?.commenter_fb_id) {
      setCommentHistory([]);
      return;
    }

    const fetchHistory = async () => {
      setLoading(true);
      try {
        const { data } = await supabase
          .from('fb_post_comments')
          .select(`
            id,
            message,
            created_time,
            fb_posts (
              message
            )
          `)
          .eq('commenter_fb_id', comment.commenter_fb_id)
          .eq('page_id', pageId)
          .eq('is_from_page', false)
          .order('created_time', { ascending: false })
          .limit(20);

        if (data) {
          setCommentHistory(data.map(item => ({
            id: item.id,
            message: item.message,
            created_time: item.created_time,
            post_message: (item.fb_posts as any)?.message || null,
          })));
        }
      } catch (err) {
        console.error('Error fetching comment history:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [comment?.commenter_fb_id, pageId]);

  if (!comment) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground p-4">
        <div className="text-center">
          <User className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm">Select a commenter to view details</p>
        </div>
      </div>
    );
  }

  const initials = comment.commenter_name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || '?';

  return (
    <div className="h-full flex flex-col border-l border-border bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h3 className="font-semibold">Commenter Details</h3>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Profile */}
          <div className="text-center">
            <Avatar className="h-20 w-20 mx-auto mb-3">
              <AvatarImage src={comment.commenter_picture_url || undefined} />
              <AvatarFallback className="text-xl">{initials}</AvatarFallback>
            </Avatar>
            <h4 className="font-semibold text-lg">
              {comment.commenter_name || 'Facebook User'}
            </h4>
            <p className="text-sm text-muted-foreground">Facebook User</p>
          </div>

          {/* Actions */}
          <div className="space-y-2">
            <Button 
              className="w-full" 
              onClick={() => onStartDM(comment)}
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Start Messenger Chat
            </Button>
            
            <Button variant="outline" className="w-full" asChild>
              <a
                href={`https://facebook.com/${comment.commenter_fb_id}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                View Facebook Profile
              </a>
            </Button>
          </div>

          <Separator />

          {/* Comment History */}
          <div>
            <h5 className="font-medium text-sm flex items-center gap-2 mb-3">
              <History className="h-4 w-4" />
              Comment History ({commentHistory.length})
            </h5>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : commentHistory.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No comments found
              </p>
            ) : (
              <div className="space-y-3">
                {commentHistory.map((item) => (
                  <div 
                    key={item.id} 
                    className="p-3 bg-muted rounded-lg text-sm space-y-1"
                  >
                    <p className="font-medium line-clamp-2">
                      "{item.message || '[No text]'}"
                    </p>
                    {item.post_message && (
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        On: {item.post_message}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {item.created_time 
                        ? formatDistanceToNow(new Date(item.created_time), { addSuffix: true })
                        : 'Unknown time'}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Separator />

          {/* Block option */}
          <Button variant="ghost" className="w-full text-destructive hover:text-destructive">
            <Ban className="h-4 w-4 mr-2" />
            Block User
          </Button>
        </div>
      </ScrollArea>
    </div>
  );
}
