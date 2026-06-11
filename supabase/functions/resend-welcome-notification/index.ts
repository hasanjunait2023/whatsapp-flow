import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ResendRequest {
  order_id: string;
  notification_type: 'whatsapp' | 'email' | 'all';
  temp_password?: string;
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

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Verify admin access via auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is system admin
    const { data: adminRole } = await supabase
      .from('system_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!adminRole) {
      return new Response(
        JSON.stringify({ success: false, error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { order_id, notification_type, temp_password }: ResendRequest = await req.json();

    if (!order_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'order_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get order details
    const { data: order, error: orderError } = await supabase
      .from('external_sales_orders')
      .select('*')
      .eq('id', order_id)
      .single();

    if (orderError || !order) {
      return new Response(
        JSON.stringify({ success: false, error: 'Order not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const password = temp_password || generatePassword();
    const notificationErrors: string[] = [];
    let whatsappSent = order.whatsapp_sent || false;
    let emailSent = order.email_sent || false;

    // IMPORTANT: Update the user's password in Supabase Auth first
    // This ensures the password we send matches the actual account password
    if (order.user_id) {
      const { error: passwordError } = await supabase.auth.admin.updateUserById(
        order.user_id,
        { password: password }
      );

      if (passwordError) {
        console.error('Failed to update password:', passwordError);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Failed to reset password: ${passwordError.message}` 
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      console.log('Password updated successfully for user:', order.user_id);
    } else {
      console.log('No user_id found on order, skipping password update');
    }

    // Send WhatsApp if requested and phone is available
    if ((notification_type === 'whatsapp' || notification_type === 'all') && order.customer_phone) {
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

প্রিয় ${order.customer_name},

আপনার অ্যাকাউন্ট সফলভাবে তৈরি হয়েছে। নিচে আপনার Login তথ্য দেওয়া হলো:

━━━━━━━━━━━━━━━━
📧 *Email:* ${order.customer_email}
🔑 *Password:* ${password}
━━━━━━━━━━━━━━━━

👉 *Login করতে এখানে যান:*
https://whataapp.myecomex.com/auth/login

⚠️ *গুরুত্বপূর্ণ:*
প্রথম Login এর পর আপনার Password অবশ্যই পরিবর্তন করুন।

📍 Settings → Profile → Security

সাহায্য প্রয়োজন? এই নম্বরে Reply করুন অথবা myecomexautomation@gmail.com এ Email করুন।

ধন্যবাদ! 🙏
Ecomex Automation Team`;

          let phoneNumber = order.customer_phone.replace(/\D/g, '');
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
            console.log('WhatsApp message resent successfully');
          } else {
            const waError = await waResponse.text();
            notificationErrors.push(`WhatsApp: ${waError}`);
            console.log('WhatsApp resend failed:', waError);
          }
        } else {
          notificationErrors.push('WhatsApp: No active admin WhatsApp instance found');
        }
      } catch (e) {
        const error = e instanceof Error ? e.message : 'Unknown error';
        notificationErrors.push(`WhatsApp: ${error}`);
        console.log('WhatsApp resend error:', e);
      }
    }

    // Send email if requested
    if (notification_type === 'email' || notification_type === 'all') {
      try {
        const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-welcome-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({
            to: order.customer_email,
            customerName: order.customer_name,
            email: order.customer_email,
            tempPassword: password,
            businessName: order.business_name,
          }),
        });

        if (emailResponse.ok) {
          emailSent = true;
          console.log('Welcome email resent successfully');
        } else {
          const emailError = await emailResponse.text();
          notificationErrors.push(`Email: ${emailError}`);
          console.log('Email resend failed:', emailError);
        }
      } catch (e) {
        const error = e instanceof Error ? e.message : 'Unknown error';
        notificationErrors.push(`Email: ${error}`);
        console.log('Email resend error:', e);
      }
    }

    // Update order with notification status
    const updateData: Record<string, unknown> = {
      notification_errors: notificationErrors.length > 0 ? notificationErrors : null,
    };

    if (whatsappSent && !order.whatsapp_sent) {
      updateData.whatsapp_sent = true;
      updateData.whatsapp_sent_at = new Date().toISOString();
    }

    if (emailSent && !order.email_sent) {
      updateData.email_sent = true;
      updateData.email_sent_at = new Date().toISOString();
    }

    await supabase
      .from('external_sales_orders')
      .update(updateData)
      .eq('id', order_id);

    // Log action
    await supabase.from('admin_audit_logs').insert({
      admin_id: user.id,
      action: 'resend_welcome_notification',
      entity_type: 'external_sales_order',
      entity_id: order_id,
      details: {
        notification_type,
        whatsapp_sent: whatsappSent,
        email_sent: emailSent,
        errors: notificationErrors,
      }
    });

    return new Response(
      JSON.stringify({
        success: true,
        notifications: {
          whatsapp_sent: whatsappSent,
          email_sent: emailSent,
          errors: notificationErrors,
        },
        temp_password: password,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Resend notification error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
