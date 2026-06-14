import type { OwnerChannel } from "./owner-messaging.js";

/**
 * Canonical definition of the M4 AFTER-SALES + LOYALTY lifecycle campaigns.
 *
 * Single source of truth shared by:
 *   - scripts/seed-aftersales-campaigns.ts (creates campaign + sequence rows)
 *   - services/growth/aftersales.ts (enroll-on-payment; the behaviour-trigger tick)
 *
 * Audience = OUR paying tenants (the seller/owner + team), reached on THEIR
 * channels. Copy is bilingual (English line + Bangla line), drawn from
 * STRATEGY.md §5 and the M4-AFTERSALES-PLAN touch map. Content is improvable;
 * the identities (campaign keys + step orders) are the stable contract.
 *
 * GATING: each step's template is approved by the founder ONCE through the gate
 * (template-approve-once). After approval, enrollments auto-send to consented
 * owners. New/edited templates re-gate. Nothing here sends on its own.
 */

export const AFTERSALES_CAMPAIGN_TYPE = "aftersales";
export const AFTERSALES_ENTITY_TYPE = "tenant";

export interface AftersalesStep {
  /** 0-based order within the campaign. */
  stepOrder: number;
  /** Channels + fallback/all policy for sendOwnerMessage. */
  channels: OwnerChannel[];
  channelMode: "fallback" | "all";
  /** Short label for the approval-card summary + send row. */
  name: string;
  nameBn: string;
  title: string;
  bodyEn: string;
  bodyBn: string;
}

export interface AftersalesCampaign {
  /** Stable natural key the seed + tick look the campaign up by. */
  key: string;
  name: string;
  nameBn: string;
  steps: AftersalesStep[];
}

/**
 * The lifecycle campaigns. Keys map to the touch map:
 *   onboarding · milestones · nps · anniversary · festival · winback · ascension
 * Each campaign holds the ordered steps that the trigger tick fires by event.
 */
export const AFTERSALES_CAMPAIGNS: readonly AftersalesCampaign[] = [
  {
    key: "aftersales-onboarding",
    name: "After-sales onboarding",
    nameBn: "আফটার-সেলস অনবোর্ডিং",
    steps: [
      {
        stepOrder: 0,
        channels: ["whatsapp", "in_app"],
        channelMode: "all",
        name: "welcome",
        nameBn: "স্বাগতম",
        title: "Welcome to What A App",
        bodyEn:
          "You're in. Your shop is about to run itself — first message to delivered order, " +
          "without touching your phone at 2am. We'll get your first auto-reply live in ~30 minutes.",
        bodyBn:
          "শুরু হয়ে গেল। এখন আপনার দোকান নিজেই চলবে — প্রথম মেসেজ থেকে ডেলিভারড অর্ডার, " +
          "রাত ২টায় ফোন না ধরেও। ৩০ মিনিটেই আপনার প্রথম অটো-রিপ্লাই চালু করে দিচ্ছি।",
      },
      {
        stepOrder: 1,
        channels: ["whatsapp", "push", "in_app"],
        channelMode: "fallback",
        name: "setup-nudge",
        nameBn: "সেটআপ নাজ",
        title: "Let's finish your 30-minute setup",
        bodyEn:
          "One short step left: connect your number so replies start firing. Reply here and our " +
          "Bangla specialist will walk you through it — most sellers are live in under 30 minutes.",
        bodyBn:
          "একটাই ছোট ধাপ বাকি: নাম্বার কানেক্ট করুন, রিপ্লাই চালু হয়ে যাবে। এখানে রিপ্লাই দিন, " +
          "আমাদের বাংলা স্পেশালিস্ট সাথে থেকে করিয়ে দেবেন — বেশিরভাগ বিক্রেতা ৩০ মিনিটেই লাইভ।",
      },
      {
        stepOrder: 2,
        channels: ["whatsapp", "in_app"],
        channelMode: "all",
        name: "first-reply-celebration",
        nameBn: "প্রথম রিপ্লাই উদযাপন",
        title: "You didn't reply — your system did",
        bodyEn:
          "Your first customer just got answered automatically. That's a sale you would've missed " +
          "while busy. This happens 24/7 now, even while you sleep.",
        bodyBn:
          "আপনার প্রথম কাস্টমার এইমাত্র অটোমেটিক উত্তর পেল। ব্যস্ত থাকলে এই বিক্রিটা মিস হতো। " +
          "এখন এটা ২৪ ঘণ্টা চলবে, আপনি ঘুমিয়ে থাকলেও।",
      },
    ],
  },
  {
    key: "aftersales-milestones",
    name: "After-sales milestones",
    nameBn: "আফটার-সেলস মাইলস্টোন",
    steps: [
      {
        stepOrder: 0,
        channels: ["whatsapp", "in_app"],
        channelMode: "all",
        name: "first-night-order",
        nameBn: "প্রথম রাতের অর্ডার",
        title: "Your first night-time order — answered while you slept",
        bodyEn:
          "Last night a customer ordered after hours and your system handled it. That's the whole " +
          "promise working: you sell while you sleep.",
        bodyBn:
          "গতরাতে একজন কাস্টমার অফ-আওয়ারে অর্ডার দিল আর আপনার সিস্টেম সামলে নিল। এটাই পুরো " +
          "প্রতিশ্রুতি — আপনি ঘুমিয়ে থেকেও বিক্রি করছেন।",
      },
      {
        stepOrder: 1,
        channels: ["whatsapp", "in_app", "push"],
        channelMode: "all",
        name: "first-100-orders",
        nameBn: "প্রথম ১০০ অর্ডার",
        title: "100 orders saved 🎉",
        bodyEn:
          "You've crossed 100 orders handled through What A App. That's 100 conversations that " +
          "became sales instead of missed messages. Proud of you — share the win.",
        bodyBn:
          "What A App দিয়ে আপনি ১০০টি অর্ডার সামলে ফেলেছেন। ১০০টি কথোপকথন মিস না হয়ে বিক্রিতে " +
          "পরিণত হয়েছে। গর্বিত আপনার জন্য — সাফল্যটা শেয়ার করুন।",
      },
      {
        stepOrder: 2,
        channels: ["whatsapp", "email", "in_app"],
        channelMode: "all",
        name: "30-day-snapshot",
        nameBn: "৩০-দিনের স্ন্যাপশট",
        title: "Your first 30 days, in numbers",
        bodyEn:
          "One month in. Here's what your system did for you: orders captured, replies sent, nights " +
          "covered. The full snapshot is in your dashboard — take a look at what running itself looks like.",
        bodyBn:
          "এক মাস পূর্ণ। আপনার সিস্টেম যা করেছে: অর্ডার ধরা, রিপ্লাই পাঠানো, রাত কাভার করা। " +
          "পূর্ণ স্ন্যাপশট ড্যাশবোর্ডে আছে — দেখে নিন নিজে-চলা দোকান দেখতে কেমন।",
      },
    ],
  },
  {
    key: "aftersales-nps",
    name: "After-sales NPS",
    nameBn: "আফটার-সেলস NPS",
    steps: [
      {
        stepOrder: 0,
        channels: ["whatsapp", "in_app"],
        channelMode: "fallback",
        name: "nps-day-45",
        nameBn: "NPS দিন ৪৫",
        title: "Quick one — how likely are you to recommend us?",
        bodyEn:
          "You've been with us 45 days. On a scale of 0-10, how likely are you to recommend What A App " +
          "to another seller? Just reply with a number — it genuinely shapes what we build next.",
        bodyBn:
          "আপনি ৪৫ দিন আমাদের সাথে আছেন। ০-১০ এর মধ্যে, আরেকজন বিক্রেতাকে What A App সাজেস্ট করার " +
          "সম্ভাবনা কতটুকু? শুধু একটা নাম্বার রিপ্লাই দিন — এটা আমরা পরে কী বানাবো তা ঠিক করে।",
      },
    ],
  },
  {
    key: "aftersales-anniversary",
    name: "After-sales anniversary",
    nameBn: "আফটার-সেলস অ্যানিভার্সারি",
    steps: [
      {
        stepOrder: 0,
        channels: ["whatsapp", "in_app"],
        channelMode: "all",
        name: "anniversary-1mo",
        nameBn: "অ্যানিভার্সারি ১ মাস",
        title: "One month together — thank you",
        bodyEn:
          "It's been a month since you trusted us with your shop. Thank you. You're exactly who we " +
          "built this for.",
        bodyBn:
          "আপনি আপনার দোকানের ভরসা আমাদের দিয়েছেন এক মাস হলো। ধন্যবাদ। ঠিক আপনার মতো বিক্রেতার " +
          "জন্যই আমরা এটা বানিয়েছি।",
      },
      {
        stepOrder: 1,
        channels: ["whatsapp", "email", "in_app"],
        channelMode: "all",
        name: "anniversary-6mo",
        nameBn: "অ্যানিভার্সারি ৬ মাস",
        title: "Six months of selling without missing a beat",
        bodyEn:
          "Half a year in. Your shop hasn't missed a message in months. Here's a small thank-you perk " +
          "in your account — you earned it.",
        bodyBn:
          "ছয় মাস পূর্ণ। মাসের পর মাস আপনার দোকান একটা মেসেজও মিস করেনি। আপনার অ্যাকাউন্টে একটা " +
          "ছোট থ্যাংক-ইউ পার্ক রাখলাম — আপনি অর্জন করেছেন।",
      },
      {
        stepOrder: 2,
        channels: ["whatsapp", "email", "in_app"],
        channelMode: "all",
        name: "anniversary-1yr",
        nameBn: "অ্যানিভার্সারি ১ বছর",
        title: "One year. You built something.",
        bodyEn:
          "A full year of your shop running itself. That's real. Thank you for growing with us — and " +
          "here's a loyalty perk locked to your account for sticking with us.",
        bodyBn:
          "পুরো এক বছর আপনার দোকান নিজে চলেছে। এটা সত্যি অর্জন। আমাদের সাথে বেড়ে ওঠার জন্য ধন্যবাদ " +
          "— সাথে থাকার জন্য আপনার অ্যাকাউন্টে একটা লয়্যালটি পার্ক রাখা হলো।",
      },
    ],
  },
  {
    key: "aftersales-festival",
    name: "After-sales festival greetings",
    nameBn: "আফটার-সেলস উৎসব শুভেচ্ছা",
    steps: [
      {
        stepOrder: 0,
        channels: ["whatsapp", "in_app"],
        channelMode: "fallback",
        name: "eid-greeting",
        nameBn: "ঈদ শুভেচ্ছা",
        title: "Eid Mubarak from all of us",
        bodyEn:
          "Eid Mubarak! May your festival be full of joy, family, and good orders. Thank you for being " +
          "part of our story this year.",
        bodyBn:
          "ঈদ মুবারক! আপনার ঈদ ভরে উঠুক আনন্দ, পরিবার আর ভালো অর্ডারে। এই বছর আমাদের গল্পের অংশ " +
          "হওয়ার জন্য ধন্যবাদ।",
      },
      {
        stepOrder: 1,
        channels: ["whatsapp", "in_app"],
        channelMode: "fallback",
        name: "pohela-boishakh",
        nameBn: "পহেলা বৈশাখ",
        title: "Shubho Noboborsho 🌸",
        bodyEn:
          "Happy Pohela Boishakh! Wishing your shop a year of growth and prosperity. Thank you for " +
          "trusting us with it.",
        bodyBn:
          "শুভ নববর্ষ! আপনার দোকানের জন্য রইল সমৃদ্ধি আর প্রবৃদ্ধির বছর। ভরসা রাখার জন্য ধন্যবাদ।",
      },
      {
        stepOrder: 2,
        channels: ["whatsapp", "in_app"],
        channelMode: "fallback",
        name: "victory-day",
        nameBn: "বিজয় দিবস",
        title: "Victory Day — with gratitude",
        bodyEn:
          "On Victory Day, we honour the spirit that built this nation. Proud to support Bangladeshi " +
          "sellers like you.",
        bodyBn:
          "বিজয় দিবসে আমরা এই জাতি গড়ার চেতনাকে সম্মান জানাই। আপনার মতো বাংলাদেশি বিক্রেতাদের " +
          "পাশে থাকতে পেরে গর্বিত।",
      },
      {
        stepOrder: 3,
        channels: ["whatsapp", "in_app"],
        channelMode: "fallback",
        name: "independence-day",
        nameBn: "স্বাধীনতা দিবস",
        title: "Independence Day greetings",
        bodyEn:
          "Happy Independence Day. Here's to building businesses that stand on their own — yours " +
          "included. Thank you for being with us.",
        bodyBn:
          "স্বাধীনতা দিবসের শুভেচ্ছা। নিজের পায়ে দাঁড়ানো ব্যবসা গড়ার জন্য — আপনারটাসহ। আমাদের " +
          "সাথে থাকার জন্য ধন্যবাদ।",
      },
    ],
  },
  {
    key: "aftersales-winback",
    name: "After-sales win-back",
    nameBn: "আফটার-সেলস উইন-ব্যাক",
    steps: [
      {
        stepOrder: 0,
        channels: ["whatsapp", "email", "in_app"],
        channelMode: "all",
        name: "winback-data-safe",
        nameBn: "উইন-ব্যাক ডেটা নিরাপদ",
        title: "Your data is safe — come back any time",
        bodyEn:
          "We noticed you stepped away. Everything — your customers, orders, history — is still here, " +
          "untouched, on your own server. Whenever you're ready, your shop picks up right where it left off.",
        bodyBn:
          "খেয়াল করলাম আপনি কিছুদিন দূরে আছেন। সবকিছু — আপনার কাস্টমার, অর্ডার, হিস্টোরি — নিজের " +
          "সার্ভারে অক্ষত রাখা আছে। যখনই তৈরি, আপনার দোকান ঠিক যেখানে ছিল সেখান থেকেই শুরু হবে।",
      },
      {
        stepOrder: 1,
        channels: ["whatsapp", "email"],
        channelMode: "all",
        name: "winback-incentive",
        nameBn: "উইন-ব্যাক অফার",
        title: "A little something to come back to",
        bodyEn:
          "If now's the time, here's 30% off your first month back — no setup again, your system is " +
          "ready the moment you are. Reply and we'll switch it back on.",
        bodyBn:
          "এখন যদি সময় হয়, ফিরে আসার প্রথম মাসে ৩০% ছাড় — আবার সেটআপ লাগবে না, আপনি তৈরি হলেই " +
          "সিস্টেম রেডি। রিপ্লাই দিন, চালু করে দিচ্ছি।",
      },
    ],
  },
  {
    key: "aftersales-ascension",
    name: "After-sales ascension",
    nameBn: "আফটার-সেলস অ্যাসেনশন",
    steps: [
      {
        stepOrder: 0,
        channels: ["whatsapp", "in_app"],
        channelMode: "all",
        name: "starter-to-pro",
        nameBn: "স্টার্টার থেকে প্রো",
        title: "You've outgrown Starter — here's why that's good",
        bodyEn:
          "You're handling 80+ orders a day now — serious volume. Pro is built for exactly this: faster " +
          "replies, more automation, no ceilings. Not an upsell, just the right fit for where you are.",
        bodyBn:
          "এখন আপনি দিনে ৮০+ অর্ডার সামলাচ্ছেন — বড় ভলিউম। Pro ঠিক এর জন্যই: দ্রুত রিপ্লাই, বেশি " +
          "অটোমেশন, কোনো সীমা নেই। আপসেল নয়, আপনি এখন যেখানে তার সাথে মানানসই।",
      },
      {
        stepOrder: 1,
        channels: ["whatsapp", "in_app"],
        channelMode: "all",
        name: "pro-to-business",
        nameBn: "প্রো থেকে বিজনেস",
        title: "Your team's growing — Business keeps up",
        bodyEn:
          "Looks like more hands are in your account now. Business adds team roles, permissions, and the " +
          "specialist onboarding so everyone works without stepping on each other. Built for a real team.",
        bodyBn:
          "মনে হচ্ছে এখন আপনার অ্যাকাউন্টে একাধিক হাত কাজ করছে। Business এ আছে টিম রোল, পারমিশন আর " +
          "স্পেশালিস্ট অনবোর্ডিং — সবাই একে অন্যের সাথে ধাক্কা না খেয়ে কাজ করবে। সত্যিকার টিমের জন্য।",
      },
    ],
  },
];

/** Look up a campaign definition by its stable key. */
export function getAftersalesCampaign(key: string): AftersalesCampaign | undefined {
  return AFTERSALES_CAMPAIGNS.find((c) => c.key === key);
}

/** Look up a single step within a campaign. */
export function getAftersalesStep(key: string, stepOrder: number): AftersalesStep | undefined {
  return getAftersalesCampaign(key)?.steps.find((s) => s.stepOrder === stepOrder);
}

export const ONBOARDING_CAMPAIGN_KEY = "aftersales-onboarding";
