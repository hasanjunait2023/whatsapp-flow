# Backlog — Autonomous Growth Company

> Prioritized milestones. CEO pops the top open item each LOOP iteration.
> Status: `todo` | `active` | `blocked` | `done`

## Active milestone
- [ ] **DEPLOY (founder)** — M1-M3 + SSR all BUILT + committed. Go live: docs/growth/DEPLOY-M1.md
      (env + migration 0003 + deploy apps/server & apps/web + Postiz connect + seed scripts + test gate).

## Done milestones
- [x] **M1 Foundation** — DONE 2026-06-14 (strategy, brand, skills, agent-company, approval-gate backend).
- [x] **M2 Content + SEO engine** — DONE 2026-06-14 (calendar + lead magnets + SEO/GEO plan + content autopilot).
- [x] **M3 Lead-gen + funnel** — DONE 2026-06-14 (demo-lead->enroll, nurture campaign, gated draft tick, send job). commit 9829248.
- [x] **SSR pre-render** — DONE 2026-06-14 (vite-react-ssg /learn + /compare, JSON-LD, robots, sitemap). commit 20e8d6b.

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
