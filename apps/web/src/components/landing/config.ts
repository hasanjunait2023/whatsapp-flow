/*
 * Static config for the marketing landing page: nav anchors, WhatsApp link, plan
 * pricing, and the signup deep-links that start the 5-day trial.
 *
 * Pricing values are the approved BD figures (see the build brief). Numbers shown
 * to users that are not yet confirmed by marketing are MARKED in the UI via the
 * `placeholder` styling, not here.
 */

import { SUPPORT_WHATSAPP, APP_NAME } from "@/config/branding";

export const WA_SUPPORT_TEXT = encodeURIComponent(`Hi, I want to know more about ${APP_NAME}`);
export const WA_SUPPORT_URL = `https://wa.me/${SUPPORT_WHATSAPP}?text=${WA_SUPPORT_TEXT}`;
/** Pretty number for the nav "support" affordance. */
export const WA_SUPPORT_DISPLAY = "+880 1922-001161";

export const NAV_LINKS: { href: string; en: string; bn: string }[] = [
  { href: "#features", en: "Features", bn: "ফিচার" },
  { href: "#pricing", en: "Pricing", bn: "মূল্য" },
  { href: "#integrations", en: "Integrations", bn: "ইন্টিগ্রেশন" },
  { href: "#faqs", en: "FAQ", bn: "প্রশ্ন" },
];

export type PlanId = "starter" | "pro" | "business";

/** Deep-link into the existing signup flow with the chosen plan → starts the trial. */
export function signupHref(plan: PlanId): string {
  return `/auth/signup?plan=${plan}`;
}

export interface Plan {
  id: PlanId | "enterprise";
  name: string;
  /** Short audience line. */
  audienceEn: string;
  audienceBn: string;
  /** Monthly price in BDT. `null` for Enterprise (contact). */
  monthly: number | null;
  highlighted?: boolean;
  badgeBn?: string;
  features: { en: string; bn?: string }[];
}

/** Yearly = 2 months free → 10× the monthly price. */
export const yearlyTotal = (monthly: number): number => monthly * 10;
/** Effective monthly when paying yearly. */
export const yearlyPerMonth = (monthly: number): number => Math.round((monthly * 10) / 12);

export const PLANS: Plan[] = [
  {
    id: "starter",
    name: "Starter",
    audienceEn: "Solo seller getting started",
    audienceBn: "একক বিক্রেতার জন্য",
    monthly: 899,
    features: [
      { en: "1 WhatsApp + 1 Facebook channel" },
      { en: "2 team agents" },
      { en: "Unified inbox" },
      { en: "Manual replies & quick replies" },
      { en: "Orders from chat (basic)" },
      { en: "bKash & Nagad payment links" },
    ],
  },
  {
    id: "pro",
    name: "Pro",
    audienceEn: "Busy store + AI + team",
    audienceBn: "ব্যস্ত দোকানের জন্য",
    monthly: 1499,
    highlighted: true,
    badgeBn: "সবচেয়ে জনপ্রিয়",
    features: [
      { en: "Everything in Starter, plus:" },
      { en: "WhatsApp + Facebook + Instagram (2 each)" },
      { en: "5 team agents" },
      { en: "AI auto-reply in Bangla & English" },
      { en: "Broadcast + follow-up funnels" },
      { en: "Full courier booking & tracking" },
      { en: "COD fraud & return check" },
    ],
  },
  {
    id: "business",
    name: "Business",
    audienceEn: "High volume & multiple brands",
    audienceBn: "বড় ব্যবসার জন্য",
    monthly: 2799,
    features: [
      { en: "Everything in Pro, plus:" },
      { en: "5 instances per channel" },
      { en: "15 team agents" },
      { en: "Unlimited conversations" },
      { en: "Advanced AI & automations" },
      { en: "Priority support" },
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    audienceEn: "Multi-brand / custom needs",
    audienceBn: "প্রতিষ্ঠানের জন্য",
    monthly: null,
    features: [
      { en: "Everything in Business, plus:" },
      { en: "Custom instances & agents" },
      { en: "Dedicated account manager" },
      { en: "SLA & onboarding support" },
      { en: "Custom integrations" },
    ],
  },
];
