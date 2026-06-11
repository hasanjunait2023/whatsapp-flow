-- Add multimedia support columns to quick_replies table
ALTER TABLE quick_replies
ADD COLUMN content_type TEXT DEFAULT 'text',
ADD COLUMN media_url TEXT,
ADD COLUMN media_filename TEXT;

-- Add check constraint for valid content types
ALTER TABLE quick_replies
ADD CONSTRAINT quick_replies_content_type_check
CHECK (content_type IN ('text', 'image', 'video', 'audio', 'mixed'));

-- Add comment for documentation
COMMENT ON COLUMN quick_replies.content_type IS 'Type of content: text, image, video, audio, or mixed (text + media)';
COMMENT ON COLUMN quick_replies.media_url IS 'URL to uploaded media in Supabase Storage';
COMMENT ON COLUMN quick_replies.media_filename IS 'Original filename for display purposes';