import { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { 
  ExternalLink, 
  MessageSquare, 
  Image, 
  Video, 
  Link as LinkIcon,
  FileText,
  Loader2
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { FBCommentBubble } from './FBCommentBubble';
import { FBCommentInput } from './FBCommentInput';
import { useFBPostComments, type FBPostComment } from '@/hooks/useFBPostComments';
import { useFBReplyComment } from '@/hooks/useFBReplyComment';
import type { FBPost } from '@/hooks/useFBPosts';

interface FBCommentThreadViewProps {
  post: FBPost;
  onSendDM: (comment: FBPostComment) => void;
  onSelectCommenter: (comment: FBPostComment) => void;
}

const postTypeIcons: Record<string, React.ReactNode> = {
  photo: <Image className="h-5 w-5 text-blue-500" />,
  video: <Video className="h-5 w-5 text-purple-500" />,
  link: <LinkIcon className="h-5 w-5 text-green-500" />,
  status: <FileText className="h-5 w-5 text-muted-foreground" />,
};

export function FBCommentThreadView({ 
  post, 
  onSendDM, 
  onSelectCommenter 
}: FBCommentThreadViewProps) {
  const [replyingTo, setReplyingTo] = useState<FBPostComment | null>(null);
  
  const { 
    threadedComments, 
    loading, 
    markAsRead 
  } = useFBPostComments(post.id);
  
  const { 
    replyToComment, 
    likeComment, 
    hideComment, 
    deleteComment,
    sending, 
    actionLoading 
  } = useFBReplyComment();

  // Mark comments as read when viewing
  useEffect(() => {
    if (post.unread_comment_count > 0) {
      markAsRead();
    }
  }, [post.id, post.unread_comment_count, markAsRead]);

  const handleReply = (comment: FBPostComment) => {
    setReplyingTo(comment);
  };

  const handleSendReply = async (message: string) => {
    if (!replyingTo) return;
    
    await replyToComment({
      commentId: replyingTo.id,
      message,
    });
    
    setReplyingTo(null);
  };

  const handleLike = async (_comment: FBPostComment) => {
    // TODO: Implement like via page access token
  };

  const handleHide = async (_comment: FBPostComment) => {
    // TODO: Implement hide
  };

  const handleDelete = async (_comment: FBPostComment) => {
    // TODO: Implement delete
  };

  const postTime = post.created_time
    ? formatDistanceToNow(new Date(post.created_time), { addSuffix: true })
    : '';

  return (
    <div className="flex flex-col h-full">
      {/* Post Preview Header */}
      <div className="p-4 border-b border-border bg-muted/30">
        <div className="flex items-start gap-3">
          {/* Post image */}
          {post.full_picture ? (
            <img 
              src={post.full_picture} 
              alt="Post" 
              className="w-20 h-20 rounded-lg object-cover shrink-0"
            />
          ) : (
            <div className="w-20 h-20 rounded-lg bg-muted flex items-center justify-center shrink-0">
              {postTypeIcons[post.post_type] || <FileText className="h-8 w-8" />}
            </div>
          )}

          {/* Post content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-medium">
                {post.facebook_pages?.page_name || 'Your Page'}
              </span>
              <span className="text-xs text-muted-foreground">{postTime}</span>
            </div>
            <p className="text-sm line-clamp-2 mb-2">
              {post.message || '[No text]'}
            </p>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <MessageSquare className="h-3.5 w-3.5" />
                {post.comment_count} comments
              </span>
              {post.permalink_url && (
                <a
                  href={post.permalink_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 hover:text-primary transition-colors"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  View on Facebook
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      <Separator />

      {/* Comments List */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : threadedComments.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No comments yet</p>
            </div>
          ) : (
            threadedComments.map((comment) => (
              <FBCommentBubble
                key={comment.id}
                comment={comment}
                onReply={handleReply}
                onSendDM={onSendDM}
                onLike={handleLike}
                onHide={handleHide}
                onDelete={handleDelete}
                onSelectCommenter={onSelectCommenter}
                actionLoading={actionLoading}
              />
            ))
          )}
        </div>
      </ScrollArea>

      {/* Reply Input */}
      <FBCommentInput
        replyingTo={replyingTo}
        onCancelReply={() => setReplyingTo(null)}
        onSend={handleSendReply}
        sending={sending}
        placeholder={replyingTo ? `Reply to ${replyingTo.commenter_name || 'this comment'}...` : 'Write a comment...'}
      />
    </div>
  );
}
