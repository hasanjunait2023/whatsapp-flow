-- Create fb_posts table for tracking page posts
CREATE TABLE public.fb_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    page_id UUID NOT NULL REFERENCES public.facebook_pages(id) ON DELETE CASCADE,
    fb_post_id TEXT NOT NULL,
    message TEXT,
    full_picture TEXT,
    permalink_url TEXT,
    post_type TEXT DEFAULT 'status',
    created_time TIMESTAMP WITH TIME ZONE,
    comment_count INTEGER DEFAULT 0,
    unread_comment_count INTEGER DEFAULT 0,
    last_comment_at TIMESTAMP WITH TIME ZONE,
    is_hidden BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(page_id, fb_post_id)
);

-- Create fb_post_comments table for tracking comments on posts
CREATE TABLE public.fb_post_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    page_id UUID NOT NULL REFERENCES public.facebook_pages(id) ON DELETE CASCADE,
    post_id UUID NOT NULL REFERENCES public.fb_posts(id) ON DELETE CASCADE,
    fb_comment_id TEXT NOT NULL,
    parent_comment_id UUID REFERENCES public.fb_post_comments(id),
    
    -- Commenter info
    commenter_fb_id TEXT NOT NULL,
    commenter_name TEXT,
    commenter_picture_url TEXT,
    
    -- Comment content
    message TEXT,
    attachment_url TEXT,
    attachment_type TEXT,
    
    -- Status
    is_from_page BOOLEAN DEFAULT false,
    is_hidden BOOLEAN DEFAULT false,
    is_read BOOLEAN DEFAULT false,
    like_count INTEGER DEFAULT 0,
    reply_count INTEGER DEFAULT 0,
    
    -- Link to Messenger contact (for DM feature)
    fb_contact_id UUID REFERENCES public.fb_contacts(id),
    
    -- Metadata
    sent_by_user_id UUID REFERENCES auth.users(id),
    created_time TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(fb_comment_id)
);

-- Create indexes for performance
CREATE INDEX idx_fb_posts_tenant_page ON fb_posts(tenant_id, page_id);
CREATE INDEX idx_fb_posts_last_comment ON fb_posts(page_id, last_comment_at DESC NULLS LAST);
CREATE INDEX idx_fb_posts_unread ON fb_posts(page_id, unread_comment_count) WHERE unread_comment_count > 0;
CREATE INDEX idx_fb_comments_post ON fb_post_comments(post_id, created_time);
CREATE INDEX idx_fb_comments_parent ON fb_post_comments(parent_comment_id) WHERE parent_comment_id IS NOT NULL;
CREATE INDEX idx_fb_comments_unread ON fb_post_comments(post_id, is_read) WHERE is_read = false;
CREATE INDEX idx_fb_comments_commenter ON fb_post_comments(commenter_fb_id);

-- Create trigger for updated_at on fb_posts
CREATE TRIGGER update_fb_posts_updated_at
    BEFORE UPDATE ON fb_posts
    FOR EACH ROW
    EXECUTE FUNCTION public.update_fb_updated_at();

-- Create trigger for updated_at on fb_post_comments
CREATE TRIGGER update_fb_post_comments_updated_at
    BEFORE UPDATE ON fb_post_comments
    FOR EACH ROW
    EXECUTE FUNCTION public.update_fb_updated_at();

-- Create function to update post comment counts
CREATE OR REPLACE FUNCTION public.update_post_comment_counts()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Increment comment count and update last_comment_at
        UPDATE fb_posts 
        SET comment_count = comment_count + 1,
            unread_comment_count = CASE WHEN NEW.is_from_page = false AND NEW.is_read = false THEN unread_comment_count + 1 ELSE unread_comment_count END,
            last_comment_at = GREATEST(last_comment_at, NEW.created_time)
        WHERE id = NEW.post_id;
        
        -- If this is a reply, increment parent's reply_count
        IF NEW.parent_comment_id IS NOT NULL THEN
            UPDATE fb_post_comments
            SET reply_count = reply_count + 1
            WHERE id = NEW.parent_comment_id;
        END IF;
    ELSIF TG_OP = 'UPDATE' THEN
        -- If is_read changed from false to true
        IF OLD.is_read = false AND NEW.is_read = true AND NEW.is_from_page = false THEN
            UPDATE fb_posts
            SET unread_comment_count = GREATEST(0, unread_comment_count - 1)
            WHERE id = NEW.post_id;
        END IF;
    ELSIF TG_OP = 'DELETE' THEN
        -- Decrement counts
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for comment counts
CREATE TRIGGER update_post_comment_counts_trigger
    AFTER INSERT OR UPDATE OR DELETE ON fb_post_comments
    FOR EACH ROW
    EXECUTE FUNCTION public.update_post_comment_counts();

-- Enable RLS
ALTER TABLE public.fb_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fb_post_comments ENABLE ROW LEVEL SECURITY;

-- RLS policies for fb_posts
CREATE POLICY "Users can view posts for their tenant" ON public.fb_posts
    FOR SELECT USING (tenant_id IN (SELECT get_user_tenant_ids()));

CREATE POLICY "Users can insert posts for their tenant" ON public.fb_posts
    FOR INSERT WITH CHECK (tenant_id IN (SELECT get_user_tenant_ids()));

CREATE POLICY "Users can update posts for their tenant" ON public.fb_posts
    FOR UPDATE USING (tenant_id IN (SELECT get_user_tenant_ids()));

CREATE POLICY "Users can delete posts for their tenant" ON public.fb_posts
    FOR DELETE USING (tenant_id IN (SELECT get_user_tenant_ids()));

-- RLS policies for fb_post_comments
CREATE POLICY "Users can view comments for their tenant" ON public.fb_post_comments
    FOR SELECT USING (tenant_id IN (SELECT get_user_tenant_ids()));

CREATE POLICY "Users can insert comments for their tenant" ON public.fb_post_comments
    FOR INSERT WITH CHECK (tenant_id IN (SELECT get_user_tenant_ids()));

CREATE POLICY "Users can update comments for their tenant" ON public.fb_post_comments
    FOR UPDATE USING (tenant_id IN (SELECT get_user_tenant_ids()));

CREATE POLICY "Users can delete comments for their tenant" ON public.fb_post_comments
    FOR DELETE USING (tenant_id IN (SELECT get_user_tenant_ids()));