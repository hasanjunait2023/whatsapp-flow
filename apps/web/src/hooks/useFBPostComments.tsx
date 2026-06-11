import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from './useTenant';

export interface FBPostComment {
  id: string;
  tenant_id: string;
  page_id: string;
  post_id: string;
  fb_comment_id: string;
  parent_comment_id: string | null;
  commenter_fb_id: string;
  commenter_name: string | null;
  commenter_picture_url: string | null;
  message: string | null;
  attachment_url: string | null;
  attachment_type: string | null;
  is_from_page: boolean;
  is_hidden: boolean;
  is_read: boolean;
  like_count: number;
  reply_count: number;
  fb_contact_id: string | null;
  sent_by_user_id: string | null;
  created_time: string | null;
  created_at: string;
  updated_at: string;
  // Nested replies (populated in hook)
  replies?: FBPostComment[];
}

export function useFBPostComments(postId: string | null) {
  const { currentTenant } = useTenant();
  const [comments, setComments] = useState<FBPostComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchComments = useCallback(async () => {
    if (!currentTenant || !postId) {
      setComments([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const { data: commentsData, error: fetchError } = await supabase
        .from('fb_post_comments')
        .select('*')
        .eq('post_id', postId)
        .eq('is_hidden', false)
        .order('created_time', { ascending: true });

      if (fetchError) throw fetchError;

      setComments(commentsData as FBPostComment[]);
      setError(null);
    } catch (err) {
      console.error('Error fetching FB comments:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch comments'));
    } finally {
      setLoading(false);
    }
  }, [currentTenant, postId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  // Real-time subscription
  useEffect(() => {
    if (!currentTenant || !postId) return;

    const channel = supabase
      .channel(`fb_comments_${postId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'fb_post_comments',
          filter: `post_id=eq.${postId}`,
        },
        () => {
          fetchComments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentTenant, postId, fetchComments]);

  // Organize comments into threaded structure
  const threadedComments = useMemo(() => {
    const commentMap = new Map<string, FBPostComment>();
    const rootComments: FBPostComment[] = [];

    // First pass: create map of all comments
    for (const comment of comments) {
      commentMap.set(comment.id, { ...comment, replies: [] });
    }

    // Second pass: build tree structure
    for (const comment of comments) {
      const commentWithReplies = commentMap.get(comment.id)!;
      
      if (comment.parent_comment_id) {
        const parent = commentMap.get(comment.parent_comment_id);
        if (parent) {
          parent.replies = parent.replies || [];
          parent.replies.push(commentWithReplies);
        } else {
          // Parent not found, treat as root
          rootComments.push(commentWithReplies);
        }
      } else {
        rootComments.push(commentWithReplies);
      }
    }

    return rootComments;
  }, [comments]);

  // Mark comments as read
  const markAsRead = useCallback(async (commentIds?: string[]) => {
    if (!postId) return;

    const idsToMark = commentIds || comments.filter(c => !c.is_read && !c.is_from_page).map(c => c.id);
    
    if (idsToMark.length === 0) return;

    const { error } = await supabase
      .from('fb_post_comments')
      .update({ is_read: true })
      .in('id', idsToMark);

    if (error) {
      console.error('Failed to mark comments as read:', error);
    }
  }, [postId, comments]);

  // Get comment by FB ID
  const findByFBCommentId = useCallback((fbCommentId: string) => {
    return comments.find(c => c.fb_comment_id === fbCommentId);
  }, [comments]);

  return {
    comments,
    threadedComments,
    loading,
    error,
    refetch: fetchComments,
    markAsRead,
    findByFBCommentId,
  };
}
