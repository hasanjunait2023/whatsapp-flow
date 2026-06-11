import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Send, Loader2, FileText, Film, Image as ImageIcon, Music } from 'lucide-react';
import { useState } from 'react';

interface MediaPreviewProps {
  file: File;
  previewUrl?: string;
  contentType: 'image' | 'video' | 'audio' | 'document';
  onSend: (caption: string) => void;
  onCancel: () => void;
  sending?: boolean;
}

export default function MediaPreview({
  file,
  previewUrl,
  contentType,
  onSend,
  onCancel,
  sending,
}: MediaPreviewProps) {
  const [caption, setCaption] = useState('');

  const handleSend = () => {
    onSend(caption);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getContentTypeIcon = () => {
    switch (contentType) {
      case 'image':
        return <ImageIcon className="h-8 w-8" />;
      case 'video':
        return <Film className="h-8 w-8" />;
      case 'audio':
        return <Music className="h-8 w-8" />;
      default:
        return <FileText className="h-8 w-8" />;
    }
  };

  return (
    <div className="absolute inset-0 bg-background/95 backdrop-blur-sm z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-3">
          {getContentTypeIcon()}
          <div>
            <p className="font-medium text-sm truncate max-w-[200px]">{file.name}</p>
            <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onCancel} disabled={sending}>
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Preview area */}
      <div className="flex-1 flex items-center justify-center p-4 overflow-hidden">
        {contentType === 'image' && previewUrl && (
          <img
            src={previewUrl}
            alt="Preview"
            className="max-w-full max-h-full object-contain rounded-lg"
          />
        )}

        {contentType === 'video' && previewUrl && (
          <video
            src={previewUrl}
            controls
            className="max-w-full max-h-full rounded-lg"
          />
        )}

        {contentType === 'audio' && previewUrl && (
          <div className="w-full max-w-md p-6 bg-card rounded-xl border border-border">
            <div className="flex items-center justify-center mb-4">
              <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
                <Music className="h-10 w-10 text-primary" />
              </div>
            </div>
            <audio src={previewUrl} controls className="w-full" />
          </div>
        )}

        {contentType === 'document' && (
          <div className="flex flex-col items-center gap-4 p-8 bg-card rounded-xl border border-border">
            <div className="h-20 w-20 rounded-xl bg-primary/10 flex items-center justify-center">
              <FileText className="h-10 w-10 text-primary" />
            </div>
            <div className="text-center">
              <p className="font-medium">{file.name}</p>
              <p className="text-sm text-muted-foreground">{formatFileSize(file.size)}</p>
            </div>
          </div>
        )}
      </div>

      {/* Caption input and send */}
      <div className="p-4 border-t border-border bg-card">
        <div className="flex items-center gap-3">
          {contentType !== 'audio' && (
            <Input
              placeholder="Add a caption..."
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              disabled={sending}
              className="flex-1"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
          )}
          {contentType === 'audio' && <div className="flex-1" />}
          <Button
            onClick={handleSend}
            disabled={sending}
            className="h-10 w-10 rounded-full bg-whatsapp hover:bg-whatsapp/90"
            size="icon"
          >
            {sending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
