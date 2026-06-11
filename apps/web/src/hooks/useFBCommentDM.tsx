import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useTenant } from './useTenant';

interface SendDMParams {
  commenterFbId: string;
  commenterName: string;
  commenterPictureUrl?: string | null;
  pageId: string;
  message: string;
  alsoReplyPublicly?: boolean;
  commentId?: string;
}

interface FBContact {
  id: string;
  psid: string;
  name: string | null;
}

export function useFBCommentDM() {
  const { currentTenant } = useTenant();
  const [sending, setSending] = useState(false);

  // Find or create FB contact from commenter
  const findOrCreateContact = async (
    commenterFbId: string,
    commenterName: string,
    commenterPictureUrl: string | null | undefined,
    pageId: string
  ): Promise<FBContact | null> => {
    if (!currentTenant) return null;

    try {
      // First, check if contact already exists with this FB ID
      // Note: For comments, the commenter_fb_id is different from Messenger PSID
      // We need to check fb_contacts by checking if any fb_post_comments link exists
      const { data: existingComment } = await supabase
        .from('fb_post_comments')
        .select('fb_contact_id')
        .eq('commenter_fb_id', commenterFbId)
        .eq('page_id', pageId)
        .not('fb_contact_id', 'is', null)
        .limit(1)
        .single();

      if (existingComment?.fb_contact_id) {
        // Fetch the contact
        const { data: contact } = await supabase
          .from('fb_contacts')
          .select('id, psid, name')
          .eq('id', existingComment.fb_contact_id)
          .single();

        if (contact) {
          return contact as FBContact;
        }
      }

      // Create new contact
      // Note: Using commenterFbId as PSID - in real scenario, 
      // Facebook might use different IDs for comments vs Messenger
      const { data: newContact, error: createError } = await supabase
        .from('fb_contacts')
        .insert({
          tenant_id: currentTenant.id,
          page_id: pageId,
          psid: commenterFbId,
          name: commenterName,
          profile_pic_url: commenterPictureUrl,
        })
        .select('id, psid, name')
        .single();

      if (createError) {
        // Handle unique constraint violation - contact might exist with this PSID
        if (createError.code === '23505') {
          const { data: existingContact } = await supabase
            .from('fb_contacts')
            .select('id, psid, name')
            .eq('page_id', pageId)
            .eq('psid', commenterFbId)
            .single();

          if (existingContact) {
            return existingContact as FBContact;
          }
        }
        throw createError;
      }

      // Update any comments from this commenter to link to the new contact
      await supabase
        .from('fb_post_comments')
        .update({ fb_contact_id: newContact.id })
        .eq('commenter_fb_id', commenterFbId)
        .eq('page_id', pageId);

      return newContact as FBContact;
    } catch (err) {
      console.error('Error finding/creating contact:', err);
      return null;
    }
  };

  // Send DM to commenter
  const sendDM = async ({
    commenterFbId,
    commenterName,
    commenterPictureUrl,
    pageId,
    message,
    alsoReplyPublicly,
    commentId,
  }: SendDMParams): Promise<FBContact | null> => {
    if (!currentTenant) {
      toast.error('No tenant selected');
      return null;
    }

    setSending(true);
    try {
      // 1. Find or create contact
      const contact = await findOrCreateContact(
        commenterFbId,
        commenterName,
        commenterPictureUrl,
        pageId
      );

      if (!contact) {
        throw new Error('Failed to create contact');
      }

      // 2. Send Messenger message
      const { data: sendResult, error: sendError } = await supabase.functions.invoke('fb-send-message', {
        body: {
          contact_id: contact.id,
          content: message,
        },
      });

      if (sendError) throw sendError;

      if (sendResult.error) {
        throw new Error(sendResult.error);
      }

      // 3. Optionally reply to comment publicly
      if (alsoReplyPublicly && commentId) {
        try {
          await supabase.functions.invoke('fb-reply-comment', {
            body: {
              comment_id: commentId,
              message,
            },
          });
        } catch (replyErr) {
          console.error('Failed to reply publicly:', replyErr);
          // Don't fail the whole operation if public reply fails
          toast.warning('DM sent, but public reply failed');
        }
      }

      toast.success('Message sent');
      return contact;
    } catch (err) {
      console.error('Failed to send DM:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to send message');
      return null;
    } finally {
      setSending(false);
    }
  };

  return {
    sendDM,
    findOrCreateContact,
    sending,
  };
}
