/**
 * Content-site config — the pre-rendered marketing/content pages (/learn, /compare).
 *
 * These pages are statically generated at build time by `vite-react-ssg` (see
 * vite.config.content.ts) so AI crawlers (GPTBot, PerplexityBot, ClaudeBot,
 * Google-Extended) and Googlebot can read the content + JSON-LD in the INITIAL
 * HTML response. This is fully isolated from the SPA app shell (src/App.tsx) —
 * no auth, no Supabase, no providers — so nothing browser-only runs at build.
 */

/** Canonical production origin. Used for canonical URLs, hreflang, JSON-LD @id. */
export const SITE_ORIGIN = "https://ecomexautomation.com";

export const BRAND_NAME = "What A App";
export const BRAND_LEGAL = "What A App by Ecomex";

/** Title suffix per SEO-GEO-PLAN §4. */
export const TITLE_SUFFIX = "What A App — WhatsApp CRM for Bangladesh";

/** BDT plan pricing — single source of truth for Offer JSON-LD (SEO-GEO-PLAN §3). */
export const PLANS = [
  { name: "Starter", price: 899 },
  { name: "Pro", price: 1499 },
  { name: "Business", price: 2799 },
] as const;

/** Social profiles for Organization sameAs. */
export const SAME_AS = [
  "https://www.facebook.com/ecomexautomation",
  "https://wa.me/8801922001161",
];

/** WhatsApp support deep-link (CTA target on content pages). */
export const WA_SUPPORT_URL =
  "https://wa.me/8801922001161?text=" +
  encodeURIComponent("Hi, I want to know more about What A App");

/** Signup deep-link into the SPA trial flow. */
export const signupHref = (plan: "starter" | "pro" | "business" = "pro"): string =>
  `/auth/signup?plan=${plan}`;
