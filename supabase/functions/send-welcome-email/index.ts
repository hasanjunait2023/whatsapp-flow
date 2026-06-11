import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WelcomeEmailRequest {
  to: string;
  customerName: string;
  email: string;
  tempPassword: string;
  businessName: string;
}

async function getAccessToken(): Promise<string> {
  const clientId = Deno.env.get('GMAIL_CLIENT_ID')!;
  const clientSecret = Deno.env.get('GMAIL_CLIENT_SECRET')!;
  const refreshToken = Deno.env.get('GMAIL_REFRESH_TOKEN')!;

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Failed to refresh access token:', error);
    throw new Error('Failed to refresh Gmail access token');
  }

  const data = await response.json();
  return data.access_token;
}

function createEmailContent(params: WelcomeEmailRequest): string {
  const loginUrl = 'https://whataapp.myecomex.com/auth/login';
  
  const htmlContent = `
<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Ecomex Automation</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7fa; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; }
    .header .emoji { font-size: 48px; margin-bottom: 10px; }
    .content { padding: 30px; }
    .bengali { font-size: 16px; line-height: 1.8; color: #333; margin-bottom: 30px; }
    .english { font-size: 14px; line-height: 1.6; color: #666; border-top: 1px solid #eee; padding-top: 20px; }
    .credentials { background: #f8f9fc; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #667eea; }
    .credentials p { margin: 8px 0; font-size: 15px; }
    .credentials strong { color: #333; }
    .btn { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 15px 0; }
    .warning { background: #fff3cd; border: 1px solid #ffc107; border-radius: 8px; padding: 15px; margin: 20px 0; }
    .warning-icon { font-size: 20px; margin-right: 8px; }
    .footer { background: #f8f9fc; padding: 20px; text-align: center; color: #888; font-size: 13px; }
    .footer a { color: #667eea; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="emoji">🎉</div>
      <h1>স্বাগতম! Welcome!</h1>
    </div>
    <div class="content">
      <div class="bengali">
        <p>প্রিয় <strong>${params.customerName}</strong>,</p>
        <p>আপনার <strong>${params.businessName}</strong> এর জন্য Ecomex Automation অ্যাকাউন্ট সফলভাবে তৈরি হয়েছে! 🚀</p>
        
        <div class="credentials">
          <p>📧 <strong>Email:</strong> ${params.email}</p>
          <p>🔑 <strong>Password:</strong> ${params.tempPassword}</p>
        </div>
        
        <p style="text-align: center;">
          <a href="${loginUrl}" class="btn">👉 এখানে Login করুন</a>
        </p>
        
        <div class="warning">
          <p><span class="warning-icon">⚠️</span><strong>গুরুত্বপূর্ণ:</strong></p>
          <p>প্রথম Login এর পর অবশ্যই আপনার Password পরিবর্তন করুন।</p>
          <p>📍 <strong>Settings → Profile → Security</strong> থেকে Password change করতে পারবেন।</p>
        </div>
      </div>
      
      <div class="english">
        <p>Dear <strong>${params.customerName}</strong>,</p>
        <p>Your Ecomex Automation account for <strong>${params.businessName}</strong> has been created successfully!</p>
        
        <div class="credentials">
          <p>📧 <strong>Email:</strong> ${params.email}</p>
          <p>🔑 <strong>Password:</strong> ${params.tempPassword}</p>
        </div>
        
        <p><a href="${loginUrl}">Login here: ${loginUrl}</a></p>
        
        <p><strong>Important:</strong> Please change your password after first login. Go to <strong>Settings → Profile → Security</strong> to update your password.</p>
      </div>
    </div>
    <div class="footer">
      <p>সাহায্য প্রয়োজন? | Need help?</p>
      <p><a href="mailto:support@myecomex.com">support@myecomex.com</a></p>
      <p style="margin-top: 15px;">© 2025 Ecomex Automation. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `.trim();

  return htmlContent;
}

function createMimeMessage(to: string, subject: string, htmlContent: string): string {
  const fromEmail = 'myecomex23@gmail.com'; // Gmail account
  
  const boundary = `boundary_${Date.now()}`;
  
  const mimeMessage = [
    `From: Ecomex Automation <${fromEmail}>`,
    `To: ${to}`,
    `Subject: =?UTF-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    btoa(unescape(encodeURIComponent(htmlContent))),
    `--${boundary}--`,
  ].join('\r\n');

  // Base64url encode the entire message
  return btoa(mimeMessage).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload: WelcomeEmailRequest = await req.json();

    if (!payload.to || !payload.customerName || !payload.email || !payload.tempPassword) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Sending welcome email to:', payload.to);

    // Get fresh access token
    const accessToken = await getAccessToken();

    // Create email content
    const htmlContent = createEmailContent(payload);
    const subject = 'আপনার অ্যাকাউন্ট তৈরি হয়েছে ✅ | Welcome to Ecomex Automation';
    
    // Create MIME message
    const rawMessage = createMimeMessage(payload.to, subject, htmlContent);

    // Send email via Gmail API
    const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw: rawMessage }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Gmail API error:', error);
      throw new Error(`Failed to send email: ${error}`);
    }

    const result = await response.json();
    console.log('Email sent successfully:', result.id);

    return new Response(
      JSON.stringify({ success: true, messageId: result.id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Send welcome email error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
