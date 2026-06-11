import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const WASENDER_API_URL = 'https://app.wasenderapi.com/api';
const MIN_QR_NOTIFICATION_INTERVAL = 2 * 60 * 1000; // 2 minutes

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const wasenderToken = Deno.env.get('WASENDER_PERSONAL_TOKEN');
    
    if (!wasenderToken) {
      throw new Error('WASENDER_PERSONAL_TOKEN not configured');
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { instance_id, job_id, send_notification = true } = await req.json();

    if (!instance_id) {
      return new Response(
        JSON.stringify({ error: 'instance_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get instance details
    const { data: instance, error: instanceError } = await supabase
      .from('whatsapp_instances')
      .select('id, tenant_id, wasender_session_id, session_id, api_key_encrypted, last_qr_sent_at')
      .eq('id', instance_id)
      .single();

    if (instanceError || !instance) {
      throw new Error('Instance not found');
    }

    // Prefer numeric session_id for API calls, fallback to wasender_session_id
    const sessionIdForApi = instance.session_id || instance.wasender_session_id;
    
    if (!sessionIdForApi) {
      throw new Error('Instance has no Wasender session');
    }

    // Check subscription status
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('status')
      .eq('tenant_id', instance.tenant_id)
      .single();

    if (subscription?.status === 'suspended' || subscription?.status === 'cancelled') {
      return new Response(
        JSON.stringify({ error: 'Payment required', code: 'SUBSCRIPTION_INACTIVE' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch QR code from Wasender using numeric session ID
    console.log('Fetching QR for session:', sessionIdForApi);
    const qrResponse = await fetch(
      `${WASENDER_API_URL}/whatsapp-sessions/${sessionIdForApi}/qrcode`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${wasenderToken}`,
          'Accept': 'application/json'
        }
      }
    );

    if (!qrResponse.ok) {
      const errorText = await qrResponse.text();
      console.error('Wasender QR error:', errorText);
      
      // Check if session is already connected
      if (qrResponse.status === 400 || qrResponse.status === 409) {
        // Session might be connected already
        return new Response(
          JSON.stringify({ 
            message: 'QR not available - session may be connected',
            status: 'check_connection'
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      throw new Error(`Failed to get QR: ${errorText}`);
    }

    const qrData = await qrResponse.json();
    console.log('QR response:', { hasQr: !!qrData.data?.qrCode || !!qrData.qrCode });

    // API returns: { success: true, data: { qrCode: "..." } }
    const qrCode = qrData.data?.qrCode || qrData.qrCode || qrData.qr || qrData.qrcode;
    const expiresAt = qrData.expires_at || qrData.expiresAt || 
      new Date(Date.now() + 60000).toISOString(); // Default 60 seconds

    // Update instance with QR code
    await supabase
      .from('whatsapp_instances')
      .update({
        qr_code: qrCode,
        qr_expires_at: expiresAt,
        status: 'disconnected',
        connection_error: null
      })
      .eq('id', instance_id);

    // Update job status
    if (job_id) {
      await supabase
        .from('onboarding_jobs')
        .update({
          status: 'awaiting_scan',
          step: 'qr_ready'
        })
        .eq('id', job_id);
    }

    // Check if we should send notification (rate limiting)
    let notificationSent = false;
    if (send_notification) {
      const lastSent = instance.last_qr_sent_at ? new Date(instance.last_qr_sent_at).getTime() : 0;
      const elapsed = Date.now() - lastSent;

      if (elapsed >= MIN_QR_NOTIFICATION_INTERVAL) {
        // Get tenant owner for notification
        const { data: tenant } = await supabase
          .from('tenants')
          .select('owner_id')
          .eq('id', instance.tenant_id)
          .single();

        if (tenant?.owner_id) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('email')
            .eq('id', tenant.owner_id)
            .single();

          if (profile?.email) {
            // Create notification record
            await supabase
              .from('notifications')
              .insert({
                tenant_id: instance.tenant_id,
                instance_id: instance_id,
                type: 'qr_ready',
                channel: 'in_app',
                recipient: profile.email,
                status: 'sent',
                sent_at: new Date().toISOString(),
                metadata: { qr_expires_at: expiresAt }
              });

            // Update last sent time
            await supabase
              .from('whatsapp_instances')
              .update({ last_qr_sent_at: new Date().toISOString() })
              .eq('id', instance_id);

            notificationSent = true;
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        qr_code: qrCode,
        expires_at: expiresAt,
        notification_sent: notificationSent
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Get QR error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
