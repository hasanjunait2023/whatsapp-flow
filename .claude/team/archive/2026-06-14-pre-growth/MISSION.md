# MISSION

**Goal:** Fully self-host the whatsapp-flow SaaS on the founder's Contabo VPS: replace Wasender API with self-hosted WAHA Plus, migrate Supabase cloud → SQLite + Node/Hono backend, migrate live production data, and launch.

**Success criteria:**
- Production runs entirely on Contabo VPS (app + WAHA + SQLite + backups)
- Frontend works with zero per-call-site changes (supabase shim; <10 web files touched)
- Live tenants/users/messages/media migrated; users log in with existing passwords (bcrypt verify+rehash)
- Real WA message round-trip: receive → inbox via SSE → reply → delivered/read acks → media both ways
- Zero cross-tenant data leakage (isolation fuzz passed)
- Off-VPS backups (Litestream + restic → Cloudflare R2) with tested restore
- 48h stable soak post-cutover

**Constraints:**
- VPS shared: 6 vCPU / 12GB RAM (~6.4GB free), ports 80/443 owned by existing proxy — never bind them
- WAHA Plus $19/mo; NOWEB engine; pinned stable tag; <20 sessions at launch
- Ban-risk policy: reactive-first, <30 proactive msgs/hr/number, warm-up guidance, tenant ToS disclosure
- Keep Supabase project alive ≥2 weeks post-cutover for rollback

**Non-goals (v1):** Accounting, Internal Chat, Scheduled Reports, Marketing Sequences, WooCommerce sync, Service Boards, bulk Group tooling — flagged/deferred to Phase 7 (NOT dropped; founder wants everything eventually).

**Approved plan:** C:\Users\Junait\.claude\plans\https-github-com-hasanjunait2023-whatsap-async-puppy.md

---

# MISSION 2 (2026-06-12) — High-conversion sales landing page

**Goal:** Build a public marketing/sales landing page for the BD WhatsApp/FB/IG CRM SaaS, modeled on a dark AI-themed reference (Eclipse/BoostIQ style), engineered for high conversion, wired into the live app (signup → 5-day trial → UddoktaPay/crypto checkout).

**Success criteria:**
- Public landing at the app root for unauthenticated visitors; dark/purple AI-business aesthetic matching the reference
- BD-market pain points + sales psychology + trust signals; bilingual-friendly (Bangla where it lands)
- Pricing: Starter ৳899 (1 FB + 1 WA), Pro ৳1499 (2× FB+WA+IG), Business ৳2799 (5 instances), Enterprise (negotiable) — seeded in DB
- 5-day free trial: signup creates a `trialing` subscription (trial_ends_at = +5d)
- Ad-conversion tracking: Meta Pixel + Google (GA4/Ads) + TikTok Pixel, env-configurable, firing PageView/Lead/Purchase
- Dashboard/feature screenshots embedded
- CTAs wire to signup→trial→checkout end-to-end

**Constraints:** reuse existing apps/web stack (Vite+React+Tailwind+shadcn); pixels dormant until founder supplies IDs; no new payment infra (UddoktaPay + crypto already live).

**Non-goals:** blog/CMS, multi-language full i18n of the whole site (focus EN + key Bangla), A/B testing infra (note as follow-up).
