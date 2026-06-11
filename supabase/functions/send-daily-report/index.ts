import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TenantMetrics {
  tenantId: string;
  tenantName: string;
  telegramChatId: string;
  orders: {
    total: number;
    revenue: number;
    collection: number;
    pending: number;
    confirmed: number;
    shipped: number;
    delivered: number;
  };
  messages: {
    sent: number;
    unread: number;
  };
  newCustomers: number;
  topPerformer: { name: string; revenue: number } | null;
  attentionItems: string[];
}

function formatBanglaNumber(num: number): string {
  return num.toLocaleString('bn-BD');
}

function formatCurrency(amount: number): string {
  return `৳${formatBanglaNumber(amount)}`;
}

function getBanglaDate(date: Date): string {
  const months = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 
                  'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];
  const day = date.getDate();
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  return `${day} ${month}, ${year}`;
}

function buildDailyReport(metrics: TenantMetrics): string {
  const today = new Date();
  const collectionRate = metrics.orders.revenue > 0 
    ? Math.round((metrics.orders.collection / metrics.orders.revenue) * 100) 
    : 0;

  let report = `📊 আজকের ব্যবসার সারসংক্ষেপ
━━━━━━━━━━━━━━━━━━━
🏪 ${metrics.tenantName}
📅 ${getBanglaDate(today)}

💰 আজকের বিক্রয়
├ অর্ডার: ${metrics.orders.total}টি
├ রাজস্ব: ${formatCurrency(metrics.orders.revenue)}
└ কালেকশন: ${formatCurrency(metrics.orders.collection)} (${collectionRate}%)

📦 অর্ডার স্ট্যাটাস
├ পেন্ডিং: ${metrics.orders.pending}টি
├ কনফার্মড: ${metrics.orders.confirmed}টি
├ শিপড: ${metrics.orders.shipped}টি
└ ডেলিভার্ড: ${metrics.orders.delivered}টি

💬 মেসেজ
├ পাঠানো: ${metrics.messages.sent}টি
└ অপঠিত: ${metrics.messages.unread}টি

👥 নতুন কাস্টমার: ${metrics.newCustomers} জন`;

  if (metrics.attentionItems.length > 0) {
    report += `\n\n⚠️ মনোযোগ দিন`;
    metrics.attentionItems.forEach((item, i) => {
      const prefix = i === metrics.attentionItems.length - 1 ? '└' : '├';
      report += `\n${prefix} ${item}`;
    });
  }

  if (metrics.topPerformer) {
    report += `\n\n🌟 আজকের সেরা: ${metrics.topPerformer.name} (${formatCurrency(metrics.topPerformer.revenue)})`;
  }

  report += `\n━━━━━━━━━━━━━━━━━━━`;

  return report;
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

    // Get today's date range
    const today = new Date();
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    // Fetch all tenants with telegram_chat_id configured and daily reports enabled
    const { data: tenants, error: tenantsError } = await supabase
      .from('tenants')
      .select(`
        id,
        name,
        settings,
        scheduled_report_settings!inner(daily_enabled)
      `)
      .eq('is_activated', true);

    if (tenantsError) {
      console.error('Error fetching tenants:', tenantsError);
      throw tenantsError;
    }

    const results: { tenantId: string; success: boolean; error?: string }[] = [];

    for (const tenant of tenants || []) {
      const telegramChatId = tenant.settings?.telegram_chat_id;
      const reportSettings = tenant.scheduled_report_settings?.[0];
      
      if (!telegramChatId || !reportSettings?.daily_enabled) {
        results.push({ tenantId: tenant.id, success: false, error: 'No Telegram chat ID or reports disabled' });
        continue;
      }

      try {
        // Fetch orders for today
        const { data: orders } = await supabase
          .from('orders')
          .select('id, total, status, payment_status, created_by')
          .eq('tenant_id', tenant.id)
          .gte('created_at', startOfDay.toISOString())
          .lte('created_at', endOfDay.toISOString());

        // Calculate order metrics
        const orderMetrics = {
          total: orders?.length || 0,
          revenue: orders?.reduce((sum, o) => sum + (o.total || 0), 0) || 0,
          collection: orders?.filter(o => o.payment_status === 'paid').reduce((sum, o) => sum + (o.total || 0), 0) || 0,
          pending: orders?.filter(o => o.status === 'pending').length || 0,
          confirmed: orders?.filter(o => o.status === 'confirmed').length || 0,
          shipped: orders?.filter(o => o.status === 'shipped').length || 0,
          delivered: orders?.filter(o => o.status === 'delivered').length || 0,
        };

        // Fetch messages for today
        const { data: messages } = await supabase
          .from('messages')
          .select('id, direction')
          .eq('tenant_id', tenant.id)
          .gte('sent_at', startOfDay.toISOString())
          .lte('sent_at', endOfDay.toISOString());

        // Fetch unread contacts
        const { data: contacts } = await supabase
          .from('contacts')
          .select('id, unread_count')
          .eq('tenant_id', tenant.id)
          .gt('unread_count', 0);

        const messageMetrics = {
          sent: messages?.filter(m => m.direction === 'outbound').length || 0,
          unread: contacts?.reduce((sum, c) => sum + c.unread_count, 0) || 0,
        };

        // Fetch new customers today
        const { count: newCustomers } = await supabase
          .from('contacts')
          .select('id', { count: 'exact', head: true })
          .eq('tenant_id', tenant.id)
          .gte('created_at', startOfDay.toISOString())
          .lte('created_at', endOfDay.toISOString());

        // Get top performer (by revenue)
        let topPerformer = null;
        if (orders && orders.length > 0) {
          const salesByUser: Record<string, number> = {};
          orders.forEach(o => {
            if (o.created_by) {
              salesByUser[o.created_by] = (salesByUser[o.created_by] || 0) + (o.total || 0);
            }
          });
          
          const topUserId = Object.entries(salesByUser).sort((a, b) => b[1] - a[1])[0];
          if (topUserId) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('id', topUserId[0])
              .single();
            
            topPerformer = {
              name: profile?.full_name || 'Team Member',
              revenue: topUserId[1]
            };
          }
        }

        // Check for attention items
        const attentionItems: string[] = [];
        
        // Pending orders > 24 hours
        const { count: oldPending } = await supabase
          .from('orders')
          .select('id', { count: 'exact', head: true })
          .eq('tenant_id', tenant.id)
          .eq('status', 'pending')
          .lt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
        
        if (oldPending && oldPending > 0) {
          attentionItems.push(`${oldPending}টি অর্ডার ২৪ঘণ্টা+ পেন্ডিং`);
        }

        // Disconnected instances
        const { count: disconnected } = await supabase
          .from('whatsapp_instances')
          .select('id', { count: 'exact', head: true })
          .eq('tenant_id', tenant.id)
          .eq('status', 'disconnected');
        
        if (disconnected && disconnected > 0) {
          attentionItems.push(`${disconnected}টি WhatsApp ইনস্ট্যান্স ডিসকানেক্টেড`);
        }

        const metrics: TenantMetrics = {
          tenantId: tenant.id,
          tenantName: tenant.name,
          telegramChatId,
          orders: orderMetrics,
          messages: messageMetrics,
          newCustomers: newCustomers || 0,
          topPerformer,
          attentionItems,
        };

        // Build and send report
        const reportText = buildDailyReport(metrics);
        
        const telegramResponse = await fetch(
          `https://api.telegram.org/bot${telegramToken}/sendMessage`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: telegramChatId,
              text: reportText,
              parse_mode: 'HTML'
            })
          }
        );

        const telegramResult = await telegramResponse.json();

        // Log the report
        await supabase
          .from('scheduled_report_logs')
          .insert({
            tenant_id: tenant.id,
            report_type: 'daily',
            status: telegramResponse.ok ? 'sent' : 'failed',
            sent_at: new Date().toISOString(),
            error_message: telegramResponse.ok ? null : telegramResult.description,
            report_data: metrics
          });

        results.push({ 
          tenantId: tenant.id, 
          success: telegramResponse.ok,
          error: telegramResponse.ok ? undefined : telegramResult.description
        });

      } catch (error) {
        console.error(`Error processing tenant ${tenant.id}:`, error);
        
        await supabase
          .from('scheduled_report_logs')
          .insert({
            tenant_id: tenant.id,
            report_type: 'daily',
            status: 'failed',
            error_message: error instanceof Error ? error.message : 'Unknown error'
          });

        results.push({ 
          tenantId: tenant.id, 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: results.length,
        results 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Daily report error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
