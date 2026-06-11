import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Hardcoded admin Telegram chat ID for system error alerts
const ADMIN_TELEGRAM_CHAT_ID = '5884335011';

interface ErrorReport {
  source: 'tenant' | 'admin' | 'public';
  tenant_id?: string;
  user_id?: string;
  user_email?: string;
  error_message: string;
  error_stack?: string;
  error_type: 'api' | 'js' | 'network' | 'component' | 'validation' | 'unknown';
  page_url: string;
  component_name?: string;
  browser_info?: string;
  user_action?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const telegramToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const errorReport = await req.json() as ErrorReport;
    const {
      source,
      tenant_id,
      user_id,
      user_email,
      error_message,
      error_stack,
      error_type,
      page_url,
      component_name,
      browser_info,
      user_action
    } = errorReport;

    // Validate required fields
    if (!error_message || !page_url) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: error_message and page_url' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Rate limiting: Check for duplicate errors in last 10 minutes
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const errorHash = `${tenant_id || 'no-tenant'}-${error_message.substring(0, 100)}`;
    
    const { data: recentErrors } = await supabase
      .from('admin_notifications')
      .select('id')
      .eq('type', 'system_error')
      .gte('created_at', tenMinutesAgo)
      .ilike('message', `%${error_message.substring(0, 50)}%`)
      .limit(1);

    if (recentErrors && recentErrors.length > 0) {
      console.log('Duplicate error detected, skipping notification');
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: 'duplicate_within_10_minutes' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch tenant details if tenant_id provided
    let tenantName = 'Unknown';
    let tenantOwnerId = null;
    let tenantOwnerEmail = null;
    let planName = 'N/A';

    if (tenant_id) {
      const { data: tenant } = await supabase
        .from('tenants')
        .select('name, owner_id')
        .eq('id', tenant_id)
        .single();

      if (tenant) {
        tenantName = tenant.name;
        tenantOwnerId = tenant.owner_id;

        // Fetch owner email
        if (tenantOwnerId) {
          const { data: ownerProfile } = await supabase
            .from('profiles')
            .select('email')
            .eq('id', tenantOwnerId)
            .single();
          tenantOwnerEmail = ownerProfile?.email;
        }

        // Fetch subscription plan
        const { data: subscription } = await supabase
          .from('subscriptions')
          .select('plans(name)')
          .eq('tenant_id', tenant_id)
          .eq('status', 'active')
          .single();

        if (subscription?.plans) {
          planName = (subscription.plans as any).name;
        }
      }
    }

    // Fetch user details if user_id provided
    let userName = user_email || 'Unknown';
    if (user_id && !user_email) {
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', user_id)
        .single();
      
      if (userProfile) {
        userName = userProfile.email || userProfile.full_name || 'Unknown';
      }
    }

    // Truncate error stack to 2000 chars
    const truncatedStack = error_stack?.substring(0, 2000) || 'No stack trace available';

    // Create support ticket (only for authenticated users with tenant context)
    let ticketNumber = null;
    if (tenant_id) {
      const ticketSubject = `[Auto] ${error_type.toUpperCase()} Error: ${error_message.substring(0, 100)}`;
      const ticketDescription = `
**Auto-generated Error Report**

**Source:** ${source}
**Page:** ${page_url}
**Component:** ${component_name || 'N/A'}
**User Action:** ${user_action || 'N/A'}
**Browser:** ${browser_info || 'N/A'}

**Error Type:** ${error_type}
**Error Message:**
${error_message}

**Stack Trace:**
\`\`\`
${truncatedStack}
\`\`\`

**Tenant:** ${tenantName}
**User:** ${userName}
**Timestamp:** ${new Date().toISOString()}
      `.trim();

      const { data: ticket, error: ticketError } = await supabase
        .from('support_tickets')
        .insert({
          tenant_id,
          user_id: user_id || tenantOwnerId,
          subject: ticketSubject,
          description: ticketDescription,
          category: 'error_report',
          priority: 'high',
          ticket_number: '', // Auto-generated by trigger
        })
        .select('ticket_number')
        .single();

      if (ticket) {
        ticketNumber = ticket.ticket_number;
      } else if (ticketError) {
        console.error('Failed to create ticket:', ticketError);
      }
    }

    // Insert admin notification
    const notificationTitle = `${source === 'tenant' ? '🏢' : source === 'admin' ? '⚙️' : '🌐'} ${error_type.toUpperCase()} Error in ${source} panel`;
    const notificationMessage = `${error_message.substring(0, 200)}${error_message.length > 200 ? '...' : ''}`;

    const { error: notifError } = await supabase
      .from('admin_notifications')
      .insert({
        type: 'system_error',
        title: notificationTitle,
        message: notificationMessage,
        tenant_id: tenant_id || null,
        entity_type: 'error',
        entity_id: ticketNumber || null,
        metadata: {
          source,
          error_type,
          page_url,
          component_name,
          browser_info,
          user_action,
          user_id,
          user_email: userName,
          tenant_name: tenantName,
          ticket_number: ticketNumber,
          timestamp: new Date().toISOString()
        }
      });

    if (notifError) {
      console.error('Failed to create notification:', notifError);
    }

    // Send Telegram notification
    if (telegramToken) {
      const bdtTime = new Date().toLocaleString('en-GB', {
        timeZone: 'Asia/Dhaka',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });

      const sourceEmoji = source === 'tenant' ? '🏢 Tenant Panel' : source === 'admin' ? '⚙️ Admin Panel' : '🌐 Public Page';
      const errorTypeEmoji = {
        api: '🔌 API Error',
        js: '⚠️ JS Error',
        network: '🌐 Network Error',
        component: '🧩 Component Error',
        validation: '📝 Validation Error',
        unknown: '❓ Unknown Error'
      }[error_type] || '❓ Unknown Error';

      let telegramMessage = `🚨 *SYSTEM ERROR ALERT*

━━━━━━━━━━━━━━━━━━━━━━━━

📍 *Source:* ${sourceEmoji}`;

      if (tenant_id) {
        telegramMessage += `
📌 *Tenant:* ${escapeMarkdown(tenantName)}
   └ ID: \`${tenant_id.substring(0, 8)}...\``;
      }

      if (userName && userName !== 'Unknown') {
        telegramMessage += `
👤 *User:* ${escapeMarkdown(userName)}`;
      }

      if (planName !== 'N/A') {
        telegramMessage += `
📊 *Plan:* ${escapeMarkdown(planName)}`;
      }

      telegramMessage += `

━━━━━━━━━━━━━━━━━━━━━━━━

❌ *Error Type:* ${errorTypeEmoji}
📝 *Message:* ${escapeMarkdown(error_message.substring(0, 300))}

🌐 *Page:* \`${escapeMarkdown(page_url)}\``;

      if (component_name) {
        telegramMessage += `
🧩 *Component:* \`${escapeMarkdown(component_name)}\``;
      }

      if (user_action) {
        telegramMessage += `
🎯 *Action:* ${escapeMarkdown(user_action)}`;
      }

      telegramMessage += `
🕐 *Time:* ${bdtTime} BST`;

      if (browser_info) {
        telegramMessage += `
🖥️ *Browser:* ${escapeMarkdown(browser_info)}`;
      }

      telegramMessage += `

━━━━━━━━━━━━━━━━━━━━━━━━`;

      if (ticketNumber) {
        telegramMessage += `

🎫 *Ticket:* \`${ticketNumber}\`
🔗 *Admin Panel:* /admin/support`;
      }

      telegramMessage += `

_Auto-generated by Error Reporter_`;

      try {
        const telegramResponse = await fetch(
          `https://api.telegram.org/bot${telegramToken}/sendMessage`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: ADMIN_TELEGRAM_CHAT_ID,
              text: telegramMessage,
              parse_mode: 'Markdown'
            })
          }
        );

        const telegramResult = await telegramResponse.json();
        if (!telegramResponse.ok) {
          console.error('Telegram API error:', telegramResult);
        }
      } catch (telegramError) {
        console.error('Failed to send Telegram notification:', telegramError);
        // Don't fail the whole request if Telegram fails
      }
    } else {
      console.log('TELEGRAM_BOT_TOKEN not configured, skipping Telegram notification');
    }

    return new Response(
      JSON.stringify({
        success: true,
        ticket_number: ticketNumber,
        notification_sent: true
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error processing error report:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Helper function to escape Markdown special characters
function escapeMarkdown(text: string): string {
  if (!text) return '';
  return text
    .replace(/\*/g, '\\*')
    .replace(/_/g, '\\_')
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]')
    .replace(/`/g, '\\`');
}
