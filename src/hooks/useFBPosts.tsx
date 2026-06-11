import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from './useTenant';

export interface FBPost {
  id: string;
  tenant_id: string;
  page_id: string;
  fb_post_id: string;
  message: string | null;
  full_picture: string | null;
  permalink_url: string | null;
  post_type: string;
  created_time: string | null;
  comment_count: number;
  unread_comment_count: number;
  last_comment_at: string | null;
  is_hidden: boolean;
  created_at: string;
  updated_at: string;
  // Joined data
  facebook_pages?: {
    page_name: string;
    profile_picture_url: string | null;
  };
  // Latest comment preview
  latest_comment?: {
    commenter_name: string | null;
    message: string | null;
  };
}

export function useFBPosts(pageId?: string | null) {
  const { currentTenant } = useTenant();
  const [posts, setPosts] = useState<FBPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchPosts = useCallback(async () => {
    if (!currentTenant) {
      setPosts([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      let query = supabase
        .from('fb_posts')
        .select(`
          *,
          facebook_pages (
            page_name,
            profile_picture_url
          )
        `)
        .eq('tenant_id', currentTenant.id)
        .eq('is_hidden', false)
        .order('last_comment_at', { ascending: false, nullsFirst: false });

      if (pageId) {
        query = query.eq('page_id', pageId);
      }

      const { data: postsData, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      // Fetch latest comment for each post
      const postIds = (postsData || []).map(p => p.id);
      let latestCommentsMap: Record<string, { commenter_name: string | null; message: string | null }> = {};

      if (postIds.length > 0) {
        const { data: commentsData } = await supabase
          .from('fb_post_comments')
          .select('post_id, commenter_name, message, created_time')
          .in('post_id', postIds)
          .eq('is_from_page', false)
          .order('created_time', { ascending: false });

        if (commentsData) {
          for (const comment of commentsData) {
            if (!latestCommentsMap[comment.post_id]) {
              latestCommentsMap[comment.post_id] = {
                commenter_name: comment.commenter_name,
                message: comment.message,
              };
            }
          }
        }
      }

      const enrichedPosts = (postsData || []).map(post => ({
        ...post,
        latest_comment: latestCommentsMap[post.id] || null,
      }));

      setPosts(enrichedPosts as FBPost[]);
      setError(null);
    } catch (err) {
      console.error('Error fetching FB posts:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch posts'));
    } finally {
      setLoading(false);
    }
  }, [currentTenant, pageId]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  // Real-time subscription
  useEffect(() => {
    if (!currentTenant) return;

    const channel = supabase
      .channel('fb_posts_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'fb_posts',
          filter: `tenant_id=eq.${currentTenant.id}`,
        },
        () => {
          fetchPosts();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'fb_post_comments',
          filter: `tenant_id=eq.${currentTenant.id}`,
        },
        () => {
          fetchPosts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentTenant, fetchPosts]);

  // Calculate total unread comments
  const totalUnreadComments = posts.reduce((sum, p) => sum + p.unread_comment_count, 0);

  return {
    posts,
    loading,
    error,
    refetch: fetchPosts,
    totalUnreadComments,
  };
}
