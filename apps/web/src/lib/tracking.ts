/*
 * Cross-platform ad/analytics tracking.
 *
 * Every platform is OPT-IN via a VITE_* env var (see apps/web/.env.example). If an
 * ID is unset, that platform's loader script and every call to it are skipped
 * silently — no console noise, no network requests, no globals touched.
 *
 * One canonical event vocabulary (see `TrackEvent`) fans out to the per-platform
 * event names. Call `track(event, params)` once; it dispatches to whichever
 * platforms are configured.
 *
 * Scripts are injected by <PixelScripts /> (src/components/landing/PixelScripts.tsx).
 */

const META_PIXEL_ID = import.meta.env.VITE_META_PIXEL_ID as string | undefined;
const GA4_ID = import.meta.env.VITE_GA4_ID as string | undefined;
const GOOGLE_ADS_ID = import.meta.env.VITE_GOOGLE_ADS_ID as string | undefined;
const TIKTOK_PIXEL_ID = import.meta.env.VITE_TIKTOK_PIXEL_ID as string | undefined;

const has = (v: string | undefined): v is string => typeof v === "string" && v.trim().length > 0;

export const trackingConfig = {
  metaPixelId: has(META_PIXEL_ID) ? META_PIXEL_ID : undefined,
  ga4Id: has(GA4_ID) ? GA4_ID : undefined,
  googleAdsId: has(GOOGLE_ADS_ID) ? GOOGLE_ADS_ID : undefined,
  tiktokPixelId: has(TIKTOK_PIXEL_ID) ? TIKTOK_PIXEL_ID : undefined,
};

/** True when at least one pixel/analytics platform is configured. */
export const isTrackingEnabled =
  !!trackingConfig.metaPixelId ||
  !!trackingConfig.ga4Id ||
  !!trackingConfig.googleAdsId ||
  !!trackingConfig.tiktokPixelId;

/** Canonical events used across the landing page. */
export type TrackEvent =
  | "PageView"
  | "ViewContent"
  | "Lead"
  | "CompleteRegistration"
  | "InitiateCheckout"
  | "Purchase";

export interface TrackParams {
  /** Monetary value (BDT) where applicable. */
  value?: number;
  currency?: string;
  /** Plan/product identifier, e.g. "starter" | "pro" | "business". */
  content_id?: string;
  content_name?: string;
  /** Dedup id shared across platforms (esp. Purchase). */
  event_id?: string;
  [key: string]: unknown;
}

// ── Third-party globals (loosely typed; injected by their loader scripts) ──
type Fbq = (...args: unknown[]) => void;
type Gtag = (...args: unknown[]) => void;
type Ttq = { track: (event: string, params?: Record<string, unknown>) => void; page: () => void };

declare global {
  interface Window {
    fbq?: Fbq;
    gtag?: Gtag;
    dataLayer?: unknown[];
    ttq?: Ttq;
  }
}

// Map our canonical events to each platform's nearest standard event.
const META_EVENT: Record<TrackEvent, string> = {
  PageView: "PageView",
  ViewContent: "ViewContent",
  Lead: "Lead",
  CompleteRegistration: "CompleteRegistration",
  InitiateCheckout: "InitiateCheckout",
  Purchase: "Purchase",
};

const GA4_EVENT: Record<TrackEvent, string> = {
  PageView: "page_view",
  ViewContent: "view_item",
  Lead: "generate_lead",
  CompleteRegistration: "sign_up",
  InitiateCheckout: "begin_checkout",
  Purchase: "purchase",
};

const TIKTOK_EVENT: Record<TrackEvent, string> = {
  PageView: "Pageview",
  ViewContent: "ViewContent",
  Lead: "SubmitForm",
  CompleteRegistration: "CompleteRegistration",
  InitiateCheckout: "InitiateCheckout",
  Purchase: "CompletePayment",
};

function metaParams(p: TrackParams): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (p.value !== undefined) out.value = p.value;
  if (p.currency) out.currency = p.currency;
  if (p.content_id) {
    out.content_ids = [p.content_id];
    out.content_type = "product";
  }
  if (p.content_name) out.content_name = p.content_name;
  return out;
}

function ga4Params(p: TrackParams): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (p.value !== undefined) out.value = p.value;
  if (p.currency) out.currency = p.currency;
  if (p.content_id) out.item_id = p.content_id;
  if (p.content_name) out.item_name = p.content_name;
  if (p.event_id) out.transaction_id = p.event_id;
  return out;
}

function tiktokParams(p: TrackParams): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (p.value !== undefined) out.value = p.value;
  if (p.currency) out.currency = p.currency;
  if (p.content_id) out.content_id = p.content_id;
  if (p.content_name) out.content_name = p.content_name;
  return out;
}

/**
 * Fire a canonical event to every configured platform. Safe to call when nothing
 * is configured (no-op) — guards on both the env config and the runtime global.
 */
export function track(event: TrackEvent, params: TrackParams = {}): void {
  try {
    if (trackingConfig.metaPixelId && typeof window.fbq === "function") {
      const opts = params.event_id ? { eventID: params.event_id } : undefined;
      window.fbq("track", META_EVENT[event], metaParams(params), opts);
    }
    if ((trackingConfig.ga4Id || trackingConfig.googleAdsId) && typeof window.gtag === "function") {
      window.gtag("event", GA4_EVENT[event], ga4Params(params));
    }
    if (trackingConfig.tiktokPixelId && window.ttq) {
      window.ttq.track(TIKTOK_EVENT[event], tiktokParams(params));
    }
  } catch {
    // Tracking must never break the page.
  }
}

/** Standard page-view ping (fired once on landing mount). */
export function trackPageView(): void {
  track("PageView");
}
