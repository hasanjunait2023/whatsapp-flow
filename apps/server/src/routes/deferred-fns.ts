import type { FnContext, FnResult } from "./waha/session.js";

/**
 * Deferred-v1 edge functions. These belong to modules the founder deferred to
 * Phase 7 (Courier integrations, Marketing Sequences, WooCommerce sync, bulk
 * Group tooling). They return a clean, graceful envelope so the UI degrades
 * without throwing — rather than a 501 that surfaces as an error toast.
 *
 *   { data: null, error: { message: "feature_disabled_v1", code: "feature_disabled" } }
 */

function disabled(): Promise<FnResult> {
  return Promise.resolve({
    data: null,
    error: { message: "feature_disabled_v1", code: "feature_disabled" },
  });
}

// Courier (BD courier risk check + parcel booking/tracking) is now LIVE — see
// routes/courier-fns.ts (COURIER_HANDLERS). Kept out of this deferred set.

// Marketing Sequences (admin nurture automation)
const marketingAutomationCron = (_b: Record<string, unknown>, _c: FnContext) => disabled();

// WooCommerce product/order sync
const woocommerceSync = (_b: Record<string, unknown>, _c: FnContext) => disabled();

// Bulk group tooling worker — its queue (group-queue-batch) is deferred-v1, so
// the batch processor has nothing to run.
const groupBatchProcessor = (_b: Record<string, unknown>, _c: FnContext) => disabled();

export const DEFERRED_HANDLERS = {
  "marketing-automation-cron": marketingAutomationCron,
  "woocommerce-sync": woocommerceSync,
  "group-batch-processor": groupBatchProcessor,
};
