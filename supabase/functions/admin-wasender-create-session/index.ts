import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const WASENDER_API_URL = 'https://app.wasenderapi.com/api';

/**
 * Admin Create Session - For Central Admin Panel ONLY
 * 
 * Flow:
 * 1. Validate input
 * 2. Check for existing instance with same phone in DB (reject if exists)
 * 3. Create DB record with status 'disconnected'
 * 4. Call Wasender POST /api/whatsapp-sessions
 * 5. If "phone taken" → list ALL sessions (paginated) → find match → adopt
 * 6. If still no match → try to delete orphaned registration via API
 * 7. Save session_id, api_key to DB
 * 8. Return { instance_id, needs_connect: true }
 */
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

    const { name, phone_number } = await req.json();

    if (!name?.trim()) {
      return new Response(
        JSON.stringify({ error: 'name is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!phone_number?.trim()) {
      return new Response(
        JSON.stringify({ error: 'phone_number is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get System Tenant
    const { data: systemTenant, error: tenantError } = await supabase
      .from('tenants')
      .select('id, name')
      .eq('settings->>is_system_tenant', 'true')
      .single();

    if (tenantError || !systemTenant) {
      console.error('Error fetching system tenant:', tenantError);
      return new Response(
        JSON.stringify({ error: 'System tenant not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Creating instance for system tenant:', systemTenant.id);

    // Format phone number to E.164 format
    let formattedPhone = phone_number.replace(/\D/g, '');
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '88' + formattedPhone;
    }
    if (!formattedPhone.startsWith('+')) {
      formattedPhone = '+' + formattedPhone;
    }
    console.log('Formatted phone number:', formattedPhone);
    const targetDigits = formattedPhone.replace(/\D/g, '');

    // Check for existing ACTIVE instance with same phone in our DB (not deleted)
    const { data: existingActiveInstance } = await supabase
      .from('whatsapp_instances')
      .select('id, status')
      .eq('tenant_id', systemTenant.id)
      .eq('phone_number', phone_number)
      .or('is_deleted.is.null,is_deleted.eq.false')
      .maybeSingle();

    if (existingActiveInstance) {
      return new Response(
        JSON.stringify({ error: 'An instance with this phone number already exists in your account' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create local DB record first with status 'disconnected'
    const { data: instance, error: instanceError } = await supabase
      .from('whatsapp_instances')
      .insert({
        tenant_id: systemTenant.id,
        name: name.trim(),
        phone_number: phone_number.trim(),
        status: 'disconnected',
        is_default: false,
      })
      .select('id')
      .single();

    if (instanceError || !instance) {
      console.error('Error creating instance record:', instanceError);
      throw instanceError || new Error('Failed to create instance record');
    }

    console.log('Created local instance:', instance.id);

    // Generate webhook URL
    const webhookUrl = `${supabaseUrl}/functions/v1/wasender-webhook/${instance.id}`;
    const webhookSecret = crypto.randomUUID().replace(/-/g, '');

    // Create session via Wasender API
    console.log('Creating Wasender session with webhook:', webhookUrl);

    const createSessionResponse = await fetch(`${WASENDER_API_URL}/whatsapp-sessions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${wasenderToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        name: name.trim(),
        phone_number: formattedPhone,
        account_protection: true,
        log_messages: true,
        read_incoming_messages: false,
        webhook_url: webhookUrl,
        webhook_enabled: true,
        webhook_events: [
          'messages.received',
          'messages.upsert',
          'messages.update',
          'session.status',
          'qrcode.updated'
        ]
      })
    });

    if (!createSessionResponse.ok) {
      const errorText = await createSessionResponse.text();
      console.error('Wasender API error:', errorText);

      // Parse error
      let errorJson: any = null;
      try {
        errorJson = JSON.parse(errorText);
      } catch {
        // ignore
      }

      // Check if phone is already taken in Wasender
      const phoneErrors = errorJson?.errors?.phone_number;
      const isPhoneTaken =
        (Array.isArray(phoneErrors) && phoneErrors.some((m: string) => String(m).toLowerCase().includes('taken')))
        || String(errorJson?.message || '').toLowerCase().includes('taken');

      if (isPhoneTaken) {
        console.log('Phone already exists in Wasender; attempting to adopt existing session...');
        
        // Try to adopt existing session
        const adoptResult = await adoptExistingSession(
          wasenderToken, 
          targetDigits, 
          instance.id, 
          webhookUrl,
          supabase
        );

        if (adoptResult.success) {
          console.log('Session adopted successfully:', adoptResult.sessionId);
          
          return new Response(
            JSON.stringify({
              message: 'Existing Wasender session adopted',
              instance_id: instance.id,
              session_id: adoptResult.sessionId,
              adopted: true,
              needs_connect: true
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Adoption failed - the phone is registered but no visible session
        // This means it's an orphaned registration. Clean up and inform user.
        console.error('Adoption failed:', adoptResult.error);
        console.log('Available sessions found:', adoptResult.availableSessions);
        
        await supabase.from('whatsapp_instances').delete().eq('id', instance.id);

        return new Response(
          JSON.stringify({ 
            error: `Phone ${formattedPhone} is registered in Wasender but the session is not accessible. This may be an orphaned registration. Please contact Wasender support or try a different phone number.`,
            details: adoptResult.error,
            available_phones: adoptResult.availableSessions
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Other error - clean up the DB record
      await supabase.from('whatsapp_instances').delete().eq('id', instance.id);

      return new Response(
        JSON.stringify({ error: `Failed to create Wasender session: ${errorText}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const sessionResponse = await createSessionResponse.json();
    console.log('Wasender session created:', sessionResponse);

    // Extract session data
    const sessionData = sessionResponse.data || sessionResponse;
    const numericSessionId = sessionData.id || sessionData.session_id;
    const apiKey = sessionData.api_key || sessionData.apiKey;
    const webhookSecretFromApi = sessionData.webhook_secret;

    if (!numericSessionId) {
      console.error('No session ID in response:', sessionResponse);
      await supabase.from('whatsapp_instances').delete().eq('id', instance.id);
      throw new Error('Wasender API did not return a session ID');
    }

    const wasenderSessionIdForWebhook = apiKey || String(numericSessionId);

    console.log('Extracted numeric ID:', numericSessionId, 'API Key:', apiKey ? apiKey.substring(0, 10) + '...' : 'missing');

    // Update instance with Wasender session details
    const { error: updateError } = await supabase
      .from('whatsapp_instances')
      .update({
        wasender_session_id: wasenderSessionIdForWebhook,
        api_key_encrypted: apiKey,
        webhook_secret: webhookSecretFromApi || webhookSecret,
        session_id: String(numericSessionId),
        updated_at: new Date().toISOString()
      })
      .eq('id', instance.id);

    if (updateError) {
      console.error('Error updating instance with session details:', updateError);
      throw updateError;
    }

    console.log('Instance created successfully. UI must now call connect-session.');

    return new Response(
      JSON.stringify({
        message: 'Instance created successfully',
        instance_id: instance.id,
        session_id: String(numericSessionId),
        needs_connect: true
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Admin create session error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

/**
 * Adopt an existing Wasender session by matching phone number
 * Searches across multiple pages to find the session
 */
async function adoptExistingSession(
  token: string,
  targetDigits: string,
  instanceId: string,
  webhookUrl: string,
  supabase: any
): Promise<{ success: boolean; sessionId?: string; error?: string; availableSessions?: string[] }> {
  const allSessions: any[] = [];
  const availablePhones: string[] = [];
  
  try {
    // Fetch multiple pages of sessions to ensure we find the match
    for (let page = 1; page <= 5; page++) {
      const listResponse = await fetch(`${WASENDER_API_URL}/whatsapp-sessions?per_page=100&page=${page}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      });

      if (!listResponse.ok) {
        console.log(`Failed to fetch page ${page}:`, listResponse.status);
        break;
      }

      const listData = await listResponse.json();
      const sessions = extractSessionsArray(listData);
      
      if (sessions.length === 0) break;
      
      allSessions.push(...sessions);
      console.log(`Page ${page}: Found ${sessions.length} sessions (total: ${allSessions.length})`);
      
      // Check if there's more pages
      const totalPages = listData?.meta?.last_page || listData?.last_page || 1;
      if (page >= totalPages) break;
    }

    console.log('Total sessions found across all pages:', allSessions.length);
    
    // Collect all phone numbers for error reporting
    for (const s of allSessions) {
      const phone = s?.phone_number ?? s?.phoneNumber ?? s?.phone;
      if (phone) availablePhones.push(phone);
    }
    
    // Log all sessions for debugging
    allSessions.forEach((s: any, idx: number) => {
      const phone = s?.phone_number ?? s?.phoneNumber ?? s?.phone ?? 'NO_PHONE';
      const name = s?.name ?? 'NO_NAME';
      const id = s?.id ?? s?.session_id ?? 'NO_ID';
      console.log(`Session ${idx}: id=${id}, name=${name}, phone=${phone}`);
    });

    // Find session matching our phone
    let match = allSessions.find((s: any) => {
      const sPhone = s?.phone_number ?? s?.phoneNumber ?? s?.phone;
      if (typeof sPhone !== 'string' || !sPhone) return false;
      return phoneDigitsMatch(sPhone, targetDigits);
    });

    if (match) {
      console.log('Found match in list response:', match?.id);
      const result = await updateInstanceWithSession(supabase, instanceId, match, webhookUrl, token);
      return { ...result, availableSessions: availablePhones };
    }

    // No match in list - fetch details for each session (in case phone is only in details)
    console.log('No match in list, fetching individual session details...');
    
    for (const s of allSessions.slice(0, 30)) {
      const id = s?.id ?? s?.session_id;
      if (!id) continue;

      try {
        const detailRes = await fetch(`${WASENDER_API_URL}/whatsapp-sessions/${id}`, {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
        });

        if (!detailRes.ok) continue;

        const detailData = await detailRes.json();
        const detail = detailData.data || detailData;
        const phone = detail?.phone_number ?? detail?.phoneNumber ?? detail?.phone;
        
        console.log(`Session ${id} detail phone: ${phone}`);

        if (typeof phone === 'string' && phone && phoneDigitsMatch(phone, targetDigits)) {
          console.log(`Match found in detail for session ${id}`);
          const result = await updateInstanceWithSession(supabase, instanceId, detail, webhookUrl, token);
          return { ...result, availableSessions: availablePhones };
        }
      } catch (e) {
        console.log(`Error fetching details for session ${id}:`, e);
      }
    }

    return { 
      success: false, 
      error: `No matching session found. Target: ${targetDigits}. Available: ${availablePhones.join(', ')}`,
      availableSessions: availablePhones
    };
  } catch (err) {
    console.error('Adoption error:', err);
    return { 
      success: false, 
      error: err instanceof Error ? err.message : 'Unknown error',
      availableSessions: availablePhones
    };
  }
}

async function updateInstanceWithSession(
  supabase: any,
  instanceId: string,
  session: any,
  webhookUrl: string,
  token: string
): Promise<{ success: boolean; sessionId?: string; error?: string }> {
  const numericId = session?.id ?? session?.session_id;
  const apiKey = session?.api_key ?? session?.apiKey;

  console.log('Updating instance with session:', { numericId, hasApiKey: !!apiKey });

  if (!numericId || !apiKey) {
    return { success: false, error: `Session missing id (${numericId}) or api_key (${!!apiKey})` };
  }

  // Update webhook URL on the adopted session
  try {
    const updateRes = await fetch(`${WASENDER_API_URL}/whatsapp-sessions/${numericId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        webhook_url: webhookUrl,
        webhook_enabled: true,
        webhook_events: ['messages.received', 'messages.upsert', 'messages.update', 'session.status', 'qrcode.updated']
      })
    });
    console.log('Webhook update response:', updateRes.status);
  } catch (e) {
    console.warn('Failed to update webhook on adopted session:', e);
  }

  // Update our DB record
  const { error } = await supabase
    .from('whatsapp_instances')
    .update({
      session_id: String(numericId),
      api_key_encrypted: apiKey,
      wasender_session_id: apiKey,
      updated_at: new Date().toISOString()
    })
    .eq('id', instanceId);

  if (error) {
    console.error('DB update error:', error);
    return { success: false, error: 'Failed to update instance record' };
  }

  return { success: true, sessionId: String(numericId) };
}

function extractSessionsArray(payload: any): any[] {
  const d1 = payload?.data;
  if (Array.isArray(d1)) return d1;
  const d2 = d1?.data;
  if (Array.isArray(d2)) return d2;
  if (Array.isArray(payload)) return payload;
  return [];
}

function phoneDigitsMatch(phone1: string, phone2: string): boolean {
  const d1 = phone1.replace(/\D/g, '');
  const d2 = phone2.replace(/\D/g, '');
  
  if (!d1 || !d2) return false;
  
  // Exact match
  if (d1 === d2) return true;
  
  // Get the last 10 digits (local number without country code)
  const last10_d1 = d1.slice(-10);
  const last10_d2 = d2.slice(-10);
  
  // Match if last 10 digits are the same
  if (last10_d1 === last10_d2 && last10_d1.length >= 9) return true;
  
  // Suffix matching with flexibility
  if (d1.endsWith(d2) || d2.endsWith(d1)) return true;
  
  return false;
}
