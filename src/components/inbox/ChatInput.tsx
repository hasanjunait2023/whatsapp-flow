import { useState, useRef, KeyboardEvent, useEffect, ChangeEvent, lazy, Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useSubscription } from '@/hooks/useSubscription';
import { useQuickReplies, QuickReply } from '@/hooks/useQuickReplies';
import { useMediaUpload } from '@/hooks/useMediaUpload';
import { Message } from '@/hooks/useMessages';
import { 
  Paperclip, 
  Send, 
  Smile, 
  Loader2,
  Image,
  FileText,
  Mic,
  Lock,
  Zap,
  Search,
  Video,
  MapPin,
  Package,
  Music,
} from 'lucide-react';

const EmojiPicker = lazy(() => import('./EmojiPicker'));
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import MediaPreview from './MediaPreview';
import VoiceRecorder from './VoiceRecorder';
import ReplyPreview from './ReplyPreview';

export interface MediaPayload {
  content_type: string;
  media_url?: string;
  media_filename?: string;
  location_lat?: number;
  location_lng?: number;
  reply_to_id?: string;
}

interface ChatInputProps {
  onSendMessage: (content: string, media?: MediaPayload) => Promise<void>;
  disabled?: boolean;
  sending?: boolean;
  replyingTo?: Message | null;
  onCancelReply?: () => void;
  onOpenProductPicker?: () => void;
}

export default function ChatInput({ onSendMessage, disabled, sending, replyingTo, onCancelReply, onOpenProductPicker }: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [quickReplyOpen, setQuickReplyOpen] = useState(false);
  const [quickReplySearch, setQuickReplySearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [fileContentType, setFileContentType] = useState<'image' | 'video' | 'audio' | 'document'>('document');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);
  
  const { isSuspended, canSendMessages } = useSubscription();
  const { quickReplies, searchQuickReplies } = useQuickReplies();
  const { uploadMedia, uploading } = useMediaUpload();

  const isDisabled = disabled || !canSendMessages;

  // Filter quick replies based on search or slash command
  const filteredReplies = showSlashMenu
    ? searchQuickReplies(message.slice(1)) // Remove the "/" prefix
    : searchQuickReplies(quickReplySearch);

  // Reset selected index when filtered list changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredReplies.length]);

  // Detect "/" at start of message
  useEffect(() => {
    if (message.startsWith('/') && message.length > 0) {
      setShowSlashMenu(true);
    } else {
      setShowSlashMenu(false);
    }
  }, [message]);

  // Cleanup preview URL on unmount
  useEffect(() => {
    return () => {
      if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);
    };
  }, [filePreviewUrl]);

  const handleSend = async () => {
    if (!message.trim() || isDisabled || sending) return;
    const content = message.trim();
    setMessage('');
    setShowSlashMenu(false);
    
    // Include reply_to_id if replying
    const media: MediaPayload | undefined = replyingTo 
      ? { content_type: 'text', reply_to_id: replyingTo.id }
      : undefined;
    
    await onSendMessage(content, media);
    onCancelReply?.();
    textareaRef.current?.focus();
  };

  const handleSelectQuickReply = async (reply: QuickReply) => {
    // Close menus first
    setQuickReplyOpen(false);
    setShowSlashMenu(false);
    setQuickReplySearch('');

    // If quick reply has media, send immediately
    if (reply.media_url) {
      const mediaType = reply.content_type === 'mixed' 
        ? (reply.media_url.match(/\.(jpg|jpeg|png|gif|webp)/i) ? 'image' : 
           reply.media_url.match(/\.(mp4|webm|mov)/i) ? 'video' : 'audio')
        : reply.content_type;

      await onSendMessage(reply.content || '', {
        content_type: mediaType,
        media_url: reply.media_url,
        media_filename: reply.media_filename || undefined,
        reply_to_id: replyingTo?.id,
      });
      onCancelReply?.();
    } else {
      // Text-only: just insert into textarea as before
      setMessage(reply.content);
    }
    
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Handle quick reply navigation when slash menu is open
    if (showSlashMenu && filteredReplies.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % filteredReplies.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredReplies.length) % filteredReplies.length);
        return;
      }
      if (e.key === 'Tab' || (e.key === 'Enter' && !e.shiftKey)) {
        e.preventDefault();
        handleSelectQuickReply(filteredReplies[selectedIndex]);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowSlashMenu(false);
        setMessage('');
        return;
      }
    }

    // Normal send on Enter
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>, type: 'image' | 'video' | 'audio' | 'document') => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Determine content type
    let contentType: 'image' | 'video' | 'audio' | 'document' = type;
    if (file.type.startsWith('audio/')) {
      contentType = 'audio';
    }

    setSelectedFile(file);
    setFileContentType(contentType);

    // Create preview URL for images and videos
    if (contentType === 'image' || contentType === 'video' || contentType === 'audio') {
      const url = URL.createObjectURL(file);
      setFilePreviewUrl(url);
    } else {
      setFilePreviewUrl(null);
    }

    // Reset input
    e.target.value = '';
  };

  const handleMediaSend = async (caption: string) => {
    if (!selectedFile) return;

    try {
      // Upload the file
      const result = await uploadMedia(selectedFile, fileContentType);
      
      if (!result.success || !result.url) {
        throw new Error(result.error || 'Upload failed');
      }

      // Send message with media (include reply_to_id if replying)
      await onSendMessage(caption, {
        content_type: fileContentType,
        media_url: result.url,
        media_filename: selectedFile.name,
        reply_to_id: replyingTo?.id,
      });

      // Cleanup
      handleCancelMedia();
      onCancelReply?.();
    } catch (error) {
      console.error('Failed to send media:', error);
    }
  };

  const handleCancelMedia = () => {
    if (filePreviewUrl) {
      URL.revokeObjectURL(filePreviewUrl);
    }
    setSelectedFile(null);
    setFilePreviewUrl(null);
    setFileContentType('document');
  };

  const handleVoiceRecordingComplete = async (blob: Blob) => {
    try {
      // Create a file from the blob
      const file = new File([blob], `voice-${Date.now()}.webm`, { 
        type: blob.type 
      });

      // Upload the audio
      const result = await uploadMedia(file, 'audio');
      
      if (!result.success || !result.url) {
        throw new Error(result.error || 'Upload failed');
      }

      // Send as audio message (include reply_to_id if replying)
      await onSendMessage('', {
        content_type: 'audio',
        media_url: result.url,
        media_filename: file.name,
        reply_to_id: replyingTo?.id,
      });

      setShowVoiceRecorder(false);
      onCancelReply?.();
    } catch (error) {
      console.error('Failed to send voice message:', error);
    }
  };

  const handleShareLocation = async () => {
    if (!navigator.geolocation) {
      console.error('Geolocation not supported');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        await onSendMessage('📍 My Location', {
          content_type: 'location',
          location_lat: position.coords.latitude,
          location_lng: position.coords.longitude,
          reply_to_id: replyingTo?.id,
        });
        onCancelReply?.();
      },
      (error) => {
        console.error('Failed to get location:', error);
      }
    );
  };

  if (isSuspended) {
    return (
      <div className="border-t border-border bg-destructive/5 p-4">
        <div className="flex items-center justify-center gap-2 text-destructive">
          <Lock className="h-4 w-4" />
          <span className="text-sm font-medium">
            Messaging is disabled. Please update your subscription to continue.
          </span>
        </div>
      </div>
    );
  }

  // Show voice recorder
  if (showVoiceRecorder) {
    return (
      <VoiceRecorder
        onRecordingComplete={handleVoiceRecordingComplete}
        onCancel={() => setShowVoiceRecorder(false)}
        disabled={isDisabled}
        uploading={uploading}
      />
    );
  }

  // Show media preview
  if (selectedFile) {
    return (
      <MediaPreview
        file={selectedFile}
        previewUrl={filePreviewUrl || undefined}
        contentType={fileContentType}
        onSend={handleMediaSend}
        onCancel={handleCancelMedia}
        sending={sending || uploading}
      />
    );
  }

  return (
    <div className="border-t border-border bg-card relative">
      {/* Reply preview */}
      {replyingTo && (
        <ReplyPreview message={replyingTo} onCancel={() => onCancelReply?.()} />
      )}

      {/* Hidden file inputs */}
      <input
        type="file"
        ref={imageInputRef}
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFileSelect(e, 'image')}
      />
      <input
        type="file"
        ref={videoInputRef}
        accept="video/*"
        className="hidden"
        onChange={(e) => handleFileSelect(e, 'video')}
      />
      <input
        type="file"
        ref={audioInputRef}
        accept="audio/*,.mp3,.wav,.m4a,.ogg,.aac,.wma,.flac"
        className="hidden"
        onChange={(e) => handleFileSelect(e, 'audio')}
      />
      <input
        type="file"
        ref={documentInputRef}
        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar"
        className="hidden"
        onChange={(e) => handleFileSelect(e, 'document')}
      />

      {/* Slash command menu */}
      {showSlashMenu && filteredReplies.length > 0 && (
        <div className="absolute bottom-full left-4 right-4 mb-2 bg-popover border border-border rounded-lg shadow-lg overflow-hidden z-50">
          <div className="p-2 border-b border-border">
            <p className="text-xs text-muted-foreground">
              Quick Replies • Use ↑↓ to navigate, Tab or Enter to select
            </p>
          </div>
          <ScrollArea className="max-h-[200px]">
            {filteredReplies.map((reply, index) => (
              <button
                key={reply.id}
                className={cn(
                  'w-full text-left px-3 py-2 hover:bg-accent transition-colors',
                  index === selectedIndex && 'bg-accent'
                )}
                onClick={() => handleSelectQuickReply(reply)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {reply.content_type === 'image' && <Image className="h-3.5 w-3.5 text-muted-foreground" />}
                    {reply.content_type === 'video' && <Video className="h-3.5 w-3.5 text-muted-foreground" />}
                    {reply.content_type === 'audio' && <Music className="h-3.5 w-3.5 text-muted-foreground" />}
                    {(reply.content_type === 'mixed') && <Image className="h-3.5 w-3.5 text-muted-foreground" />}
                    <span className="font-medium text-sm">{reply.title}</span>
                  </div>
                  {reply.shortcut && (
                    <span className="text-xs text-muted-foreground font-mono">
                      /{reply.shortcut}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  {reply.content || `[${reply.content_type} message]`}
                </p>
              </button>
            ))}
          </ScrollArea>
        </div>
      )}

      <div className="flex items-end gap-2 p-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0" disabled={isDisabled}>
              <Paperclip className="h-5 w-5 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => imageInputRef.current?.click()}>
              <Image className="mr-2 h-4 w-4" />
              Image
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => videoInputRef.current?.click()}>
              <Video className="mr-2 h-4 w-4" />
              Video
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => audioInputRef.current?.click()}>
              <Music className="mr-2 h-4 w-4" />
              Audio
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => documentInputRef.current?.click()}>
              <FileText className="mr-2 h-4 w-4" />
              Document
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleShareLocation}>
              <MapPin className="mr-2 h-4 w-4" />
              Location
            </DropdownMenuItem>
            {onOpenProductPicker && (
              <DropdownMenuItem onClick={onOpenProductPicker}>
                <Package className="mr-2 h-4 w-4" />
                Products
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Quick Replies Button */}
        <Popover open={quickReplyOpen} onOpenChange={setQuickReplyOpen}>
          <PopoverTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-10 w-10 shrink-0" 
              disabled={isDisabled}
              title="Quick Replies (type / to search)"
            >
              <Zap className="h-5 w-5 text-muted-foreground" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-80 p-0">
            <div className="p-3 border-b border-border">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search quick replies..."
                  value={quickReplySearch}
                  onChange={(e) => setQuickReplySearch(e.target.value)}
                  className="pl-9 h-9"
                  autoFocus
                />
              </div>
            </div>
            <ScrollArea className="max-h-[250px]">
              {filteredReplies.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground text-sm">
                  {quickReplies.length === 0
                    ? 'No quick replies yet. Create one in Settings.'
                    : 'No matching quick replies.'}
                </div>
              ) : (
                <div className="p-1">
                  {filteredReplies.map((reply) => (
                    <button
                      key={reply.id}
                      className="w-full text-left px-3 py-2 rounded-md hover:bg-accent transition-colors"
                      onClick={() => handleSelectQuickReply(reply)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {reply.content_type === 'image' && <Image className="h-3.5 w-3.5 text-muted-foreground" />}
                          {reply.content_type === 'video' && <Video className="h-3.5 w-3.5 text-muted-foreground" />}
                          {reply.content_type === 'audio' && <Music className="h-3.5 w-3.5 text-muted-foreground" />}
                          {(reply.content_type === 'mixed') && <Image className="h-3.5 w-3.5 text-muted-foreground" />}
                          <span className="font-medium text-sm">{reply.title}</span>
                        </div>
                        {reply.shortcut && (
                          <span className="text-xs text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded">
                            /{reply.shortcut}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {reply.content || `[${reply.content_type} message]`}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
            <div className="p-2 border-t border-border">
              <p className="text-xs text-muted-foreground text-center">
                Tip: Type <kbd className="px-1 py-0.5 bg-muted rounded text-xs font-mono">/</kbd> to quickly search
              </p>
            </div>
          </PopoverContent>
        </Popover>

        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            placeholder="Type a message... (use / for quick replies)"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isDisabled}
            className="min-h-[44px] max-h-[120px] resize-none pr-12"
            rows={1}
          />
          <Button 
            variant="ghost" 
            size="icon" 
            className="absolute right-1 bottom-1 h-8 w-8" 
            disabled={isDisabled}
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          >
            <Smile className="h-5 w-5 text-muted-foreground" />
          </Button>
          
          {showEmojiPicker && (
            <Suspense fallback={<div className="absolute bottom-full right-0 mb-2 p-4 bg-card border rounded-lg">Loading...</div>}>
              <EmojiPicker
                onEmojiSelect={(emoji) => {
                  setMessage((prev) => prev + emoji);
                  textareaRef.current?.focus();
                }}
                onClose={() => setShowEmojiPicker(false)}
              />
            </Suspense>
          )}
        </div>

        {message.trim() && !showSlashMenu ? (
          <Button
            onClick={handleSend}
            disabled={isDisabled || sending || !message.trim()}
            className="h-10 w-10 shrink-0 rounded-full bg-brand hover:bg-brand/90"
            size="icon"
          >
            {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          </Button>
        ) : (
          <Button 
            variant="ghost" 
            className="h-10 w-10 shrink-0" 
            size="icon" 
            disabled={isDisabled}
            onClick={() => setShowVoiceRecorder(true)}
          >
            <Mic className="h-5 w-5 text-muted-foreground" />
          </Button>
        )}
      </div>
    </div>
  );
}
