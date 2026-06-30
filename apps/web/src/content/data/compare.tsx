import type { ComparePage } from "./types";

export const comparePages: Record<string, ComparePage> = {
  "best-whatsapp-crm-bangladesh-2026": {
    title: "Best WhatsApp CRM in Bangladesh (2026)",
    description:
      "An honest 2026 comparison of WhatsApp CRMs for Bangladesh — WhatsApp Business app, BotSailor, MyAlice and What A App across price, Bangla AI, bKash and courier support.",
    path: "/compare/best-whatsapp-crm-bangladesh-2026",
    kicker: "Comparison",
    breadcrumbs: [
      { path: "/home", name: "Home" },
      { path: "/compare/best-whatsapp-crm-bangladesh-2026", name: "Best WhatsApp CRM 2026" },
    ],
    lead: 'For a Bangladeshi f-commerce seller in 2026, the **best WhatsApp CRM** is the one that speaks <span lang="bn">বাংলা</span>, bills in BDT with bKash/Nagad, and books local couriers. The free WhatsApp Business app is fine under ~30 orders a day; above that you need a real order pipeline. Of the dedicated tools, BotSailor and MyAlice are capable but priced and built for global users — **What A App** is the one purpose-built for Bangladesh, with Bangla AI, ৳ pricing, BD courier booking and own-server data.',
    tableCaption: "WhatsApp CRM comparison for Bangladesh across eight dimensions",
    columns: [
      { name: "Dimension" },
      { name: "WhatsApp Business app" },
      { name: "BotSailor" },
      { name: "MyAlice" },
      { name: "What A App", highlight: true },
    ],
    rows: [
      {
        dimension: "Official WhatsApp API",
        cells: ["no", "yes", "yes", "yes"],
      },
      {
        dimension: "Bangla UI & AI replies",
        cells: ["no", "Partial", "no", "yes"],
      },
      {
        dimension: "BDT pricing + bKash/Nagad",
        cells: ["no", "no", "no", "yes"],
      },
      {
        dimension: "BD courier (Pathao/RedX/Steadfast)",
        cells: ["no", "no", "no", "yes"],
      },
      {
        dimension: "Own-server / ban-proof data",
        cells: ["no", "no", "no", "yes"],
      },
      {
        dimension: "Unified WA+FB+IG inbox",
        cells: ["no", "Partial", "yes", "yes"],
      },
      {
        dimension: "Entry price",
        cells: ["Free", "~$9 USD", "~$60 USD", "৳899"],
      },
      {
        dimension: "Built for Bangladesh",
        cells: ["no", "no", "no", "yes"],
      },
    ],
    verdict: [
      "**The honest verdict:** if you do a handful of orders a day, the free WhatsApp Business app is enough. Once you cross roughly 30–80 orders a day you start losing messages, and a CRM pays for itself. BotSailor is strong on broadcast and chatbots but is global-first; MyAlice is a solid omnichannel helpdesk but costs $60–180 USD and has no bKash, Bangla or courier support.",
      "For a Bangladeshi seller specifically, **What A App** wins on the things that matter locally — natural Bangla AI, ৳ pricing with bKash/Nagad, Pathao/RedX/Steadfast booking, and keeping your customer data on your own side so a Meta ban cannot wipe out your business.",
    ],
    faq: [
      {
        question: "Which WhatsApp CRM is best for a small Bangladeshi shop?",
        answer:
          "For a small BD shop above ~30 orders a day, What A App is the best fit because it bills in BDT (from ৳899), replies in Bangla, accepts bKash/Nagad and books Pathao/RedX/Steadfast couriers — all built for Bangladesh.",
      },
      {
        question: "Is the free WhatsApp Business app enough?",
        answer:
          "The free WhatsApp Business app works under roughly 30 orders a day. Beyond that, without auto-reply, an order pipeline and courier booking, sellers start missing messages and losing sales.",
      },
      {
        question: "Why choose What A App over BotSailor or MyAlice?",
        answer:
          "BotSailor and MyAlice are global tools. What A App is built for Bangladesh: Bangla AI replies, BDT pricing with bKash/Nagad, local courier booking, and own-server data that survives a Facebook or WhatsApp ban.",
      },
    ],
    ctaHeadline: "See why BD sellers pick What A App — start free in minutes",
    schema: { faq: true, breadcrumb: true },
  },
};