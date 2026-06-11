-- Add media_items column for multiple media support
ALTER TABLE quick_replies 
ADD COLUMN media_items JSONB DEFAULT '[]'::jsonb;

-- Add a comment explaining the structure
COMMENT ON COLUMN quick_replies.media_items IS 'Array of media items: [{type: "image"|"video"|"audio", url: string, filename: string, caption?: string}]';