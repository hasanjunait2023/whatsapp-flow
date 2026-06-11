import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Starting scheduled subscription reminder job...');

    // Get all active reminder settings
    const { data: reminderSettings, error: settingsError } = await supabase
      .from('reminder_settings')
      .select('*')
      .eq('is_active', true);

    if (settingsError) throw settingsError;

    if (!reminderSettings || reminderSettings.length === 0) {
      console.log('No active reminder settings found');
      return new Response(JSON.stringify({ message: 'No active reminders configured' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const results: { type: string; sent: number; failed: number; skipped: number }[] = [];

    for (const setting of reminderSettings) {
      console.log(`Processing reminder type: ${setting.reminder_type}`);
      
      const typeResult = { type: setting.reminder_type, sent: 0, failed: 0, skipped: 0 };

      // Get subscriptions that match the reminder criteria
      const subscriptionsToNotify = await getSubscriptionsForReminder(supabase, setting);

      for (const subscription of subscriptionsToNotify) {
        try {
          // Check if we already sent this reminder today
          const today = new Date().toISOString().split('T')[0];
          const { data: existingLog } = await supabase
            .from('reminder_logs')
            .select('id')
            .eq('tenant_id', subscription.tenant_id)
            .eq('reminder_type', setting.reminder_type)
            .gte('sent_at', today)
            .single();

          if (existingLog) {
            console.log(`Skipping ${subscription.tenant_id} - already notified today`);
            typeResult.skipped++;
            continue;
          }

          // Get tenant owner
          const { data: ownerRole } = await supabase
            .from('user_roles')
            .select('user_id')
            .eq('tenant_id', subscription.tenant_id)
            .eq('role', 'owner')
            .single();

          if (!ownerRole) {
            console.log(`No owner found for tenant ${subscription.tenant_id}`);
            typeResult.skipped++;
            continue;
          }

          // Get owner profile
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, email, phone_number')
            .eq('id', ownerRole.user_id)
            .single();

          if (!profile) {
            console.log(`No profile found for owner ${ownerRole.user_id}`);
            typeResult.skipped++;
            continue;
          }

          // Get tenant and plan info
          const { data: tenant } = await supabase
            .from('tenants')
            .select('name')
            .eq('id', subscription.tenant_id)
            .single();

          const { data: plan } = await supabase
            .from('plans')
            .select('name')
            .eq('id', subscription.plan_id)
            .single();

          // Get message template if configured
          let messageTemplate = getDefaultTemplate(setting.reminder_type);
          if (setting.template_id) {
            const { data: template } = await supabase
              .from('message_templates')
              .select('content')
              .eq('id', setting.template_id)
              .single();
            if (template) {
              messageTemplate = template.content;
            }
          }

          // Calculate days remaining/overdue
          const expiryDate = new Date(subscription.current_period_end);
          const now = new Date();
          const daysRemaining = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

          // Personalize message
          const personalizedMessage = messageTemplate
            .replace(/{{tenant_name}}/g, tenant?.name || 'Your Business')
            .replace(/{{plan_name}}/g, plan?.name || 'Subscription')
            .replace(/{{expiry_date}}/g, expiryDate.toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            }))
            .replace(/{{days_remaining}}/g, String(Math.abs(daysRemaining)))
            .replace(/{{owner_name}}/g, profile.full_name || 'Customer');

          // Send based on channel
          let sent = false;
          const errorMessages: string[] = [];

          if ((setting.channel === 'whatsapp' || setting.channel === 'both') && profile.phone_number) {
            try {
              const response = await fetch(`${supabaseUrl}/functions/v1/send-message`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${supabaseKey}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  phone_number: profile.phone_number,
                  message: personalizedMessage,
                  tenant_id: subscription.tenant_id,
                }),
              });

              if (response.ok) {
                sent = true;
                console.log(`WhatsApp sent to ${profile.phone_number}`);
              } else {
                const error = await response.text();
                errorMessages.push(`WhatsApp: ${error}`);
              }
            } catch (err: any) {
              errorMessages.push(`WhatsApp: ${err.message}`);
            }
          }

          if (setting.channel === 'email' || setting.channel === 'both') {
            // Email would be sent here - for now just log
            console.log(`Email would be sent to ${profile.email}: ${personalizedMessage}`);
            if (setting.channel === 'email') sent = true;
          }

          // Log the reminder
          await supabase.from('reminder_logs').insert({
            tenant_id: subscription.tenant_id,
            reminder_type: setting.reminder_type,
            channel: setting.channel,
            template_id: setting.template_id,
            status: sent ? 'sent' : 'failed',
            error_message: errorMessages.length > 0 ? errorMessages.join('; ') : null,
          });

          if (sent) {
            typeResult.sent++;
          } else {
            typeResult.failed++;
          }
        } catch (err: any) {
          console.error(`Error processing subscription ${subscription.id}:`, err);
          typeResult.failed++;
        }
      }

      results.push(typeResult);
    }

    const summary = {
      processed_at: new Date().toISOString(),
      results,
      total_sent: results.reduce((sum, r) => sum + r.sent, 0),
      total_failed: results.reduce((sum, r) => sum + r.failed, 0),
      total_skipped: results.reduce((sum, r) => sum + r.skipped, 0),
    };

    console.log('Reminder job completed:', summary);

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Reminder cron error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function getSubscriptionsForReminder(supabase: any, setting: any) {
  const now = new Date();
  const subscriptions: any[] = [];

  for (const dayOffset of setting.days_offset) {
    let query = supabase
      .from('subscriptions')
      .select('id, tenant_id, plan_id, current_period_end, status');

    if (setting.reminder_type === 'expiry_warning') {
      // Find subscriptions expiring in exactly `dayOffset` days
      const targetDate = new Date(now);
      targetDate.setDate(targetDate.getDate() + dayOffset);
      const targetDateStr = targetDate.toISOString().split('T')[0];

      query = query
        .eq('status', 'active')
        .gte('current_period_end', `${targetDateStr}T00:00:00`)
        .lt('current_period_end', `${targetDateStr}T23:59:59`);
    } else if (setting.reminder_type === 'payment_overdue') {
      // Find subscriptions that are overdue by `dayOffset` days
      const targetDate = new Date(now);
      targetDate.setDate(targetDate.getDate() - dayOffset);
      const targetDateStr = targetDate.toISOString().split('T')[0];

      query = query
        .eq('status', 'past_due')
        .gte('current_period_end', `${targetDateStr}T00:00:00`)
        .lt('current_period_end', `${targetDateStr}T23:59:59`);
    } else if (setting.reminder_type === 'trial_ending') {
      // Find trialing subscriptions ending in `dayOffset` days
      const targetDate = new Date(now);
      targetDate.setDate(targetDate.getDate() + dayOffset);
      const targetDateStr = targetDate.toISOString().split('T')[0];

      query = query
        .eq('status', 'trialing')
        .gte('current_period_end', `${targetDateStr}T00:00:00`)
        .lt('current_period_end', `${targetDateStr}T23:59:59`);
    }

    const { data, error } = await query;
    if (!error && data) {
      subscriptions.push(...data);
    }
  }

  // Remove duplicates
  const uniqueSubscriptions = subscriptions.filter(
    (sub, index, self) => index === self.findIndex((s) => s.id === sub.id)
  );

  return uniqueSubscriptions;
}

function getDefaultTemplate(reminderType: string): string {
  switch (reminderType) {
    case 'expiry_warning':
      return `Hello {{owner_name}},

Your subscription for {{tenant_name}} will expire on {{expiry_date}} ({{days_remaining}} days remaining).

To avoid service interruption, please renew your subscription.

Thank you for your continued support!`;

    case 'payment_overdue':
      return `Hello {{owner_name}},

Your payment for {{tenant_name}} is {{days_remaining}} days overdue.

Please complete your payment to restore full access to your account.

If you have any questions, please contact our support team.`;

    case 'trial_ending':
      return `Hello {{owner_name}},

Your trial for {{tenant_name}} ends on {{expiry_date}} ({{days_remaining}} days remaining).

Upgrade now to continue enjoying all features without interruption!

Thank you for trying our service!`;

    default:
      return `Hello {{owner_name}},

This is a reminder about your subscription for {{tenant_name}}.

Please contact support if you have any questions.`;
  }
}
