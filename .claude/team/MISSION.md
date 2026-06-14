# Mission Charter — Autonomous Growth Company

> Written at CHARTER. The sacred source of intent. Every agent reads this first.
> Supersedes prior missions (self-host, landing, design overhaul — all shipped;
> archived under `archive/2026-06-14-pre-growth/`).

- **Project:** What A App (Ecomex) — autonomous growth company
- **Chartered:** 2026-06-14
- **CEO run:** /ceo

## Goal
Grow **What A App** (multi-tenant WhatsApp/FB/IG CRM for Bangladeshi e-commerce
sellers) **organically** toward a $100M business, run by an autonomous agent
company. First measurable goal: **1,000 paying tenants, profitably.**

## Success criteria (M1 Foundation — how we know it's done)
- [ ] Grand Slam Offer + positioning locked (Hormozi Value Equation) — founder-approved
- [ ] Brand kit (visual system + voice, Bangla+EN) delivered
- [ ] `hormozi-growth` + `ai-search-seo` skills authored and usable
- [ ] Agent-company roles defined (CEO, CMO/Growth, Content, SEO/GEO, Brand, Sales/Lead, Hermes, Eng/Bug)
- [ ] Approval-gate plumbing live: `growth_approvals` + Telegram ✅/❌ callback + company CEO report (e2e test passes)
- [ ] Every external action (publish/spend/contact-human) blocked behind one-tap founder approval

## Constraints
- Stack: monorepo — apps/web (Vite+React), apps/server (Hono+Drizzle+Postgres)
- Deploy target: Contabo VPS (Docker), shared postiz-postgres
- Reuse existing: job_queue, scheduler, admin marketing tables, Telegram alerts, ceo_reports
- Publishing: Postiz public API (`POST /public/v1/posts`) — separate VPS service
- Autonomy: draft/research/schedule 24/7; HARD approval before publish/spend/outreach
- Growth motion: organic Core Four (warm outreach, free content, lead magnets); paid/cold gated

## Non-goals (out of scope for now)
- Autonomous media buying / ad spend (gated behind explicit per-campaign budget approval)
- Cold WhatsApp outreach to non-opted-in numbers (ban + spam-law risk)
- Global English repositioning (BD-first; architect for regional, don't build it yet)
- Rebuilding marketing tables that already exist (extend, don't duplicate)

## Strategy spine (Alex Hormozi)
- **$100M Offers:** Grand Slam Offer via Value Equation = (Dream Outcome × Perceived
  Likelihood) / (Time Delay × Effort). Offer stack + guarantee + naming.
- **$100M Leads:** organic Core Four (warm outreach, free content, lead magnets);
  value-first — give until they ask.
- **Funnel:** value-first lead magnet → opt-in → 5-day trial → paid.
- **After-sales:** retention/ascension — win first 24h, milestones, NPS, referral, tier-up.

## Honest $100M math
At ~৳1,499/mo ARPU, $100M ARR ≈ ~700k tenants — beyond BD alone. Path: climb ARPU
(Business/Enterprise + add-ons) + regional expansion + organic brand flywheel.
First goal = 1,000 paying tenants, profitably.

## Stakeholder decisions
- 2026-06-14 — Founder approved plan `now-the-most-important-synthetic-parrot.md`
- 2026-06-14 — Autonomy = gate before public/spend/outreach
- 2026-06-14 — Hybrid architecture (Claude skills + product backend)
- 2026-06-14 — Foundation sprint first
- 2026-06-14 — BD-first, architected for regional expansion
- 2026-06-14 — Run autonomously on bypass permissions, looped
