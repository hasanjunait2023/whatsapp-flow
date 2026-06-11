import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Upload, X, FileImage, FileVideo, FileAudio, File, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface MediaUploaderProps {
  value?: string;
  onChange: (url: string) => void;
  accept?: string;
  label?: string;
  mediaType: 'image' | 'video' | 'audio' | 'voice' | 'document';
  instanceId?: string;
}

const mediaTypeIcons: Record<string, React.ElementType> = {
  image: FileImage,
  video: FileVideo,
  audio: FileAudio,
  voice: FileAudio,
  document: File,
};

const acceptTypes: Record<string, string> = {
  image: 'image/*',
  video: 'video/*',
  audio: 'audio/*',
  voice: 'audio/*',
  document: '*/*',
};

export default function MediaUploader({
  value,
  onChange,
  accept,
  label,
  mediaType,
  instanceId,
}: MediaUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const Icon = mediaTypeIcons[mediaType] || File;

  const uploadFile = async (file: File) => {
    setUploading(true);
    setProgress(0);

    try {
      // Generate unique filename
      const ext = file.name.split('.').pop();
      const fileName = `workflow-media/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;

      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress((p) => Math.min(p + 10, 90));
      }, 100);

      // Upload to chat-media bucket
      const { data, error } = await supabase.storage
        .from('chat-media')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      clearInterval(progressInterval);

      if (error) {
        throw error;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('chat-media')
        .getPublicUrl(data.path);

      setProgress(100);
      onChange(urlData.publicUrl);

      toast({
        title: 'Upload complete',
        description: `${file.name} uploaded successfully`,
      });
    } catch (err: any) {
      console.error('Upload error:', err);
      toast({
        title: 'Upload failed',
        description: err.message || 'Failed to upload file',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadFile(file);
    }
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);

      const file = e.dataTransfer.files?.[0];
      if (file) {
        uploadFile(file);
      }
    },
    [uploadFile]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const clearFile = () => {
    onChange('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-2">
      {label && <Label>{label}</Label>}

      {value ? (
        <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
          <Icon className="h-5 w-5 text-muted-foreground flex-shrink-0" />
          <span className="text-sm truncate flex-1">{value.split('/').pop()}</span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={clearFile}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <>
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              'border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors',
              dragOver
                ? 'border-primary bg-primary/5'
                : 'border-muted-foreground/25 hover:border-primary/50',
              uploading && 'pointer-events-none opacity-50'
            )}
          >
            {uploading ? (
              <div className="space-y-2">
                <Loader2 className="h-8 w-8 mx-auto animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Uploading...</p>
                <Progress value={progress} className="h-1" />
              </div>
            ) : (
              <>
                <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  Drop file here or click to browse
                </p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  {mediaType === 'image' && 'JPG, PNG, GIF up to 10MB'}
                  {mediaType === 'video' && 'MP4, WebM up to 100MB'}
                  {(mediaType === 'audio' || mediaType === 'voice') && 'MP3, OGG, WAV up to 10MB'}
                  {mediaType === 'document' && 'PDF, DOC, XLS up to 25MB'}
                </p>
              </>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept={accept || acceptTypes[mediaType]}
            onChange={handleFileSelect}
            className="hidden"
          />
        </>
      )}

      {/* Manual URL input */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">or enter URL:</span>
        <Input
          type="url"
          placeholder="https://..."
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className="text-xs h-8"
        />
      </div>
    </div>
  );
}
