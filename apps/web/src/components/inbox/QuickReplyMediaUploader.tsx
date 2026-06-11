import { useState, useRef, ChangeEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/useTenant';
import { MediaItem } from '@/hooks/useQuickReplies';
import { 
  Upload, 
  X, 
  Image as ImageIcon, 
  Video, 
  Music,
  Loader2,
  Plus
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface QuickReplyMediaUploaderProps {
  mediaItems: MediaItem[];
  onMediaItemsChange: (items: MediaItem[]) => void;
}

const ACCEPT_MAP = {
  image: 'image/*',
  video: 'video/*',
  audio: 'audio/*,.mp3,.wav,.m4a,.ogg,.aac',
};

const MAX_SIZES = {
  image: 10 * 1024 * 1024, // 10MB
  video: 100 * 1024 * 1024, // 100MB
  audio: 50 * 1024 * 1024, // 50MB
};

type MediaType = 'image' | 'video' | 'audio';

export default function QuickReplyMediaUploader({
  mediaItems,
  onMediaItemsChange,
}: QuickReplyMediaUploaderProps) {
  const { currentTenant } = useTenant();
  const [uploading, setUploading] = useState(false);
  const [activeType, setActiveType] = useState<MediaType>('image');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !currentTenant) return;

    setUploading(true);
    const newItems: MediaItem[] = [];

    try {
      for (const file of Array.from(files)) {
        // Determine media type from file
        let mediaType: MediaType = 'image';
        if (file.type.startsWith('video/')) mediaType = 'video';
        else if (file.type.startsWith('audio/')) mediaType = 'audio';

        // Validate file size
        if (file.size > MAX_SIZES[mediaType]) {
          toast.error(`${file.name} is too large. Maximum ${MAX_SIZES[mediaType] / (1024 * 1024)}MB allowed.`);
          continue;
        }

        const fileExt = file.name.split('.').pop();
        const fileName = `${currentTenant.id}/quick-replies/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('chat-media')
          .upload(fileName, file);

        if (uploadError) {
          console.error('Upload failed:', uploadError);
          toast.error(`Failed to upload ${file.name}`);
          continue;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('chat-media')
          .getPublicUrl(fileName);

        newItems.push({
          type: mediaType,
          url: publicUrl,
          filename: file.name,
          caption: '',
        });
      }

      if (newItems.length > 0) {
        onMediaItemsChange([...mediaItems, ...newItems]);
        toast.success(`${newItems.length} file(s) uploaded`);
      }
    } catch (error) {
      console.error('Upload failed:', error);
      toast.error('Failed to upload media');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveItem = async (index: number) => {
    const item = mediaItems[index];
    
    // If it's a Supabase storage URL, try to delete it
    if (item.url?.includes('chat-media') && currentTenant) {
      try {
        const path = item.url.split('/chat-media/')[1];
        if (path) {
          await supabase.storage.from('chat-media').remove([path]);
        }
      } catch (error) {
        console.error('Failed to delete from storage:', error);
      }
    }
    
    const newItems = [...mediaItems];
    newItems.splice(index, 1);
    onMediaItemsChange(newItems);
  };

  const handleCaptionChange = (index: number, caption: string) => {
    const newItems = [...mediaItems];
    newItems[index] = { ...newItems[index], caption };
    onMediaItemsChange(newItems);
  };

  const getTypeIcon = (type: MediaType) => {
    switch (type) {
      case 'image': return <ImageIcon className="h-4 w-4" />;
      case 'video': return <Video className="h-4 w-4" />;
      case 'audio': return <Music className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-4 w-full overflow-hidden">
      <Label>Media Files</Label>
      
      {/* Existing media items */}
      {mediaItems.length > 0 && (
        <div className="space-y-3 w-full">
          {mediaItems.map((item, index) => (
            <div key={index} className="border border-border rounded-lg p-3 space-y-2 w-full">
              <div className="flex items-center gap-3 w-full">
                {/* Preview */}
                <div className="shrink-0 w-10 h-10 rounded-md overflow-hidden bg-muted flex items-center justify-center">
                  {item.type === 'image' ? (
                    <img src={item.url} alt="" className="w-full h-full object-cover" />
                  ) : item.type === 'video' ? (
                    <Video className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Music className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>

                {/* Filename - with proper truncation */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate max-w-[200px]">{item.filename}</p>
                </div>

                {/* Remove button */}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="shrink-0 h-8 w-8"
                  onClick={() => handleRemoveItem(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Individual caption */}
              <Textarea
                placeholder="Caption (optional)..."
                value={item.caption || ''}
                onChange={(e) => handleCaptionChange(index, e.target.value)}
                rows={2}
                className="text-sm w-full"
              />
            </div>
          ))}
        </div>
      )}

      {/* Upload section */}
      <div className="space-y-2">
        {/* Media type selector */}
        <div className="flex gap-2">
          <Button
            type="button"
            variant={activeType === 'image' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveType('image')}
          >
            <ImageIcon className="h-4 w-4 mr-1" />
            Image
          </Button>
          <Button
            type="button"
            variant={activeType === 'video' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveType('video')}
          >
            <Video className="h-4 w-4 mr-1" />
            Video
          </Button>
          <Button
            type="button"
            variant={activeType === 'audio' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveType('audio')}
          >
            <Music className="h-4 w-4 mr-1" />
            Audio
          </Button>
        </div>

        {/* Drop zone */}
        <div
          className={cn(
            'border-2 border-dashed border-border rounded-lg p-6 text-center transition-colors',
            'hover:border-primary/50 hover:bg-accent/50 cursor-pointer',
            uploading && 'pointer-events-none opacity-50'
          )}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPT_MAP[activeType]}
            className="hidden"
            onChange={handleFileSelect}
            disabled={uploading}
            multiple
          />
          
          <div className="flex flex-col items-center gap-2">
            {uploading ? (
              <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
            ) : (
              <Plus className="h-8 w-8 text-muted-foreground" />
            )}
            <p className="text-sm font-medium">
              {uploading ? 'Uploading...' : `Click to add ${activeType}(s)`}
            </p>
            <p className="text-xs text-muted-foreground">
              You can select multiple files. Max size: {MAX_SIZES[activeType] / (1024 * 1024)}MB each
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
