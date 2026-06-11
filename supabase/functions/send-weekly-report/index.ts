import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WeeklyMetrics {
  tenantId: string;
  tenantName: string;
  telegramChatId: string;
  dateRange: string;
  orders: {
    total: number;
    totalChange: number;
    revenue: number;
    revenueChange: number;
    avgOrderValue: number;
    collectionRate: number;
  };
  dailyBreakdown: { day: string; revenue: number }[];
  customers: {
    new: number;
    returning: number;
    active: number;
  };
  delivery: {
    shipped: number;
    delivered: number;
    successRate: number;
  };
  topPerformers: { name: string; revenue: number }[];
  issues: {
    complaints: number;
    resolved: number;
    cancelled: number;
    cancelRate: number;
  };
}

function formatBanglaNumber(num: number): string {
  return num.toLocaleString('bn-BD');
}

function formatCurrency(amount: number): string {
  return `৳${formatBanglaNumber(amount)}`;
}

function formatChange(change: number): string {
  if (change > 0) return `↑${change}%`;
  if (change < 0) return `↓${Math.abs(change)}%`;
  return '→0%';
}

function getBanglaDate(date: Date): string {
  const day = date.getDate();
  const months = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 
                  'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];
  return `${day} ${months[date.getMonth()]}`;
}

function getBanglaDayName(dayIndex: number): string {
  const days = ['রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার', 'শনিবার'];
  return days[dayIndex];
}

function buildWeeklyReport(metrics: WeeklyMetrics): string {
  const bestDay = metrics.dailyBreakdown.reduce((a, b) => a.revenue > b.revenue ? a : b, metrics.dailyBreakdown[0]);
  const worstDay = metrics.dailyBreakdown.reduce((a, b) => a.revenue < b.revenue ? a : b, metrics.dailyBreakdown[0]);

  let report = `📈 সাপ্তাহিক ব্যবসার রিপোর্ট
━━━━━━━━━━━━━━━━━━━
🏪 ${metrics.tenantName}
📅 ${metrics.dateRange}

💰 সাপ্তাহিক পারফরম্যান্স
├ মোট অর্ডার: ${metrics.orders.total}টি (${formatChange(metrics.orders.totalChange)})
├ মোট রাজস্ব: ${formatCurrency(metrics.orders.revenue)} (${formatChange(metrics.orders.revenueChange)})
├ গড় অর্ডার: ${formatCurrency(metrics.orders.avgOrderValue)}
└ কালেকশন রেট: ${metrics.orders.collectionRate}%

📊 দৈনিক তুলনা
├ সর্বোচ্চ: ${bestDay?.day || 'N/A'} (${formatCurrency(bestDay?.revenue || 0)})
└ সর্বনিম্ন: ${worstDay?.day || 'N/A'} (${formatCurrency(worstDay?.revenue || 0)})

👥 কাস্টমার
├ নতুন: ${metrics.customers.new} জন
├ রিটার্নিং: ${metrics.customers.returning} জন
└ মোট অ্যাক্টিভ: ${metrics.customers.active} জন

📦 ডেলিভারি পারফরম্যান্স
├ শিপড: ${metrics.delivery.shipped}টি
├ ডেলিভার্ড: ${metrics.delivery.delivered}টি
└ সাকসেস রেট: ${metrics.delivery.successRate}%`;

  if (metrics.topPerformers.length > 0) {
    report += `\n\n🏆 Top ${Math.min(3, metrics.topPerformers.length)} টিম মেম্বার`;
    metrics.topPerformers.slice(0, 3).forEach((performer, i) => {
      report += `\n${i + 1}. ${performer.name} - ${formatCurrency(performer.revenue)}`;
    });
  }

  report += `\n\n❗ সমস্যা রিপোর্ট
├ অভিযোগ: ${metrics.issues.complaints}টি (${metrics.issues.resolved}টি সমাধান)
└ ক্যান্সেল: ${metrics.issues.cancelled}টি (${metrics.issues.cancelRate}%)
━━━━━━━━━━━━━━━━━━━`;

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

    // Get this week's date range (last 7 days)
    const today = new Date();
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const twoWeeksAgo = new Date(today);
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    // Fetch all tenants with telegram_chat_id configured and weekly reports enabled
    const { data: tenants, error: tenantsError } = await supabase
      .from('tenants')
      .select(`
        id,
        name,
        settings,
        scheduled_report_settings!inner(weekly_enabled)
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
      
      if (!telegramChatId || !reportSettings?.weekly_enabled) {
        results.push({ tenantId: tenant.id, success: false, error: 'No Telegram chat ID or reports disabled' });
        continue;
      }

      try {
        // Fetch orders for this week
        const { data: thisWeekOrders } = await supabase
          .from('orders')
          .select('id, total, status, payment_status, created_by, created_at')
          .eq('tenant_id', tenant.id)
          .gte('created_at', weekAgo.toISOString())
          .lte('created_at', today.toISOString());

        // Fetch orders for last week (for comparison)
        const { data: lastWeekOrders } = await supabase
          .from('orders')
          .select('id, total')
          .eq('tenant_id', tenant.id)
          .gte('created_at', twoWeeksAgo.toISOString())
          .lt('created_at', weekAgo.toISOString());

        const thisWeekRevenue = thisWeekOrders?.reduce((sum, o) => sum + (o.total || 0), 0) || 0;
        const lastWeekRevenue = lastWeekOrders?.reduce((sum, o) => sum + (o.total || 0), 0) || 0;
        const thisWeekCount = thisWeekOrders?.length || 0;
        const lastWeekCount = lastWeekOrders?.length || 0;

        const revenueChange = lastWeekRevenue > 0 
          ? Math.round(((thisWeekRevenue - lastWeekRevenue) / lastWeekRevenue) * 100)
          : 0;
        const countChange = lastWeekCount > 0 
          ? Math.round(((thisWeekCount - lastWeekCount) / lastWeekCount) * 100)
          : 0;

        const paidOrders = thisWeekOrders?.filter(o => o.payment_status === 'paid').reduce((sum, o) => sum + (o.total || 0), 0) || 0;
        const collectionRate = thisWeekRevenue > 0 ? Math.round((paidOrders / thisWeekRevenue) * 100) : 0;

        // Daily breakdown
        const dailyRevenue: Record<number, number> = {};
        thisWeekOrders?.forEach(order => {
          const day = new Date(order.created_at).getDay();
          dailyRevenue[day] = (dailyRevenue[day] || 0) + (order.total || 0);
        });
        
        const dailyBreakdown = Object.entries(dailyRevenue).map(([day, revenue]) => ({
          day: getBanglaDayName(parseInt(day)),
          revenue
        }));

        // Customer metrics
        const { count: newCustomers } = await supabase
          .from('contacts')
          .select('id', { count: 'exact', head: true })
          .eq('tenant_id', tenant.id)
          .gte('created_at', weekAgo.toISOString());

        const { count: activeCustomers } = await supabase
          .from('contacts')
          .select('id', { count: 'exact', head: true })
          .eq('tenant_id', tenant.id)
          .gte('last_message_at', weekAgo.toISOString());

        // Delivery metrics
        const shipped = thisWeekOrders?.filter(o => ['shipped', 'delivered'].includes(o.status)).length || 0;
        const delivered = thisWeekOrders?.filter(o => o.status === 'delivered').length || 0;
        const deliverySuccessRate = shipped > 0 ? Math.round((delivered / shipped) * 100) : 0;

        // Top performers
        const salesByUser: Record<string, number> = {};
        thisWeekOrders?.forEach(o => {
          if (o.created_by) {
            salesByUser[o.created_by] = (salesByUser[o.created_by] || 0) + (o.total || 0);
          }
        });

        const topPerformers: { name: string; revenue: number }[] = [];
        const sortedUsers = Object.entries(salesByUser).sort((a, b) => b[1] - a[1]).slice(0, 3);
        
        for (const [userId, revenue] of sortedUsers) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', userId)
            .single();
          
          topPerformers.push({
            name: profile?.full_name || 'Team Member',
            revenue
          });
        }

        // Issues
        const { count: complaints } = await supabase
          .from('complaints')
          .select('id', { count: 'exact', head: true })
          .eq('tenant_id', tenant.id)
          .gte('created_at', weekAgo.toISOString());

        const { count: resolvedComplaints } = await supabase
          .from('complaints')
          .select('id', { count: 'exact', head: true })
          .eq('tenant_id', tenant.id)
          .eq('status', 'resolved')
          .gte('created_at', weekAgo.toISOString());

        const cancelled = thisWeekOrders?.filter(o => o.status === 'cancelled').length || 0;
        const cancelRate = thisWeekCount > 0 ? Math.round((cancelled / thisWeekCount) * 100) : 0;

        const metrics: WeeklyMetrics = {
          tenantId: tenant.id,
          tenantName: tenant.name,
          telegramChatId,
          dateRange: `${getBanglaDate(weekAgo)}-${getBanglaDate(today)}, ${today.getFullYear()}`,
          orders: {
            total: thisWeekCount,
            totalChange: countChange,
            revenue: thisWeekRevenue,
            revenueChange,
            avgOrderValue: thisWeekCount > 0 ? Math.round(thisWeekRevenue / thisWeekCount) : 0,
            collectionRate,
          },
          dailyBreakdown,
          customers: {
            new: newCustomers || 0,
            returning: (activeCustomers || 0) - (newCustomers || 0),
            active: activeCustomers || 0,
          },
          delivery: {
            shipped,
            delivered,
            successRate: deliverySuccessRate,
          },
          topPerformers,
          issues: {
            complaints: complaints || 0,
            resolved: resolvedComplaints || 0,
            cancelled,
            cancelRate,
          },
        };

        // Build and send report
        const reportText = buildWeeklyReport(metrics);
        
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
            report_type: 'weekly',
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
            report_type: 'weekly',
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
    console.error('Weekly report error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
