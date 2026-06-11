import { useState, useRef, KeyboardEvent, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Send, Paperclip, Image, FileText, Film, X, Loader2, Zap, Search } from 'lucide-react';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useFBMediaUpload, MediaType } from '@/hooks/useFBMediaUpload';
import { useQuickReplies, QuickReply } from '@/hooks/useQuickReplies';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';

interface FBChatInputProps {
  onSend: (message: string, mediaUrl?: string, contentType?: string) => Promise<void>;
  disabled?: boolean;
  placeholder?: string;
  tenantId: string;
}

interface PendingMedia {
  file: File;
  preview: string;
  type: MediaType;
}

export default function FBChatInput({
  onSend,
  disabled = false,
  placeholder = "Type a message...",
  tenantId,
}: FBChatInputProps) {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [pendingMedia, setPendingMedia] = useState<PendingMedia | null>(null);
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [quickReplyOpen, setQuickReplyOpen] = useState(false);
  const [quickReplySearch, setQuickReplySearch] = useState('');
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { uploadMedia, validateFile, uploading, progress } = useFBMediaUpload();
  const { quickReplies, searchQuickReplies } = useQuickReplies();

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

  const handleSend = async () => {
    if ((!message.trim() && !pendingMedia) || sending || disabled || uploading) return;

    setSending(true);
    setShowSlashMenu(false);
    try {
      if (pendingMedia) {
        const result = await uploadMedia(pendingMedia.file, tenantId);
        await onSend(message.trim(), result.url, result.contentType);
        setPendingMedia(null);
      } else {
        await onSend(message.trim());
      }
      setMessage('');
      textareaRef.current?.focus();
    } catch (error) {
      console.error('Failed to send message:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleSelectQuickReply = (reply: QuickReply) => {
    setMessage(reply.content);
    setQuickReplyOpen(false);
    setShowSlashMenu(false);
    setQuickReplySearch('');
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

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = async (
    e: React.ChangeEvent<HTMLInputElement>,
    expectedType: 'image' | 'video' | 'file'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateFile(file);
    if (!validation.valid) {
      toast.error(validation.error);
      return;
    }

    let preview = '';
    if (file.type.startsWith('image/')) {
      preview = URL.createObjectURL(file);
    } else if (file.type.startsWith('video/')) {
      preview = URL.createObjectURL(file);
    }

    const mediaType: MediaType = file.type.startsWith('image/') ? 'image' 
      : file.type.startsWith('video/') ? 'video'
      : file.type.startsWith('audio/') ? 'audio'
      : 'file';

    setPendingMedia({ file, preview, type: mediaType });
    e.target.value = '';
  };

  const clearPendingMedia = () => {
    if (pendingMedia?.preview) {
      URL.revokeObjectURL(pendingMedia.preview);
    }
    setPendingMedia(null);
  };

  const canSend = (message.trim().length > 0 || pendingMedia) && !sending && !disabled && !uploading;

  return (
    <div className="p-4 border-t border-border bg-card">
      {/* Slash Menu */}
      {showSlashMenu && filteredReplies.length > 0 && (
        <div className="mb-2 border border-border rounded-lg bg-popover shadow-lg overflow-hidden">
          <div className="p-2 border-b border-border bg-muted/50">
            <p className="text-xs text-muted-foreground">
              Quick Replies • Use ↑↓ to navigate, Enter to select
            </p>
          </div>
          <ScrollArea className="max-h-[200px]">
            <div className="p-1">
              {filteredReplies.map((reply, index) => (
                <button
                  key={reply.id}
                  className={cn(
                    "w-full text-left px-3 py-2 rounded-md transition-colors",
                    index === selectedIndex ? "bg-accent" : "hover:bg-accent/50"
                  )}
                  onClick={() => handleSelectQuickReply(reply)}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{reply.title}</span>
                    {reply.shortcut && (
                      <span className="text-xs text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded">
                        /{reply.shortcut}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {reply.content}
                  </p>
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Media Preview */}
      {pendingMedia && (
        <div className="mb-3 relative inline-block">
          <div className="relative rounded-lg overflow-hidden border border-border bg-muted">
            {pendingMedia.type === 'image' && pendingMedia.preview && (
              <img 
                src={pendingMedia.preview} 
                alt="Preview" 
                className="max-h-32 max-w-xs object-cover"
              />
            )}
            {pendingMedia.type === 'video' && pendingMedia.preview && (
              <video 
                src={pendingMedia.preview} 
                className="max-h-32 max-w-xs object-cover"
              />
            )}
            {pendingMedia.type === 'file' && (
              <div className="flex items-center gap-2 p-3">
                <FileText className="h-8 w-8 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate max-w-[200px]">
                    {pendingMedia.file.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {(pendingMedia.file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
            )}
            <Button
              variant="destructive"
              size="icon"
              className="absolute top-1 right-1 h-6 w-6"
              onClick={clearPendingMedia}
              disabled={uploading}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
          {uploading && (
            <div className="mt-2">
              <Progress value={progress} className="h-1" />
              <p className="text-xs text-muted-foreground mt-1">Uploading... {progress}%</p>
            </div>
          )}
        </div>
      )}

      <div className="flex items-end gap-2">
        {/* Attachment Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 shrink-0"
              disabled={disabled || uploading}
            >
              <Paperclip className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuItem onClick={() => imageInputRef.current?.click()}>
              <Image className="h-4 w-4 mr-2" />
              Photo
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => videoInputRef.current?.click()}>
              <Film className="h-4 w-4 mr-2" />
              Video
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
              <FileText className="h-4 w-4 mr-2" />
              Document
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Quick Replies Button */}
        <Popover open={quickReplyOpen} onOpenChange={setQuickReplyOpen}>
          <PopoverTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-10 w-10 shrink-0" 
              disabled={disabled}
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
                        <span className="font-medium text-sm">{reply.title}</span>
                        {reply.shortcut && (
                          <span className="text-xs text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded">
                            /{reply.shortcut}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {reply.content}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </PopoverContent>
        </Popover>

        <input
          ref={imageInputRef}
          type="file"
          className="hidden"
          accept="image/jpeg,image/png,image/gif,image/webp"
          onChange={(e) => handleFileSelect(e, 'image')}
        />
        <input
          ref={videoInputRef}
          type="file"
          className="hidden"
          accept="video/mp4,video/quicktime,video/webm"
          onChange={(e) => handleFileSelect(e, 'video')}
        />
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept="application/pdf,.doc,.docx,.xls,.xlsx"
          onChange={(e) => handleFileSelect(e, 'file')}
        />

        {/* Message Input */}
        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={pendingMedia ? "Add a caption..." : placeholder}
            disabled={disabled || sending || uploading}
            className={cn(
              "min-h-[44px] max-h-32 resize-none pr-10",
              "focus-visible:ring-1 focus-visible:ring-primary"
            )}
            rows={1}
          />
        </div>

        {/* Send Button */}
        <Button
          onClick={handleSend}
          disabled={!canSend}
          size="icon"
          className={cn(
            "h-10 w-10 shrink-0 transition-colors",
            canSend ? "bg-primary hover:bg-primary/90" : ""
          )}
        >
          {sending || uploading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Send className="h-5 w-5" />
          )}
        </Button>
      </div>

      {/* Character count for long messages */}
      {message.length > 1500 && (
        <p className={cn(
          "text-xs mt-1 text-right",
          message.length > 2000 ? "text-destructive" : "text-muted-foreground"
        )}>
          {message.length} / 2000 characters
        </p>
      )}
    </div>
  );
}
