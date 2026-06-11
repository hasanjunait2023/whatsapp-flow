import { formatDistanceToNow } from 'date-fns';
import { Image, MessageSquare, FileText, Video, Link } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { FBPost } from '@/hooks/useFBPosts';

interface FBPostItemProps {
  post: FBPost;
  isSelected: boolean;
  onClick: () => void;
}

const postTypeIcons: Record<string, React.ReactNode> = {
  photo: <Image className="h-4 w-4 text-blue-500" />,
  video: <Video className="h-4 w-4 text-purple-500" />,
  link: <Link className="h-4 w-4 text-green-500" />,
  status: <FileText className="h-4 w-4 text-muted-foreground" />,
};

export function FBPostItem({ post, isSelected, onClick }: FBPostItemProps) {
  const timeAgo = post.last_comment_at
    ? formatDistanceToNow(new Date(post.last_comment_at), { addSuffix: false })
    : post.created_time
    ? formatDistanceToNow(new Date(post.created_time), { addSuffix: false })
    : '';

  const postPreview = post.message?.slice(0, 60) || '[No text]';
  const hasUnread = post.unread_comment_count > 0;

  return (
    <div
      onClick={onClick}
      className={cn(
        "flex items-start gap-3 p-3 cursor-pointer transition-colors border-b border-border/50",
        isSelected 
          ? "bg-accent" 
          : hasUnread 
            ? "bg-blue-50/50 dark:bg-blue-950/20 hover:bg-accent/80" 
            : "hover:bg-accent/50"
      )}
    >
      {/* Post thumbnail or icon */}
      <div className="relative shrink-0">
        {post.full_picture ? (
          <Avatar className="h-12 w-12 rounded-lg">
            <AvatarImage src={post.full_picture} alt="Post" className="object-cover" />
            <AvatarFallback className="rounded-lg bg-muted">
              {postTypeIcons[post.post_type] || <FileText className="h-5 w-5" />}
            </AvatarFallback>
          </Avatar>
        ) : (
          <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center">
            {postTypeIcons[post.post_type] || <FileText className="h-5 w-5" />}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 overflow-hidden">
        <div className="flex items-start justify-between gap-2">
          <p className={cn(
            "text-sm line-clamp-2",
            hasUnread ? "font-medium" : "text-foreground"
          )}>
            {postPreview}
          </p>
          <span className="text-xs text-muted-foreground shrink-0">{timeAgo}</span>
        </div>

        {/* Comment preview */}
        <div className="flex items-center gap-2 mt-1.5">
          <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
          {post.latest_comment ? (
            <p className="text-xs text-muted-foreground truncate">
              <span className="font-medium text-foreground/80">
                {post.latest_comment.commenter_name || 'Someone'}
              </span>
              : {post.latest_comment.message?.slice(0, 40) || '[attachment]'}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              {post.comment_count} comments
            </p>
          )}
        </div>

        {/* Unread badge */}
        {hasUnread && (
          <Badge 
            variant="destructive" 
            className="mt-1.5 h-5 text-xs"
          >
            {post.unread_comment_count} unread
          </Badge>
        )}
      </div>
    </div>
  );
}
