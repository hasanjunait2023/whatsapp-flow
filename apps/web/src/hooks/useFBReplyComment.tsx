import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ReplyCommentParams {
  commentId: string;
  message: string;
  attachmentUrl?: string;
}

interface CommentActionParams {
  commentId: string;
  fbCommentId: string;
  pageAccessToken: string;
}

export function useFBReplyComment() {
  const [sending, setSending] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const replyToComment = async ({ commentId, message, attachmentUrl }: ReplyCommentParams) => {
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('fb-reply-comment', {
        body: {
          comment_id: commentId,
          message,
          attachment_url: attachmentUrl,
        },
      });

      if (error) throw error;

      if (data.error) {
        throw new Error(data.error);
      }

      toast.success('Reply sent successfully');
      return data;
    } catch (err) {
      console.error('Failed to reply to comment:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to send reply');
      throw err;
    } finally {
      setSending(false);
    }
  };

  const likeComment = async ({ fbCommentId, pageAccessToken }: CommentActionParams) => {
    setActionLoading('like');
    try {
      const response = await fetch(
        `https://graph.facebook.com/v18.0/${fbCommentId}/likes?access_token=${pageAccessToken}`,
        { method: 'POST' }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to like comment');
      }

      toast.success('Comment liked');
    } catch (err) {
      console.error('Failed to like comment:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to like comment');
      throw err;
    } finally {
      setActionLoading(null);
    }
  };

  const hideComment = async ({ commentId, fbCommentId, pageAccessToken }: CommentActionParams) => {
    setActionLoading('hide');
    try {
      const response = await fetch(
        `https://graph.facebook.com/v18.0/${fbCommentId}?is_hidden=true&access_token=${pageAccessToken}`,
        { method: 'POST' }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to hide comment');
      }

      // Update local database
      await supabase
        .from('fb_post_comments')
        .update({ is_hidden: true })
        .eq('id', commentId);

      toast.success('Comment hidden');
    } catch (err) {
      console.error('Failed to hide comment:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to hide comment');
      throw err;
    } finally {
      setActionLoading(null);
    }
  };

  const deleteComment = async ({ commentId, fbCommentId, pageAccessToken }: CommentActionParams) => {
    setActionLoading('delete');
    try {
      const response = await fetch(
        `https://graph.facebook.com/v18.0/${fbCommentId}?access_token=${pageAccessToken}`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to delete comment');
      }

      // Delete from local database
      await supabase
        .from('fb_post_comments')
        .delete()
        .eq('id', commentId);

      toast.success('Comment deleted');
    } catch (err) {
      console.error('Failed to delete comment:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to delete comment');
      throw err;
    } finally {
      setActionLoading(null);
    }
  };

  return {
    replyToComment,
    likeComment,
    hideComment,
    deleteComment,
    sending,
    actionLoading,
  };
}
