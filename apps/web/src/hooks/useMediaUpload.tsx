import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/useTenant';

interface UploadResult {
  success: boolean;
  url?: string;
  path?: string;
  content_type?: string;
  mime_type?: string;
  file_name?: string;
  file_size?: number;
  error?: string;
}

export function useMediaUpload() {
  const { currentTenant } = useTenant();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const uploadMedia = useCallback(async (
    file: File,
    contentType?: string
  ): Promise<UploadResult> => {
    if (!currentTenant) {
      return { success: false, error: 'No tenant selected' };
    }

    setUploading(true);
    setProgress(0);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('tenant_id', currentTenant.id);
      if (contentType) {
        formData.append('content_type', contentType);
      }

      // Get session for auth
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      // Simulate progress (actual progress not available with fetch)
      const progressInterval = setInterval(() => {
        setProgress((prev) => Math.min(prev + 10, 90));
      }, 100);

      const response = await supabase.functions.invoke('upload-chat-media', {
        body: formData,
      });

      clearInterval(progressInterval);
      setProgress(100);

      if (response.error) {
        throw new Error(response.error.message || 'Upload failed');
      }

      const data = response.data as UploadResult;

      if (!data.success) {
        throw new Error(data.error || 'Upload failed');
      }

      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Upload failed';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setUploading(false);
    }
  }, [currentTenant?.id]);

  const resetProgress = useCallback(() => {
    setProgress(0);
    setError(null);
  }, []);

  return {
    uploadMedia,
    uploading,
    progress,
    error,
    resetProgress,
  };
}
