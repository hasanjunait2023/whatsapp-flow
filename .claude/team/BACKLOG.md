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
- [ ] **Internal Chat** — DEDICATED scoped route required (NOT generic /api/query).
      Tables exist (internal_chat_rooms/members/messages) but members+messages have
      no tenant_id AND need MEMBERSHIP scoping (rooms the caller is in) — tenant-only
      scoping leaks staff DMs within a tenant. Build internal-chat-fns.ts with
      handlers: list-rooms, create-direct/group-room (atomic room+members insert with
      authz), add/remove-member (room-admin only), send-message (room∈my-rooms guard),
      mark-read; emit SSE on internal_messages insert; rewrite useInternalChat.tsx to
      call the fns instead of raw table CRUD. ~focused session.
- [ ] Scheduled Reports — largely covered by agent_schedules (CEO reports); verify email cron path
- [ ] Marketing Sequences — DEFERRED by founder (revisit later); needs schema + trigger/step model
- [ ] WooCommerce sync — needs per-tenant store URL + consumer key/secret; webhook route /api/webhooks/woocommerce not built
- [ ] Service Boards — read-only stub today
- [ ] **Bulk Group tooling** — group-batch-processor is stubbed. Build the send queue +
      worker; MUST route through outboundRateLimiter (high ban-risk) + gate on BanRiskNotice.
      WAHA Core = single session; full value needs Plus. ~focused session.
- [ ] **Courier BD** — bdcourier-check / courier-book-parcel / courier-track-parcel stubbed.
      BLOCKED on founder: pick provider (Steadfast / Pathao / RedX) + API key. Then build
      services/courier/<provider>.ts + wire the 3 fns + courier_integrations settings UI.

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
- [ ] Hetzner exit path doc if Contabo SLAs become an issue
- [ ] WAHA tag-upgrade runbook (protocol breaks every ~3-6mo)
- [ ] Resolve 7 residual web tsc errors (Map inference in useTeamReports/useTeamActivityHeatmap/useAdminDashboard) — vite build unaffected
