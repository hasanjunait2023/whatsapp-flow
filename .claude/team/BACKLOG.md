# Backlog — Autonomous Growth Company

> Prioritized milestones. CEO pops the top open item each LOOP iteration.
> Status: `todo` | `active` | `blocked` | `done`

## Active milestone
- [ ] **M2: Content + SEO engine** — status: GATE2 (buildable scope DONE)
      DONE: 30-day calendar + 3 lead magnets (CONTENT-M2.md/calendar.json), SEO/GEO plan
      (SEO-GEO-PLAN.md), content autopilot backend (seed + daily draft→approval tick, 18 tests).
      BLOCKED for publish: M1 deploy (founder env) + SEO needs SPA pre-render decision.

## Queue (priority order)
- [ ] **SSR/pre-render decision** (founder) — unblocks ALL SEO/GEO; vite-plugin-ssg or static /blog. apps/web architecture.
- [ ] **M3: Lead-gen + funnel** — lead magnets; /api/public/demo-lead → marketingLeads;
      nurture via admin-marketing tables; value-first opt-in → trial
- [ ] **M4: After-sales experience** — onboarding win-fast, milestones, NPS, referral loop, tier-up (Hermes)
- [ ] **M5: (Gated) scale** — warm-only cold outreach; then paid/media buying behind explicit budget approval

## Done
- [x] **M1: Foundation** — DONE 2026-06-14. Strategy/offer/funnel/after-sales (STRATEGY.md),
      Hormozi+BD research (RESEARCH-hormozi-bd.md), brand kit (brand/), skills
      (hormozi-growth + ai-search-seo), agent-company def (AGENT-COMPANY.md), hardened
      approval-gate backend (committed HEAD; migration 0003 additive; deploy via DEPLOY-M1.md).
      GATE1+GATE2 passed. Deploy pending founder env (TELEGRAM_WEBHOOK_SECRET, FOUNDER_TG_USER_ID, POSTIZ_*).

## Follow-ups / tech debt (captured at RETRO)
- Confirm exact Postiz `/public/v1/posts` payload shape against running VPS instance at build
- FOUNDER_TG_USER_ID allowlist decision for approval-callback authz
- ARPU-climb + regional-expansion modeling (needed for true $100M path)

## Founder action items
- [ ] Provide Postiz API key + base URL (POSTIZ_URL, POSTIZ_API_KEY)
- [ ] Confirm GROWTH_TELEGRAM_CHAT_ID (or reuse OPS_TELEGRAM_CHAT_ID)
- [ ] Connect social channels inside Postiz (FB/IG/YouTube/TikTok/LinkedIn)
