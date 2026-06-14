# Backlog — Autonomous Growth Company

> Prioritized milestones. CEO pops the top open item each LOOP iteration.
> Status: `todo` | `active` | `blocked` | `done`

## Active milestone
- [ ] **M1: Foundation** — status: active
  - Offer + positioning (Grand Slam Offer, Hormozi)
  - Brand kit (visual + voice, Bangla+EN)
  - Skills: `hormozi-growth`, `ai-search-seo`
  - Agent-company role definitions
  - Approval-gate plumbing (growth_approvals + Telegram ✅/❌ + company CEO report)
  - Growth strategy doc ($100M model, organic Core Four, funnel map, after-sales journey)

## Queue (priority order)
- [ ] **M2: Content + SEO engine** — Postiz adapter + social_posts + draftDailyContent;
      SEO/GEO content clusters + content_pieces; 30-day editorial calendar (all gated)
- [ ] **M3: Lead-gen + funnel** — lead magnets; /api/public/demo-lead → marketingLeads;
      nurture via admin-marketing tables; value-first opt-in → trial
- [ ] **M4: After-sales experience** — onboarding win-fast, milestones, NPS, referral loop, tier-up (Hermes)
- [ ] **M5: (Gated) scale** — warm-only cold outreach; then paid/media buying behind explicit budget approval

## Done
<!-- moved here on completion, with date -->

## Follow-ups / tech debt (captured at RETRO)
- Confirm exact Postiz `/public/v1/posts` payload shape against running VPS instance at build
- FOUNDER_TG_USER_ID allowlist decision for approval-callback authz
- ARPU-climb + regional-expansion modeling (needed for true $100M path)

## Founder action items
- [ ] Provide Postiz API key + base URL (POSTIZ_URL, POSTIZ_API_KEY)
- [ ] Confirm GROWTH_TELEGRAM_CHAT_ID (or reuse OPS_TELEGRAM_CHAT_ID)
- [ ] Connect social channels inside Postiz (FB/IG/YouTube/TikTok/LinkedIn)
