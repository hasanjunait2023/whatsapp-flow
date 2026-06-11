import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, Square, Send, Trash2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VoiceRecorderProps {
  onRecordingComplete: (blob: Blob) => void;
  onCancel: () => void;
  disabled?: boolean;
  uploading?: boolean;
}

export default function VoiceRecorder({ 
  onRecordingComplete, 
  onCancel, 
  disabled,
  uploading 
}: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') 
          ? 'audio/webm' 
          : 'audio/mp4'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { 
          type: mediaRecorder.mimeType 
        });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start(100); // Collect data every 100ms
      setIsRecording(true);
      setRecordingTime(0);

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Failed to start recording:', err);
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [isRecording]);

  const handleSend = useCallback(() => {
    if (audioBlob) {
      onRecordingComplete(audioBlob);
    }
  }, [audioBlob, onRecordingComplete]);

  const handleCancel = useCallback(() => {
    if (isRecording) {
      stopRecording();
    }
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingTime(0);
    onCancel();
  }, [isRecording, audioUrl, stopRecording, onCancel]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center gap-3 p-4 border-t border-border bg-card">
      {/* Recording indicator or audio preview */}
      <div className="flex-1 flex items-center gap-3">
        {isRecording && (
          <>
            <div className="h-3 w-3 rounded-full bg-destructive animate-pulse" />
            <div className="flex-1">
              <div className="h-8 bg-muted rounded-full overflow-hidden">
                <div className="h-full flex items-center justify-center gap-0.5">
                  {[...Array(20)].map((_, i) => (
                    <div
                      key={i}
                      className="w-1 bg-primary rounded-full animate-pulse"
                      style={{
                        height: `${Math.random() * 100}%`,
                        animationDelay: `${i * 50}ms`,
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
            <span className="text-sm font-mono text-muted-foreground min-w-[48px]">
              {formatTime(recordingTime)}
            </span>
          </>
        )}

        {!isRecording && audioUrl && (
          <>
            <audio src={audioUrl} controls className="h-10 flex-1" />
            <span className="text-sm font-mono text-muted-foreground min-w-[48px]">
              {formatTime(recordingTime)}
            </span>
          </>
        )}

        {!isRecording && !audioUrl && (
          <p className="text-sm text-muted-foreground">
            Click the mic to start recording
          </p>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2">
        {!isRecording && !audioBlob && (
          <Button
            onClick={startRecording}
            disabled={disabled}
            size="icon"
            className="h-10 w-10 rounded-full bg-destructive hover:bg-destructive/90"
          >
            <Mic className="h-5 w-5" />
          </Button>
        )}

        {isRecording && (
          <Button
            onClick={stopRecording}
            size="icon"
            variant="outline"
            className="h-10 w-10 rounded-full"
          >
            <Square className="h-4 w-4" />
          </Button>
        )}

        {audioBlob && !isRecording && (
          <>
            <Button
              onClick={handleCancel}
              size="icon"
              variant="ghost"
              className="h-10 w-10"
              disabled={uploading}
            >
              <Trash2 className="h-5 w-5 text-muted-foreground" />
            </Button>
            <Button
              onClick={handleSend}
              size="icon"
              disabled={disabled || uploading}
              className="h-10 w-10 rounded-full bg-brand hover:bg-brand/90"
            >
              {uploading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </Button>
          </>
        )}

        {!audioBlob && (
          <Button
            onClick={handleCancel}
            size="sm"
            variant="ghost"
            className="text-muted-foreground"
          >
            Cancel
          </Button>
        )}
      </div>
    </div>
  );
}
