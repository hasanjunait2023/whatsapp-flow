import { useState, useRef } from 'react';
import { Send, Paperclip, Mic, X, Image, FileText, Video, Smile } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useMediaUpload } from '@/hooks/useMediaUpload';
import { useTeam } from '@/hooks/useTeam';
import { useTypingIndicator } from '@/hooks/useTypingIndicator';
import VoiceRecorder from '@/components/inbox/VoiceRecorder';
import MediaPreview from '@/components/inbox/MediaPreview';
import EmojiPicker from '@/components/inbox/EmojiPicker';
import { UserMentionPopover } from './UserMentionPopover';
import { cn } from '@/lib/utils';

interface InternalMessage {
  id: string;
  sender_id: string;
  content: string | null;
  sender?: {
    full_name: string | null;
  };
}

interface InternalChatInputProps {
  roomId: string;
  onSendMessage: (
    content: string,
    contentType?: string,
    mediaUrl?: string,
    mediaFilename?: string,
    replyToId?: string,
    mentions?: string[]
  ) => Promise<void>;
  replyingTo?: InternalMessage | null;
  onCancelReply?: () => void;
  disabled?: boolean;
}

export function InternalChatInput({
  roomId,
  onSendMessage,
  replyingTo,
  onCancelReply,
  disabled = false,
}: InternalChatInputProps) {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<{ file: File; preview: string; contentType: string } | null>(null);
  const [mentionSearch, setMentionSearch] = useState('');
  const [showMentions, setShowMentions] = useState(false);
  const [mentionStartIndex, setMentionStartIndex] = useState(-1);
  const [mentions, setMentions] = useState<string[]>([]);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mentionAnchorRef = useRef<HTMLSpanElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { uploadMedia, uploading } = useMediaUpload();
  const { members } = useTeam();
  const { startTyping, stopTyping } = useTypingIndicator({ roomId });

  // Handle input change with mention detection
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart || 0;
    
    setMessage(value);
    startTyping();

    // Detect @ mentions
    const textBeforeCursor = value.substring(0, cursorPos);
    const atIndex = textBeforeCursor.lastIndexOf('@');
    
    if (atIndex !== -1) {
      const textAfterAt = textBeforeCursor.substring(atIndex + 1);
      // Check if there's a space after @ (would close the mention)
      if (!textAfterAt.includes(' ')) {
        setMentionStartIndex(atIndex);
        setMentionSearch(textAfterAt);
        setShowMentions(true);
        return;
      }
    }
    
    setShowMentions(false);
    setMentionSearch('');
  };

  // Handle mention selection
  const handleSelectMention = (user: { id: string; full_name: string | null }) => {
    if (mentionStartIndex === -1) return;
    
    const beforeMention = message.substring(0, mentionStartIndex);
    const afterMention = message.substring(mentionStartIndex + mentionSearch.length + 1);
    const mentionText = `@${user.full_name || 'User'} `;
    
    setMessage(beforeMention + mentionText + afterMention);
    setMentions([...mentions, user.id]);
    setShowMentions(false);
    setMentionSearch('');
    setMentionStartIndex(-1);
    
    textareaRef.current?.focus();
  };

  // Handle sending message
  const handleSend = async () => {
    if ((!message.trim() && !selectedMedia) || sending) return;

    setSending(true);
    stopTyping();

    try {
      if (selectedMedia) {
        const result = await uploadMedia(selectedMedia.file);
        if (result?.url) {
          await onSendMessage(
            message.trim() || '',
            selectedMedia.contentType,
            result.url,
            selectedMedia.file.name,
            replyingTo?.id,
            mentions.length > 0 ? mentions : undefined
          );
        }
        setSelectedMedia(null);
      } else {
        await onSendMessage(
          message.trim(),
          'text',
          undefined,
          undefined,
          replyingTo?.id,
          mentions.length > 0 ? mentions : undefined
        );
      }
      
      setMessage('');
      setMentions([]);
      onCancelReply?.();
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    
    if (e.key === 'Escape') {
      if (showMentions) {
        setShowMentions(false);
      } else if (replyingTo) {
        onCancelReply?.();
      }
    }
  };

  // Handle file selection
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>, type: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setSelectedMedia({
        file,
        preview: reader.result as string,
        contentType: type,
      });
    };
    reader.readAsDataURL(file);
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle voice recording
  const handleVoiceRecording = async (blob: Blob) => {
    setSending(true);
    try {
      const file = new File([blob], `voice-${Date.now()}.webm`, { type: 'audio/webm' });
      const result = await uploadMedia(file);
      if (result?.url) {
        await onSendMessage('', 'audio', result.url, file.name, replyingTo?.id);
        onCancelReply?.();
      }
    } catch (error) {
      console.error('Error sending voice message:', error);
    } finally {
      setSending(false);
      setShowVoiceRecorder(false);
    }
  };

  // Handle emoji selection
  const handleEmojiSelect = (emoji: string) => {
    setMessage(prev => prev + emoji);
    setShowEmoji(false);
    textareaRef.current?.focus();
  };

  // Convert team members to mention format
  const mentionUsers = members.map(m => ({
    id: m.user_id,
    full_name: m.profile?.full_name || null,
    email: m.profile?.email || null,
    avatar_url: m.profile?.avatar_url || null,
  }));

  if (showVoiceRecorder) {
    return (
      <div className="p-4 border-t">
        <VoiceRecorder
          onRecordingComplete={handleVoiceRecording}
          onCancel={() => setShowVoiceRecorder(false)}
        />
      </div>
    );
  }

  if (selectedMedia) {
    return (
      <div className="p-4 border-t">
        <MediaPreview
          file={selectedMedia.file}
          previewUrl={selectedMedia.preview}
          contentType={selectedMedia.contentType as 'image' | 'video' | 'audio' | 'document'}
          onSend={async () => {
            await handleSend();
          }}
          onCancel={() => setSelectedMedia(null)}
          sending={sending || uploading}
        />
      </div>
    );
  }

  return (
    <div className="p-4 border-t space-y-2">
      {/* Reply preview */}
      {replyingTo && (
        <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground">
              Replying to {replyingTo.sender?.full_name || 'Unknown'}
            </p>
            <p className="text-sm truncate">{replyingTo.content || '[Media]'}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onCancelReply}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      <div className="flex items-end gap-2">
        {/* Attachments dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" disabled={disabled}>
              <Paperclip className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem asChild>
              <label className="flex items-center gap-2 cursor-pointer">
                <Image className="h-4 w-4" />
                Photo
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleFileSelect(e, 'image')}
                />
              </label>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <label className="flex items-center gap-2 cursor-pointer">
                <Video className="h-4 w-4" />
                Video
                <input
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={(e) => handleFileSelect(e, 'video')}
                />
              </label>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <label className="flex items-center gap-2 cursor-pointer">
                <FileText className="h-4 w-4" />
                Document
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.txt"
                  className="hidden"
                  onChange={(e) => handleFileSelect(e, 'document')}
                />
              </label>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Message input */}
        <div className="flex-1 relative">
          <span ref={mentionAnchorRef} className="absolute" />
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            disabled={disabled || sending}
            className="min-h-10 max-h-32 resize-none pr-10"
            rows={1}
          />
          
          {/* Emoji picker */}
          <Popover open={showEmoji} onOpenChange={setShowEmoji}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 bottom-1 h-8 w-8"
              >
                <Smile className="h-5 w-5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent side="top" className="w-auto p-0">
              <EmojiPicker onEmojiSelect={handleEmojiSelect} onClose={() => setShowEmoji(false)} />
            </PopoverContent>
          </Popover>

          {/* Mention popover */}
          <UserMentionPopover
            users={mentionUsers}
            isOpen={showMentions}
            searchQuery={mentionSearch}
            onSelect={handleSelectMention}
            onClose={() => setShowMentions(false)}
            anchorRef={mentionAnchorRef}
          />
        </div>

        {/* Send or voice button */}
        {message.trim() ? (
          <Button onClick={handleSend} disabled={disabled || sending} loading={sending}>
            <Send className="h-5 w-5" />
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowVoiceRecorder(true)}
            disabled={disabled}
          >
            <Mic className="h-5 w-5" />
          </Button>
        )}
      </div>
    </div>
  );
}
