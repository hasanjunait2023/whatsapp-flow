import { useState } from 'react';
import { linkifyText } from '@/lib/linkify';
import { formatDistanceToNow } from 'date-fns';
import { 
  Reply, 
  ThumbsUp, 
  EyeOff, 
  Trash2, 
  MessageSquare, 
  MoreHorizontal,
  Loader2,
  User
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { FBPostComment } from '@/hooks/useFBPostComments';

interface FBCommentBubbleProps {
  comment: FBPostComment;
  pageAccessToken?: string;
  onReply: (comment: FBPostComment) => void;
  onSendDM: (comment: FBPostComment) => void;
  onLike?: (comment: FBPostComment) => void;
  onHide?: (comment: FBPostComment) => void;
  onDelete?: (comment: FBPostComment) => void;
  onSelectCommenter?: (comment: FBPostComment) => void;
  isNested?: boolean;
  actionLoading?: string | null;
}

export function FBCommentBubble({
  comment,
  onReply,
  onSendDM,
  onLike,
  onHide,
  onDelete,
  onSelectCommenter,
  isNested = false,
  actionLoading,
}: FBCommentBubbleProps) {
  const [showReplies, setShowReplies] = useState(true);
  
  const timeAgo = comment.created_time
    ? formatDistanceToNow(new Date(comment.created_time), { addSuffix: true })
    : '';

  const initials = comment.commenter_name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || '?';

  const isFromPage = comment.is_from_page;
  const hasReplies = comment.replies && comment.replies.length > 0;

  return (
    <div className={cn("group", isNested && "ml-10 mt-2")}>
      <div className={cn(
        "flex gap-3",
        !comment.is_read && !isFromPage && "bg-blue-50/50 dark:bg-blue-950/20 -mx-3 px-3 py-2 rounded-lg"
      )}>
        {/* Avatar */}
        <Avatar 
          className={cn(
            "h-8 w-8 shrink-0 cursor-pointer hover:ring-2 ring-primary/50 transition-all",
            isNested && "h-7 w-7"
          )}
          onClick={() => !isFromPage && onSelectCommenter?.(comment)}
        >
          <AvatarImage src={comment.commenter_picture_url || undefined} />
          <AvatarFallback className={cn(
            "text-xs",
            isFromPage && "bg-primary text-primary-foreground"
          )}>
            {isFromPage ? '📄' : initials}
          </AvatarFallback>
        </Avatar>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className={cn(
            "rounded-2xl px-3 py-2",
            isFromPage 
              ? "bg-primary/10 border border-primary/20" 
              : "bg-muted"
          )}>
            <div className="flex items-center gap-2 mb-0.5">
              <span 
                className={cn(
                  "text-sm font-medium cursor-pointer hover:underline",
                  isFromPage && "text-primary"
                )}
                onClick={() => !isFromPage && onSelectCommenter?.(comment)}
              >
                {isFromPage ? 'Your Page' : comment.commenter_name || 'Facebook User'}
              </span>
              {comment.sent_by_user_id && (
                <span className="text-xs text-muted-foreground">(Team)</span>
              )}
            </div>
            <p className="text-sm whitespace-pre-wrap break-words">
              {comment.message 
                ? linkifyText(comment.message, 'text-primary hover:underline break-all')
                : '[No text]'}
            </p>
            
            {/* Attachment */}
            {comment.attachment_url && (
              <div className="mt-2">
                {comment.attachment_type === 'photo' || comment.attachment_type === 'sticker' ? (
                  <img 
                    src={comment.attachment_url} 
                    alt="Attachment" 
                    className="max-w-xs rounded-lg"
                  />
                ) : (
                  <a 
                    href={comment.attachment_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline"
                  >
                    View attachment
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 mt-1 px-1">
            <span className="text-xs text-muted-foreground">{timeAgo}</span>
            
            {!isFromPage && (
              <>
                <button
                  onClick={() => onLike?.(comment)}
                  className="text-xs text-muted-foreground hover:text-primary transition-colors"
                  disabled={actionLoading === 'like'}
                >
                  {actionLoading === 'like' ? (
                    <Loader2 className="h-3 w-3 animate-spin inline mr-1" />
                  ) : null}
                  Like
                </button>
                <button
                  onClick={() => onReply(comment)}
                  className="text-xs text-muted-foreground hover:text-primary transition-colors"
                >
                  Reply
                </button>
              </>
            )}

            {/* More actions dropdown */}
            {!isFromPage && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem onClick={() => onSendDM(comment)}>
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Send DM
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onSelectCommenter?.(comment)}>
                    <User className="h-4 w-4 mr-2" />
                    View Profile
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => onHide?.(comment)}
                    disabled={actionLoading === 'hide'}
                  >
                    <EyeOff className="h-4 w-4 mr-2" />
                    Hide Comment
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => onDelete?.(comment)}
                    className="text-destructive focus:text-destructive"
                    disabled={actionLoading === 'delete'}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Comment
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Like count */}
            {comment.like_count > 0 && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <ThumbsUp className="h-3 w-3" />
                {comment.like_count}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Nested replies */}
      {hasReplies && (
        <div className="mt-2">
          {comment.replies!.length > 2 && !showReplies && (
            <button
              onClick={() => setShowReplies(true)}
              className="text-xs text-primary hover:underline ml-11 flex items-center gap-1"
            >
              <Reply className="h-3 w-3" />
              View {comment.replies!.length} replies
            </button>
          )}
          
          {(showReplies || comment.replies!.length <= 2) && (
            comment.replies!.map((reply) => (
              <FBCommentBubble
                key={reply.id}
                comment={reply}
                onReply={onReply}
                onSendDM={onSendDM}
                onLike={onLike}
                onHide={onHide}
                onDelete={onDelete}
                onSelectCommenter={onSelectCommenter}
                isNested
                actionLoading={actionLoading}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}
