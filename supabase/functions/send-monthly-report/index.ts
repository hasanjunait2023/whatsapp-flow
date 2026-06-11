import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MonthlyMetrics {
  tenantId: string;
  tenantName: string;
  telegramChatId: string;
  monthName: string;
  year: number;
  financial: {
    revenue: number;
    revenueChange: number;
    expenses: number;
    grossProfit: number;
    netProfit: number;
    profitMargin: number;
  };
  orders: {
    total: number;
    totalChange: number;
    delivered: number;
    deliveryRate: number;
    cancelled: number;
    cancelRate: number;
    avgOrderValue: number;
  };
  payment: {
    paid: number;
    paidPercent: number;
    pending: number;
    pendingPercent: number;
    cod: number;
    codPercent: number;
  };
  customers: {
    new: number;
    returning: number;
    retention: number;
    active: number;
  };
  channels: {
    whatsapp: { revenue: number; percent: number };
    woocommerce: { revenue: number; percent: number };
    manual: { revenue: number; percent: number };
  };
  topProducts: { name: string; quantity: number; revenue: number }[];
  topPerformers: { name: string; metric: string; value: string }[];
  comparison: {
    ordersChange: number;
    revenueChange: number;
    customersChange: number;
  };
}

function formatBanglaNumber(num: number): string {
  return num.toLocaleString('bn-BD');
}

function formatCurrency(amount: number): string {
  return `৳${formatBanglaNumber(amount)}`;
}

function formatChange(change: number): string {
  if (change > 0) return `+${change}%`;
  if (change < 0) return `${change}%`;
  return '0%';
}

function getBanglaMonth(monthIndex: number): string {
  const months = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 
                  'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];
  return months[monthIndex];
}

function buildMonthlyReport(metrics: MonthlyMetrics): string {
  let report = `📑 মাসিক ব্যবসার রিপোর্ট
━━━━━━━━━━━━━━━━━━━
🏪 ${metrics.tenantName}
📅 ${metrics.monthName} ${metrics.year}

💰 আর্থিক সারসংক্ষেপ
├ মোট রাজস্ব: ${formatCurrency(metrics.financial.revenue)} (${formatChange(metrics.financial.revenueChange)})
├ মোট খরচ: ${formatCurrency(metrics.financial.expenses)}
├ গ্রস প্রফিট: ${formatCurrency(metrics.financial.grossProfit)}
├ নেট প্রফিট: ${formatCurrency(metrics.financial.netProfit)}
└ প্রফিট মার্জিন: ${metrics.financial.profitMargin}%

📦 অর্ডার সামারি
├ মোট অর্ডার: ${metrics.orders.total}টি (${formatChange(metrics.orders.totalChange)})
├ ডেলিভার্ড: ${metrics.orders.delivered}টি (${metrics.orders.deliveryRate}%)
├ ক্যান্সেল/রিটার্ন: ${metrics.orders.cancelled}টি (${metrics.orders.cancelRate}%)
└ গড় অর্ডার ভ্যালু: ${formatCurrency(metrics.orders.avgOrderValue)}

💳 পেমেন্ট স্ট্যাটাস
├ পেইড: ${formatCurrency(metrics.payment.paid)} (${metrics.payment.paidPercent}%)
├ পেন্ডিং: ${formatCurrency(metrics.payment.pending)} (${metrics.payment.pendingPercent}%)
└ COD কালেকশন: ${formatCurrency(metrics.payment.cod)} (${metrics.payment.codPercent}%)

👥 কাস্টমার গ্রোথ
├ নতুন কাস্টমার: ${metrics.customers.new} জন
├ রিপিট কাস্টমার: ${metrics.customers.returning} জন
├ কাস্টমার রিটেনশন: ${metrics.customers.retention}%
└ মোট অ্যাক্টিভ: ${metrics.customers.active} জন

📱 চ্যানেল পারফরম্যান্স
├ WhatsApp: ${formatCurrency(metrics.channels.whatsapp.revenue)} (${metrics.channels.whatsapp.percent}%)
├ WooCommerce: ${formatCurrency(metrics.channels.woocommerce.revenue)} (${metrics.channels.woocommerce.percent}%)
└ ম্যানুয়াল: ${formatCurrency(metrics.channels.manual.revenue)} (${metrics.channels.manual.percent}%)`;

  if (metrics.topProducts.length > 0) {
    report += `\n\n🏆 Top ${Math.min(5, metrics.topProducts.length)} প্রোডাক্ট`;
    metrics.topProducts.slice(0, 5).forEach((product, i) => {
      report += `\n${i + 1}. ${product.name} - ${product.quantity}টি (${formatCurrency(product.revenue)})`;
    });
  }

  if (metrics.topPerformers.length > 0) {
    report += `\n\n👨‍💼 টিম পারফরম্যান্স`;
    metrics.topPerformers.forEach(performer => {
      report += `\n├ ${performer.metric}: ${performer.name}`;
    });
  }

  report += `\n\n📈 গত মাসের তুলনায়
├ অর্ডার: ${formatChange(metrics.comparison.ordersChange)}
├ রাজস্ব: ${formatChange(metrics.comparison.revenueChange)}
└ কাস্টমার: ${formatChange(metrics.comparison.customersChange)}
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

    // Get last month's date range
    const today = new Date();
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
    const twoMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 2, 1);
    const twoMonthsAgoEnd = new Date(today.getFullYear(), today.getMonth() - 1, 0);

    // Fetch all tenants with telegram_chat_id configured and monthly reports enabled
    const { data: tenants, error: tenantsError } = await supabase
      .from('tenants')
      .select(`
        id,
        name,
        settings,
        scheduled_report_settings!inner(monthly_enabled)
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
      
      if (!telegramChatId || !reportSettings?.monthly_enabled) {
        results.push({ tenantId: tenant.id, success: false, error: 'No Telegram chat ID or reports disabled' });
        continue;
      }

      try {
        // Fetch orders for last month
        const { data: thisMonthOrders } = await supabase
          .from('orders')
          .select('id, total, status, payment_status, created_by, source')
          .eq('tenant_id', tenant.id)
          .gte('created_at', lastMonth.toISOString())
          .lte('created_at', lastMonthEnd.toISOString());

        // Fetch orders for previous month (for comparison)
        const { data: prevMonthOrders } = await supabase
          .from('orders')
          .select('id, total')
          .eq('tenant_id', tenant.id)
          .gte('created_at', twoMonthsAgo.toISOString())
          .lte('created_at', twoMonthsAgoEnd.toISOString());

        const thisMonthRevenue = thisMonthOrders?.reduce((sum, o) => sum + (o.total || 0), 0) || 0;
        const prevMonthRevenue = prevMonthOrders?.reduce((sum, o) => sum + (o.total || 0), 0) || 0;
        const thisMonthCount = thisMonthOrders?.length || 0;
        const prevMonthCount = prevMonthOrders?.length || 0;

        const revenueChange = prevMonthRevenue > 0 
          ? Math.round(((thisMonthRevenue - prevMonthRevenue) / prevMonthRevenue) * 100)
          : 0;
        const countChange = prevMonthCount > 0 
          ? Math.round(((thisMonthCount - prevMonthCount) / prevMonthCount) * 100)
          : 0;

        // Fetch expenses for the month
        const { data: expenses } = await supabase
          .from('tenant_expenses')
          .select('amount')
          .eq('tenant_id', tenant.id)
          .gte('expense_date', lastMonth.toISOString())
          .lte('expense_date', lastMonthEnd.toISOString());

        const totalExpenses = expenses?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0;
        const grossProfit = thisMonthRevenue - totalExpenses;
        const netProfit = grossProfit * 0.7; // Simplified - assume 30% overhead
        const profitMargin = thisMonthRevenue > 0 ? Math.round((netProfit / thisMonthRevenue) * 100) : 0;

        // Order metrics
        const delivered = thisMonthOrders?.filter(o => o.status === 'delivered').length || 0;
        const cancelled = thisMonthOrders?.filter(o => o.status === 'cancelled').length || 0;
        const deliveryRate = thisMonthCount > 0 ? Math.round((delivered / thisMonthCount) * 100) : 0;
        const cancelRate = thisMonthCount > 0 ? Math.round((cancelled / thisMonthCount) * 100) : 0;

        // Payment metrics
        const paidTotal = thisMonthOrders?.filter(o => o.payment_status === 'paid').reduce((sum, o) => sum + (o.total || 0), 0) || 0;
        const pendingTotal = thisMonthOrders?.filter(o => o.payment_status === 'pending').reduce((sum, o) => sum + (o.total || 0), 0) || 0;
        const codTotal = thisMonthOrders?.filter(o => o.payment_status === 'cod').reduce((sum, o) => sum + (o.total || 0), 0) || 0;

        const paidPercent = thisMonthRevenue > 0 ? Math.round((paidTotal / thisMonthRevenue) * 100) : 0;
        const pendingPercent = thisMonthRevenue > 0 ? Math.round((pendingTotal / thisMonthRevenue) * 100) : 0;
        const codPercent = thisMonthRevenue > 0 ? Math.round((codTotal / thisMonthRevenue) * 100) : 0;

        // Customer metrics
        const { count: newCustomers } = await supabase
          .from('contacts')
          .select('id', { count: 'exact', head: true })
          .eq('tenant_id', tenant.id)
          .gte('created_at', lastMonth.toISOString())
          .lte('created_at', lastMonthEnd.toISOString());

        const { count: prevNewCustomers } = await supabase
          .from('contacts')
          .select('id', { count: 'exact', head: true })
          .eq('tenant_id', tenant.id)
          .gte('created_at', twoMonthsAgo.toISOString())
          .lte('created_at', twoMonthsAgoEnd.toISOString());

        const { count: activeCustomers } = await supabase
          .from('contacts')
          .select('id', { count: 'exact', head: true })
          .eq('tenant_id', tenant.id)
          .gte('last_message_at', lastMonth.toISOString());

        const customerChange = (prevNewCustomers || 0) > 0 
          ? Math.round((((newCustomers || 0) - (prevNewCustomers || 0)) / (prevNewCustomers || 1)) * 100)
          : 0;

        const returning = (activeCustomers || 0) - (newCustomers || 0);
        const retention = (activeCustomers || 0) > 0 ? Math.round((returning / (activeCustomers || 1)) * 100) : 0;

        // Channel performance
        const whatsappRevenue = thisMonthOrders?.filter(o => o.source === 'whatsapp' || !o.source).reduce((sum, o) => sum + (o.total || 0), 0) || 0;
        const woocommerceRevenue = thisMonthOrders?.filter(o => o.source === 'woocommerce').reduce((sum, o) => sum + (o.total || 0), 0) || 0;
        const manualRevenue = thisMonthOrders?.filter(o => o.source === 'manual').reduce((sum, o) => sum + (o.total || 0), 0) || 0;

        // Top products
        const { data: orderItems } = await supabase
          .from('order_items')
          .select(`
            quantity,
            price,
            product_id,
            products(name)
          `)
          .in('order_id', thisMonthOrders?.map(o => o.id) || []);

        const productSales: Record<string, { name: string; quantity: number; revenue: number }> = {};
        orderItems?.forEach(item => {
          const productId = item.product_id;
          // Handle both single object and array responses from Supabase
          const productsData = item.products as { name: string } | { name: string }[] | null;
          let productName = 'Unknown';
          if (productsData) {
            if (Array.isArray(productsData)) {
              productName = productsData[0]?.name || 'Unknown';
            } else {
              productName = productsData.name || 'Unknown';
            }
          }
          if (!productSales[productId]) {
            productSales[productId] = { name: productName, quantity: 0, revenue: 0 };
          }
          productSales[productId].quantity += item.quantity || 0;
          productSales[productId].revenue += (item.quantity || 0) * (item.price || 0);
        });

        const topProducts = Object.values(productSales)
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 5);

        // Top performers
        const salesByUser: Record<string, number> = {};
        thisMonthOrders?.forEach(o => {
          if (o.created_by) {
            salesByUser[o.created_by] = (salesByUser[o.created_by] || 0) + (o.total || 0);
          }
        });

        const topPerformers: { name: string; metric: string; value: string }[] = [];
        const topSeller = Object.entries(salesByUser).sort((a, b) => b[1] - a[1])[0];
        
        if (topSeller) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', topSeller[0])
            .single();
          
          topPerformers.push({
            name: profile?.full_name || 'Team Member',
            metric: 'সর্বোচ্চ বিক্রয়',
            value: formatCurrency(topSeller[1])
          });
        }

        const metrics: MonthlyMetrics = {
          tenantId: tenant.id,
          tenantName: tenant.name,
          telegramChatId,
          monthName: getBanglaMonth(lastMonth.getMonth()),
          year: lastMonth.getFullYear(),
          financial: {
            revenue: thisMonthRevenue,
            revenueChange,
            expenses: totalExpenses,
            grossProfit,
            netProfit,
            profitMargin,
          },
          orders: {
            total: thisMonthCount,
            totalChange: countChange,
            delivered,
            deliveryRate,
            cancelled,
            cancelRate,
            avgOrderValue: thisMonthCount > 0 ? Math.round(thisMonthRevenue / thisMonthCount) : 0,
          },
          payment: {
            paid: paidTotal,
            paidPercent,
            pending: pendingTotal,
            pendingPercent,
            cod: codTotal,
            codPercent,
          },
          customers: {
            new: newCustomers || 0,
            returning,
            retention,
            active: activeCustomers || 0,
          },
          channels: {
            whatsapp: { 
              revenue: whatsappRevenue, 
              percent: thisMonthRevenue > 0 ? Math.round((whatsappRevenue / thisMonthRevenue) * 100) : 0 
            },
            woocommerce: { 
              revenue: woocommerceRevenue, 
              percent: thisMonthRevenue > 0 ? Math.round((woocommerceRevenue / thisMonthRevenue) * 100) : 0 
            },
            manual: { 
              revenue: manualRevenue, 
              percent: thisMonthRevenue > 0 ? Math.round((manualRevenue / thisMonthRevenue) * 100) : 0 
            },
          },
          topProducts,
          topPerformers,
          comparison: {
            ordersChange: countChange,
            revenueChange,
            customersChange: customerChange,
          },
        };

        // Build and send report
        const reportText = buildMonthlyReport(metrics);
        
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
            report_type: 'monthly',
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
            report_type: 'monthly',
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
    console.error('Monthly report error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
