# What A App — SEO/GEO Content Plan (DRAFTS, approval before publish)

> Authored M2 by SEO/GEO Lead via `ai-search-seo`. Own "WhatsApp/F-commerce order
> automation for Bangladeshi sellers" in Google + AI answer engines, organically.

## ⚠️ CRITICAL technical blocker (read first)
The marketing site is a **Vite/React SPA with no SSR/pre-rendering** — `apps/web/dist/
index.html` is a bare `<div id="root">`. AI crawlers (GPTBot, PerplexityBot, ClaudeBot,
Google-Extended) and Googlebot cannot reliably read JS-rendered content. **Every content
page is invisible until pre-rendering is solved → content ROI ≈ 0 without it.**
Fix (ranked): (1) `vite-plugin-ssg`/`vite-ssg` pre-render `/learn/*` + `/compare/*` at
build; (2) separate static site (Astro/Next) at `/blog`; (3) SSR via Node adapter.
File: `apps/web/vite.config.ts`. App routes `/app/*` need no pre-render.
**This is a founder decision (architecture change to apps/web) — see backlog.**

## 1. Content cluster
**Pillar P0** — `/learn/whatsapp-crm-bangladesh` — target `whatsapp crm bangladesh`
(+ `whatsapp business automation bangladesh`, `বাংলাদেশে WhatsApp CRM`). Answer-first:
"A WhatsApp CRM for Bangladesh collects every order message from WhatsApp/FB/IG into one
inbox, replies in Bangla automatically, and books a Pathao/RedX courier — without the
seller touching the phone." Carries Organization + SoftwareApplication + FAQPage + Breadcrumb.

**Supporting pages (link ↑ to P0):**
- S01 `/learn/cod-fake-orders-bangladesh` — `ভুয়া COD অর্ডার কমানোর উপায়`
- S02 `/learn/whatsapp-auto-reply-bangladesh-setup` — `whatsapp auto reply setup bangladesh` (HowTo)
- S03 `/learn/book-courier-from-whatsapp-bangladesh` — `whatsapp theke courier book` (HowTo; name Pathao/RedX/Steadfast)
- S04 `/learn/whatsapp-business-app-vs-api-bangladesh` — `whatsapp business app vs api bangladesh` (FAQ; feeds ban-proof wedge)
- S05 `/learn/bkash-nagad-payment-whatsapp-bangladesh` — `whatsapp bkash payment link bangladesh` (HowTo)
- S06 `/learn/facebook-page-ban-recovery-bangladesh` — `facebook page ban hoye gele ki korbo` (FAQ; top-of-funnel trust, high emotion, near-zero Bangla competition)
- S07 `/learn/manage-100-whatsapp-orders-day-bangladesh` — `whatsapp order management 100+ bangladesh`
- S08 `/learn/f-commerce-whatsapp-automation-bangladesh` — `f-commerce bangladesh whatsapp` (entity-definition page)
- S09 `/learn/whatsapp-broadcast-without-ban-bangladesh` — `whatsapp broadcast ban na hoye pathano` (counters bulk-sender competitors)
- S10 `/learn/whatsapp-crm-price-bangladesh` — `whatsapp crm price bangladesh` (Product/Offer BDT)
- S11 `/learn/bangla-whatsapp-templates-bd-sellers` — `whatsapp message template bangla` (the 50-template lead magnet as a public, shareable page)
- S12 `/learn/own-server-data-safety-meta-ban` — `whatsapp crm own server data bangladesh` (the moat page)
- S13 `/learn/whatsapp-chatbot-bangla-online-shop` — `WhatsApp chatbot bangla` (Bangla-primary)
- S14 `/learn/bd-seller-whatsapp-automation-story` — `whatsapp automation seller success bangladesh` (real seller, consent; Article+Person)

## 2. Comparison / alternative pages (AI engines cite these most)
- **C01** `/compare/best-whatsapp-crm-bangladesh-2026` — honest matrix (WhatsApp Business app · BotSailor · MyAlice · What A App) across 8 dims: official API, Bangla UI/AI, BDT/bKash, BD courier, own-server, price, unified inbox, BD focus.
- **C02** `/compare/what-a-app-vs-botsailor` — BotSailor strong on broadcast/chatbot; we win Bangla AI, BDT, courier, own-server. Fair FAQ.
- **C03** `/compare/what-a-app-vs-myalice` — MyAlice $60–180 USD, no bKash/Bangla/courier; we fit BD SMB.
- **C04** `/compare/whatsapp-business-app-vs-order-system` — free app caps at ~30–80 orders/day; we add auto-reply, order pipeline, COD seq, courier, own-server.
Honest + specific (AI engines cross-check). No `AggregateRating` until 10+ real reviews exist.

## 3. Schema plan
Site-wide `Organization` (areaServed Bangladesh, sameAs socials). `SoftwareApplication`
with BDT `Offer`s (Starter 899 / Pro 1499 / Business 2799) on P0 + S10. `FAQPage` on
P0/S04/S06/S09/S12 + all comparison pages. `HowTo` on S02/S03/S05/S07/S13. `BreadcrumbList`
every page. `Article`+`Person` on S14. JSON-LD must be in the **pre-rendered HTML head**,
not React-injected.

## 4. Technical + GEO checklist
- **Pre-render** `/learn/*` + `/compare/*` (the blocker above).
- **robots.txt** (`apps/web/public/robots.txt`): explicitly Allow GPTBot/PerplexityBot/
  Google-Extended/ClaudeBot into `/learn/` + `/compare/`; Disallow `/app/` + `/api/`; add Sitemap.
- **sitemap.xml** (add `vite-plugin-sitemap`): pillar 1.0, comparison 0.9, supporting 0.8.
- **Per-page title/meta** in server HTML (not post-hydration). Title: `[Topic] | What A App
  — WhatsApp CRM for Bangladesh`. Meta = the AEO answer, <155 char.
- **hreflang** en + bn (`/bn/learn/...`) + x-default; `Content-Language: bn-BD` for `/bn/`.
- **CWV**: content pages must NOT load CRM chunks (recharts/xyflow/jspdf); LCP<2.5/INP<200/CLS<0.1; real OG image (placeholder `og-image.png` unreplaced).
- **Mobile-first** 360–390px; Bangla body ≥16px / 1.6 line-height; 44px tap targets.
- **GEO entity signals**: mention COD/bKash/Nagad/Pathao/RedX/Steadfast/Daraz/f-commerce/৳;
  stable canonical pillar URL; identified BD author bios (E-E-A-T).

## 5. First 5 pages (publish order)
1. **P0 pillar** — `whatsapp crm bangladesh` (everything links here).
2. **C01** best-whatsapp-crm-bangladesh-2026 — most-cited by AI for "which tool".
3. **S06** facebook-page-ban-recovery — highest-emotion, near-zero Bangla competition.
4. **S11** bangla-whatsapp-templates — shareable in seller groups, compounds backlinks.
5. **S01** cod-fake-orders — quantifies the pain that converts.

Scope boundary: no link-building outreach (earned via communities), no paid search
(organic-first), no India/PK content yet (after 1,000 BD tenants), social calendar lives
in CONTENT-M2.md, YouTube SEO later.
