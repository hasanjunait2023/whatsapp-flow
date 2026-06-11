import { useState } from 'react';
import { MessageSquare, Send, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useFBCommentDM } from '@/hooks/useFBCommentDM';

interface FBCommentDMDialogProps {
  isOpen: boolean;
  onClose: () => void;
  commenter: {
    fb_id: string;
    name: string | null;
    picture_url?: string | null;
  };
  comment?: {
    id: string;
    message: string | null;
  };
  pageId: string;
  onDMSent: (contactId: string) => void;
}

export function FBCommentDMDialog({
  isOpen,
  onClose,
  commenter,
  comment,
  pageId,
  onDMSent,
}: FBCommentDMDialogProps) {
  const [message, setMessage] = useState('');
  const [alsoReplyPublicly, setAlsoReplyPublicly] = useState(false);
  const { sendDM, sending } = useFBCommentDM();

  const handleSend = async () => {
    if (!message.trim()) return;

    const contact = await sendDM({
      commenterFbId: commenter.fb_id,
      commenterName: commenter.name || 'Facebook User',
      commenterPictureUrl: commenter.picture_url,
      pageId,
      message: message.trim(),
      alsoReplyPublicly,
      commentId: comment?.id,
    });

    if (contact) {
      setMessage('');
      setAlsoReplyPublicly(false);
      onDMSent(contact.id);
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSend();
    }
  };

  const initials = commenter.name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || '?';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            Send Message to {commenter.name || 'User'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Commenter preview */}
          <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
            <Avatar className="h-10 w-10">
              <AvatarImage src={commenter.picture_url || undefined} />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-sm">{commenter.name || 'Facebook User'}</p>
              <p className="text-xs text-muted-foreground">via Messenger</p>
            </div>
          </div>

          {/* Comment context */}
          {comment?.message && (
            <div className="p-3 bg-muted/50 rounded-lg border-l-2 border-primary">
              <p className="text-xs text-muted-foreground mb-1">Their comment:</p>
              <p className="text-sm italic">"{comment.message}"</p>
            </div>
          )}

          {/* Message input */}
          <div className="space-y-2">
            <Label htmlFor="dm-message">Your message</Label>
            <Textarea
              id="dm-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your message..."
              rows={4}
              className="resize-none"
              disabled={sending}
            />
            <p className="text-xs text-muted-foreground">
              Press Ctrl+Enter to send
            </p>
          </div>

          {/* Reply publicly option */}
          {comment && (
            <div className="flex items-center space-x-2">
              <Checkbox
                id="reply-publicly"
                checked={alsoReplyPublicly}
                onCheckedChange={(checked) => setAlsoReplyPublicly(checked === true)}
                disabled={sending}
              />
              <Label 
                htmlFor="reply-publicly" 
                className="text-sm font-normal cursor-pointer"
              >
                Also reply to their comment publicly
              </Label>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} disabled={sending}>
            Cancel
          </Button>
          <Button 
            onClick={handleSend} 
            disabled={!message.trim() || sending}
          >
            {sending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send & Open Chat
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
