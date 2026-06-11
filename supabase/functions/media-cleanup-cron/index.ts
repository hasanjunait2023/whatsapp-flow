import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const RETENTION_DAYS = 30;
const MEDIA_TYPES = ['image', 'video', 'audio', 'voice', 'ptt'];
const BUCKET_NAME = 'chat-media';
const BATCH_SIZE = 500;

interface CleanupResult {
  messagesProcessed: number;
  filesDeleted: number;
  waMessagesCleaned: number;
  fbMessagesCleaned: number;
  storageFreedBytes: number;
  errors: Array<{ message_id: string; error: string }>;
  durationMs: number;
}

function extractStoragePath(url: string): string | null {
  if (!url) return null;
  // URL format: https://xxx.supabase.co/storage/v1/object/public/chat-media/{path}
  const match = url.match(/\/chat-media\/(.+)$/);
  return match ? decodeURIComponent(match[1]) : null;
}

function isOurStorageUrl(url: string): boolean {
  if (!url) return false;
  // Check if it's our Supabase storage URL (not external like Facebook CDN)
  return url.includes('supabase.co/storage') && url.includes('chat-media');
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('🧹 Starting media cleanup job...');
    console.log(`📅 Retention period: ${RETENTION_DAYS} days`);
    console.log(`📁 Media types: ${MEDIA_TYPES.join(', ')}`);

    // Calculate cutoff date
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - RETENTION_DAYS);
    const cutoffIso = cutoffDate.toISOString();
    
    console.log(`📆 Cutoff date: ${cutoffIso}`);

    let filesDeleted = 0;
    let messagesProcessed = 0;
    let waMessagesCleaned = 0;
    let fbMessagesCleaned = 0;
    let storageFreedBytes = 0;
    const errors: Array<{ message_id: string; error: string }> = [];

    // ============================================
    // 1. Process WhatsApp messages
    // ============================================
    console.log('📱 Processing WhatsApp messages...');
    
    const { data: waMessages, error: waError } = await supabase
      .from('messages')
      .select('id, media_url, content_type, tenant_id')
      .in('content_type', MEDIA_TYPES)
      .lt('sent_at', cutoffIso)
      .not('media_url', 'is', null)
      .limit(BATCH_SIZE);

    if (waError) {
      console.error('❌ Error fetching WhatsApp messages:', waError);
      errors.push({ message_id: 'wa_fetch', error: waError.message });
    } else {
      console.log(`📊 Found ${waMessages?.length || 0} WhatsApp messages to clean`);
      
      for (const msg of waMessages || []) {
        try {
          // Check if it's our storage URL
          if (isOurStorageUrl(msg.media_url)) {
            const storagePath = extractStoragePath(msg.media_url);
            
            if (storagePath) {
              console.log(`🗑️ Deleting storage file: ${storagePath}`);
              
              const { error: deleteError } = await supabase.storage
                .from(BUCKET_NAME)
                .remove([storagePath]);
              
              if (deleteError) {
                console.warn(`⚠️ Storage delete warning for ${storagePath}:`, deleteError.message);
                // Don't count as error - file might already be deleted
              } else {
                filesDeleted++;
              }
            }
          }

          // Clear media_url in database (keep message record)
          const { error: updateError } = await supabase
            .from('messages')
            .update({ 
              media_url: null,
              media_mime_type: null,
              media_filename: null
            })
            .eq('id', msg.id);

          if (updateError) {
            throw new Error(`Update failed: ${updateError.message}`);
          }

          messagesProcessed++;
          waMessagesCleaned++;
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : String(err);
          console.error(`❌ Error processing WA message ${msg.id}:`, errorMsg);
          errors.push({ message_id: msg.id, error: errorMsg });
        }
      }
    }

    // ============================================
    // 2. Process Facebook messages
    // ============================================
    console.log('📘 Processing Facebook messages...');
    
    const { data: fbMessages, error: fbError } = await supabase
      .from('fb_messages')
      .select('id, media_url, content_type, tenant_id')
      .in('content_type', MEDIA_TYPES)
      .lt('sent_at', cutoffIso)
      .not('media_url', 'is', null)
      .limit(BATCH_SIZE);

    if (fbError) {
      console.error('❌ Error fetching Facebook messages:', fbError);
      errors.push({ message_id: 'fb_fetch', error: fbError.message });
    } else {
      console.log(`📊 Found ${fbMessages?.length || 0} Facebook messages to clean`);
      
      for (const msg of fbMessages || []) {
        try {
          // Check if it's our storage URL (FB usually uses external CDN)
          if (isOurStorageUrl(msg.media_url)) {
            const storagePath = extractStoragePath(msg.media_url);
            
            if (storagePath) {
              console.log(`🗑️ Deleting FB storage file: ${storagePath}`);
              
              const { error: deleteError } = await supabase.storage
                .from(BUCKET_NAME)
                .remove([storagePath]);
              
              if (!deleteError) {
                filesDeleted++;
              }
            }
          }

          // Clear media_url in database (keep message record)
          // Note: For FB messages with external URLs, we just clear the reference
          const { error: updateError } = await supabase
            .from('fb_messages')
            .update({ 
              media_url: null,
              media_mime_type: null,
              media_filename: null,
              original_media_url: null
            })
            .eq('id', msg.id);

          if (updateError) {
            throw new Error(`Update failed: ${updateError.message}`);
          }

          messagesProcessed++;
          fbMessagesCleaned++;
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : String(err);
          console.error(`❌ Error processing FB message ${msg.id}:`, errorMsg);
          errors.push({ message_id: msg.id, error: errorMsg });
        }
      }
    }

    const durationMs = Date.now() - startTime;

    // ============================================
    // 3. Log the cleanup run
    // ============================================
    console.log('📝 Logging cleanup run...');
    
    const { error: logError } = await supabase
      .from('media_cleanup_logs')
      .insert({
        messages_processed: messagesProcessed,
        files_deleted: filesDeleted,
        storage_freed_bytes: storageFreedBytes,
        errors: errors.length > 0 ? errors : null,
        duration_ms: durationMs,
        wa_messages_cleaned: waMessagesCleaned,
        fb_messages_cleaned: fbMessagesCleaned
      });

    if (logError) {
      console.error('❌ Error logging cleanup run:', logError);
    }

    // ============================================
    // Summary
    // ============================================
    console.log('✅ Media cleanup completed!');
    console.log(`📊 Summary:`);
    console.log(`   - Messages processed: ${messagesProcessed}`);
    console.log(`   - WhatsApp cleaned: ${waMessagesCleaned}`);
    console.log(`   - Facebook cleaned: ${fbMessagesCleaned}`);
    console.log(`   - Files deleted: ${filesDeleted}`);
    console.log(`   - Errors: ${errors.length}`);
    console.log(`   - Duration: ${durationMs}ms`);

    const result: CleanupResult = {
      messagesProcessed,
      filesDeleted,
      waMessagesCleaned,
      fbMessagesCleaned,
      storageFreedBytes,
      errors,
      durationMs
    };

    return new Response(
      JSON.stringify({ success: true, ...result }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('❌ Fatal error in media cleanup:', errorMsg);
    
    return new Response(
      JSON.stringify({ success: false, error: errorMsg }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
