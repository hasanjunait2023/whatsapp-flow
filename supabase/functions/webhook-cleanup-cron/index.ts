import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Retention periods in days (optimized for performance)
const WEBHOOK_RETENTION_DAYS = 3;
const PRESENCE_RETENTION_DAYS = 14;
const NOTIFICATION_RETENTION_DAYS = 30;
const BATCH_SIZE = 500;
const MAX_BATCHES = 200; // Increased for gradual cleanup
const BATCH_DELAY_MS = 200; // Delay between batches to prevent deadlocks

interface CleanupResult {
  webhookEventsDeleted: number;
  fbWebhookEventsDeleted: number;
  presenceLogsDeleted: number;
  notificationsDeleted: number;
  durationMs: number;
}

async function deleteBatched(
  supabase: any,
  tableName: string,
  cutoffDate: Date,
  dateColumn: string = 'created_at'
): Promise<number> {
  let totalDeleted = 0;
  let batchCount = 0;
  
  while (batchCount < MAX_BATCHES) {
    const { data: toDelete, error: selectError } = await supabase
      .from(tableName)
      .select('id')
      .lt(dateColumn, cutoffDate.toISOString())
      .limit(BATCH_SIZE);
    
    if (selectError) {
      console.error(`❌ Error selecting from ${tableName}:`, selectError);
      break;
    }
    
    if (!toDelete || toDelete.length === 0) {
      console.log(`✅ No more records to delete from ${tableName}`);
      break;
    }
    
    const ids = toDelete.map((r: { id: string }) => r.id);
    
    const { error: deleteError } = await supabase
      .from(tableName)
      .delete()
      .in('id', ids);
    
    if (deleteError) {
      console.error(`❌ Error deleting from ${tableName}:`, deleteError);
      break;
    }
    
    totalDeleted += ids.length;
    batchCount++;
    console.log(`🗑️ ${tableName}: Deleted batch ${batchCount} (${ids.length} records, total: ${totalDeleted})`);
    
    if (toDelete.length < BATCH_SIZE) {
      break;
    }
  }
  
  return totalDeleted;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('🧹 Starting webhook cleanup job...');
    console.log(`📅 Webhook retention: ${WEBHOOK_RETENTION_DAYS} days`);
    console.log(`📅 Presence retention: ${PRESENCE_RETENTION_DAYS} days`);

    // Loop through batches until all old records are deleted
    let totalWebhookDeleted = 0;
    let totalFbWebhookDeleted = 0;
    let batchNumber = 0;
    let hasMore = true;

    while (hasMore && batchNumber < MAX_BATCHES) {
      batchNumber++;
      console.log(`🚀 Running cleanup batch ${batchNumber}...`);
      
      const { data: rpcResult, error: rpcError } = await supabase.rpc('cleanup_old_webhook_logs', {
        p_webhook_retention_days: WEBHOOK_RETENTION_DAYS,
        p_batch_size: 5000
      });

      if (rpcError) {
        console.error(`❌ Batch ${batchNumber} failed:`, rpcError);
        break;
      }

      const batchWebhook = rpcResult?.webhook_events_deleted || 0;
      const batchFbWebhook = rpcResult?.fb_webhook_events_deleted || 0;
      
      totalWebhookDeleted += batchWebhook;
      totalFbWebhookDeleted += batchFbWebhook;
      hasMore = rpcResult?.has_more || false;

      console.log(`✅ Batch ${batchNumber}: WA=${batchWebhook}, FB=${batchFbWebhook}, hasMore=${hasMore}`);

      // Increased delay between batches to prevent deadlocks
      if (hasMore) {
        await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS));
      }
    }

    console.log(`📊 Total webhook cleanup: WA=${totalWebhookDeleted}, FB=${totalFbWebhookDeleted}`);

    // Continue with smaller tables using SDK (these shouldn't timeout)
    const presenceCutoff = new Date();
    presenceCutoff.setDate(presenceCutoff.getDate() - PRESENCE_RETENTION_DAYS);
    
    const notificationCutoff = new Date();
    notificationCutoff.setDate(notificationCutoff.getDate() - NOTIFICATION_RETENTION_DAYS);

    // Delete old team presence logs
    console.log('🗑️ Starting team_presence_logs cleanup...');
    const presenceLogsDeleted = await deleteBatched(supabase, 'team_presence_logs', presenceCutoff, 'recorded_at');
    console.log(`✅ Total team_presence_logs deleted: ${presenceLogsDeleted}`);

    // Delete old read notifications
    console.log('🗑️ Starting in_app_notifications cleanup...');
    const notificationsDeleted = await deleteBatched(supabase, 'in_app_notifications', notificationCutoff);
    console.log(`✅ Total in_app_notifications deleted: ${notificationsDeleted}`);

    const durationMs = Date.now() - startTime;

    console.log('✅ Cleanup completed!');
    console.log(`📊 Summary:`);
    console.log(`   - WhatsApp webhook events: ${totalWebhookDeleted}`);
    console.log(`   - Facebook webhook events: ${totalFbWebhookDeleted}`);
    console.log(`   - Presence logs: ${presenceLogsDeleted}`);
    console.log(`   - Notifications: ${notificationsDeleted}`);
    console.log(`   - Batches run: ${batchNumber}`);
    console.log(`   - Duration: ${durationMs}ms`);

    const result: CleanupResult = {
      webhookEventsDeleted: totalWebhookDeleted,
      fbWebhookEventsDeleted: totalFbWebhookDeleted,
      presenceLogsDeleted,
      notificationsDeleted,
      durationMs
    };

    return new Response(
      JSON.stringify({ success: true, batchesRun: batchNumber, ...result }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('❌ Fatal error in cleanup:', errorMsg);
    
    return new Response(
      JSON.stringify({ success: false, error: errorMsg }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
