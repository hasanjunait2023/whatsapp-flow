import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Campaign IDs
const PROSPECT_NURTURE_ID = "620d4020-b78b-4e89-b9a5-8403c3f1e3b0";
const SUBSCRIBER_RETENTION_ID = "dc17758e-52f0-4f25-9dab-fd0d8db79ac4";

// Prospect Nurture Campaign Sequences (25 total)
const prospectNurtureSequences = [
  {
    week_number: 1,
    step_order: 1,
    name: "Welcome",
    name_bn: "স্বাগতম",
    theme: "welcome",
    channel: "whatsapp",
    discount_percent: 0,
    content_template: {
      wa_message_bn: `আসসালামু আলাইকুম {{name}} ভাই/আপা! 😊 Ecomex এ আপনাকে স্বাগতম! আমরা দেখলাম আপনি register করেছেন। আচ্ছা, আপনার ব্যবসায় WhatsApp থেকে কি অনেক মেসেজ আসে? সব reply দিতে গিয়ে কি মাঝে মাঝে ক্লান্ত লাগে? আপনার এই সমস্যার সমাধান আমাদের কাছে আছে! কোনো প্রশ্ন থাকলে জানাবেন। - Ecomex টিম`,
    },
  },
  {
    week_number: 2,
    step_order: 1,
    name: "Problem Identification",
    name_bn: "সমস্যা চিহ্নিত",
    theme: "educational",
    channel: "whatsapp",
    discount_percent: 0,
    content_template: {
      wa_message_bn: `{{name}} ভাই/আপা, একটু ভাবুন তো... দিনে কতবার আপনাকে "Price কত?", "Delivery কবে?" এসব প্রশ্নের উত্তর দিতে হয়? 🤔 একই কাজ বারবার করতে গিয়ে আসল কাজের সময় থাকে না। Ecomex দিয়ে এসব স্বয়ংক্রিয় করতে পারেন। আপনার সময় বাঁচান, ব্যবসা বাড়ান!`,
    },
  },
  {
    week_number: 3,
    step_order: 1,
    name: "Quick Reply Introduction",
    name_bn: "Quick Reply পরিচয়",
    theme: "feature",
    channel: "whatsapp",
    discount_percent: 0,
    content_template: {
      wa_message_bn: `{{name}} ভাই, জানেন কি? 💡 Ecomex এ "Quick Reply" ফিচার আছে। একবার সেট করলে "/price" লিখলেই সব product এর দাম চলে যায়! আর একই কথা বারবার লিখতে হয় না। ১০০+ ব্যবসায়ী এটা ব্যবহার করে দিনে ২-৩ ঘণ্টা সময় বাঁচাচ্ছে!`,
    },
  },
  {
    week_number: 4,
    step_order: 1,
    name: "Success Story",
    name_bn: "Success Story",
    theme: "social_proof",
    channel: "whatsapp",
    discount_percent: 0,
    content_template: {
      wa_message_bn: `{{name}} ভাই/আপা, আমাদের একজন ব্যবহারকারী জাহিদ ভাই (চা ব্যবসা) বললেন - "আগে সারাদিন phone ধরে বসে থাকতাম। এখন Ecomex এ সব order একসাথে দেখি, Quick Reply দিয়ে জবাব দিই। সন্ধ্যায় পরিবারকে সময় দিতে পারি!" 😊 আপনিও পারবেন!`,
    },
  },
  {
    week_number: 6,
    step_order: 1,
    name: "Chat to Order",
    name_bn: "Chat থেকে Order",
    theme: "feature",
    channel: "whatsapp",
    discount_percent: 0,
    content_template: {
      wa_message_bn: `ভাই/আপা, WhatsApp chat থেকে সরাসরি order নিতে পারেন জানেন? 📦 Customer এর সাথে কথা বলতে বলতেই order create, status update - সব এক জায়গায়! কোনো আলাদা app দরকার নেই। আমাদের Starter প্যাকেজ মাত্র ৳১,৯৯৯/মাস - দিনে মাত্র ৳৬৭ টাকা!`,
    },
  },
  {
    week_number: 8,
    step_order: 1,
    name: "First Offer",
    name_bn: "প্রথম Offer",
    theme: "offer",
    channel: "whatsapp",
    discount_percent: 10,
    content_template: {
      wa_message_bn: `{{name}} ভাই, আপনার জন্য special! 🎁 এই সপ্তাহে subscribe করলে **১০% ছাড়!** আমাদের Starter প্যাকেজ এখন মাত্র **৳১,৭৯৯/মাস** (আসল দাম ৳১,৯৯৯)। WhatsApp + Messenger + Orders - সব এক জায়গায়। Offer শেষ: {{offer_end_date}}। Link: {{signup_link}}`,
    },
  },
  {
    week_number: 10,
    step_order: 1,
    name: "Check-in",
    name_bn: "Check-in",
    theme: "engagement",
    channel: "whatsapp",
    discount_percent: 0,
    content_template: {
      wa_message_bn: `{{name}} ভাই/আপা, কেমন আছেন? 😊 কিছুদিন আগে Ecomex এ register করেছিলেন। কোনো সমস্যায় পড়েছেন? নাকি কোনো feature বুঝতে অসুবিধা হচ্ছে? জানালে আমরা help করতে পারি!`,
    },
  },
  {
    week_number: 12,
    step_order: 1,
    name: "Messenger Integration",
    name_bn: "Messenger Integration",
    theme: "educational",
    channel: "whatsapp",
    discount_percent: 0,
    content_template: {
      wa_message_bn: `ভাই, শুধু WhatsApp না! 📱 Ecomex এ Facebook Messenger ও connect করতে পারেন। দুটো platform এর সব message এক জায়গায়! Page এ কেউ knock করলে আর miss হবে না। ভাবুন একবার - কত customer হারাচ্ছেন late reply এর জন্য?`,
    },
  },
  {
    week_number: 14,
    step_order: 1,
    name: "Show Numbers",
    name_bn: "Numbers দেখান",
    theme: "social_proof",
    channel: "whatsapp",
    discount_percent: 0,
    content_template: {
      wa_message_bn: `{{name}} ভাই, কিছু মজার তথ্য! 📊 Ecomex ব্যবহারকারীরা average: প্রতিদিন ২ ঘণ্টা সময় বাঁচায়, ৩০% বেশি order handle করে, Customer satisfaction বাড়ে! আপনিও এই community তে join করুন।`,
    },
  },
  {
    week_number: 16,
    step_order: 1,
    name: "Team Feature",
    name_bn: "Team Feature",
    theme: "feature",
    channel: "whatsapp",
    discount_percent: 0,
    content_template: {
      wa_message_bn: `বড় হচ্ছে ব্যবসা? 👥 Ecomex এ Team feature আছে! Starter এ ৩ জন, Growth এ ৫ জন team member add করতে পারেন। কে কোন customer handle করছে সব track হয়। আপনি owner হিসেবে সব দেখতে পারবেন!`,
    },
  },
  {
    week_number: 18,
    step_order: 1,
    name: "Get Feedback",
    name_bn: "Feedback নিন",
    theme: "engagement",
    channel: "whatsapp",
    discount_percent: 0,
    content_template: {
      wa_message_bn: `{{name}} ভাই/আপা, আমাদের সাথে কথা বলার সময় আছে? 🤝 আপনি register করেছিলেন কিন্তু এখনো start করেননি। কোনো বিশেষ কারণ আছে কি? আপনার মতামত আমাদের জন্য খুবই গুরুত্বপূর্ণ!`,
    },
  },
  {
    week_number: 20,
    step_order: 1,
    name: "Reports Dashboard",
    name_bn: "Reports/Dashboard",
    theme: "feature",
    channel: "whatsapp",
    discount_percent: 0,
    content_template: {
      wa_message_bn: `ভাই, রিপোর্ট দেখতে পারেন Ecomex এ! 📈 কোন দিন কত message আসছে, কত order হচ্ছে - সব এক dashboard এ। ব্যবসার growth নিজে দেখুন। Data-driven decision নিন!`,
    },
  },
  {
    week_number: 22,
    step_order: 1,
    name: "Products Catalog",
    name_bn: "Products Catalog",
    theme: "feature",
    channel: "whatsapp",
    discount_percent: 0,
    content_template: {
      wa_message_bn: `ভাই, Products feature দেখেছেন? 🛍️ আপনার সব product Ecomex এ add করুন - নাম, দাম, ছবি সহ। Customer জিজ্ঞেস করলে এক click এ পাঠিয়ে দিন। Professional ভাবে ব্যবসা করুন!`,
    },
  },
  {
    week_number: 24,
    step_order: 1,
    name: "Mid-Year Offer",
    name_bn: "Mid-Year Offer",
    theme: "offer",
    channel: "whatsapp",
    discount_percent: 15,
    content_template: {
      wa_message_bn: `{{name}} ভাই, **Special Offer!** 🎊 এই সপ্তাহে start করলে **১৫% ছাড়!** Starter এখন **৳১,৬৯৯/মাস** (আসল ৳১,৯৯৯), Growth এখন **৳২,৪৬৪/মাস** (আসল ৳২,৮৯৯)। আমরা চাই আপনার ব্যবসা বড় হোক। Link: {{signup_link}}`,
    },
  },
  {
    week_number: 26,
    step_order: 1,
    name: "Value Reminder",
    name_bn: "Value Reminder",
    theme: "engagement",
    channel: "whatsapp",
    discount_percent: 0,
    content_template: {
      wa_message_bn: `{{name}} ভাই, একটু হিসাব করুন: দিনে ২ ঘণ্টা সময় বাঁচলে মাসে ৬০ ঘণ্টা! এই সময়ে আরও কত কাজ করতে পারতেন? Ecomex মাত্র ৳১,৯৯৯/মাস - দিনে একটা চায়ের দামও না! ☕`,
    },
  },
  {
    week_number: 28,
    step_order: 1,
    name: "Automation Introduction",
    name_bn: "Automation পরিচয়",
    theme: "educational",
    channel: "whatsapp",
    discount_percent: 0,
    content_template: {
      wa_message_bn: `ভাই/আপা, জানেন কি? 🤖 Ecomex Growth প্যাকেজে AI Agent আছে। নতুন message আসলে automatic reply, order confirm হলে automatic status update! আপনি ঘুমিয়ে থাকলেও ব্যবসা চলবে। মাত্র ৳২,৮৯৯/মাস!`,
    },
  },
  {
    week_number: 30,
    step_order: 1,
    name: "Yearly Plan",
    name_bn: "Yearly Plan",
    theme: "feature",
    channel: "whatsapp",
    discount_percent: 0,
    content_template: {
      wa_message_bn: `ভাই, জানেন কি? 💰 Yearly plan নিলে ২ মাস একদম FREE! Starter বছরে ৳১৯,৯৯০ (৳৩,৯৯৮ সেভ), Growth বছরে ৳২৮,৯৯০ (৳৫,৭৯৮ সেভ)! দীর্ঘমেয়াদে ভাবুন, সেভ করুন!`,
    },
  },
  {
    week_number: 32,
    step_order: 1,
    name: "Testimonial",
    name_bn: "Testimonial",
    theme: "social_proof",
    channel: "whatsapp",
    discount_percent: 0,
    content_template: {
      wa_message_bn: `{{name}} ভাই, Tasnim Apa (Online Boutique) বলেছেন: "Ecomex আগে শুনিনি, কিন্তু ব্যবহার করে মুগ্ধ! সব order এক জায়গায়, customer দের সাথে কথা বলা অনেক easy হয়ে গেছে।" আপনিও এই experience পেতে পারেন! 😊`,
    },
  },
  {
    week_number: 34,
    step_order: 1,
    name: "Industry Specific",
    name_bn: "Industry Specific",
    theme: "social_proof",
    channel: "whatsapp",
    discount_percent: 0,
    content_template: {
      wa_message_bn: `{{name}} ভাই, আপনার মতো Retail/Wholesale/Service ব্যবসায়ীরা Ecomex ব্যবহার করে খুশি! প্রতিটা industry র জন্য আলাদা feature আছে। WooCommerce sync, Bulk order - সব আছে!`,
    },
  },
  {
    week_number: 36,
    step_order: 1,
    name: "Labels Tags",
    name_bn: "Labels/Tags",
    theme: "feature",
    channel: "whatsapp",
    discount_percent: 0,
    content_template: {
      wa_message_bn: `ভাই, Customer organize করা এখন সহজ! 🏷️ Ecomex এ Labels feature দিয়ে VIP customer, New, Pending - সব tag করতে পারেন। কে important, কার সাথে follow-up দরকার - এক নজরে দেখুন!`,
    },
  },
  {
    week_number: 40,
    step_order: 1,
    name: "Reminder",
    name_bn: "Reminder",
    theme: "engagement",
    channel: "whatsapp",
    discount_percent: 0,
    content_template: {
      wa_message_bn: `{{name}} ভাই/আপা, আমরা আপনাকে মনে রাখি! 💭 Ecomex আপনার জন্য ready। যখনই ব্যবসার WhatsApp handle করতে কষ্ট হবে, আমরা আছি। কোনো প্রশ্ন থাকলে জানাবেন!`,
    },
  },
  {
    week_number: 44,
    step_order: 1,
    name: "Courier Integration",
    name_bn: "Courier Integration",
    theme: "feature",
    channel: "whatsapp",
    discount_percent: 0,
    content_template: {
      wa_message_bn: `ভাই, Courier integration জানেন? 🚚 Ecomex থেকে সরাসরি Steadfast, Pathao এ parcel book করতে পারেন! আলাদা app খুলতে হয় না। Order থেকে delivery - সব এক জায়গায়! Pro প্যাকেজে ৩টা WhatsApp instance connect করতে পারবেন।`,
    },
  },
  {
    week_number: 48,
    step_order: 1,
    name: "Year-End Offer",
    name_bn: "Year-End Offer",
    theme: "offer",
    channel: "whatsapp",
    discount_percent: 15,
    content_template: {
      wa_message_bn: `{{name}} ভাই, বছর শেষ হচ্ছে! 🎄 নতুন বছরে ব্যবসা আরও বড় করতে চান? এখন join করলে **১৫% ছাড়!** Starter **৳১,৬৯৯**, Growth **৳২,৪৬৪**, Pro **৳২,৯৭৪**। নতুন বছর, নতুন শুরু! Link: {{signup_link}}`,
    },
  },
  {
    week_number: 50,
    step_order: 1,
    name: "Growth Stats",
    name_bn: "Growth Stats",
    theme: "social_proof",
    channel: "whatsapp",
    discount_percent: 0,
    content_template: {
      wa_message_bn: `ভাই/আপা, গত ১ বছরে Ecomex এ: ৫০০+ ব্যবসা যুক্ত হয়েছে, ১০ লাখ+ message handle হয়েছে, ৫০,০০০+ order process হয়েছে! এই growing community তে আপনিও আসুন! 🚀`,
    },
  },
  {
    week_number: 52,
    step_order: 1,
    name: "Final Push",
    name_bn: "Final Push",
    theme: "offer",
    channel: "whatsapp",
    discount_percent: 15,
    content_template: {
      wa_message_bn: `{{name}} ভাই/আপা, প্রায় ১ বছর হয়ে গেল আমরা আপনার সাথে connect আছি! 🎂 এই বিশেষ মুহূর্তে **১৫% ছাড়!** Starter মাত্র **৳১,৬৯৯/মাস**, Growth **৳২,৪৬৪/মাস**। Ecomex দিয়ে ব্যবসা সহজ করুন! Link: {{signup_link}}`,
    },
  },
];

// Subscriber Retention Campaign Sequences (20 total)
const subscriberRetentionSequences = [
  {
    week_number: 1,
    step_order: 1,
    name: "Congratulations",
    name_bn: "অভিনন্দন",
    theme: "welcome",
    channel: "whatsapp",
    discount_percent: 0,
    content_template: {
      wa_message_bn: `{{name}} ভাই/আপা, Ecomex family তে স্বাগতম! 🎉 আপনার subscription সফলভাবে activate হয়েছে। এখন থেকে আপনার ব্যবসা আরও সহজ হবে! কোনো help লাগলে আমরা আছি। - Ecomex টিম`,
    },
  },
  {
    week_number: 2,
    step_order: 1,
    name: "Getting Started",
    name_bn: "Getting Started",
    theme: "educational",
    channel: "whatsapp",
    discount_percent: 0,
    content_template: {
      wa_message_bn: `ভাই, শুরু করতে সাহায্য দরকার? 🚀 ১. প্রথমে WhatsApp instance connect করুন ২. Quick Replies সেট করুন ৩. Contact labels ঠিক করুন। কোনো step এ আটকে গেলে জানাবেন!`,
    },
  },
  {
    week_number: 4,
    step_order: 1,
    name: "Quick Reply Setup",
    name_bn: "Quick Reply Setup",
    theme: "feature",
    channel: "whatsapp",
    discount_percent: 0,
    content_template: {
      wa_message_bn: `{{name}} ভাই, Quick Reply সেটআপ করেছেন? 💬 Settings > Quick Replies এ যান। Price list, Delivery info, Bank details - সব save করে রাখুন। একবার setup, সারা জীবন use!`,
    },
  },
  {
    week_number: 6,
    step_order: 1,
    name: "First Check-in",
    name_bn: "First Check-in",
    theme: "checkin",
    channel: "whatsapp",
    discount_percent: 0,
    content_template: {
      wa_message_bn: `ভাই/আপা, কেমন চলছে Ecomex? 😊 কোনো সমস্যায় পড়েছেন? আমাদের জানান, আমরা solve করব! আপনার feedback আমাদের কাছে খুব মূল্যবান।`,
    },
  },
  {
    week_number: 8,
    step_order: 1,
    name: "Orders Module",
    name_bn: "Orders Module",
    theme: "feature",
    channel: "whatsapp",
    discount_percent: 0,
    content_template: {
      wa_message_bn: `{{name}} ভাই, Orders feature ব্যবহার করছেন তো? 📦 Chat থেকে সরাসরি order create করুন। Status update, customer notification - সব automatic! আপনার কাজ অনেক কমে যাবে।`,
    },
  },
  {
    week_number: 10,
    step_order: 1,
    name: "Community",
    name_bn: "Community",
    theme: "social_proof",
    channel: "whatsapp",
    discount_percent: 0,
    content_template: {
      wa_message_bn: `ভাই, জানেন কি? 👥 Ecomex এ এখন ৫০০+ ব্যবসা! আপনি একা নন, বড় একটা community র অংশ। আমরা সবাই মিলে grow করছি!`,
    },
  },
  {
    week_number: 12,
    step_order: 1,
    name: "Feedback",
    name_bn: "Feedback",
    theme: "engagement",
    channel: "whatsapp",
    discount_percent: 0,
    content_template: {
      wa_message_bn: `{{name}} ভাই/আপা, ১ মাস পার! 🎊 Ecomex কেমন লাগছে? কোনো নতুন feature চান? আপনার মতামত জানালে আমরা আরও ভালো করতে পারব!`,
    },
  },
  {
    week_number: 14,
    step_order: 1,
    name: "Contacts Management",
    name_bn: "Contacts Management",
    theme: "feature",
    channel: "whatsapp",
    discount_percent: 0,
    content_template: {
      wa_message_bn: `ভাই, Contacts feature দেখেছেন? 👤 সব customer এর info এক জায়গায়! নাম, address, order history - সব save থাকে। Next time message করতে গেলে সব info হাতের কাছে!`,
    },
  },
  {
    week_number: 16,
    step_order: 1,
    name: "Team Management",
    name_bn: "Team Management",
    theme: "feature",
    channel: "whatsapp",
    discount_percent: 0,
    content_template: {
      wa_message_bn: `ভাই, Team feature ব্যবহার করেছেন? 👨‍👩‍👧‍👦 একা সব handle করতে কষ্ট হলে team member add করুন। Starter এ ৩ জন, Growth এ ৫ জন, Pro তে ১০ জন পর্যন্ত add করা যায়!`,
    },
  },
  {
    week_number: 20,
    step_order: 1,
    name: "Mid-Check",
    name_bn: "Mid-Check",
    theme: "checkin",
    channel: "whatsapp",
    discount_percent: 0,
    content_template: {
      wa_message_bn: `{{name}} ভাই/আপা, আশা করি ভালো আছেন! 😊 Ecomex এ কোনো সমস্যা হচ্ছে? নতুন কোনো feature দরকার? জানালে আমরা দেখব!`,
    },
  },
  {
    week_number: 22,
    step_order: 1,
    name: "Invoice Generation",
    name_bn: "Invoice Generation",
    theme: "feature",
    channel: "whatsapp",
    discount_percent: 0,
    content_template: {
      wa_message_bn: `{{name}} ভাই, Invoice তৈরি করেছেন Ecomex থেকে? 📄 Professional invoice generate করুন one click এ। Customer এ পাঠান, print করুন - সব সহজ!`,
    },
  },
  {
    week_number: 24,
    step_order: 1,
    name: "Analytics Dashboard",
    name_bn: "Analytics Dashboard",
    theme: "feature",
    channel: "whatsapp",
    discount_percent: 0,
    content_template: {
      wa_message_bn: `ভাই, Dashboard দেখেছেন? 📊 আপনার message stats, order trends - সব এক জায়গায়। প্রতি সপ্তাহে check করুন, ব্যবসার pattern বুঝুন, সিদ্ধান্ত নিন!`,
    },
  },
  {
    week_number: 28,
    step_order: 1,
    name: "Upgrade Offer",
    name_bn: "Upgrade Offer",
    theme: "offer",
    channel: "whatsapp",
    discount_percent: 10,
    content_template: {
      wa_message_bn: `{{name}} ভাই, আপনার ব্যবসা বাড়ছে দেখে ভালো লাগছে! 📈 Upgrade করতে চাইলে এখন **১০% ছাড়!** Growth মাত্র **৳২,৬০৯/মাস**, Pro মাত্র **৳৩,১৪৯/মাস**। বেশি instance, বেশি team member, AI Agent - সব পাবেন!`,
    },
  },
  {
    week_number: 32,
    step_order: 1,
    name: "Automation Workflow",
    name_bn: "Automation/Workflow",
    theme: "feature",
    channel: "whatsapp",
    discount_percent: 0,
    content_template: {
      wa_message_bn: `ভাই/আপা, Workflow feature try করেছেন? ⚡ Growth এ Automation আছে! Automatic welcome message, order confirmation - সব সেট করে রাখুন। Upgrade করলে আরও power পাবেন!`,
    },
  },
  {
    week_number: 36,
    step_order: 1,
    name: "Success Check",
    name_bn: "Success Check",
    theme: "engagement",
    channel: "whatsapp",
    discount_percent: 0,
    content_template: {
      wa_message_bn: `{{name}} ভাই, একটু জানতে চাই - Ecomex ব্যবহার করে কি সত্যিই সময় বাঁচছে? 🤔 আমরা সবসময় আপনার experience improve করতে চাই!`,
    },
  },
  {
    week_number: 40,
    step_order: 1,
    name: "Integrations",
    name_bn: "Integrations",
    theme: "feature",
    channel: "whatsapp",
    discount_percent: 0,
    content_template: {
      wa_message_bn: `ভাই, সব integration ব্যবহার করছেন? 🔗 Courier booking (Steadfast, Pathao), WooCommerce sync, Facebook Messenger - সব connected থাকলে কাজ অনেক সহজ। কোনো help লাগলে জানাবেন!`,
    },
  },
  {
    week_number: 44,
    step_order: 1,
    name: "Impact Stats",
    name_bn: "Impact Stats",
    theme: "social_proof",
    channel: "whatsapp",
    discount_percent: 0,
    content_template: {
      wa_message_bn: `{{name}} ভাই/আপা, আপনি জানেন? 📈 Ecomex users গড়ে প্রতিদিন ২ ঘণ্টা সময় বাঁচায়! আপনার ব্যবসাতেও কি improvement হয়েছে?`,
    },
  },
  {
    week_number: 48,
    step_order: 1,
    name: "Year-end Check",
    name_bn: "Year-end Check",
    theme: "checkin",
    channel: "whatsapp",
    discount_percent: 0,
    content_template: {
      wa_message_bn: `ভাই, প্রায় এক বছর হয়ে গেল! 🎂 Ecomex এর সাথে আপনার journey কেমন ছিল? কোনো suggestion থাকলে জানাবেন। নতুন বছরে আরও ভালো করার plan আছে!`,
    },
  },
  {
    week_number: 50,
    step_order: 1,
    name: "Loyalty Renewal",
    name_bn: "Loyalty/Renewal",
    theme: "offer",
    channel: "whatsapp",
    discount_percent: 15,
    content_template: {
      wa_message_bn: `{{name}} ভাই/আপা, আপনি আমাদের পুরনো member! 🌟 Loyalty bonus হিসেবে পরবর্তী renewal/upgrade এ **১৫% ছাড়!** Yearly plan নিলে আরও সেভ। আপনার সাথে থাকতে পেরে আমরা গর্বিত!`,
    },
  },
  {
    week_number: 52,
    step_order: 1,
    name: "Anniversary",
    name_bn: "Anniversary",
    theme: "engagement",
    channel: "whatsapp",
    discount_percent: 0,
    content_template: {
      wa_message_bn: `ভাই/আপা, ১ বছর! 🎉 Ecomex family তে ১ বছর পূর্ণ হলো। এই journey র জন্য ধন্যবাদ। আগামী বছরও আপনার সাথে থাকতে চাই। নতুন features আসছে - excited! 🚀`,
    },
  },
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // First, update campaign max_discount_percent to 15%
    const { error: updateError } = await supabase
      .from("admin_marketing_campaigns")
      .update({ max_discount_percent: 15 })
      .in("id", [PROSPECT_NURTURE_ID, SUBSCRIBER_RETENTION_ID]);

    if (updateError) {
      console.error("Error updating campaigns:", updateError);
    }

    // Delete existing sequences for these campaigns (fresh start)
    const { error: deleteError } = await supabase
      .from("admin_marketing_sequences")
      .delete()
      .in("campaign_id", [PROSPECT_NURTURE_ID, SUBSCRIBER_RETENTION_ID]);

    if (deleteError) {
      console.error("Error deleting existing sequences:", deleteError);
    }

    // Prepare sequences for insertion
    const allSequences = [
      ...prospectNurtureSequences.map((seq) => ({
        campaign_id: PROSPECT_NURTURE_ID,
        ...seq,
        ai_personalize: true,
        is_active: true,
      })),
      ...subscriberRetentionSequences.map((seq) => ({
        campaign_id: SUBSCRIBER_RETENTION_ID,
        ...seq,
        ai_personalize: true,
        is_active: true,
      })),
    ];

    // Insert all sequences
    const { data, error: insertError } = await supabase
      .from("admin_marketing_sequences")
      .insert(allSequences)
      .select();

    if (insertError) {
      console.error("Error inserting sequences:", insertError);
      return new Response(
        JSON.stringify({ success: false, error: insertError.message }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Marketing sequences seeded successfully",
        stats: {
          prospect_nurture: prospectNurtureSequences.length,
          subscriber_retention: subscriberRetentionSequences.length,
          total: allSequences.length,
        },
        sequences: data,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
