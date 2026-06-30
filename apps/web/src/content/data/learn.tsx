import type { LearnPage } from "./types";

export const learnPages: Record<string, LearnPage> = {
  "whatsapp-crm-bangladesh": {
    meta: {
      title: "WhatsApp CRM Bangladesh (2026) — Guide for Bangladeshi Sellers",
      description:
        "A comprehensive guide to WhatsApp CRM for Bangladeshi f-commerce and e-commerce sellers in 2026. Why you need one, how it works, and what to look for in a Bangladesh-friendly solution.",
      path: "/learn/whatsapp-crm-bangladesh",
      kicker: "Guide",
      breadcrumbs: [
        { path: "/home", name: "Home" },
        { path: "/learn/whatsapp-crm-bangladesh", name: "WhatsApp CRM Bangladesh" },
      ],
      schema: { organization: true, softwareApplication: true, faq: true, breadcrumb: true },
    },
    lead: "If you sell on Facebook Marketplace or your own e-commerce store in Bangladesh, you already run your business on WhatsApp. A WhatsApp CRM turns your messy chat inbox into an organised order pipeline — with Bangla AI replies, bKash/Nagad payment tracking, and Pathao/RedX courier booking built in.",
    sections: [
      {
        id: "what-is-whatsapp-crm",
        heading: "What is a WhatsApp CRM?",
        body: [
          "A WhatsApp CRM (Customer Relationship Management) is a software tool that connects to your WhatsApp Business API and organises your customer conversations. Instead of scrolling through a chat list to find an order, you get a dashboard shows every customer, their order status, payment history, and conversation history — all in one place.",
          "For Bangladeshi sellers, the key difference from a generic CRM is localisation: Bangla language support, BDT pricing with bKash/Nagad/Rocket, and integration with local courier services like Pathao, RedX, and Steadfast.",
        ],
      },
      {
        id: "why-bd-sellers-need-one",
        heading: "Why Bangladeshi sellers need a WhatsApp CRM",
        body: [
          "**Volume problem:** Once you cross ~30 orders a day, the free WhatsApp Business app becomes impossible to manage. Messages get missed, orders get lost, and customers get frustrated.",
          "**Ban risk:** Your customer data lives on Meta's servers. If your WhatsApp gets banned (common for Bangladeshi businesses), you lose everything — customer contacts, order history, conversations. A self-hosted CRM like What A App keeps your data on your own server.",
          "**Bangla matters:** Most global CRMs don't support Bangla properly. A Bangladesh-focused CRM provides natural Bangla AI replies, not machine-translated gibberish.",
          "**Payment + courier:** bKash/Nagad and Pathao/RedX/Steadfast are essential for Bangladeshi e-commerce. A CRM that integrates these saves hours of manual work every day.",
        ],
      },
      {
        id: "features-to-look-for",
        heading: "Features to look for in a WhatsApp CRM for Bangladesh",
        body: [
          "**Official WhatsApp API:** Ensure the CRM uses the official WhatsApp Business API, not unofficial methods that can get your number banned.",
          "**Bangla AI replies:** The AI should understand and reply in natural Bengali, not translated text. Look for support for Hind Siliguri or Noto Sans Bengali fonts.",
          "**BDT pricing:** Avoid CRMs that charge in USD with international fees. A Bangladesh-friendly CRM bills in BDT and accepts bKash/Nagad.",
          "**Local courier booking:** Direct integration with Pathao, RedX, and Steadfast for automatic courier booking and tracking.",
          "**Multi-channel inbox:** One inbox for WhatsApp, Facebook Messenger, and Instagram — especially important for f-commerce sellers who use all three.",
          "**Self-hosted / ban-proof:** Your data should be on your own server or VPS, not on Meta's servers. This protects your business if your account gets banned.",
        ],
      },
      {
        id: "what-a-app-vs-alternatives",
        heading: "What A App vs alternatives for Bangladeshi sellers",
        body: [
          "**WhatsApp Business app (free):** Works for small volumes but no CRM features. No AI, no order pipeline, no courier integration. Use this below ~30 orders/day.",
          "**BotSailor:** Good chatbot and broadcast features but global-first. Limited Bangla support, USD pricing, no bKash or local courier integration. Starts at ~$9/month.",
          "**MyAlice:** Strong omnichannel helpdesk with WhatsApp, Facebook, and Instagram inbox. But expensive ($60–180 USD/month), no Bangla AI, no bKash, no BD courier booking.",
          "**What A App:** Built from the ground up for Bangladeshi sellers. Bangla AI, BDT pricing (from ৳899/month), bKash/Nagad, Pathao/RedX/Steadfast courier booking, self-hosted data. 5-day free trial.",
        ],
      },
    ],
    faq: [
      {
        question: "Can I use the free WhatsApp Business app instead of a CRM?",
        answer:
          "Yes, for small volumes — roughly under 30 orders a day — the free WhatsApp Business app works fine. Beyond that, sellers typically start missing messages and losing sales. A CRM like What A App helps you stay organised with an order pipeline, auto-replies, and courier booking.",
      },
      {
        question: "What if my WhatsApp gets banned?",
        answer:
          "With a self-hosted CRM like What A App, your customer data, order history, and conversations stay on your own server. If your WhatsApp gets banned, you can switch to a new number without losing any data. This is not possible with the free WhatsApp Business app or cloud-only CRMs.",
      },
      {
        question: "Does What A App support Bangla?",
        answer:
          "Yes — the entire UI is available in Bangla (Hind Siliguri font), and the AI can understand and reply in natural Bengali. This is one of the key differentiators from global CRMs like BotSailor or MyAlice.",
      },
      {
        question: "How do I start with What A App?",
        answer:
          "Sign up for a 5-day free trial at whatapp.junno.qzz.io. No credit card required. You can connect your WhatsApp Business number, set up your inbox, and see how it works for your business.",
      },
    ],
    ctaHeadline: "Ready to organise your WhatsApp business? Start free in minutes.",
  },
};