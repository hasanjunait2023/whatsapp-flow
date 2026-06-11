-- Add user_id column to admin_notifications for targeted notifications
ALTER TABLE public.admin_notifications 
ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create index for faster queries
CREATE INDEX idx_admin_notifications_user_id ON public.admin_notifications(user_id);

-- Add RLS policy for users to see their own notifications
CREATE POLICY "Users can view their own admin notifications"
ON public.admin_notifications
FOR SELECT
USING (user_id = auth.uid() OR user_id IS NULL);

-- Add RLS policy for users to update their own notifications (mark as read)
CREATE POLICY "Users can update their own admin notifications"
ON public.admin_notifications
FOR UPDATE
USING (user_id = auth.uid() OR user_id IS NULL);

-- Add RLS policy for authenticated users to insert notifications
CREATE POLICY "Authenticated users can create admin notifications"
ON public.admin_notifications
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);