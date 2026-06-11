 import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
 
 const corsHeaders = {
   'Access-Control-Allow-Origin': '*',
   'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
 };
 
 const WASENDER_API_URL = 'https://app.wasenderapi.com/api';
 
 Deno.serve(async (req) => {
   if (req.method === 'OPTIONS') {
     return new Response(null, { headers: corsHeaders });
   }
 
   try {
     const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
     const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
     const wasenderToken = Deno.env.get('WASENDER_PERSONAL_TOKEN');
     const supabase = createClient(supabaseUrl, supabaseServiceKey);
 
     if (!wasenderToken) {
       throw new Error('WASENDER_PERSONAL_TOKEN not configured');
     }
 
     const { instance_id, dry_run = false, source_instance_ids = null } = await req.json();
 
     if (!instance_id) {
       return new Response(
         JSON.stringify({ error: 'instance_id is required' }),
         { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
       );
     }
 
     console.log('Fixing webhook for instance:', instance_id, { dry_run, source_instance_ids });
 
     // Fetch the target instance
     const { data: instance, error: instanceError } = await supabase
       .from('whatsapp_instances')
       .select('id, session_id, api_key_encrypted, wasender_session_id, phone_number, name, tenant_id')
       .eq('id', instance_id)
       .single();
 
     if (instanceError || !instance) {
       console.error('Instance not found:', instanceError);
       return new Response(
         JSON.stringify({ error: 'Instance not found' }),
         { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
       );
     }
 
     if (!instance.session_id) {
       return new Response(
         JSON.stringify({ error: 'Instance has no session_id - cannot update webhook' }),
         { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
       );
     }
 
     console.log('Instance details:', {
       id: instance.id,
       session_id: instance.session_id,
       phone_number: instance.phone_number,
       name: instance.name,
     });
 
     // Build the correct webhook URL
     const correctWebhookUrl = `${supabaseUrl}/functions/v1/wasender-webhook/${instance.id}`;
     console.log('Correct webhook URL:', correctWebhookUrl);
 
     // Resolve source instances (either explicit override OR duplicates by session_id)
     let sourceInstanceIds: string[] = [];
     let duplicates: any[] = [];
 
     if (Array.isArray(source_instance_ids) && source_instance_ids.length > 0) {
       sourceInstanceIds = source_instance_ids.filter((x: any) => typeof x === 'string' && x && x !== instance.id);
       if (sourceInstanceIds.length > 0) {
         const { data: srcRows } = await supabase
           .from('whatsapp_instances')
           .select('id, name, tenant_id, phone_number, status')
           .in('id', sourceInstanceIds);
         duplicates = srcRows || [];
       }
     } else {
       // Find all other instances with the same session_id (duplicates)
       const { data: dupRows, error: dupError } = await supabase
         .from('whatsapp_instances')
         .select('id, name, tenant_id, phone_number, status')
         .eq('session_id', instance.session_id)
         .neq('id', instance.id);
 
       if (dupError) {
         console.error('Error finding duplicates:', dupError);
       }
 
       duplicates = dupRows || [];
       sourceInstanceIds = duplicates.map((d: any) => d.id);
     }
 
     console.log('Found source instances:', sourceInstanceIds.length, duplicates);
 
     const actions: any[] = [];
 
     // Step 1: Update webhook on Wasender API
     if (!dry_run) {
       console.log('Updating Wasender webhook for session:', instance.session_id);
 
       const updateResponse = await fetch(`${WASENDER_API_URL}/whatsapp-sessions/${instance.session_id}`, {
         method: 'PUT',
         headers: {
           'Authorization': `Bearer ${wasenderToken}`,
           'Content-Type': 'application/json',
           'Accept': 'application/json',
         },
         body: JSON.stringify({
           webhook_url: correctWebhookUrl,
           webhook_enabled: true,
           webhook_events: [
             'messages.received',
             'messages.upsert',
             'messages.update',
             'session.status',
             'qrcode.updated',
           ],
         }),
       });
 
       const updateText = await updateResponse.text();
       let updateJson: any = null;
       try {
         updateJson = JSON.parse(updateText);
       } catch {
         // ignore
       }
 
       console.log('Wasender update response:', { status: updateResponse.status, body: updateText.slice(0, 500) });
 
       if (!updateResponse.ok) {
         return new Response(
           JSON.stringify({
             error: 'Failed to update Wasender webhook',
             wasender_status: updateResponse.status,
             wasender_response: updateJson || updateText,
           }),
           { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
         );
       }
 
       actions.push({
         action: 'wasender_webhook_updated',
         session_id: instance.session_id,
         new_webhook_url: correctWebhookUrl,
         wasender_response: updateJson,
       });
     } else {
       actions.push({
         action: 'would_update_wasender_webhook',
         session_id: instance.session_id,
         new_webhook_url: correctWebhookUrl,
       });
     }
 
     // Step 2: Migrate existing data from source instance(s) to the target instance
     if (sourceInstanceIds.length > 0) {
       const { count: targetThreadCount } = await supabase
         .from('contact_thread_state')
         .select('contact_id', { count: 'exact', head: true })
         .eq('instance_id', instance.id);
 
       // Safety: only auto-migrate when target is empty to avoid accidental merges
       if ((targetThreadCount || 0) > 0) {
         actions.push({
           action: 'migration_skipped_target_not_empty',
           target_thread_state_count: targetThreadCount,
           source_instance_ids: sourceInstanceIds,
         });
       } else {
         for (const srcId of sourceInstanceIds) {
           const counts = await getInstanceDataCounts(supabase, srcId);
 
           if (!dry_run) {
             await migrateInstanceData(supabase, srcId, instance.id);
           }
 
           actions.push({
             action: dry_run ? 'would_migrate_instance_data' : 'instance_data_migrated',
             from_instance_id: srcId,
             to_instance_id: instance.id,
             counts,
           });
         }
       }
     }
 
     // Step 3: Clear duplicate session references from source instances
     if (sourceInstanceIds.length > 0) {
       if (!dry_run) {
         console.log('Clearing session references from source instances:', sourceInstanceIds);
 
         const { error: clearError } = await supabase
           .from('whatsapp_instances')
           .update({
             wasender_session_id: null,
             session_id: null,
             api_key_encrypted: null,
             status: 'disconnected',
           })
           .in('id', sourceInstanceIds);
 
         if (clearError) {
           console.error('Error clearing source instances:', clearError);
           actions.push({
             action: 'clear_sources_failed',
             error: clearError.message,
             instance_ids: sourceInstanceIds,
           });
         } else {
           actions.push({
             action: 'sources_cleared',
             instance_ids: sourceInstanceIds,
             instances: duplicates,
           });
         }
       } else {
         actions.push({
           action: 'would_clear_sources',
           instance_ids: sourceInstanceIds,
           instances: duplicates,
         });
       }
     }
 
     // Step 4: Verify the current Wasender session status
     let sessionStatus: any = null;
     if (!dry_run) {
       const verifyResponse = await fetch(`${WASENDER_API_URL}/whatsapp-sessions/${instance.session_id}`, {
         method: 'GET',
         headers: {
           'Authorization': `Bearer ${wasenderToken}`,
           'Accept': 'application/json',
         },
       });
 
       if (verifyResponse.ok) {
         const verifyJson = await verifyResponse.json();
         sessionStatus = verifyJson.data || verifyJson;
         console.log('Verified session status:', {
           id: sessionStatus.id,
           status: sessionStatus.status,
           webhook_url: sessionStatus.webhook_url,
         });
 
         actions.push({
           action: 'session_verified',
           session_id: sessionStatus.id,
           status: sessionStatus.status,
           webhook_url: sessionStatus.webhook_url,
           webhook_enabled: sessionStatus.webhook_enabled,
         });
 
         // Also sync instance phone_number to what Wasender reports (fixes UI badge)
         const phoneFromWasender = sessionStatus.phone_number || null;
         if (phoneFromWasender && phoneFromWasender !== instance.phone_number) {
           await supabase
             .from('whatsapp_instances')
             .update({ phone_number: phoneFromWasender, updated_at: new Date().toISOString() })
             .eq('id', instance.id);
 
           actions.push({
             action: 'instance_phone_synced',
             previous_phone_number: instance.phone_number,
             new_phone_number: phoneFromWasender,
           });
         }
       }
     }
 
     return new Response(
       JSON.stringify({
         success: true,
         dry_run,
         instance_id: instance.id,
         session_id: instance.session_id,
         correct_webhook_url: correctWebhookUrl,
         sources_found: sourceInstanceIds.length,
         sources: duplicates,
         actions,
         session_status: sessionStatus,
       }),
       { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
     );
 
   } catch (error: unknown) {
     console.error('Admin fix webhook error:', error);
     const message = error instanceof Error ? error.message : 'Unknown error';
     return new Response(
       JSON.stringify({ error: message }),
       { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
     );
   }
 });

async function getInstanceDataCounts(supabase: any, instanceId: string) {
  const [{ count: contactsCount }, { count: messagesCount }, { count: threadsCount }] = await Promise.all([
    supabase.from('contacts').select('id', { count: 'exact', head: true }).eq('instance_id', instanceId),
    supabase.from('messages').select('id', { count: 'exact', head: true }).eq('instance_id', instanceId),
    supabase.from('contact_thread_state').select('contact_id', { count: 'exact', head: true }).eq('instance_id', instanceId),
  ]);

  return {
    contacts: contactsCount || 0,
    messages: messagesCount || 0,
    thread_state: threadsCount || 0,
  };
}

async function migrateInstanceData(supabase: any, fromInstanceId: string, toInstanceId: string) {
  // Update instance_id on all related tables so inbox history follows the session
  await Promise.all([
    supabase.from('contacts').update({ instance_id: toInstanceId }).eq('instance_id', fromInstanceId),
    supabase.from('messages').update({ instance_id: toInstanceId }).eq('instance_id', fromInstanceId),
    supabase.from('contact_thread_state').update({ instance_id: toInstanceId }).eq('instance_id', fromInstanceId),
  ]);
}
