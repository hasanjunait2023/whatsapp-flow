import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type MediaType = 'image' | 'video' | 'audio' | 'file';

interface UploadResult {
  url: string;
  contentType: MediaType;
  filename: string;
  mimeType: string;
}

const ALLOWED_TYPES: Record<string, MediaType> = {
  // Images
  'image/jpeg': 'image',
  'image/png': 'image',
  'image/gif': 'image',
  'image/webp': 'image',
  // Videos
  'video/mp4': 'video',
  'video/quicktime': 'video',
  'video/webm': 'video',
  // Audio
  'audio/mpeg': 'audio',
  'audio/ogg': 'audio',
  'audio/wav': 'audio',
  'audio/mp4': 'audio',
  // Documents
  'application/pdf': 'file',
  'application/msword': 'file',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'file',
  'application/vnd.ms-excel': 'file',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'file',
};

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB - Facebook's limit

export function useFBMediaUpload() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<Error | null>(null);

  const uploadMedia = async (file: File, tenantId: string): Promise<UploadResult> => {
    setUploading(true);
    setProgress(0);
    setError(null);

    try {
      // Validate file type
      const contentType = ALLOWED_TYPES[file.type];
      if (!contentType) {
        throw new Error(`Unsupported file type: ${file.type}`);
      }

      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        throw new Error(`File size exceeds 25MB limit`);
      }

      // Generate unique filename
      const ext = file.name.split('.').pop() || 'bin';
      const uniqueId = crypto.randomUUID();
      const path = `fb/${tenantId}/${uniqueId}.${ext}`;

      setProgress(10);

      // Upload to Supabase Storage
      const { data, error: uploadError } = await supabase.storage
        .from('chat-media')
        .upload(path, file, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      setProgress(80);

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('chat-media')
        .getPublicUrl(path);

      if (!urlData?.publicUrl) {
        throw new Error('Failed to get public URL');
      }

      setProgress(100);

      return {
        url: urlData.publicUrl,
        contentType,
        filename: file.name,
        mimeType: file.type,
      };
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Upload failed');
      setError(error);
      throw error;
    } finally {
      setUploading(false);
    }
  };

  const validateFile = (file: File): { valid: boolean; error?: string } => {
    if (!ALLOWED_TYPES[file.type]) {
      return { valid: false, error: `Unsupported file type: ${file.type}` };
    }
    if (file.size > MAX_FILE_SIZE) {
      return { valid: false, error: `File size exceeds 25MB limit` };
    }
    return { valid: true };
  };

  return {
    uploadMedia,
    validateFile,
    uploading,
    progress,
    error,
  };
}
