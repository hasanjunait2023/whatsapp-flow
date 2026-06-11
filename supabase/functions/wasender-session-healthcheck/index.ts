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
    
    if (!wasenderToken) {
      throw new Error('WASENDER_PERSONAL_TOKEN is not configured');
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const results = {
      checked: 0,
      reconnected: 0,
      qr_refreshed: 0,
      errors: [] as string[]
    };

    // Get all instances that need attention
    const { data: instances, error: instancesError } = await supabase
      .from('whatsapp_instances')
      .select(`
        id, 
        tenant_id, 
        wasender_session_id, 
        session_id,
        api_key_encrypted, 
        status, 
        qr_expires_at,
        last_status_at,
        is_deleted
      `)
      .or('wasender_session_id.not.is.null,session_id.not.is.null')
      .eq('is_deleted', false)
      .in('status', ['disconnected', 'banned']);

    if (instancesError) throw instancesError;

    for (const instance of instances || []) {
      results.checked++;

      try {
        // Check subscription status
        const { data: subscription } = await supabase
          .from('subscriptions')
          .select('status')
          .eq('tenant_id', instance.tenant_id)
          .single();

        // Skip if subscription is not active
        if (!subscription || 
            subscription.status === 'suspended' || 
            subscription.status === 'cancelled') {
          continue;
        }

        // Need a valid session_id to check status
        const sessionIdToCheck = instance.session_id;
        if (!sessionIdToCheck) {
          console.log(`Instance ${instance.id} has no session_id, skipping status check`);
          continue;
        }

        // Poll Wasender for current status using PAT
        const statusResponse = await fetch(
          `${WASENDER_API_URL}/whatsapp-sessions/${sessionIdToCheck}`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${wasenderToken}`,
              'Accept': 'application/json'
            }
          }
        );

        // Handle 404 - session no longer exists on Wasender
        if (statusResponse.status === 404) {
          console.log(`Instance ${instance.id}: session ${sessionIdToCheck} no longer exists on Wasender (404)`);
          await supabase
            .from('whatsapp_instances')
            .update({
              session_id: null,
              wasender_session_id: null,
              api_key_encrypted: null,
              qr_code: null,
              qr_expires_at: null,
              connection_error: 'Session expired or deleted on Wasender',
              last_status_at: new Date().toISOString()
            })
            .eq('id', instance.id);
          results.errors.push(`Instance ${instance.id}: session no longer exists, cleared`);
          continue;
        }

        // Get response body once
        const responseText = await statusResponse.text();
        const contentType = statusResponse.headers.get('content-type') || '';

        // Check if response is not OK or is HTML (Wasender sometimes returns 200 with HTML error page)
        if (!statusResponse.ok || !contentType.includes('application/json') || responseText.includes('<!DOCTYPE html>')) {
          console.log(`Instance ${instance.id}: session ${sessionIdToCheck} returned invalid response (status: ${statusResponse.status}), clearing session`);
          await supabase
            .from('whatsapp_instances')
            .update({
              session_id: null,
              wasender_session_id: null,
              api_key_encrypted: null,
              qr_code: null,
              qr_expires_at: null,
              connection_error: 'Session no longer valid on Wasender',
              last_status_at: new Date().toISOString()
            })
            .eq('id', instance.id);
          results.errors.push(`Instance ${instance.id}: invalid session response, cleared`);
          continue;
        }

        let statusData;
        try {
          statusData = JSON.parse(responseText);
        } catch (e) {
          console.error(`Instance ${instance.id}: failed to parse response as JSON`);
          continue;
        }

        const currentStatus = statusData.status || statusData.state;
        console.log(`Instance ${instance.id} status from API:`, currentStatus, 'Raw response:', JSON.stringify(statusData).substring(0, 200));

        // If status is undefined or null, session may not be properly registered
        if (!currentStatus) {
          console.log(`Instance ${instance.id}: session returned no status, clearing session data`);
          await supabase
            .from('whatsapp_instances')
            .update({
              session_id: null,
              wasender_session_id: null,
              api_key_encrypted: null,
              qr_code: null,
              qr_expires_at: null,
              connection_error: 'Session returned invalid status from Wasender',
              last_status_at: new Date().toISOString()
            })
            .eq('id', instance.id);
          results.errors.push(`Instance ${instance.id}: no status returned, cleared`);
          continue;
        }

        // Handle different statuses
        if (currentStatus === 'connected' || currentStatus === 'ready') {
          // Update to active
          await supabase
            .from('whatsapp_instances')
            .update({
              status: 'active',
              connection_error: null,
              last_connected_at: new Date().toISOString(),
              last_status_at: new Date().toISOString(),
              qr_code: null,
              qr_expires_at: null
            })
            .eq('id', instance.id);

          // Update any pending onboarding job
          await supabase
            .from('onboarding_jobs')
            .update({ status: 'connected', step: 'completed' })
            .eq('instance_id', instance.id)
            .in('status', ['awaiting_scan', 'connecting']);

        } else if (currentStatus === 'need_scan' || currentStatus === 'logged_out') {
          // Check if QR is expired
          const qrExpired = !instance.qr_expires_at || 
            new Date(instance.qr_expires_at) < new Date();

          if (qrExpired) {
            // Refresh QR
            await fetch(`${supabaseUrl}/functions/v1/wasender-connect-session`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${supabaseServiceKey}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ instance_id: instance.id })
            });
            results.qr_refreshed++;
          }

        } else if (currentStatus === 'disconnected' || currentStatus === 'expired') {
          // Auto-reconnect
          await fetch(`${supabaseUrl}/functions/v1/wasender-connect-session`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${supabaseServiceKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ instance_id: instance.id })
          });
          results.reconnected++;

          // Send Telegram notification
          await fetch(`${supabaseUrl}/functions/v1/send-telegram-notification`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${supabaseServiceKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              tenant_id: instance.tenant_id,
              instance_id: instance.id,
              type: 'disconnected'
            })
          });
        }

        // Update last status check time
        await supabase
          .from('whatsapp_instances')
          .update({ last_status_at: new Date().toISOString() })
          .eq('id', instance.id);

      } catch (instanceError: unknown) {
        console.error(`Error processing instance ${instance.id}:`, instanceError);
        const errMsg = instanceError instanceof Error ? instanceError.message : 'Unknown error';
        results.errors.push(`Instance ${instance.id}: ${errMsg}`);
      }
    }

    // Also retry failed onboarding jobs with exponential backoff
    const { data: failedJobs } = await supabase
      .from('onboarding_jobs')
      .select('id, instance_id, retry_count')
      .eq('status', 'failed')
      .lt('next_retry_at', new Date().toISOString())
      .lt('retry_count', 5);

    for (const job of failedJobs || []) {
      try {
        if (job.instance_id) {
          // Retry connect
          await fetch(`${supabaseUrl}/functions/v1/wasender-connect-session`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${supabaseServiceKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ instance_id: job.instance_id, job_id: job.id })
          });
        }

        // Update retry count and next retry time
        const backoffSeconds = Math.min(30 * Math.pow(2, job.retry_count), 3600);
        await supabase
          .from('onboarding_jobs')
          .update({
            status: 'connecting',
            retry_count: job.retry_count + 1,
            next_retry_at: new Date(Date.now() + backoffSeconds * 1000).toISOString()
          })
          .eq('id', job.id);

      } catch (jobError) {
        console.error(`Error retrying job ${job.id}:`, jobError);
      }
    }

    return new Response(
      JSON.stringify({
        message: 'Health check complete',
        ...results
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Health check error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
