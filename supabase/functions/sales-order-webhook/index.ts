import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-sales-webhook-secret',
};

interface SalesWebhookPayload {
  customer: {
    name: string;
    email: string;
    phone?: string;
  };
  order: {
    order_id: string;
    plan_slug: string;
    billing_cycle: 'monthly' | 'yearly';
    amount: number;
    payment_method?: string;
    transaction_id?: string;
  };
  business: {
    name: string;
    type: 'wholesale' | 'retail' | 'service';
  };
  source?: string;
}

function generatePassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let password = 'Temp@';
  for (let i = 0; i < 8; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const envWebhookSecret = Deno.env.get('SALES_WEBHOOK_SECRET');

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Get webhook secret from database (preferred) or fall back to env
    let webhookSecret = envWebhookSecret;
    
    const { data: dbSecret } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'sales_webhook_secret')
      .maybeSingle();
    
    if (dbSecret?.value) {
      // Handle both direct values and JSON wrapped values
      const value = typeof dbSecret.value === 'object' && 'value' in (dbSecret.value as object)
        ? (dbSecret.value as { value: string }).value
        : dbSecret.value;
      webhookSecret = value as string;
    }

    // Validate webhook secret
    const providedSecret = req.headers.get('x-sales-webhook-secret');
    if (!webhookSecret || providedSecret !== webhookSecret) {
      console.error('Invalid webhook secret');
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized', code: 'INVALID_SECRET' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const payload: SalesWebhookPayload = await req.json();

    // Validate required fields
    if (!payload.customer?.email || !payload.customer?.name) {
      return new Response(
        JSON.stringify({ success: false, error: 'Customer name and email are required', code: 'MISSING_CUSTOMER_INFO' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!payload.order?.order_id || !payload.order?.plan_slug) {
      return new Response(
        JSON.stringify({ success: false, error: 'Order ID and plan slug are required', code: 'MISSING_ORDER_INFO' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!payload.business?.name || !payload.business?.type) {
      return new Response(
        JSON.stringify({ success: false, error: 'Business name and type are required', code: 'MISSING_BUSINESS_INFO' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const source = payload.source || 'main_website';

    // Check for duplicate order
    const { data: existingOrder } = await supabase
      .from('external_sales_orders')
      .select('id, status, tenant_id')
      .eq('external_order_id', payload.order.order_id)
      .eq('source', source)
      .maybeSingle();

    if (existingOrder) {
      if (existingOrder.status === 'completed') {
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Order already processed',
            tenant_id: existingOrder.tenant_id,
            code: 'DUPLICATE_ORDER'
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Find the plan by slug pattern (tier_businesstype)
    // Expected formats: starter_retail, growth_wholesale, pro_service
    const planSlugParts = payload.order.plan_slug.split('_');
    const tier = planSlugParts[0]; // starter, growth, pro
    const businessTypeFromSlug = planSlugParts.slice(1).join('_'); // retail, wholesale, service

    // Map external slug to database slug
    const slugMapping: Record<string, string> = {
      'retail': 'retail_ecom',
      'retail_ecom': 'retail_ecom',
      'wholesale': 'wholesale',
      'service': 'service',
    };
    
    const mappedSlug = slugMapping[businessTypeFromSlug] || businessTypeFromSlug;

    // Get business type by mapped slug
    let { data: businessType } = await supabase
      .from('business_types')
      .select('id, slug')
      .eq('slug', mappedSlug)
      .maybeSingle();

    // Fallback: try exact match or ilike on name
    if (!businessType) {
      const { data: businessTypeByName } = await supabase
        .from('business_types')
        .select('id, slug')
        .or(`slug.eq.${businessTypeFromSlug},name.ilike.%${payload.business.type}%`)
        .maybeSingle();
      
      businessType = businessTypeByName;
    }

    if (!businessType) {
      console.error('Business type not found:', { slug: businessTypeFromSlug, mappedSlug, businessType: payload.business.type });
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Business type not found: ${businessTypeFromSlug}. Valid types: retail, wholesale, service`, 
          code: 'INVALID_BUSINESS_TYPE' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const businessTypeId = businessType.id;
    console.log('Resolved business type:', { input: businessTypeFromSlug, resolved: businessType.slug, id: businessTypeId });

    // Find matching plan
    const { data: plan } = await supabase
      .from('plans')
      .select('id, name')
      .ilike('name', `%${tier}%`)
      .eq('business_type_id', businessTypeId)
      .eq('is_active', true)
      .maybeSingle();

    if (!plan) {
      // Fallback: try to find any active plan for this business type
      const { data: fallbackPlan } = await supabase
        .from('plans')
        .select('id, name')
        .eq('business_type_id', businessTypeId)
        .eq('is_active', true)
        .order('monthly_price', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (!fallbackPlan) {
        return new Response(
          JSON.stringify({ success: false, error: `No plan found for: ${payload.order.plan_slug}`, code: 'PLAN_NOT_FOUND' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const planId = plan?.id;

    // Create external sales order record first (for tracking)
    const { data: salesOrder, error: salesOrderError } = await supabase
      .from('external_sales_orders')
      .upsert({
        external_order_id: payload.order.order_id,
        source,
        plan_id: planId,
        amount: payload.order.amount,
        billing_cycle: payload.order.billing_cycle || 'monthly',
        payment_method: payload.order.payment_method,
        transaction_id: payload.order.transaction_id,
        customer_name: payload.customer.name,
        customer_email: payload.customer.email.toLowerCase(),
        customer_phone: payload.customer.phone,
        business_name: payload.business.name,
        business_type: payload.business.type,
        status: 'processing',
        raw_payload: payload as unknown as Record<string, unknown>,
      }, {
        onConflict: 'external_order_id,source'
      })
      .select()
      .single();

    if (salesOrderError) {
      console.error('Error creating sales order record:', salesOrderError);
      throw salesOrderError;
    }

    // Check if user already exists
    const { data: existingUser } = await supabase.auth.admin.listUsers();
    const userExists = existingUser?.users?.find(u => u.email?.toLowerCase() === payload.customer.email.toLowerCase());

    let userId: string;
    let tempPassword: string | null = null;

    if (userExists) {
      userId = userExists.id;
    } else {
      // Create new user
      tempPassword = generatePassword();
      const { data: newUser, error: createUserError } = await supabase.auth.admin.createUser({
        email: payload.customer.email.toLowerCase(),
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          full_name: payload.customer.name,
          phone: payload.customer.phone,
        }
      });

      if (createUserError) {
        console.error('Error creating user:', createUserError);
        await supabase.from('external_sales_orders').update({
          status: 'failed',
          error_message: `User creation failed: ${createUserError.message}`
        }).eq('id', salesOrder.id);
        
        return new Response(
          JSON.stringify({ success: false, error: createUserError.message, code: 'USER_CREATION_FAILED' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      userId = newUser.user.id;

      // Update profile with phone number
      await supabase.from('profiles').update({
        full_name: payload.customer.name,
        phone_number: payload.customer.phone,
      }).eq('id', userId);
    }

    // Create tenant
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .insert({
        name: payload.business.name,
        owner_id: userId,
        business_type_id: businessTypeId,
        is_activated: false, // Will be activated by trigger when subscription order is paid
      })
      .select()
      .single();

    if (tenantError) {
      console.error('Error creating tenant:', tenantError);
      await supabase.from('external_sales_orders').update({
        status: 'failed',
        error_message: `Tenant creation failed: ${tenantError.message}`
      }).eq('id', salesOrder.id);
      
      return new Response(
        JSON.stringify({ success: false, error: tenantError.message, code: 'TENANT_CREATION_FAILED' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Assign owner role
    const { error: roleError } = await supabase
      .from('user_roles')
      .insert({
        user_id: userId,
        tenant_id: tenant.id,
        role: 'owner',
      });

    if (roleError) {
      console.error('Error assigning role:', roleError);
      // Continue anyway, this is not critical
    }

    // Create subscription order (marked as paid to trigger activation)
    const { data: subscriptionOrder, error: subOrderError } = await supabase
      .from('subscription_orders')
      .insert({
        order_number: `EXT-${payload.order.order_id}`,
        tenant_id: tenant.id,
        plan_id: planId,
        amount: payload.order.amount,
        billing_cycle: payload.order.billing_cycle || 'monthly',
        payment_method: payload.order.payment_method || 'external',
        transaction_id: payload.order.transaction_id,
        status: 'paid', // This triggers the activate_tenant_on_order_paid trigger
        verified_by: userId,
        verified_at: new Date().toISOString(),
        notes: `External order: ${payload.order.order_id} from ${source}`,
      })
      .select()
      .single();

    if (subOrderError) {
      console.error('Error creating subscription order:', subOrderError);
      await supabase.from('external_sales_orders').update({
        status: 'failed',
        error_message: `Subscription order failed: ${subOrderError.message}`
      }).eq('id', salesOrder.id);
      
      return new Response(
        JSON.stringify({ success: false, error: subOrderError.message, code: 'SUBSCRIPTION_ORDER_FAILED' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update external sales order as completed
    // Update with temp_password in raw_payload for admin reference
    const updatedPayload = {
      ...(payload as unknown as Record<string, unknown>),
      temp_password: tempPassword,
    };

    await supabase.from('external_sales_orders').update({
      tenant_id: tenant.id,
      user_id: userId,
      status: 'completed',
      processed_at: new Date().toISOString(),
      raw_payload: updatedPayload,
    }).eq('id', salesOrder.id);

    // Log to admin audit
    await supabase.from('admin_audit_logs').insert({
      action: 'external_sale_processed',
      entity_type: 'tenant',
      entity_id: tenant.id,
      details: {
        external_order_id: payload.order.order_id,
        source,
        customer_email: payload.customer.email,
        plan_id: planId,
        amount: payload.order.amount,
      }
    });

    // Optional: Send Telegram notification
    const telegramBotToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
    if (telegramBotToken) {
      try {
        // Get admin telegram chat IDs if configured
        const { data: settings } = await supabase
          .from('admin_settings')
          .select('value')
          .eq('key', 'telegram_notification_chat_id')
          .maybeSingle();

        if (settings?.value) {
          const message = `🎉 *New External Sale!*\n\n` +
            `👤 Customer: ${payload.customer.name}\n` +
            `📧 Email: ${payload.customer.email}\n` +
            `🏢 Business: ${payload.business.name}\n` +
            `💰 Amount: ৳${payload.order.amount}\n` +
            `📦 Order: ${payload.order.order_id}`;

          await fetch(`https://api.telegram.org/bot${telegramBotToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: settings.value,
              text: message,
              parse_mode: 'Markdown'
            })
          });
        }
      } catch (e) {
        console.log('Telegram notification failed:', e);
      }
    }

    // Track notification status
    let whatsappSent = false;
    let emailSent = false;
    const notificationErrors: string[] = [];

    // Send WhatsApp welcome message if phone number is provided and temp password exists
    if (tempPassword && payload.customer.phone) {
      try {
        // Check for an active Admin WhatsApp instance with API key
        const { data: instance } = await supabase
          .from('admin_whatsapp_instances')
          .select('session_id, api_key_encrypted')
          .eq('status', 'active')
          .not('session_id', 'is', null)
          .not('api_key_encrypted', 'is', null)
          .eq('is_default', true)
          .maybeSingle();

        // Fallback to any active instance if no default
        const activeInstance = instance || (await supabase
          .from('admin_whatsapp_instances')
          .select('session_id, api_key_encrypted')
          .eq('status', 'active')
          .not('session_id', 'is', null)
          .not('api_key_encrypted', 'is', null)
          .limit(1)
          .maybeSingle()).data;

        if (activeInstance?.session_id && activeInstance?.api_key_encrypted) {
            const whatsappMessage = `🎉 *Ecomex Automation এ স্বাগতম!*

প্রিয় ${payload.customer.name},

আপনার অ্যাকাউন্ট সফলভাবে তৈরি হয়েছে। নিচে আপনার Login তথ্য দেওয়া হলো:

━━━━━━━━━━━━━━━━
📧 *Email:* ${payload.customer.email}
🔑 *Password:* ${tempPassword}
━━━━━━━━━━━━━━━━

👉 *Login করতে এখানে যান:*
https://whataapp.myecomex.com/auth/login

⚠️ *গুরুত্বপূর্ণ:*
প্রথম Login এর পর আপনার Password অবশ্যই পরিবর্তন করুন।

📍 Settings → Profile → Security

সাহায্য প্রয়োজন? এই নম্বরে Reply করুন অথবা myecomexautomation@gmail.com এ Email করুন।

ধন্যবাদ! 🙏
Ecomex Automation Team`;

            // Format phone number (remove + and any non-digits)
            let phoneNumber = payload.customer.phone.replace(/\D/g, '');
            // Ensure it starts with country code (880 for Bangladesh)
            if (phoneNumber.startsWith('0')) {
              phoneNumber = '880' + phoneNumber.slice(1);
            } else if (!phoneNumber.startsWith('880')) {
              phoneNumber = '880' + phoneNumber;
            }

            const waResponse = await fetch(`https://www.wasenderapi.com/api/send-message`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${activeInstance.api_key_encrypted}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                sessionId: activeInstance.session_id,
                to: phoneNumber,
                text: whatsappMessage,
              }),
            });

            if (waResponse.ok) {
              whatsappSent = true;
              console.log('WhatsApp welcome message sent successfully');
            } else {
              const waError = await waResponse.text();
              notificationErrors.push(`WhatsApp: ${waError}`);
              console.log('WhatsApp message failed:', waError);
            }
          } else {
            notificationErrors.push('WhatsApp: No active admin instance available');
          }
      } catch (e) {
        const error = e instanceof Error ? e.message : 'Unknown error';
        notificationErrors.push(`WhatsApp: ${error}`);
        console.log('WhatsApp welcome message failed:', e);
      }
    }

    // Send welcome email if temp password exists
    if (tempPassword) {
      try {
        const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-welcome-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({
            to: payload.customer.email,
            customerName: payload.customer.name,
            email: payload.customer.email,
            tempPassword: tempPassword,
            businessName: payload.business.name,
          }),
        });

        if (emailResponse.ok) {
          emailSent = true;
          console.log('Welcome email sent successfully');
        } else {
          const emailError = await emailResponse.text();
          notificationErrors.push(`Email: ${emailError}`);
          console.log('Welcome email failed:', emailError);
        }
      } catch (e) {
        const error = e instanceof Error ? e.message : 'Unknown error';
        notificationErrors.push(`Email: ${error}`);
        console.log('Welcome email failed:', e);
      }
    }

    // Update external sales order with notification status
    await supabase.from('external_sales_orders').update({
      whatsapp_sent: whatsappSent,
      whatsapp_sent_at: whatsappSent ? new Date().toISOString() : null,
      email_sent: emailSent,
      email_sent_at: emailSent ? new Date().toISOString() : null,
      notification_errors: notificationErrors.length > 0 ? notificationErrors : null,
    }).eq('id', salesOrder.id);

    console.log('External sale processed successfully:', {
      order_id: payload.order.order_id,
      tenant_id: tenant.id,
      user_id: userId,
    });

    return new Response(
      JSON.stringify({
        success: true,
        tenant_id: tenant.id,
        user_id: userId,
        message: 'Tenant created and activated successfully',
        login_url: 'https://whaatapp.lovable.app/auth/login',
        temporary_password: tempPassword,
        notifications: {
          whatsapp_sent: whatsappSent,
          email_sent: emailSent,
          errors: notificationErrors.length > 0 ? notificationErrors : undefined,
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Sales order webhook error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: message, code: 'INTERNAL_ERROR' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
