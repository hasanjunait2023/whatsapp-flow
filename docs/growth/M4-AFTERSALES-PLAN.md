# M4 — After-Sales Experience + Loyalty (multi-channel) — PLAN

> Goal: make every paying tenant (the seller/owner) feel seen, successful, and
> attached to the brand — so they stay, upgrade, and refer. Multi-channel, BD-culture-
> aware, gated. Builds on STRATEGY.md §5 and reuses existing product infra.
> Audience = OUR paying customers (tenant owner + team), reached on THEIR channels.

## Principle
Retention is the $100M lever (BD-only ceiling is low; LTV + referrals + ascension are
what compound). Win the **first 24h**, celebrate **milestones**, catch **risk early**,
ask for **referral/upgrade at peak happiness**, and wrap it in **BD cultural warmth**
(festival greetings, seller-to-seller community). Reach them where they actually read —
in BD that's **WhatsApp first**, then in-app/push, then Telegram/email/SMS.

## Channels (owned-free → outbound → high-touch → cultural)

| Channel | Mechanism | Status | Use for |
|---|---|---|---|
| **In-app notification** | `notifications` table + SSE (exists) | reuse | every milestone/event; zero-cost, instant, owned |
| **Web push** | `push_subscriptions` (exists) | reuse | re-engagement, milestone, payment-due (owner not in app) |
| **WhatsApp (owner)** | company WAHA session → owner's number (consented customer) | reuse WAHA (`GROWTH_WHATSAPP_SESSION`) | welcome, first-win celebration, NPS, referral, win-back — the high-read channel |
| **Telegram (owner)** | `telegram_links` (exists; CEO reports already use it) | reuse | digest, milestone, ops alerts for owners who linked |
| **Email** | SMTP/Resend | NEW dep (key) | 30-day snapshot, receipts, long-form, newsletter |
| **SMS** | BD provider (SSL Wireless / bulk SMS) or Twilio | NEW dep (key) | critical/time-sensitive (payment due, trial ending, OTP-grade) where data is off |
| **In-product banner / checklist** | app UI | small build | onboarding checklist, ascension nudge, "what's new" |
| **Phone call (manual)** | human task | process | high-value or at-risk (detractor, churn-risk) — not automated |
| **Community group** | WhatsApp/FB seller group | process | belonging, peer proof, seller-of-the-month |
| **Cultural / seasonal** | any channel | content | Eid, Pohela Boishakh, Victory Day greetings; account anniversary |
| **Physical thank-you card** | manual, top tier | process (later) | Business/Enterprise delight |

Frequency caps + quiet hours (no 2am pings to the owner) + per-owner channel
preference + opt-out — all enforced centrally.

## Lifecycle touch map (event → channels → intent)

**Onboarding (first 24–72h) — the "alive" moment**
- Payment success → WhatsApp welcome + in-app + email receipt. (STRATEGY §5)
- Setup checklist (in-product) → push/WhatsApp nudge if not started in 2h.
- First auto-reply fires → celebrate (WhatsApp + in-app): "your system replied, not you."
- 24h no activation → human/WhatsApp from onboarding specialist.

**Activation milestones (celebrations, shareable)**
- First night-time order answered → morning WhatsApp + in-app card.
- First 100 orders saved → WhatsApp + email + shareable image (seller-centered).
- First COD sequence completed → in-app.
- 30-day revenue snapshot → email + WhatsApp card.

**Health & retention (catch risk early)**
- Usage dip (inbound/AI volume drops vs baseline, from `tenant_daily_stats`/`usage_counters`) → re-engagement push + WhatsApp.
- Trial ending (day 4/5) → WhatsApp + email + in-app (convert).
- Payment due / failed → SMS + WhatsApp + in-app (time-sensitive).
- Feature-stuck (e.g. never connected courier) → targeted tip.

**Relationship & loyalty**
- NPS at day 45 → WhatsApp (best BD response). Promoter → referral/testimonial ask; detractor → human within 2h.
- Referral loop → triggered at "first 100 orders" high; WhatsApp-shareable link (M3 referral mechanics).
- Account anniversary (1mo/6mo/1yr) → WhatsApp + email thank-you + a perk.
- Festival greetings (Eid-ul-Fitr/Adha, Pohela Boishakh, Victory/Independence Day) → warm, non-salesy, all channels.
- Loyalty recognition → "seller of the month" in community; longevity badge in-app.

**Ascension (earned, behavior-triggered)**
- Starter→Pro when >80 orders/day; Pro→Business on team-like usage. (STRATEGY §5) → in-app + WhatsApp, framed as helping them, not upsell.

**Win-back (churned)**
- Cancelled/lapsed → reactivation sequence (WhatsApp + email), "your data is safe, come back" + incentive.

## Loyalty & relationship mechanics
- **Referral credits** (M3): referrer 1 mo free, referee 30% off — surfaced at peak moments.
- **Longevity perks**: tenure badges, anniversary perk, price-lock for early loyal customers.
- **Recognition**: seller-of-the-month, success-story features (feeds M2 content pillar 3).
- **Community belonging**: curated seller group; exclusive tips; early feature access.
- **Surprise & delight**: festival gift/credit, handwritten card for top tier.

## Data model (reuse > new)
- **Reuse** `adminMarketingCampaigns` (type `aftersales`/`lifecycle`) + `adminMarketingSequences`
  (steps) + `adminMarketingEnrollments` (entity_type=`tenant`, entity_id=tenant.id) +
  `adminMarketingSends` (per-send log, add channel). Same machinery M3 uses for leads.
- **Reuse** `customerJourneyEvents` / per-tenant stats to trigger behavior-based touches.
- **New (small)**: `owner_channel_prefs` (tenant_id, preferred_channel, whatsapp_ok, sms_ok,
  email, telegram_linked, quiet_hours, opted_out) for routing + consent; extend
  `adminMarketingSends.channel` to the full enum (whatsapp|telegram|email|sms|in_app|push).
- **New job kinds**: extend the M3 `send_marketing_message` job into a **channel router**
  (`sendOwnerMessage`) that dispatches to in-app/push/WAHA/Telegram/email/SMS with fallback.

## Gating model (refined for lifecycle scale)
Per-message founder approval doesn't scale for lifecycle touches to paying customers.
Proposed: **approve each sequence TEMPLATE once** at a gate (founder reviews the copy +
channels per step). After approval, enrollments fire that approved template automatically
to consented customers (transactional). **Still gated per-message** for: anything to a
non-customer, any NEW/edited template, paid incentives, and bulk one-off broadcasts.
Owner opt-out + quiet-hours + frequency caps always enforced. (Confirm at GATE 1.)

## Build slices (M4)
1. **Channel router** (`sendOwnerMessage`): in-app + push + WAHA + Telegram (reuse infra) now; email + SMS behind provider keys (stub like M3 email until keys supplied).
2. **Owner channel prefs + consent** table + resolution (preference, fallback, quiet hours, opt-out, caps).
3. **Lifecycle campaigns**: seed the onboarding + milestone + NPS + anniversary + win-back sequences (bilingual), enroll tenants on `payment_success`/lifecycle events.
4. **Behavior triggers**: a tick reading tenant stats → enroll/advance (usage dip, trial-ending, milestones, anniversary, festivals via a date table).
5. **Hermes ownership**: route detractor/at-risk/no-activation to a human task + the product's Hermes agent.
6. **Approval**: template-level approval flow (reuse `growth_approvals`, artifact_type `aftersales_template`).

## Dependencies / founder actions
- **SMS provider** (BD: SSL Wireless / bulk SMS, or Twilio) + key — needed for SMS channel.
- **Email provider** (SMTP/Resend) + key — shared with M3.
- Company **WhatsApp session** name for owner outreach (confirm WAHA Plus session).
- Confirm gating granularity (template-approve vs per-message).

## Risks
- **WhatsApp business-initiated to owners**: even to customers, high-volume company-initiated WA risks limits — keep warm, consented, capped, value-first; prefer in-app/push for routine, WA for high-value moments.
- **SMS cost** (per-message in BD) — reserve for time-sensitive/critical only.
- **Notification fatigue** — central frequency caps + quiet hours + preference + one-tap opt-out; never duplicate the same event across all channels.
- **Consent/compliance** — honor opt-out; transactional vs marketing distinction.
