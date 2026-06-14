# The Agent Company — roles, dispatch, and the gated growth OS

> Authored at M1 Foundation. Defines the autonomous company that grows What A App.
> Run via `/ceo`. Every external action is gated (Telegram ✅/❌) before it fires.

## Operating principle
Agents **draft, research, and schedule 24/7**. Nothing **publishes, spends, or
contacts a real human** without a one-tap founder approval. The technical chokepoint
is the `growth_approvals` table + Telegram callback (live, M1). Strategy lives in
`STRATEGY.md`; frameworks in the `hormozi-growth` + `ai-search-seo` skills; brand in
`brand/`.

## Org chart

| Role | Backed by (Agent / skill) | Owns | Gated outputs |
|---|---|---|---|
| **CEO** (you-as-tycoon) | `/ceo` orchestrator | Vision, OKRs, prioritization, founder comms, approval digest, the loop | — (sets direction; founder gates) |
| **CMO / Growth** | `marketing-agent` + `hormozi-growth` skill | Offer, positioning, growth model, channel mix, funnel design, money model | offer changes, funnel structure |
| **Content Factory** | `content-marketer` + `seo-content-writer` + brand/VOICE | Daily social posts, blogs, video scripts (Bangla+EN) | every post/article → approval |
| **SEO / GEO Lead** | `seo-specialist` + `ai-search-seo` skill + `seo-*` subagents | Technical SEO, schema, AI-search ranking, content clusters | published pages → approval |
| **Brand / Design** | `designer` + `brandkit`/`high-end-visual-design` skills | Visual system, post creatives, logo, templates | brand assets (low-risk) |
| **Sales / Lead Engine** | `sales-automator` + `marketing-agent` | Lead magnets, funnel copy, nurture sequences | outreach/nurture sends → approval |
| **Hermes (Support/Success)** | `customer-success-manager` + product Hermes agent | Onboarding, after-sales journey, retention, referrals, NPS | customer messages → approval (warm only) |
| **Eng + Bug squad** | `backend-engineer`, `frontend-engineer`, `ceo-code-reviewer`, `security-officer`, `qa-engineer`, `debugger` | Builds growth-system code; fixes product bugs | code ships via GATE 2 |

## The gated growth OS (how a thing goes live)
```
scheduled job / agent drafts artifact (post, page, lead-magnet, nurture msg)
   → growth_approvals row (status=awaiting_approval)
   → Telegram card to founder: summary + ✅ Approve / ❌ Reject
   → ✅ → execution job runs (Postiz publish / WAHA warm send / page publish)
   → ❌ → rejected, agent revises
   → company CEO report (daily/weekly) digests results + pending approvals to Telegram
```
Backend pieces (live, M1): `growth_approvals`, `social_posts`, `content_pieces`
tables; `services/growth/approvals.ts`; Postiz client; `publish_social_post` +
`company_ceo_report` jobs; Telegram approve/reject callback. E2E test:
`POST /api/fn/growth-test-approval`.

## Cadence (set in M2+ via scheduler ticks, all gated)
- **Daily:** draft social posts (per brand pillars) → approval → Postiz schedule.
- **Daily:** advance funnel/nurture enrollments (warm only on WhatsApp) → approval.
- **Daily:** after-sales touches for new paying tenants (Hermes) → approval.
- **Weekly:** SEO/GEO content cluster pieces + audits → approval.
- **Daily/Weekly:** company CEO report to founder (KPIs + pending-approval backlog).
- **Hourly:** expire stale approvals.

## Hard gates (founder approval required)
- GATE 1 (plan) and GATE 2 (ship code) per `/ceo` lifecycle.
- Every publish, every outbound to a human, every ad/spend.
- **Never autonomous:** ad/media spend (per-campaign budget approval), cold WhatsApp
  outreach to non-opted-in numbers (warm-only), global repositioning.

## Roadmap (backlog)
M1 Foundation (now) → M2 Content+SEO engine → M3 Lead-gen+funnel → M4 After-sales →
M5 (gated) scale. First measurable goal: **1,000 paying tenants, profitably.**
