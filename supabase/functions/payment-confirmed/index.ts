import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { tenant_id, payment_id } = await req.json();

    if (!tenant_id) {
      return new Response(
        JSON.stringify({ error: 'tenant_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify payment is actually verified (if payment_id provided)
    if (payment_id) {
      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .select('status')
        .eq('id', payment_id)
        .single();

      if (paymentError || payment?.status !== 'verified') {
        return new Response(
          JSON.stringify({ error: 'Payment not verified' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Check subscription status
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('status')
      .eq('tenant_id', tenant_id)
      .single();

    if (subError || !subscription) {
      return new Response(
        JSON.stringify({ error: 'Subscription not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (subscription.status === 'suspended' || subscription.status === 'cancelled') {
      return new Response(
        JSON.stringify({ error: 'Subscription is not active', code: 'SUBSCRIPTION_INACTIVE' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check for existing active instance (idempotency)
    const { data: existingInstance } = await supabase
      .from('whatsapp_instances')
      .select('id, wasender_session_id, status')
      .eq('tenant_id', tenant_id)
      .not('wasender_session_id', 'is', null)
      .maybeSingle();

    if (existingInstance) {
      // Instance already exists, check if we need to reconnect
      if (existingInstance.status === 'active') {
        return new Response(
          JSON.stringify({ 
            message: 'Instance already exists and is active',
            instance_id: existingInstance.id,
            reused: true
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Instance exists but disconnected - create job to reconnect
      const { data: job, error: jobError } = await supabase
        .from('onboarding_jobs')
        .insert({
          tenant_id,
          instance_id: existingInstance.id,
          status: 'connecting',
          step: 'reconnecting_existing_session',
          metadata: { payment_id, reusing_instance: true }
        })
        .select()
        .single();

      if (jobError) throw jobError;

      // Trigger connect session
      const connectResponse = await fetch(`${supabaseUrl}/functions/v1/wasender-connect-session`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ instance_id: existingInstance.id, job_id: job.id })
      });

      const connectResult = await connectResponse.json();

      return new Response(
        JSON.stringify({
          message: 'Reconnecting existing instance',
          job_id: job.id,
          instance_id: existingInstance.id,
          connect_result: connectResult
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check for pending onboarding job (idempotency)
    const { data: existingJob } = await supabase
      .from('onboarding_jobs')
      .select('id, status')
      .eq('tenant_id', tenant_id)
      .in('status', ['pending', 'creating_session', 'connecting', 'awaiting_scan'])
      .maybeSingle();

    if (existingJob) {
      return new Response(
        JSON.stringify({
          message: 'Onboarding already in progress',
          job_id: existingJob.id,
          status: existingJob.status
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create new onboarding job
    const { data: job, error: jobError } = await supabase
      .from('onboarding_jobs')
      .insert({
        tenant_id,
        status: 'pending',
        step: 'starting',
        metadata: { payment_id }
      })
      .select()
      .single();

    if (jobError) throw jobError;

    // Trigger session creation
    const createResponse = await fetch(`${supabaseUrl}/functions/v1/wasender-create-session`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ tenant_id, job_id: job.id })
    });

    const createResult = await createResponse.json();

    return new Response(
      JSON.stringify({
        message: 'Onboarding started',
        job_id: job.id,
        create_result: createResult
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Payment confirmed error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
