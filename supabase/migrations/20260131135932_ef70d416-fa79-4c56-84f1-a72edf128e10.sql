-- Fix function search_path for update_post_comment_counts
CREATE OR REPLACE FUNCTION public.update_post_comment_counts()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE fb_posts 
        SET comment_count = comment_count + 1,
            unread_comment_count = CASE WHEN NEW.is_from_page = false AND NEW.is_read = false THEN unread_comment_count + 1 ELSE unread_comment_count END,
            last_comment_at = GREATEST(last_comment_at, NEW.created_time)
        WHERE id = NEW.post_id;
        
        IF NEW.parent_comment_id IS NOT NULL THEN
            UPDATE fb_post_comments
            SET reply_count = reply_count + 1
            WHERE id = NEW.parent_comment_id;
        END IF;
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.is_read = false AND NEW.is_read = true AND NEW.is_from_page = false THEN
            UPDATE fb_posts
            SET unread_comment_count = GREATEST(0, unread_comment_count - 1)
            WHERE id = NEW.post_id;
        END IF;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE fb_posts
        SET comment_count = GREATEST(0, comment_count - 1),
            unread_comment_count = CASE WHEN OLD.is_from_page = false AND OLD.is_read = false THEN GREATEST(0, unread_comment_count - 1) ELSE unread_comment_count END
        WHERE id = OLD.post_id;
        
        IF OLD.parent_comment_id IS NOT NULL THEN
            UPDATE fb_post_comments
            SET reply_count = GREATEST(0, reply_count - 1)
            WHERE id = OLD.parent_comment_id;
        END IF;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';