import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const WASENDER_API_URL = 'https://app.wasenderapi.com/api';

// Compare phone numbers by suffix (handles +880 vs 018 differences)
function phoneDigitsMatch(s1: string, s2: string): boolean {
  const d1 = s1.replace(/\D/g, '');
  const d2 = s2.replace(/\D/g, '');
  if (!d1 || !d2) return false;
  // Compare last 7-11 digits
  const suffixes = [d2.slice(-10), d2.slice(-11), d2.slice(-7)].filter(s => s.length > 0);
  return suffixes.some(suf => d1.endsWith(suf) || d2.endsWith(suf));
}

// Check if error indicates phone is taken
function isPhoneTakenError(errorText: string): boolean {
  const lower = errorText.toLowerCase();
  return lower.includes('already registered') || 
         lower.includes('phone number') && (lower.includes('taken') || lower.includes('exists') || lower.includes('use'));
}

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
    if (page > 10) break; // Safety limit
  }
  
  return sessions;
}

// Deep search: fetch each session's details to find phone match
async function findSessionForPhoneDeep(phone: string, token: string): Promise<any | null> {
  const sessions = await listAllWasenderSessions(token);
  
  for (const session of sessions) {
    // Check if phone matches at list level
    if (session.phone_number && phoneDigitsMatch(phone, session.phone_number)) {
      return session;
    }
    if (session.phone && phoneDigitsMatch(phone, session.phone)) {
      return session;
    }
  }
  
  // If no match found in list, fetch individual details
  for (const session of sessions) {
    const id = session.id || session.session_id;
    if (!id) continue;
    
    try {
      const detailResponse = await fetch(`${WASENDER_API_URL}/whatsapp-sessions/${id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });
      
      if (!detailResponse.ok) continue;
      
      const detail = await detailResponse.json();
      const detailData = detail.data || detail;
      const detailPhone = detailData.phone_number || detailData.phone || '';
      
      if (detailPhone && phoneDigitsMatch(phone, detailPhone)) {
        return { ...session, ...detailData };
      }
    } catch {
      continue;
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
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (!wasenderToken) {
      throw new Error('WASENDER_PERSONAL_TOKEN not configured');
    }

    const { tenant_id, job_id, phone_number } = await req.json();

    if (!tenant_id) {
      return new Response(
        JSON.stringify({ error: 'tenant_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!phone_number) {
      return new Response(
        JSON.stringify({ error: 'phone_number is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Format phone number to E.164 format
    let formattedPhone = phone_number.replace(/\D/g, '');
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '88' + formattedPhone;
    }
    if (!formattedPhone.startsWith('+')) {
      formattedPhone = '+' + formattedPhone;
    }
    console.log('Formatted phone number:', formattedPhone);

    // Check subscription status and plan limits
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('status, plan:plans(max_instances)')
      .eq('tenant_id', tenant_id)
      .maybeSingle();

    if (subscription?.status === 'suspended' || subscription?.status === 'cancelled') {
      return new Response(
        JSON.stringify({ error: 'Payment required', code: 'SUBSCRIPTION_INACTIVE' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check instance limit from plan
    const maxInstances = (subscription?.plan as any)?.max_instances || 1;
    const { count: instanceCount, error: countError } = await supabase
      .from('whatsapp_instances')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenant_id)
      .or('is_deleted.is.null,is_deleted.eq.false');

    // Look for existing instance with this phone number (active or soft-deleted)
    const { data: existingByPhone } = await supabase
      .from('whatsapp_instances')
      .select('id, wasender_session_id, session_id, status, is_deleted, phone_number')
      .eq('tenant_id', tenant_id)
      .order('created_at', { ascending: false });

    // Find matching phone instance
    const matchingInstance = existingByPhone?.find(inst => 
      inst.phone_number && phoneDigitsMatch(inst.phone_number, phone_number)
    );

    if (matchingInstance && matchingInstance.wasender_session_id && !matchingInstance.is_deleted) {
      // Verify session still exists on Wasender
      console.log('Found existing instance with matching phone, verifying on Wasender...');
      
      const sessionIdForApi = matchingInstance.session_id || matchingInstance.wasender_session_id;
      const verifyResponse = await fetch(
        `${WASENDER_API_URL}/whatsapp-sessions/${sessionIdForApi}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${wasenderToken}`,
            'Accept': 'application/json'
          }
        }
      );

      if (verifyResponse.ok) {
        console.log('Existing session verified, returning for connect');
        return new Response(
          JSON.stringify({
            message: 'Using existing session',
            instance_id: matchingInstance.id,
            wasender_session_id: matchingInstance.wasender_session_id,
            needs_connect: true,
            reused: true
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Check limits (excluding soft-deleted)
    if (!countError && instanceCount !== null && instanceCount >= maxInstances && !matchingInstance) {
      return new Response(
        JSON.stringify({
          error: 'Instance limit reached',
          code: 'INSTANCE_LIMIT_REACHED',
          current: instanceCount,
          max: maxInstances,
          upgrade_required: true
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get tenant info for session name
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('id, name')
      .eq('id', tenant_id)
      .single();

    if (tenantError || !tenant) {
      throw new Error('Tenant not found');
    }

    // Determine which instance to use
    let instance: { id: string } | null = null;
    let isReusingInstance = false;

    // Reactivate soft-deleted instance with matching phone
    if (matchingInstance?.is_deleted) {
      console.log('Reactivating soft-deleted instance:', matchingInstance.id);
      await supabase
        .from('whatsapp_instances')
        .update({
          is_deleted: false,
          deleted_at: null,
          status: 'disconnected',
          wasender_session_id: null,
          session_id: null,
          api_key_encrypted: null,
          qr_code: null,
          qr_expires_at: null
        })
        .eq('id', matchingInstance.id);
      
      instance = matchingInstance;
      isReusingInstance = true;
    }

    // Or reuse an existing instance without wasender_session_id (not deleted)
    if (!instance) {
      const { data: reuseInstance } = await supabase
        .from('whatsapp_instances')
        .select('id')
        .eq('tenant_id', tenant_id)
        .is('wasender_session_id', null)
        .eq('is_deleted', false)
        .maybeSingle();

      if (reuseInstance) {
        instance = reuseInstance;
        isReusingInstance = true;
        console.log('Reusing existing instance record:', instance.id);
      }
    }
    
    // Also check for ANY soft-deleted instance to reactivate (regardless of phone match)
    if (!instance) {
      const { data: deletedInstance } = await supabase
        .from('whatsapp_instances')
        .select('id')
        .eq('tenant_id', tenant_id)
        .eq('is_deleted', true)
        .order('deleted_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (deletedInstance) {
        console.log('Reactivating soft-deleted instance:', deletedInstance.id);
        await supabase
          .from('whatsapp_instances')
          .update({
            is_deleted: false,
            deleted_at: null,
            status: 'disconnected',
            wasender_session_id: null,
            session_id: null,
            api_key_encrypted: null,
            qr_code: null,
            qr_expires_at: null,
            phone_number: phone_number || null
          })
          .eq('id', deletedInstance.id);
        
        instance = deletedInstance;
        isReusingInstance = true;
      }
    }

    // Create new instance if needed
    if (!instance) {
      if (job_id) {
        await supabase
          .from('onboarding_jobs')
          .update({ status: 'creating_session', step: 'creating_db_record' })
          .eq('id', job_id);
      }

      const { data: newInstance, error: instanceError } = await supabase
        .from('whatsapp_instances')
        .insert({
          tenant_id,
          name: `${tenant.name} WhatsApp`,
          phone_number: phone_number || null,
          status: 'disconnected',
          is_default: true
        })
        .select()
        .single();

      if (instanceError || !newInstance) {
        console.error('Error creating instance record:', instanceError);
        throw instanceError || new Error('Failed to create instance');
      }

      instance = newInstance;
    }

    // At this point instance must exist
    if (!instance) {
      throw new Error('Failed to obtain or create instance');
    }
    
    const instanceId = instance.id;
    console.log('Using instance:', instanceId);

    // Update phone number on the instance
    await supabase
      .from('whatsapp_instances')
      .update({ phone_number: phone_number })
      .eq('id', instanceId);

    // Generate webhook URL
    const webhookUrl = `${supabaseUrl}/functions/v1/wasender-webhook/${instanceId}`;
    const webhookSecret = crypto.randomUUID().replace(/-/g, '');

    if (job_id) {
      await supabase
        .from('onboarding_jobs')
        .update({ 
          instance_id: instanceId,
          status: 'creating_session', 
          step: 'calling_wasender_api' 
        })
        .eq('id', job_id);
    }

    // Try to create session on Wasender
    console.log('Creating Wasender session with webhook:', webhookUrl);
    
    const createSessionResponse = await fetch(`${WASENDER_API_URL}/whatsapp-sessions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${wasenderToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        name: `${tenant.name} - WhatsApp`,
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
      
      // Check if phone is already taken - try to adopt
      if (isPhoneTakenError(errorText)) {
        console.log('Phone number taken, attempting to find existing session...');
        
        const existingSession = await findSessionForPhoneDeep(formattedPhone, wasenderToken);
        
        if (existingSession) {
          console.log('Found existing Wasender session:', existingSession.id);
          
          const numericId = existingSession.id || existingSession.session_id;
          const apiKey = existingSession.api_key || existingSession.apiKey;
          const wasenderSessionIdForWebhook = apiKey || String(numericId);
          
          // Update local instance with adopted session
          await supabase
            .from('whatsapp_instances')
            .update({
              wasender_session_id: wasenderSessionIdForWebhook,
              api_key_encrypted: apiKey,
              session_id: String(numericId),
              status: 'disconnected',
              is_deleted: false,
              deleted_at: null
            })
            .eq('id', instanceId);
          
          console.log('Session adopted successfully');
          
          return new Response(
            JSON.stringify({
              message: 'Session adopted',
              instance_id: instanceId,
              wasender_session_id: wasenderSessionIdForWebhook,
              numeric_session_id: numericId,
              needs_connect: true,
              adopted: true
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        // Phone is taken but not in our account
        console.log('Phone taken but not found in current token account');
        
        // Clean up if we created a new instance
        if (!isReusingInstance) {
          await supabase
            .from('whatsapp_instances')
            .delete()
            .eq('id', instanceId);
        }

        return new Response(
          JSON.stringify({
            error: 'This phone number is registered in Wasender but not under your account. Please use the correct API token or release the number in Wasender.',
            code: 'PHONE_TAKEN_NOT_IN_ACCOUNT'
          }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Other errors - clean up and throw
      if (!isReusingInstance) {
        await supabase
          .from('whatsapp_instances')
          .delete()
          .eq('id', instanceId);
      }
      
      if (job_id) {
        await supabase
          .from('onboarding_jobs')
          .update({
            status: 'failed',
            error_message: `Wasender API error: ${errorText}`,
            retry_count: 1,
            next_retry_at: new Date(Date.now() + 30000).toISOString()
          })
          .eq('id', job_id);
      }

      throw new Error(`Failed to create Wasender session: ${errorText}`);
    }

    const sessionResponse = await createSessionResponse.json();
    console.log('Wasender session created:', sessionResponse);

    const sessionData = sessionResponse.data || sessionResponse;
    const numericSessionId = sessionData.id || sessionData.session_id;
    const apiKey = sessionData.api_key || sessionData.apiKey;
    const webhookSecretFromApi = sessionData.webhook_secret;

    if (!numericSessionId) {
      console.error('No session ID in response:', sessionResponse);
      throw new Error('Wasender API did not return a session ID');
    }

    const wasenderSessionIdForWebhook = apiKey || String(numericSessionId);
    
    console.log('Extracted numeric ID:', numericSessionId, 'API Key:', apiKey ? apiKey.substring(0, 10) + '...' : 'missing');

    // Update instance with session details
    const { error: updateError } = await supabase
      .from('whatsapp_instances')
      .update({
        wasender_session_id: wasenderSessionIdForWebhook,
        api_key_encrypted: apiKey,
        webhook_secret: webhookSecretFromApi || webhookSecret,
        session_id: String(numericSessionId)
      })
      .eq('id', instanceId);

    if (updateError) {
      console.error('Error updating instance with session details:', updateError);
      throw updateError;
    }

    console.log('Instance updated, returning needs_connect: true');

    if (job_id) {
      await supabase
        .from('onboarding_jobs')
        .update({
          status: 'connecting',
          step: 'session_created'
        })
        .eq('id', job_id);
    }

    // Return immediately - let frontend trigger connect separately
    return new Response(
      JSON.stringify({
        message: 'Session created',
        instance_id: instanceId,
        wasender_session_id: wasenderSessionIdForWebhook,
        numeric_session_id: numericSessionId,
        needs_connect: true
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Create session error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

