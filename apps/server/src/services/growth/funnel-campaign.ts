/**
 * Canonical definition of the value-first onboarding funnel (M3 LEAD-GEN).
 *
 * This is the single source of truth shared by:
 *   - scripts/seed-funnel-campaign.ts (creates the campaign + sequence rows)
 *   - services/growth/funnel.ts (auto-enroll on lead capture; the draft tick)
 *
 * The funnel mirrors STRATEGY.md §3 stages (new -> warm -> demo -> trial) and
 * pulls intent from the three CONTENT-M2.md lead magnets. Content is bilingual
 * (Bangla-dominant with an English line). NOTHING here sends on its own — every
 * step is drafted through the M1 approval gate before any execution.
 */

/** Stable campaign identity. The seed + auto-enroll look the campaign up by name. */
export const FUNNEL_CAMPAIGN_NAME = "value-first onboarding funnel";
export const FUNNEL_CAMPAIGN_NAME_BN = "ভ্যালু-ফার্স্ট অনবোর্ডিং ফানেল";
export const FUNNEL_CAMPAIGN_TYPE = "lifecycle";

/**
 * Frequency caps for the funnel. Conservative: at most one funnel message per
 * lead every 2 days, capped at 3/week. The draft tick enforces both.
 */
export const FUNNEL_FREQUENCY_PER_WEEK = 3;
export const FUNNEL_FREQUENCY_PER_MONTH = 8;
export const FUNNEL_MIN_DAYS_BETWEEN_MESSAGES = 2;

/** entity_type stamped on enrollments created from a captured lead. */
export const FUNNEL_ENTITY_TYPE_LEAD = "lead";

export interface FunnelStep {
  /** 0-based order within the (single-week) sequence. */
  stepOrder: number;
  /** Days after enrollment this step becomes due. */
  dayOffset: number;
  /** whatsapp = warm consented send; email = stubbed (no infra yet). */
  channel: "whatsapp" | "email";
  /** Short label used in the approval-card summary, e.g. "Day0 lead magnet". */
  name: string;
  nameBn: string;
  theme: string;
  /** Bilingual body. WhatsApp uses `body`; email uses subject + body. */
  subject: string;
  subjectBn: string;
  body: string;
  bodyBn: string;
}

/**
 * The four funnel steps mapped to STRATEGY §3:
 *   Day0 deliver lead magnet (warm WhatsApp) -> Day1 value drop -> Day3 demo ->
 *   Day5 trial nudge (email path, exercises the stubbed sender).
 *
 * Lead-magnet intent (CONTENT-M2.md): COD Rescue / Bangla Chat Script Pack /
 * FB Page Ban Survival Checklist. Day0 leads with the COD calculator (the
 * highest-intent, money-quantifying magnet).
 */
export const FUNNEL_STEPS: readonly FunnelStep[] = [
  {
    stepOrder: 0,
    dayOffset: 0,
    channel: "whatsapp",
    name: "Day0 lead magnet",
    nameBn: "দিন ০ — লিড ম্যাগনেট",
    theme: "deliver_value",
    subject: "Your COD leakage calculator + Bangla script pack",
    subjectBn: "আপনার COD লিকেজ ক্যালকুলেটর + বাংলা স্ক্রিপ্ট প্যাক",
    body:
      "Thanks for checking out What A App. As promised — your free COD Rescue " +
      "calculator and the 50-message Bangla Chat Script Pack. No signup, just value.",
    bodyBn:
      "What A App দেখার জন্য ধন্যবাদ। কথা অনুযায়ী — আপনার ফ্রি COD Rescue " +
      "ক্যালকুলেটর আর ৫০টা রেডি বাংলা চ্যাট স্ক্রিপ্ট। কোনো সাইনআপ নেই, শুধু ভ্যালু।",
  },
  {
    stepOrder: 1,
    dayOffset: 1,
    channel: "whatsapp",
    name: "Day1 value drop",
    nameBn: "দিন ১ — ভ্যালু ড্রপ",
    theme: "social_proof",
    subject: "How a Dhaka seller cut fake COD by 45%",
    subjectBn: "ঢাকার এক বিক্রেতা কীভাবে ভুয়া COD ৪৫% কমালেন",
    body:
      "Quick story: a seller added a 3-message COD confirmation flow and fake " +
      "orders dropped ~45%. The same flow ships with What A App — here is the " +
      "FB Page Ban Survival Checklist too, so your customer list stays yours.",
    bodyBn:
      "ছোট গল্প: এক বিক্রেতা ৩-মেসেজের COD কনফার্মেশন ফ্লো যোগ করে ভুয়া অর্ডার " +
      "~৪৫% কমিয়েছেন। একই ফ্লো What A App এ আছে — সাথে FB Page Ban Survival " +
      "চেকলিস্ট, যাতে আপনার কাস্টমার লিস্ট আপনারই থাকে।",
  },
  {
    stepOrder: 2,
    dayOffset: 3,
    channel: "whatsapp",
    name: "Day3 demo",
    nameBn: "দিন ৩ — ডেমো",
    theme: "demo",
    subject: "12-min Bangla demo: one chat -> booked order",
    subjectBn: "১২ মিনিটের বাংলা ডেমো: এক চ্যাট -> বুকড অর্ডার",
    body:
      "Want to see it in motion? A 12-minute Bangla-narrated demo shows one " +
      "WhatsApp message turning into a booked, payment-ready order in seconds. " +
      "Reply 'demo' and we will send the link.",
    bodyBn:
      "চলন্ত অবস্থায় দেখতে চান? ১২ মিনিটের বাংলা ডেমোতে দেখবেন একটা WhatsApp " +
      "মেসেজ কয়েক সেকেন্ডে বুকড, পেমেন্ট-রেডি অর্ডারে পরিণত হচ্ছে। 'demo' লিখে " +
      "রিপ্লাই দিন, লিংক পাঠাই।",
  },
  {
    stepOrder: 3,
    dayOffset: 5,
    channel: "email",
    name: "Day5 trial nudge",
    nameBn: "দিন ৫ — ট্রায়াল নাজ",
    theme: "trial_nudge",
    subject: "Start your free 5-day setup — no card",
    subjectBn: "আপনার ফ্রি ৫-দিনের সেটআপ শুরু করুন — কার্ড ছাড়াই",
    body:
      "Ready to let your shop run itself? Start the free 5-day trial: Day0 setup, " +
      "Day1 check, Day3 COD activate, Day5 summary. No credit card. Just reply to " +
      "begin.",
    bodyBn:
      "দোকান নিজে চলুক — তৈরি? ফ্রি ৫-দিনের ট্রায়াল শুরু করুন: দিন০ সেটআপ, দিন১ " +
      "চেক, দিন৩ COD চালু, দিন৫ সামারি। কোনো ক্রেডিট কার্ড লাগবে না। শুরু করতে " +
      "রিপ্লাই দিন।",
  },
];

/** Total steps in the funnel (used to detect completion). */
export const FUNNEL_STEP_COUNT = FUNNEL_STEPS.length;
