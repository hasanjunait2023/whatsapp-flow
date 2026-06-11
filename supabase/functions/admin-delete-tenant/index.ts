import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const WASENDER_API_URL = 'https://app.wasenderapi.com/api';

async function ensureSystemAdmin(supabase: any, jwt: string) {
  const { data: userRes, error: authError } = await supabase.auth.getUser(jwt);
  const user = userRes?.user;

  if (authError || !user) {
    return { ok: false as const, status: 401, error: 'Authentication failed' };
  }

  const { data: adminRole, error: roleError } = await supabase
    .from('system_roles')
    .select('role')
    .eq('user_id', user.id)
    .eq('role', 'admin')
    .maybeSingle();

  if (roleError || !adminRole) {
    return { ok: false as const, status: 403, error: 'Admin access required' };
  }

  return { ok: true as const, userId: user.id };
}

async function deleteWasenderSessionsForTenant(supabase: any, tenantId: string, wasenderToken: string | null) {
  if (!wasenderToken) return 0;

  const { data: instances } = await supabase
    .from('whatsapp_instances')
    .select('id, session_id, wasender_session_id, name')
    .eq('tenant_id', tenantId);

  let deleted = 0;

  for (const inst of instances || []) {
    const sessionId = inst.session_id || inst.wasender_session_id;
    if (!sessionId) continue;

    try {
      const res = await fetch(`${WASENDER_API_URL}/whatsapp-sessions/${sessionId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${wasenderToken}`,
          Accept: 'application/json',
        },
      });

      // Wasender may return 404 if already deleted—treat as success for idempotency.
      if (res.ok || res.status === 404) deleted++;
      else {
        const txt = await res.text();
        console.warn(`Wasender delete failed for session ${sessionId}: ${txt}`);
      }
    } catch (e) {
      console.warn(`Wasender delete error for session ${sessionId}:`, e);
    }
  }

  return deleted;
}

async function deleteTenantNonCascadeTables(supabase: any, tenantId: string) {
  // These tables do NOT cascade cleanly (some are ON DELETE SET NULL, some are RESTRICT)
  // We delete them explicitly to ensure full purge and to avoid tenant delete blocking.
  await supabase.from('admin_tasks').delete().eq('related_tenant_id', tenantId);
  await supabase.from('admin_notifications').delete().eq('tenant_id', tenantId);
  await supabase.from('external_sales_orders').delete().eq('tenant_id', tenantId);
}

async function drainTenantViaRpc(
  supabase: any,
  fnName: string,
  tenantId: string,
  batchSize: number,
  label: string
) {
  let totalDeleted = 0;
  let size = batchSize;

  // Hard safety guard to avoid infinite loops
  for (let i = 0; i < 100000; i++) {
    const { data, error } = await supabase.rpc(fnName, {
      _tenant_id: tenantId,
      _batch_size: size,
    });

    if (error) {
      const msg = (error as any)?.message || '';
      if (msg.includes('statement timeout') && size > 50) {
        size = Math.max(50, Math.floor(size / 2));
        console.warn(`[${label}] statement_timeout; retrying with batch_size=${size}`);
        continue;
      }
      throw error;
    }

    const deleted = typeof data === 'number' ? data : Number(data ?? 0);
    totalDeleted += deleted;

    if (deleted === 0) break;

    // Yield periodically so we don't block the runtime too aggressively
    if (i % 20 === 19) {
      await new Promise((r) => setTimeout(r, 1));
    }
  }

  console.log(`Drained ${totalDeleted} rows from ${label}`);
  return totalDeleted;
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

    const authHeader = req.headers.get('Authorization');
    const jwt = authHeader?.replace('Bearer ', '') || '';
    if (!jwt) {
      return new Response(JSON.stringify({ error: 'Not authorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const adminCheck = await ensureSystemAdmin(supabase, jwt);
    if (!adminCheck.ok) {
      return new Response(JSON.stringify({ error: adminCheck.error }), {
        status: adminCheck.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json().catch(() => ({}));
    const tenant_ids = body?.tenant_ids as string[] | undefined;

    if (!tenant_ids || !Array.isArray(tenant_ids) || tenant_ids.length === 0) {
      return new Response(JSON.stringify({ error: 'tenant_ids array is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const results: Array<{
      tenant_id: string;
      success: boolean;
      wasender_sessions_deleted: number;
      messages_deleted?: number;
      webhook_events_deleted?: number;
      fb_webhook_events_deleted?: number;
      orders_deleted?: number;
      contacts_deleted?: number;
      error?: string;
    }> = [];

    for (const tenantId of tenant_ids) {
      try {
        console.log('Purging tenant:', tenantId);

        const wasenderDeleted = await deleteWasenderSessionsForTenant(supabase, tenantId, wasenderToken);

        // Delete non-cascade tables first (prevents RESTRICT and ensures true purge)
        await deleteTenantNonCascadeTables(supabase, tenantId);

        // Drain the biggest tables in small batches to avoid Postgres statement_timeout.
        // Order matters: messages first (they reference contacts).
        const messagesDeleted = await drainTenantViaRpc(
          supabase,
          'admin_purge_messages_batch',
          tenantId,
          2000,
          'messages'
        );

        const webhookDeleted = await drainTenantViaRpc(
          supabase,
          'admin_purge_webhook_events_log_batch',
          tenantId,
          5000,
          'webhook_events_log'
        );

        const fbWebhookDeleted = await drainTenantViaRpc(
          supabase,
          'admin_purge_fb_webhook_events_log_batch',
          tenantId,
          5000,
          'fb_webhook_events_log'
        );

        const ordersDeleted = await drainTenantViaRpc(
          supabase,
          'admin_purge_orders_batch',
          tenantId,
          200,
          'orders'
        );

        const contactsDeleted = await drainTenantViaRpc(
          supabase,
          'admin_purge_contacts_batch',
          tenantId,
          500,
          'contacts'
        );

        // Now delete tenant record — remaining DB FKs with ON DELETE CASCADE will purge the rest.
        const { error: delErr } = await supabase.from('tenants').delete().eq('id', tenantId);
        if (delErr) throw delErr;

        results.push({
          tenant_id: tenantId,
          success: true,
          wasender_sessions_deleted: wasenderDeleted,
          messages_deleted: messagesDeleted,
          webhook_events_deleted: webhookDeleted,
          fb_webhook_events_deleted: fbWebhookDeleted,
          orders_deleted: ordersDeleted,
          contacts_deleted: contactsDeleted,
        });
      } catch (e: any) {
        console.error('Tenant purge failed:', tenantId, e);
        results.push({
          tenant_id: tenantId,
          success: false,
          wasender_sessions_deleted: 0,
          error: e?.message || 'Unknown error',
        });
      }
    }

    const allSuccess = results.every((r) => r.success);

    return new Response(
      JSON.stringify({
        success: allSuccess,
        results,
      }),
      {
        status: allSuccess ? 200 : 207,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (e: any) {
    console.error('admin-delete-tenant fatal:', e);
    return new Response(JSON.stringify({ error: e?.message || 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
