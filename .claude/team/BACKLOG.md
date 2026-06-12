# BACKLOG

## Now (BUILD)
- [ ] Phase 0: infra discovery + WAHA pilot (devops-deployer)
- [ ] Phase 1: backend skeleton + supabase shim (backend-engineer)

## Next
- [ ] Phase 2: WAHA vertical slice (keystone)
- [ ] Phase 3: module-by-module port
- [ ] Phase 4: migration rehearsal on copy
- [ ] Phase 5: cutover
- [ ] Phase 6: hardening + launch

## Later (Phase 7 — deferred modules, behind flags)
- [ ] Accounting — needs founder ledger model decision
- [x] **Internal Chat** — DONE (dedicated membership-scoped route internal-chat-fns.ts;
      useInternalChat rewritten; cross-tenant + intra-tenant DM authz tested). LIVE.
- [ ] Scheduled Reports — largely covered by agent_schedules (CEO reports); verify email cron path
- [ ] Marketing Sequences — DEFERRED by founder (revisit later); needs schema + trigger/step model
- [ ] WooCommerce sync — needs per-tenant store URL + consumer key/secret; webhook route /api/webhooks/woocommerce not built
- [ ] Service Boards — read-only stub today
- [x] **Bulk Group tooling** — DONE (group-queue-batch enqueue + group-batch-processor +
      scheduler worker; paced batches + per-tenant daily cap enforced; tested). LIVE.
- [x] **Courier BD** — DONE (BYOK; Steadfast booking/tracking + BDCourier risk check;
      encrypted creds; tested). Pathao booking deferred (OAuth). LIVE. Tenants add their
      own keys in Courier settings.
- [ ] Courier: Pathao booking (OAuth token flow + city/zone/area lookups) — deferred
- [ ] Tenant must supply their own courier API keys in Settings → Courier when ready.

## Founder action items
- [ ] Purchase WAHA Plus subscription ($19/mo) — needed before Phase 2 multi-session/media work
- [ ] Create Cloudflare R2 bucket + API token — needed by Phase 4 backup setup
- [ ] Scan pilot QR with a test WhatsApp number when Phase 0 reports ready
- [ ] Rotate Supabase anon key (committed in git) — after cutover, Supabase decommission

## Phase 3 coverage audit (2026-06-12) — 41/71 edge fns mapped; classify+close the 30 below
Verify each is genuinely handled (relocated/deferred) or a real v1 gap to port:
- RELOCATED (confirm wired, not /api/fn): fb-webhook→webhooks/fb.ts; wasender-webhook→waha ingest; wasender-session-healthcheck→waha-health job; uddoktapay-webhook→payment webhook route; send-telegram-notification→services/telegram.
- CRONS (confirm in scheduler/jobs): media-cleanup-cron, webhook-cleanup-cron, subscription-reminder-cron, whatsapp-followup-cron, backfill-thread-state (one-off migration script).
- DEFERRED Phase-7 (OK to skip v1): woocommerce-order-webhook, woocommerce-scheduled-sync, marketing-enroll-entity, marketing-unsubscribe, seed-marketing-sequences, send-daily/weekly/monthly-report, sales-order-webhook, workflow-execute(?).
- LIKELY REAL v1 GAPS — port or justify: admin-delete-tenant, admin-fix-webhook, admin-link-session, admin-reset-user-password, admin-test-welcome-message, report-system-error, resend-welcome-notification, send-welcome-email, test-welcome-message, fb-backfill-profiles, group-batch-processor.

## Tech debt / follow-ups
- [ ] FB OAuth WIP (concurrent, uncommitted): fb-oauth.ts + services/facebook/ + index.ts/env.ts
      have 3 tsc errors (fb-fns.ts:296/302, fb-oauth.ts:35 — string|null). Resolve before it ships.
      NOT included in the deployed HEAD (uncommitted). Left untouched.
- [ ] Dead-Supabase refs still in admin tools (WebhookSecretManager, ResetPasswordDialog) +
      broken fetches (useExternalSales, presence hooks) — follow-up sweep.
- [ ] Hetzner exit path doc if Contabo SLAs become an issue
- [ ] WAHA tag-upgrade runbook (protocol breaks every ~3-6mo)
- [ ] Resolve 7 residual web tsc errors (Map inference in useTeamReports/useTeamActivityHeatmap/useAdminDashboard) — vite build unaffected
