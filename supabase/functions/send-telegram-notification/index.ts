import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TelegramNotification {
  tenant_id: string;
  instance_id?: string;
  type: 'qr_ready' | 'disconnected' | 'connected' | 'session_created' | 'workflow_error';
  message?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const telegramToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
    if (!telegramToken) {
      throw new Error('TELEGRAM_BOT_TOKEN not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const requestBody = await req.json() as TelegramNotification & { chat_id_override?: string };
    const { tenant_id, instance_id, type, message, chat_id_override } = requestBody;

    let telegramChatId = chat_id_override;
    let tenantName = 'Test';
    let instanceName = '';

    // If no override, fetch from tenant
    if (!chat_id_override) {
      // Get tenant settings to find Telegram chat ID
      const { data: tenant, error: tenantError } = await supabase
        .from('tenants')
        .select('settings, name, owner_id')
        .eq('id', tenant_id)
        .single();

      if (tenantError || !tenant) {
        console.error('Tenant not found:', tenantError);
        return new Response(
          JSON.stringify({ error: 'Tenant not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      telegramChatId = tenant.settings?.telegram_chat_id;
      tenantName = tenant.name;
    }

    if (!telegramChatId) {
      console.log('No Telegram chat ID configured for tenant:', tenant_id);
      return new Response(
        JSON.stringify({ message: 'No Telegram chat ID configured, skipping notification' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get instance name if provided
    if (instance_id) {
      const { data: instance } = await supabase
        .from('whatsapp_instances')
        .select('name')
        .eq('id', instance_id)
        .single();
      instanceName = instance?.name || 'WhatsApp Instance';
    }

    // Build notification message
    let notificationText = '';
    switch (type) {
      case 'qr_ready':
        notificationText = `📱 *QR Code Ready*\n\nYour WhatsApp instance "${instanceName}" is ready to connect.\n\nPlease scan the QR code in your dashboard within the next 2 minutes.`;
        break;
      case 'disconnected':
        notificationText = `⚠️ *WhatsApp Disconnected*\n\nYour instance "${instanceName}" has been disconnected.\n\nWe're attempting to reconnect automatically. If it doesn't reconnect, please check your dashboard.`;
        break;
      case 'connected':
        notificationText = `✅ *WhatsApp Connected*\n\nYour instance "${instanceName}" is now connected and ready to receive messages!`;
        break;
      case 'session_created':
        notificationText = `🎉 *Session Created*\n\nA new WhatsApp session has been created for "${instanceName}".\n\nPlease scan the QR code to activate it.`;
        break;
      case 'workflow_error':
        notificationText = message || `⚠️ *Workflow Error*\n\nAn error occurred in one of your workflows. Please check your dashboard.`;
        break;
      default:
        notificationText = message || 'Notification from WhatsCRM';
    }

    // Send Telegram message
    const telegramResponse = await fetch(
      `https://api.telegram.org/bot${telegramToken}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: telegramChatId,
          text: notificationText,
          parse_mode: 'Markdown'
        })
      }
    );

    const telegramResult = await telegramResponse.json();

    if (!telegramResponse.ok) {
      console.error('Telegram API error:', telegramResult);
      throw new Error(telegramResult.description || 'Failed to send Telegram message');
    }

    // Log notification
    await supabase
      .from('notifications')
      .insert({
        tenant_id,
        instance_id,
        type,
        channel: 'telegram',
        status: 'sent',
        sent_at: new Date().toISOString(),
        metadata: { telegram_message_id: telegramResult.result?.message_id }
      });

    return new Response(
      JSON.stringify({ success: true, message_id: telegramResult.result?.message_id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Telegram notification error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
