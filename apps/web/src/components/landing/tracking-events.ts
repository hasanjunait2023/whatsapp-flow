/*
 * Landing-specific tracking helpers — encapsulate the conversion-event semantics
 * from the build brief so call sites stay declarative. All of these no-op when no
 * pixel is configured (see src/lib/tracking.ts).
 */

import { track } from "@/lib/tracking";

import { PLANS, type PlanId } from "./config";

const CURRENCY = "BDT";

function planPrice(plan: PlanId): number | undefined {
  return PLANS.find((p) => p.id === plan)?.monthly ?? undefined;
}

/** Pricing section scrolled ~50% into view. */
export function trackPricingView(): void {
  track("ViewContent", { content_name: "pricing", currency: CURRENCY });
}

/** A plan CTA was clicked → start of checkout intent. value = monthly plan price. */
export function trackPlanCtaClick(plan: PlanId): void {
  track("InitiateCheckout", {
    content_id: plan,
    content_name: plan,
    value: planPrice(plan),
    currency: CURRENCY,
  });
}
