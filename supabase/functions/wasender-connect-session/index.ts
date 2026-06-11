import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const WASENDER_API_URL = 'https://app.wasenderapi.com/api';

// List all Wasender sessions (with pagination)
async function listAllWasenderSessions(token: string): Promise<any[]> {
  const sessions: any[] = [];
  let page = 1;
  const perPage = 100;
  
  while (true) {
    const response = await fetch(`${WASENDER_API_URL}/whatsapp-sessions?page=${page}&per_page=${perPage}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) break;
    
    const data = await response.json();
    const items = data.data || data;
    if (!Array.isArray(items) || items.length === 0) break;
    
    sessions.push(...items);
    if (items.length < perPage) break;
    page++;
    if (page > 10) break;
  }
  
  return sessions;
}

// Recover numeric session ID from API key
async function recoverSessionId(apiKey: string, phone: string | null, token: string): Promise<string | null> {
  const sessions = await listAllWasenderSessions(token);
  
  for (const session of sessions) {
    const sessionApiKey = session.api_key || session.apiKey;
    if (sessionApiKey === apiKey) {
      return String(session.id || session.session_id);
    }
    
    // Also match by phone if provided
    if (phone) {
      const sessionPhone = session.phone_number || session.phone || '';
      const phoneDigits = phone.replace(/\D/g, '');
      const sessionPhoneDigits = sessionPhone.replace(/\D/g, '');
      if (phoneDigits && sessionPhoneDigits && 
          (phoneDigits.endsWith(sessionPhoneDigits.slice(-7)) || 
           sessionPhoneDigits.endsWith(phoneDigits.slice(-7)))) {
        return String(session.id || session.session_id);
      }
    }
  }
  
  return null;
}

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

    const { instance_id, job_id } = await req.json();

    if (!instance_id) {
      return new Response(
        JSON.stringify({ error: 'instance_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get instance details
    const { data: instance, error: instanceError } = await supabase
      .from('whatsapp_instances')
      .select('id, tenant_id, wasender_session_id, session_id, api_key_encrypted, status, phone_number')
      .eq('id', instance_id)
      .single();

    if (instanceError || !instance) {
      throw new Error('Instance not found');
    }

    // Try to get numeric session_id, recover if missing
    let sessionIdForApi = instance.session_id || instance.wasender_session_id;
    
    if (!sessionIdForApi && instance.api_key_encrypted) {
      console.log('Attempting to recover session_id from API key...');
      const recoveredId = await recoverSessionId(
        instance.api_key_encrypted, 
        instance.phone_number, 
        wasenderToken
      );
      
      if (recoveredId) {
        console.log('Recovered session_id:', recoveredId);
        sessionIdForApi = recoveredId;
        
        // Update DB with recovered ID
        await supabase
          .from('whatsapp_instances')
          .update({ session_id: recoveredId })
          .eq('id', instance_id);
      }
    }
    
    if (!sessionIdForApi) {
      throw new Error('Instance has no Wasender session. Please recreate the instance.');
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

    // Update job status
    if (job_id) {
      await supabase
        .from('onboarding_jobs')
        .update({ step: 'initiating_connection' })
        .eq('id', job_id);
    }

    // Call Wasender connect endpoint
    console.log('Connecting session:', sessionIdForApi);
    const connectResponse = await fetch(
      `${WASENDER_API_URL}/whatsapp-sessions/${sessionIdForApi}/connect`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${wasenderToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      }
    );

    if (!connectResponse.ok) {
      const errorText = await connectResponse.text();
      console.error('Wasender connect error:', errorText);
      
      // Check if already connected
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { message: errorText };
      }
      
      if (errorData?.message?.toLowerCase().includes('already connected')) {
        console.log('Session is already connected, updating status to active');
        
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
          .eq('id', instance_id);

        if (job_id) {
          await supabase
            .from('onboarding_jobs')
            .update({
              status: 'completed',
              completed_at: new Date().toISOString()
            })
            .eq('id', job_id);
        }

        return new Response(
          JSON.stringify({
            message: 'Already connected',
            instance_id,
            status: 'active'
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Update instance with error
      await supabase
        .from('whatsapp_instances')
        .update({
          connection_error: `Connect failed: ${errorText}`,
          last_status_at: new Date().toISOString()
        })
        .eq('id', instance_id);

      if (job_id) {
        await supabase
          .from('onboarding_jobs')
          .update({
            status: 'failed',
            error_message: `Connect failed: ${errorText}`,
            retry_count: 1,
            next_retry_at: new Date(Date.now() + 30000).toISOString()
          })
          .eq('id', job_id);
      }

      throw new Error(`Failed to connect: ${errorText}`);
    }

    const connectData = await connectResponse.json();
    console.log('Connect response:', connectData);

    // Update instance status
    await supabase
      .from('whatsapp_instances')
      .update({
        status: 'disconnected',
        connection_error: null,
        last_status_at: new Date().toISOString()
      })
      .eq('id', instance_id);

    // Fetch QR code
    const qrResponse = await fetch(`${supabaseUrl}/functions/v1/wasender-get-qrcode`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ instance_id, job_id })
    });

    const qrResult = await qrResponse.json();

    // Send Telegram notification that QR is ready
    await fetch(`${supabaseUrl}/functions/v1/send-telegram-notification`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        tenant_id: instance.tenant_id,
        instance_id: instance.id,
        type: 'qr_ready'
      })
    });

    return new Response(
      JSON.stringify({
        message: 'Connection initiated',
        instance_id,
        qr_result: qrResult
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Connect session error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
